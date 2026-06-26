/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import { useApp } from '../context/AppContext';
import { StudentClass, Student, UserRole } from '../types';
import { Plus, UserPlus, Trash2, Edit2, ShieldAlert, Check, X, ToggleLeft, ToggleRight, Database, Server, RefreshCw, Copy, Share2, Users, BellRing, MessageSquareCode, UserCheck, Camera, Upload, Download, Search, QrCode, Printer, Contact, Award, DollarSign, Info, MessageSquare, Sliders } from 'lucide-react';
import { getClassCategory } from '../initialData';
import { AdjustmentsTab } from './AdjustmentsTab';
import { ExpendituresTab } from './ExpendituresTab';
import { WhatsAppLogsTab } from './WhatsAppLogsTab';
import { VoiceSearchButton } from './VoiceSearchButton';
import { SettingsPanel } from './SettingsPanel';
import { IdCardsGeneratorTab } from './IdCardsGeneratorTab';

export const AdminPanel: React.FC = React.memo(() => {
  const { 
    students, 
    users, 
    addStudent, 
    updateStudent, 
    deleteStudent, 
    toggleMfaForUser,
    registerStaff,
    updateStaff,
    deleteStaff,
    toggleStaffActive,
    currentUser,
    firebaseConnected,
    firebaseError,
    retryFirebaseConnection,
    seedFirebaseFromLocal,
    storageMode,
    setStorageMode,
    bgSyncEnabled,
    setBgSyncEnabled,
    bgSyncStatus,
    lastBgSyncTime,
    clearSampleStudents,
    currentDate,
    activeTerm,
    payments,
    adjustPayment,
    resetData,
    purgeDeactivatedStudents,
    promoteAllStudents,
    backups,
    createBackup,
    restoreBackup,
    deleteBackup,
    clearAllBackups,
    audioMuted,
    setAudioMuted,
    playFeedbackSound,
    whatsappLogs,
    fetchWhatsappLogs,
    terms,
    expenses,
    salaries,
    budgetTargets,
    systemSettings
  } = useApp();

  const [localTimeLeft, setLocalTimeLeft] = useState<number>(30 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) return 30 * 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<'students' | 'mfa' | 'gates' | 'database' | 'adjustments' | 'expenditures' | 'whatsapp' | 'settings' | 'idcards'>('students');
  const [studentFilter, setStudentFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLedgerSwitchModal, setShowLedgerSwitchModal] = useState(false);
  const [isSyncingTransition, setIsSyncingTransition] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');
  const [showRestoreConfirmId, setShowRestoreConfirmId] = useState<string | null>(null);
  const [showBackupPurgeConfirm, setShowBackupPurgeConfirm] = useState(false);
  const [selectedIdCardStudent, setSelectedIdCardStudent] = useState<Student | null>(null);
  const [historyModalStudent, setHistoryModalStudent] = useState<Student | null>(null);
  const [idCardQrDataUrl, setIdCardQrDataUrl] = useState<string>('');
  const [idCardTheme, setIdCardTheme] = useState<'dark' | 'light'>('dark');

  // Bulk print student ID cards state
  const [showBulkPrintModal, setShowBulkPrintModal] = useState(false);
  const [bulkPrintSelectedIds, setBulkPrintSelectedIds] = useState<string[]>([]);
  const [bulkPrintClassFilter, setBulkPrintClassFilter] = useState<string>('all');
  const [bulkPrintTheme, setBulkPrintTheme] = useState<'dark' | 'light'>('dark');
  const [bulkQrCodes, setBulkQrCodes] = useState<Record<string, string>>({});
  const [bulkPrintSearch, setBulkPrintSearch] = useState<string>('');
  const [bulkPreviewStudentId, setBulkPreviewStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedIdCardStudent) {
      // Encode both name and unique ID into the QR Code for robust check-in scanning
      const qrPayload = JSON.stringify({
        id: selectedIdCardStudent.id,
        name: selectedIdCardStudent.name,
        rollNumber: selectedIdCardStudent.rollNumber || ''
      });

      QRCode.toDataURL(qrPayload, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => {
          setIdCardQrDataUrl(url);
        })
        .catch(err => {
          console.error("Failed to generate QR Code offline using local qrcode library", err);
          setIdCardQrDataUrl('');
        });
    } else {
      setIdCardQrDataUrl('');
    }
  }, [selectedIdCardStudent]);
  
  const downloadDatabaseBackup = () => {
    try {
      const now = new Date();
      const backupFilename = `feetrack-backup-${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}.json`;
      
      const backupData = {
        app: "FEETRACK",
        description: "School Administration Financial Ledger Database Backup",
        backupType: "Manual JSON State Export",
        exportedAt: now.toISOString(),
        exportedBy: currentUser?.name || currentUser?.email || "System",
        ledgerMode: storageMode,
        activeTerm: activeTerm,
        currentDate: currentDate,
        systemSettings: systemSettings,
        data: {
          students,
          payments,
          users,
          terms,
          expenses,
          salaries,
          whatsappLogs,
          budgetTargets,
          backups
        }
      };

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = backupFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      showToast('Database backup downloaded successfully!');
    } catch (error) {
      console.error('Database backup failed:', error);
      showToast('Error generating database backup file.');
    }
  };

  // Compute filtered students for bulk print picker
  const bulkFilteredStudents = useMemo(() => {
    return students.filter(st => {
      if (!st.active) return false; // Only active students
      if (bulkPrintClassFilter !== 'all' && st.class !== bulkPrintClassFilter) return false;
      if (bulkPrintSearch) {
        const query = bulkPrintSearch.toLowerCase();
        const matchesName = st.name.toLowerCase().includes(query);
        const matchesId = st.id.toLowerCase().includes(query) || (st.rollNumber && st.rollNumber.toLowerCase().includes(query));
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [students, bulkPrintClassFilter, bulkPrintSearch]);

  // Set first filtered student as active preview if none or mismatch
  useEffect(() => {
    if (bulkFilteredStudents.length > 0 && (!bulkPreviewStudentId || !bulkFilteredStudents.some(s => s.id === bulkPreviewStudentId))) {
      setBulkPreviewStudentId(bulkFilteredStudents[0].id);
    } else if (bulkFilteredStudents.length === 0) {
      setBulkPreviewStudentId(null);
    }
  }, [bulkFilteredStudents, bulkPreviewStudentId]);

  const generateBulkQrCodes = async (studentsList: Student[]) => {
    const codes: Record<string, string> = { ...bulkQrCodes };
    let updated = false;
    for (const student of studentsList) {
      if (codes[student.id]) continue;
      const qrPayload = JSON.stringify({
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber || ''
      });
      try {
        const url = await QRCode.toDataURL(qrPayload, {
          margin: 1,
          width: 150,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        codes[student.id] = url;
        updated = true;
      } catch (err) {
        console.error("Failed to generate bulk QR code", err);
      }
    }
    if (updated) {
      setBulkQrCodes(codes);
    }
  };

  useEffect(() => {
    if (showBulkPrintModal && bulkFilteredStudents.length > 0) {
      generateBulkQrCodes(bulkFilteredStudents);
    }
  }, [showBulkPrintModal, bulkFilteredStudents]);

  const handleBulkPrint = async () => {
    const selectedStudents = students.filter(s => bulkPrintSelectedIds.includes(s.id));
    if (selectedStudents.length === 0) {
      alert("No students selected for printing.");
      return;
    }

    // Double check missing QR codes
    const missingStudents = selectedStudents.filter(s => !bulkQrCodes[s.id]);
    if (missingStudents.length > 0) {
      await generateBulkQrCodes(selectedStudents);
    }

    let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'idcard-print-iframe';
      printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) return;

    const isDarkTheme = bulkPrintTheme === 'dark';
    const cardBgFront = isDarkTheme 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const cardBgBack = isDarkTheme 
      ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
      : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

    const textMain = isDarkTheme ? 'color: #ffffff !important;' : 'color: #111111 !important;';
    const textMuted = isDarkTheme ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
    const borderCol = isDarkTheme ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
    const subBg = isDarkTheme ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

    const termName = activeTerm?.name || "Academic Term";
    const expiryDate = activeTerm?.endDate || "Term End";

    const cardsHtml = selectedStudents.map(student => {
      const qrUrl = bulkQrCodes[student.id] || '';
      const rollNumber = student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase();
      return `
      <div class="card-pair-wrapper">
        <div class="id-card">
          <div class="accent-top"></div>
          <div class="header">
            <div class="header-logo-container">
              <div class="logo-badge">SH</div>
              <div class="logo-text">SHCA-SAWLA</div>
            </div>
            <div>
              <span class="active-pass-badge">Active Pass</span>
            </div>
          </div>

          <div class="main-content">
            <div class="avatar-container">
              <div class="avatar">
                ${student.photoUrl 
                  ? `<img src="${student.photoUrl}" alt="${student.name}" />`
                  : `<div class="avatar-placeholder">${student.name.slice(0, 2).toUpperCase()}</div>`
                }
              </div>
              <span class="avatar-label">STUDENT INFO</span>
            </div>

            <div class="details">
              <div>
                <span class="field-label">Pupil Name</span>
                <span class="field-val-name">${student.name}</span>
              </div>
              <div class="meta-grid">
                <div>
                  <span class="field-label">Class</span>
                  <span class="field-val-meta">${student.class}</span>
                </div>
                <div>
                  <span class="field-label">Gender</span>
                  <span class="field-val-gender">${student.gender || '—'}</span>
                </div>
              </div>
              <div class="reg-id-box">
                REG-ID: <span class="reg-id-badge">${rollNumber}</span>
              </div>
            </div>

            <div class="qr-code-box">
              <img class="qr-code-img" src="${qrUrl}" />
              <span class="qr-label">GATE PASS</span>
            </div>
          </div>

          <div class="footer">
            <div class="footer-left">
              SYSTEM ACCREDITED <span class="footer-expiry">EXP: ${expiryDate}</span>
            </div>
            <div class="term-label">${termName.toUpperCase()}</div>
          </div>
        </div>

        <div class="id-card id-card-back">
          <div class="accent-top" style="background-color: ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;"></div>
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
                <span class="contact-val">${student.guardianPhone || 'NOT ENROLLED'}</span>
              </div>
              <div style="text-align: right;">
                <span class="contact-label">Authorized Registrar</span>
                <span class="contact-val" style="color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;">YAKUBU HAKEEM</span>
              </div>
            </div>

            <div class="status-banner-back">
              Validation Active &bull; Valid thru Term Closure (${expiryDate})
            </div>
          </div>

          <div class="barcode-area">
            <div class="barcode-lines">
              ${Array.from({ length: 32 }).map((_, idx) => `
                <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
              `).join('')}
            </div>
            <div class="barcode-label">
              *SHCA-${student.id.substring(0, 8).toUpperCase()}*
            </div>
          </div>
        </div>
      </div>
      `;
    }).join('');

    const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA Student ID Cards - Bulk Print</title>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&display=swap" rel="stylesheet">
    <style>
      @page {
        size: portrait;
        margin: 15mm 10mm;
      }
      html, body {
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: 'Inter', sans-serif;
      }
      .bulk-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
        align-items: center;
        justify-content: center;
      }
      .card-pair-wrapper {
        display: flex;
        flex-direction: row;
        gap: 12px;
        page-break-inside: avoid;
        break-inside: avoid;
        margin-bottom: 20px;
        border-bottom: 1px dashed #d4d4d8;
        padding-bottom: 20px;
      }
      .card-pair-wrapper:last-child {
        border-bottom: none;
      }
      .id-card {
        width: 324px;
        height: 204px;
        border-radius: 8px;
        border: 1.5px solid ${isDarkTheme ? '#3f3f46' : '#d4d4d8'} !important;
        box-sizing: border-box;
        overflow: hidden;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        ${cardBgFront}
      }
      .accent-top {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 4.5px;
        background-color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .header {
        padding: 8px 10px 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        background-color: #fbbf24 !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        ${textMain}
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
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
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
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        background-color: ${isDarkTheme ? '#000000' : '#e4e4e7'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding: 0.5px 2px;
        border-radius: 1.5px;
        font-size: 5px;
        margin-left: 2px;
        ${textMain}
      }
      .term-label {
        font-weight: 900;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
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
        border-top: 1px dashed ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#18181b' : '#e4e4e7'} !important;
        ${textMuted}
      }
      .barcode-area {
        background-color: #ffffff !important;
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
    <div class="bulk-container">
      ${cardsHtml}
    </div>

    <script>
      window.onload = function() {
        setTimeout(function() {
          window.focus();
          window.print();
        }, 500);
      };
    </script>
  </body>
</html>
    `;

    iframeDoc.open();
    iframeDoc.write(docContent);
    iframeDoc.close();
  };

  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionConfirmedText, setPromotionConfirmedText] = useState('');
  const [promotionTab, setPromotionTab] = useState<'bulk' | 'single'>('bulk');
  const [selectedPromoStudentId, setSelectedPromoStudentId] = useState<string>('');
  const [inLinePromoStudentId, setInLinePromoStudentId] = useState<string>('');
  const [inLineRepeatClass, setInLineRepeatClass] = useState<StudentClass>('B1');

  const getSafeOrigin = () => {
    try {
      if (window.location.origin && window.location.origin !== 'null') {
        return window.location.origin;
      }
      const parsed = new URL(window.location.href);
      if (parsed.origin && parsed.origin !== 'null') {
        return parsed.origin;
      }
    } catch (e) {
      console.warn("Unable to parse origin, falling back to empty string", e);
    }
    return '';
  };

  // Filter students based on state (active, inactive, or all) and search query
  const filteredStudentsForList = useMemo(() => {
    let list = students;
    if (studentFilter === 'active') {
      list = students.filter(st => st.active);
    } else if (studentFilter === 'inactive') {
      list = students.filter(st => !st.active);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      list = list.filter(st => 
        st.name.toLowerCase().includes(query) || 
        st.id.toLowerCase().includes(query)
      );
    }
    return list;
  }, [students, studentFilter, searchQuery]);

  // State for SMS Modal
  const [smsTarget, setSmsTarget] = useState<{
    student: Student;
    consecutiveDays: number;
    unpaidDates: string[];
  } | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [smsSuccess, setSmsSuccess] = useState(false);

  // Delete Confirmation Modal state
  const [deleteConf, setDeleteConf] = useState<{
    isOpen: boolean;
    type: 'student' | 'purge_inactive' | 'staff';
    targetId?: string;
    targetName: string;
    userInput: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    type: 'student',
    targetName: '',
    userInput: '',
    onConfirm: () => {}
  });

  // Find all school days up to currentDate
  const validSchoolDays = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays) return [];
    const holidays = activeTerm.publicHolidays || [];
    return [...activeTerm.schoolDays].filter(d => d <= currentDate && !holidays.includes(d)).sort();
  }, [activeTerm, currentDate]);

  // Dynamic Expiry Calculation based on activeTerm and currentDate
  const expiryInfo = useMemo(() => {
    if (!activeTerm || !activeTerm.schoolDays || activeTerm.schoolDays.length === 0) {
      // Fallback: 90 days from currentDate
      const d = currentDate ? new Date(currentDate) : new Date();
      d.setDate(d.getDate() + 90);
      const fallbackExpiry = d.toISOString().split('T')[0];
      return {
        expiryDate: fallbackExpiry,
        daysRemaining: 90,
        isNearingExpiry: false,
        isExpired: false,
        termName: '25/26 TERM'
      };
    }

    // Get sorted school days to locate first and last day
    const sortedDays = [...activeTerm.schoolDays].sort();
    const expiryDate = sortedDays[sortedDays.length - 1]; // Last school day of the active term
    
    // Parse to calculate remaining days
    const current = currentDate ? new Date(currentDate) : new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry.getTime() - current.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // "Nearing its expiration date" -> let's say less than or equal to 14 days remaining
    const isNearingExpiry = daysRemaining > 0 && daysRemaining <= 14;
    const isExpired = daysRemaining <= 0;

    return {
      expiryDate,
      daysRemaining,
      isNearingExpiry,
      isExpired,
      termName: activeTerm.name || '25/26 TERM'
    };
  }, [activeTerm, currentDate]);

  // Find students who have not paid for 3 or more consecutive school days
  const consecutiveUnpaidAlerts = useMemo(() => {
    if (validSchoolDays.length < 3) return [];
    
    // Pre-index payments for O(1) loop lookup
    const verifiedPaymentSet = new Set<string>();
    if (payments) {
      for (let i = 0; i < payments.length; i++) {
        const p = payments[i];
        if (p.verified) {
          verifiedPaymentSet.add(`${p.studentId}_${p.date}`);
        }
      }
    }
    
    return students.filter(s => s.active && s.paymentType !== 'Term').map(student => {
      // Find the consecutive unpaid tracks
      let consecutiveUnpaid: string[] = [];
      let maxConsecutiveUnpaid: string[] = [];
      
      for (const day of validSchoolDays) {
        const key = `${student.id}_${day}`;
        const hasPaid = verifiedPaymentSet.has(key);
        
        if (!hasPaid) {
          consecutiveUnpaid.push(day);
          if (consecutiveUnpaid.length > maxConsecutiveUnpaid.length) {
            maxConsecutiveUnpaid = [...consecutiveUnpaid];
          }
        } else {
          // Reset
          consecutiveUnpaid = [];
        }
      }
      
      return {
        student,
        consecutiveDays: maxConsecutiveUnpaid.length,
        unpaidDates: maxConsecutiveUnpaid
      };
    }).filter(item => item.consecutiveDays >= 3);
  }, [students, payments, validSchoolDays]);

  // Find all unassigned active pupils (Active students whose class has no active Teacher assigned)
  const unassignedPupils = useMemo(() => {
    if (!students || !users) return [];
    return students.filter(s => {
      if (!s.active) return false;
      const hasTeacher = users.some(
        u => u.role === 'Teacher' && 
        (u.assignedClass === s.class || u.assignedClasses?.includes(s.class)) && 
        u.active !== false
      );
      return !hasTeacher;
    });
  }, [students, users]);

  // Find all students with missing registration records today (Active students who have no payment logged for currentDate)
  const missingRegistrations = useMemo(() => {
    if (!students) return [];
    const paidStudentIds = new Set(
      (payments || []).filter(p => p.date === currentDate).map(p => p.studentId)
    );
    return students.filter(s => s.active && !paidStudentIds.has(s.id));
  }, [students, payments, currentDate]);

  const [showUnassignedDetails, setShowUnassignedDetails] = useState(false);
  const [showMissingDetails, setShowMissingDetails] = useState(false);

  // Add student form state
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState<StudentClass>('B1');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentPhoto, setNewStudentPhoto] = useState<string | null>(null);
  const [newStudentDiscount, setNewStudentDiscount] = useState<number>(0);
  const [newStudentGender, setNewStudentGender] = useState<'Male' | 'Female'>('Male');
  const [newStudentPaymentType, setNewStudentPaymentType] = useState<'Daily' | 'Term'>('Daily');
  const [newStudentTermFee, setNewStudentTermFee] = useState<number>(350);
  const [newStudentLegacyDebt, setNewStudentLegacyDebt] = useState<number>(0);
  const [editStudentObj, setEditStudentObj] = useState<Student | null>(null);

  // Arrears log collapse state
  const [isArrearsCollapsed, setIsArrearsCollapsed] = useState(true);

  // CSV Import states
  const [csvPreviewRows, setCsvPreviewRows] = useState<any[]>([]);
  const [csvParsingError, setCsvParsingError] = useState<string | null>(null);
  const [isCsvDragging, setIsCsvDragging] = useState(false);
  const [showCsvPreviewModal, setShowCsvPreviewModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [pastedRosterText, setPastedRosterText] = useState('');
  const [importSource, setImportSource] = useState<'upload' | 'paste'>('upload');

  const normalizeClassOrGrade = (val: string): StudentClass | null => {
    const clean = val.trim().toUpperCase().replace(/[\s-_]/g, '');
    
    if (clean === 'NURSERY') return 'Nursery';
    if (clean === 'KG1' || clean === 'KINDERGARTEN1' || clean === 'KINDERGARTENONE') return 'KG1';
    if (clean === 'KG2' || clean === 'KINDERGARTENTWO') return 'KG2';
    
    const matchB = clean.match(/^(?:B|BASIC|GRADE|PRIMARY|CLASS)(\d)$/);
    if (matchB) {
      const num = matchB[1];
      const bClass = `B${num}` as StudentClass;
      const validB = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'];
      if (validB.includes(bClass)) return bClass;
    }
    
    if (/^[1-9]$/.test(clean)) {
      return `B${clean}` as StudentClass;
    }
    
    const directClasses: Record<string, StudentClass> = {
      'NURSERY': 'Nursery',
      'KG1': 'KG1',
      'KG2': 'KG2',
      'B1': 'B1',
      'B2': 'B2',
      'B3': 'B3',
      'B4': 'B4',
      'B5': 'B5',
      'B6': 'B6',
      'B7': 'B7',
      'B8': 'B8',
      'B9': 'B9'
    };
    
    return directClasses[clean] || null;
  };

  const validateCsvRow = (row: any) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const name = row.name ? row.name.trim() : null;
    if (!name) {
      errors.push("Missing pupil full name");
    } else if (name.length < 3) {
      warnings.push("Pupil name is unusually short");
    }
    
    const rawClass = row.rawClass ? row.rawClass.trim() : null;
    let normalized: StudentClass | null = null;
    if (!rawClass) {
      errors.push("Missing class/grade field");
    } else {
      normalized = normalizeClassOrGrade(rawClass);
      if (!normalized) {
        errors.push(`Invalid class or grade '${rawClass}'. Hand-entered grades must be KG1, KG2, Nursery, B1-B9.`);
      } else if (normalized.toLowerCase() !== rawClass.toLowerCase()) {
        warnings.push(`Normalized '${rawClass}' to '${normalized}'`);
      }
    }
    
    let guardianPhone = row.guardianPhone ? row.guardianPhone.toString().trim().replace(/\D/g, '') : undefined;
    if (row.guardianPhone && !guardianPhone) {
      warnings.push("Guardian phone contains no digits; ignored");
      guardianPhone = undefined;
    } else if (guardianPhone && (guardianPhone.length < 9 || guardianPhone.length > 15)) {
      warnings.push(`Unusual phone number length (${guardianPhone.length} digits)`);
    }
    
    let discountVal = 0;
    if (row.discount !== undefined && row.discount !== '') {
      const dVal = parseFloat(row.discount);
      if (isNaN(dVal)) {
        warnings.push("Discount is not a number; reset to 0");
      } else if (dVal < 0 || dVal > 5) {
        warnings.push("Discount must be GHC 0 to 5; capped.");
        discountVal = Math.max(0, Math.min(5, dVal));
      } else {
        discountVal = dVal;
      }
    }

    let parsedGender: 'Male' | 'Female' | undefined = undefined;
    if (row.rawGender) {
      const cleanG = row.rawGender.trim().toLowerCase();
      if (cleanG.startsWith('m')) {
        parsedGender = 'Male';
      } else if (cleanG.startsWith('f')) {
        parsedGender = 'Female';
      } else {
        warnings.push(`Unrecognized gender '${row.rawGender}'; defaulting to Male`);
        parsedGender = 'Male';
      }
    }
    
    return {
      ...row,
      name: name || '',
      guardianPhone,
      discount: discountVal,
      normalizedClass: normalized,
      gender: parsedGender,
      isValid: errors.length === 0,
      errors,
      warnings
    };
  };

  const parseCSV = (text: string) => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = '';
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if ((char === ',' || char === '\t') && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++;
        }
        row.push(currentVal.trim());
        if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
          lines.push(row);
        }
        row = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    
    if (currentVal || row.length > 0) {
      row.push(currentVal.trim());
      if (row.length > 0 && !(row.length === 1 && row[0] === '')) {
        lines.push(row);
      }
    }
    
    return lines;
  };

  const handleCsvFileLoad = (file: File) => {
    setCsvParsingError(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          setCsvParsingError("The CSV file is empty or could not be read.");
          return;
        }
        
        const parsedLines = parseCSV(text);
        if (parsedLines.length < 2) {
          setCsvParsingError("The spreadsheet must contain at least a header row and one student data row.");
          return;
        }
        
        const headers = parsedLines[0].map(h => h.toLowerCase().trim());
        
        let nameIdx = headers.findIndex(h => h.includes('name'));
        let classIdx = headers.findIndex(h => h.includes('class') || h.includes('grade') || h.includes('level'));
        let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('guardian') || h.includes('mobile'));
        let discountIdx = headers.findIndex(h => h.includes('discount') || h.includes('fee') || h.includes('scholarship') || h.includes('rate'));
        let genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));
        
        if (nameIdx === -1) nameIdx = 0;
        if (classIdx === -1) classIdx = headers.length > 1 ? 1 : -1;
        if (phoneIdx === -1 && headers.length > 2) phoneIdx = 2;
        if (discountIdx === -1 && headers.length > 3) discountIdx = 3;
        if (genderIdx === -1 && headers.length > 4) genderIdx = 4;
        
        if (classIdx === -1 && nameIdx === -1) {
          setCsvParsingError("Could not detect Name and Class columns. Please make sure the header row contains columns labeled 'Name' and 'Class'.");
          return;
        }
        
        const rowsToValidate: any[] = [];
        for (let i = 1; i < parsedLines.length; i++) {
          const line = parsedLines[i];
          if (line.length === 0 || (line.length === 1 && line[0] === '')) {
            continue;
          }
          
          const rawName = nameIdx !== -1 && nameIdx < line.length ? line[nameIdx] : '';
          const rawClass = classIdx !== -1 && classIdx < line.length ? line[classIdx] : '';
          const rawPhone = phoneIdx !== -1 && phoneIdx < line.length ? line[phoneIdx] : '';
          const rawDiscount = discountIdx !== -1 && discountIdx < line.length ? line[discountIdx] : '';
          const rawGender = genderIdx !== -1 && genderIdx < line.length ? line[genderIdx] : '';
          
          const validatedRow = validateCsvRow({
            rowIndex: i + 1,
            name: rawName,
            rawClass: rawClass,
            guardianPhone: rawPhone,
            discount: rawDiscount,
            rawGender: rawGender
          });
          
          rowsToValidate.push(validatedRow);
        }
        
        if (rowsToValidate.length === 0) {
          setCsvParsingError("The CSV file contained no valid student rows under the header.");
          return;
        }
        
        setCsvPreviewRows(rowsToValidate);
        setShowCsvPreviewModal(true);
      } catch (err: any) {
        setCsvParsingError(`Error parsing CSV file: ${err.message || err}`);
      }
    };
    
    reader.readAsText(file);
  };

  const handleProcessPastedText = (rawText: string) => {
    setCsvParsingError(null);
    if (!rawText.trim()) {
      setCsvParsingError("The text input is empty. Please copy-paste some valid rows under a header.");
      return;
    }

    try {
      const parsedLines = parseCSV(rawText.trim());
      if (parsedLines.length < 2) {
        setCsvParsingError("The pasted dataset must contain at least a header row and one student data row.");
        return;
      }

      const headers = parsedLines[0].map(h => h.toLowerCase().trim());

      let nameIdx = headers.findIndex(h => h.includes('name'));
      let classIdx = headers.findIndex(h => h.includes('class') || h.includes('grade') || h.includes('level'));
      let phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('contact') || h.includes('guardian') || h.includes('mobile'));
      let discountIdx = headers.findIndex(h => h.includes('discount') || h.includes('fee') || h.includes('scholarship') || h.includes('rate'));
      let genderIdx = headers.findIndex(h => h.includes('gender') || h.includes('sex'));

      if (nameIdx === -1) nameIdx = 0;
      if (classIdx === -1) classIdx = headers.length > 1 ? 1 : -1;
      if (phoneIdx === -1 && headers.length > 2) phoneIdx = 2;
      if (discountIdx === -1 && headers.length > 3) discountIdx = 3;
      if (genderIdx === -1 && headers.length > 4) genderIdx = 4;

      if (classIdx === -1 && nameIdx === -1) {
        setCsvParsingError("Could not detect Name and Class columns in the pasted text headers. Ensure your top row includes columns like 'Name' and 'Class'.");
        return;
      }

      const rowsToValidate: any[] = [];
      for (let i = 1; i < parsedLines.length; i++) {
        const line = parsedLines[i];
        if (line.length === 0 || (line.length === 1 && line[0] === '')) {
          continue;
        }

        const rawName = nameIdx !== -1 && nameIdx < line.length ? line[nameIdx] : '';
        const rawClass = classIdx !== -1 && classIdx < line.length ? line[classIdx] : '';
        const rawPhone = phoneIdx !== -1 && phoneIdx < line.length ? line[phoneIdx] : '';
        const rawDiscount = discountIdx !== -1 && discountIdx < line.length ? line[discountIdx] : '';
        const rawGender = genderIdx !== -1 && genderIdx < line.length ? line[genderIdx] : '';

        const validatedRow = validateCsvRow({
          rowIndex: i + 1,
          name: rawName,
          rawClass: rawClass,
          guardianPhone: rawPhone,
          discount: rawDiscount,
          rawGender: rawGender
        });

        rowsToValidate.push(validatedRow);
      }

      if (rowsToValidate.length === 0) {
        setCsvParsingError("The pasted text contained no valid student rows under the header.");
        return;
      }

      setCsvPreviewRows(rowsToValidate);
      setShowCsvPreviewModal(true);
      setShowBulkImportModal(false); // Close setup wizard to switch to review mode
    } catch (err: any) {
      setCsvParsingError(`Error parsing pasted dataset: ${err.message || err}`);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent = "Full Name,Class,Guardian Phone,Discount\n" +
                       "Priscilla Owusu,B1,0541234567,2.50\n" +
                       "Kofi Mensah,KG1,0507654321,0.00\n" +
                       "Abena Boateng,Nursery,,5.00";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_roster_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const executeCsvImport = () => {
    const validRows = csvPreviewRows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    validRows.forEach(row => {
      addStudent(
        row.name.trim(),
        row.normalizedClass,
        row.guardianPhone?.trim() || undefined,
        undefined,
        row.discount,
        row.gender
      );
    });

    showToast(`Successfully enrolled ${validRows.length} students from CSV roster!`);
    setShowCsvPreviewModal(false);
    setCsvPreviewRows([]);
  };
  
  // Success indicator
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Add staff form state
  const [adminRegName, setAdminRegName] = useState('');
  const [adminRegEmail, setAdminRegEmail] = useState('');
  const [adminRegRole, setAdminRegRole] = useState<UserRole>('Teacher');
  const [adminRegClass, setAdminRegClass] = useState<StudentClass>('B1');
  const [adminRegClasses, setAdminRegClasses] = useState<StudentClass[]>(['B1']);
  const [adminRegMfa, setAdminRegMfa] = useState(false);
  const [adminRegPasswordEnabled, setAdminRegPasswordEnabled] = useState(false);
  const [adminRegPassword, setAdminRegPassword] = useState('');
  const [adminRegStipendSalary, setAdminRegStipendSalary] = useState('');
  const [adminRegMomoNumber, setAdminRegMomoNumber] = useState('');
  const [adminRegMomoName, setAdminRegMomoName] = useState('');
  const [editStaffObj, setEditStaffObj] = useState<any | null>(null);

  const handleAdminRegisterStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminRegName.trim() || !adminRegEmail.trim()) return;

    const result = registerStaff(
      adminRegName.trim(),
      adminRegEmail.trim(),
      adminRegRole,
      adminRegRole === 'Teacher' ? (adminRegClasses[0] || 'B1') : undefined,
      adminRegMfa,
      adminRegPasswordEnabled,
      adminRegPassword.trim(),
      adminRegRole === 'Teacher' ? adminRegClasses : undefined,
      adminRegStipendSalary ? parseFloat(adminRegStipendSalary) : undefined,
      adminRegMomoNumber.trim() || undefined,
      adminRegMomoName.trim() || undefined
    );

    if (result.success) {
      setAdminRegName('');
      setAdminRegEmail('');
      setAdminRegMfa(false);
      setAdminRegPasswordEnabled(false);
      setAdminRegPassword('');
      setAdminRegClasses(['B1']);
      setAdminRegStipendSalary('');
      setAdminRegMomoNumber('');
      setAdminRegMomoName('');
      showToast('Staff register updated with new entry.');
    } else {
      showToast(result.error || 'Check administrator database permissions & connection.');
    }
  };

  const handleAdminEditStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaffObj || !editStaffObj.name.trim() || !editStaffObj.email.trim()) return;

    const result = updateStaff(
      editStaffObj.id,
      editStaffObj.name.trim(),
      editStaffObj.email.trim(),
      editStaffObj.role,
      editStaffObj.assignedClass,
      !!editStaffObj.mfaEnabled,
      !!editStaffObj.passwordEnabled,
      editStaffObj.password || '',
      editStaffObj.role === 'Teacher' ? (editStaffObj.assignedClasses || (editStaffObj.assignedClass ? [editStaffObj.assignedClass] : [])) : undefined,
      editStaffObj.stipendSalary ? parseFloat(editStaffObj.stipendSalary.toString()) : undefined,
      editStaffObj.momoNumber?.trim() || undefined,
      editStaffObj.momoName?.trim() || undefined
    );

    if (result.success) {
      setEditStaffObj(null);
      showToast('Staff profile details updated successfully.');
    } else {
      showToast(result.error || 'Failed to update staff profile.');
    }
  };

  const handleAssignGateTeacher = (cls: StudentClass, teacherId: string) => {
    // 1. For all other teachers currently assigned to this classroom gate checkpoint, remove 'cls' from their assignments
    users.forEach(u => {
      if (u.role === 'Teacher' && u.id !== teacherId) {
        const hasSingle = u.assignedClass === cls;
        const hasMulti = u.assignedClasses?.includes(cls);
        if (hasSingle || hasMulti) {
          const currentMulti = u.assignedClasses || (u.assignedClass ? [u.assignedClass] : []);
          const newMulti = currentMulti.filter(c => c !== cls);
          const newSingle = newMulti[0];
          updateStaff(u.id, u.name, u.email, u.role, newSingle, !!u.mfaEnabled, !!u.passwordEnabled, u.password || '', newMulti);
        }
      }
    });

    // 2. Assign the newly selected teacher to this gate (and append to their existing assigned gates)
    if (teacherId) {
      const selectedT = users.find(u => u.id === teacherId);
      if (selectedT) {
        const currentMulti = selectedT.assignedClasses || (selectedT.assignedClass ? [selectedT.assignedClass] : []);
        const newMulti = currentMulti.includes(cls) ? currentMulti : [...currentMulti, cls];
        const newSingle = newMulti[0] || cls;
        const result = updateStaff(
          selectedT.id,
          selectedT.name,
          selectedT.email,
          selectedT.role,
          newSingle,
          !!selectedT.mfaEnabled,
          !!selectedT.passwordEnabled,
          selectedT.password || '',
          newMulti
        );
        if (result.success) {
          showToast(`Successfully assigned ${selectedT.name} to oversee ${cls} Gate Checkpoint.`);
        } else {
          showToast(result.error || `Failed to assign ${selectedT.name} to ${cls}.`);
        }
      }
    } else {
      showToast(`Gate Teacher unassigned and reset to system fallback for ${cls}.`);
    }
  };

  const classes: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          if (isEdit && editStudentObj) {
            setEditStudentObj({
              ...editStudentObj,
              photoUrl: reader.result
            });
          } else {
            setNewStudentPhoto(reader.result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    const isDuplicate = students.some(
      s => s.name.trim().toLowerCase() === newStudentName.trim().toLowerCase() && s.class === newStudentClass
    );

    if (isDuplicate) {
      playFeedbackSound('error');
      showToast(`Conflict error: Pupil "${newStudentName.trim()}" is already registered in class ${newStudentClass}!`);
      return;
    }

    addStudent(
      newStudentName.trim(), 
      newStudentClass, 
      newStudentPhone.trim() || undefined, 
      newStudentPhoto || undefined,
      newStudentDiscount,
      newStudentGender,
      newStudentPaymentType,
      newStudentTermFee,
      newStudentLegacyDebt
    );
    setNewStudentName('');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    setNewStudentGender('Male');
    setNewStudentPaymentType('Daily');
    setNewStudentTermFee(350);
    setNewStudentLegacyDebt(0);
    showToast('Student successfully registered to the daily ledger catalog.');
  };

  const handleResetAddStudentForm = () => {
    setNewStudentName('');
    setNewStudentClass('B1');
    setNewStudentPhone('');
    setNewStudentPhoto(null);
    setNewStudentDiscount(0);
    setNewStudentGender('Male');
    setNewStudentPaymentType('Daily');
    setNewStudentTermFee(350);
    setNewStudentLegacyDebt(0);
    showToast('Student registration form cleared.');
  };

  const handleStartEdit = (student: Student) => {
    setEditStudentObj({ ...student });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStudentObj || !editStudentObj.name.trim()) return;

    // Recalculate category based on selected class
    const category = getClassCategory(editStudentObj.class);
    updateStudent({
      ...editStudentObj,
      category
    });
    setEditStudentObj(null);
    showToast('Catalog record updated.');
  };

  const handleToggleStudentActive = (student: Student) => {
    updateStudent({
      ...student,
      active: !student.active
    });
    showToast(`Status toggled for ${student.name}.`);
  };

  const showToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Ledger Switch & Sync Safeguard Modal */}
      {showLedgerSwitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-xl w-full p-8 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative">
            <div className="flex items-center gap-3 border-b-2 border-neutral-850 pb-4">
              <ShieldAlert className="text-amber-500 animate-pulse" size={28} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">Ledger Precaution Guard</span>
                <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Unsynced Database Conflict Check</h3>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
              You are switching from <span className="text-amber-400">📁 Local Ledger Only</span> to <span className="text-emerald-400">☁️ Firestore Cloud Sync</span>.
            </p>

            <div className="p-4 bg-amber-950/20 border-2 border-amber-900/60 rounded text-xs text-neutral-300 leading-normal space-y-2">
              <p className="font-extrabold text-amber-500 text-xs">🚨 Unsynced Data Loss Protection!</p>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Any student records or fee payments you logged in Local mode are stored in your browser cache. Connecting directly to Firestore will trigger a remote fetch which would replace your local list!
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                id="modal-btn-sync"
                disabled={isSyncingTransition}
                onClick={async () => {
                  try {
                    setIsSyncingTransition(true);
                    showToast('Beginning relational seeding transition...');
                    const response = await seedFirebaseFromLocal();
                    showToast(response.message);
                    if (response.success) {
                      setStorageMode('cloud');
                    }
                  } catch (err) {
                    console.error('Transition seeding error:', err);
                    showToast('Sync failure. Checking database credentials...');
                  } finally {
                    setIsSyncingTransition(false);
                    setShowLedgerSwitchModal(false);
                  }
                }}
                className="w-full py-4 px-4 bg-emerald-500 hover:bg-emerald-450 disabled:bg-neutral-800 disabled:text-neutral-500 text-black font-black uppercase text-xs tracking-wider transition-all cursor-pointer font-mono flex items-center justify-between"
              >
                <span>🚀 Option A: Publish & Sync Local to Cloud</span>
                <span className="text-[9px] bg-black/15 text-black px-2.5 py-0.5 rounded font-bold font-sans">SAFE & MERGE</span>
              </button>

              <button
                type="button"
                id="modal-btn-overwrite"
                disabled={isSyncingTransition}
                onClick={() => {
                  setStorageMode('cloud');
                  showToast('Cloud Sync active. Overwritten with remote collection.');
                  setShowLedgerSwitchModal(false);
                }}
                className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono text-left"
              >
                📥 Option B: Download Cloud (Discard Unsynced Local)
              </button>

              <button
                type="button"
                id="modal-btn-cancel"
                disabled={isSyncingTransition}
                onClick={() => setShowLedgerSwitchModal(false)}
                className="w-full py-3.5 px-4 bg-transparent hover:bg-neutral-900 border border-neutral-800 text-neutral-500 hover:text-neutral-300 text-xs uppercase font-bold tracking-wider transition-colors cursor-pointer font-mono text-left"
              >
                ✕ Cancel and Stay in Local Ledger Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Safeguard Modal */}
      {deleteConf.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-red-600 max-w-md w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(220,38,38,0.25)] relative">
            <div className="flex items-center gap-3 border-b-2 border-neutral-850 pb-4">
              <Trash2 className="text-red-500 animate-pulse" size={28} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-red-500 uppercase font-black">CRITICAL DELETION GUARD</span>
                <h3 className="text-base font-black uppercase tracking-tight text-white font-mono">Confirm Radical Purge Action</h3>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-neutral-300 leading-relaxed font-semibold">
                You are about to permanently purge the following entry from the records. Once done, this action <strong className="text-red-500">CANNOT BE UNDONE</strong> and will sever all database linkages:
              </p>
              
              <div className="p-3 bg-red-950/20 border-2 border-red-900/60 rounded text-center">
                <p className="text-[10px] font-mono uppercase text-neutral-400">Target Record Name</p>
                <p className="text-sm font-black font-mono text-white mt-1 uppercase tracking-wider">
                  {deleteConf.targetName}
                </p>
                <p className="text-[9px] font-mono text-red-400 mt-1 uppercase tracking-widest font-bold">
                  {deleteConf.type === 'student' ? 'Student Record' : deleteConf.type === 'purge_inactive' ? 'Deactivated Pupils Purge' : 'Staff/Teacher Account'}
                </p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  Type <span className="text-red-500 font-extrabold bg-red-950/40 px-1.5 border border-red-900/40 font-bold font-mono">DELETE</span> to authorize:
                </label>
                <input
                  type="text"
                  value={deleteConf.userInput}
                  placeholder="Type DELETE here..."
                  onChange={(e) => setDeleteConf(prev => ({ ...prev, userInput: e.target.value }))}
                  className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-red-600 py-2.5 px-3.5 text-xs text-white font-mono font-bold focus:outline-none uppercase tracking-widest"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConf.userInput.trim().toUpperCase() === 'DELETE') {
                      deleteConf.onConfirm();
                      setDeleteConf(prev => ({ ...prev, isOpen: false }));
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConf({ isOpen: false, type: 'student', targetName: '', userInput: '', onConfirm: () => {} })}
                className="w-1/3 py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono"
              >
                Cancel
              </button>
              
              <button
                type="button"
                disabled={deleteConf.userInput.trim().toUpperCase() !== 'DELETE'}
                onClick={() => {
                  deleteConf.onConfirm();
                  setDeleteConf({ isOpen: false, type: 'student', targetName: '', userInput: '', onConfirm: () => {} });
                }}
                className={`w-2/3 py-3 px-4 font-black uppercase text-xs tracking-wider font-mono transition-all cursor-pointer ${
                  deleteConf.userInput.trim().toUpperCase() === 'DELETE'
                    ? 'bg-red-600 hover:bg-red-500 text-white hover:scale-[1.02] active:scale-[0.98]'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-650 cursor-not-allowed opacity-50'
                }`}
              >
                Permanent Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert Header */}
      {successMsg && (
        <div className="bg-amber-400 text-black border-4 border-neutral-800 p-4 text-xs font-black flex items-center justify-between shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] font-mono uppercase tracking-widest">
          <div className="flex items-center gap-2">
            <Check size={16} className="bg-black/10 p-0.5" />
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {/* BULK DATA IMPORT WIZARD MODAL */}
      {showBulkImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-3xl w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative max-h-[95vh] flex flex-col justify-between overflow-y-auto">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <Database className="text-amber-500 animate-pulse" size={28} />
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">ADMINISTRATOR TOOLKIT</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Bulk Pupil Import Wizard</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setPastedRosterText('');
                  setCsvParsingError(null);
                }}
                className="text-neutral-500 hover:text-white transition-colors p-1 cursor-pointer bg-transparent border-0"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step 1: Standardized Template Guide */}
            <div className="bg-neutral-900 border-2 border-neutral-800 p-4 space-y-2 shrink-0">
              <h4 className="text-[10px] font-mono font-black text-amber-400 uppercase tracking-wider flex items-center gap-2">
                📋 Required Column Layout & CSV Template Standard
              </h4>
              <p className="text-[11px] text-neutral-350 leading-relaxed font-semibold">
                To guarantee correct automatic assignment, your spreadsheet or pasted cells must respect this header line format and these exact column names:
              </p>
              <div className="overflow-x-auto text-[10px] font-mono">
                <table className="w-full text-center border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 text-neutral-450 border border-neutral-800 uppercase text-[9px]">
                      <th className="p-2 border-r border-neutral-800">Full Name (Required)</th>
                      <th className="p-2 border-r border-neutral-800">Class (Required)</th>
                      <th className="p-2 border-r border-neutral-800">Guardian Phone (Optional)</th>
                      <th className="p-2">Discount (Optional)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="bg-neutral-950/40 text-neutral-300 border border-neutral-800">
                      <td className="p-2 border-r border-neutral-805">Priscilla Owusu</td>
                      <td className="p-2 border-r border-neutral-805">B1</td>
                      <td className="p-2 border-r border-neutral-805">0541234567</td>
                      <td className="p-2 font-bold text-amber-400">2.50</td>
                    </tr>
                    <tr className="bg-neutral-950/40 text-neutral-300 border border-neutral-800">
                      <td className="p-2 border-r border-neutral-805">Kofi Mensah</td>
                      <td className="p-2 border-r border-neutral-805">KG1</td>
                      <td className="p-2 border-r border-neutral-805">0507654321</td>
                      <td className="p-2 font-bold text-amber-400">0.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="bg-neutral-950 hover:bg-neutral-800 text-amber-500 hover:text-amber-400 border border-neutral-800 hover:border-amber-500/45 px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                >
                  📥 Download Sample Template .CSV
                </button>
              </div>
            </div>

            {/* Input Selection Tabs */}
            <div className="space-y-4 flex-1 flex flex-col min-h-0">
              <div className="flex border-b-2 border-neutral-850 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('upload');
                    setCsvParsingError(null);
                  }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] bg-transparent ${
                    importSource === 'upload'
                      ? 'border-amber-400 text-amber-400 bg-neutral-900/50'
                      : 'border-transparent text-neutral-555 hover:text-neutral-300'
                  }`}
                >
                  📁 Option A: Roster File Upload
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportSource('paste');
                    setCsvParsingError(null);
                  }}
                  className={`px-4 py-2.5 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer border-b-2 -mb-[2px] bg-transparent ${
                    importSource === 'paste'
                      ? 'border-amber-400 text-amber-400 bg-neutral-900/50'
                      : 'border-transparent text-neutral-555 hover:text-neutral-300'
                  }`}
                >
                  📝 Option B: Copy-Paste Cells
                </button>
              </div>

              {/* Tab Content Dynamic View */}
              <div className="flex-1 min-h-[160px] flex flex-col justify-center">
                {importSource === 'upload' ? (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsCsvDragging(true);
                    }}
                    onDragLeave={() => setIsCsvDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsCsvDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        handleCsvFileLoad(file);
                        setShowBulkImportModal(false); // Switch focus to the preview table
                      }
                    }}
                    className={`border-2 border-dashed p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center flex-1 min-h-[150px] ${
                      isCsvDragging
                        ? "border-amber-400 bg-amber-955/20"
                        : "border-neutral-800 hover:border-neutral-700 bg-neutral-950/20"
                    }`}
                    onClick={() => document.getElementById('modal-csv-file-input')?.click()}
                  >
                    <Upload size={28} className={isCsvDragging ? "text-amber-400 mb-2 animate-bounce" : "text-neutral-500 mb-2"} />
                    <span className="text-xs font-mono font-black text-neutral-250 uppercase tracking-wider block">
                      Drag & Drop Standardized CSV File
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500 uppercase mt-1 block">
                      or click to select file from your machine
                    </span>
                    <input
                      id="modal-csv-file-input"
                      type="file"
                      accept=".csv"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleCsvFileLoad(file);
                          setShowBulkImportModal(false); // Switch focus to the preview table
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 flex flex-col">
                    <p className="text-[10px] text-neutral-405 uppercase font-mono font-bold leading-relaxed">
                      Copy whole rows from Excel or Google Sheets (with the header row included) and paste them directly in the zone below:
                    </p>
                    <textarea
                      value={pastedRosterText}
                      onChange={(e) => setPastedRosterText(e.target.value)}
                      placeholder="Full Name&#9;Class&#9;Guardian Phone&#9;Discount&#10;Priscilla Owusu&#9;B1&#9;0541234567&#9;2.50&#10;Kofi Mensah&#9;KG1&#9;0507654321&#9;0.00"
                      className="w-full flex-1 min-h-[160px] bg-neutral-950 border-2 border-neutral-800 font-mono text-xs p-4 focus:outline-none focus:border-amber-400 text-white placeholder:text-neutral-700"
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleProcessPastedText(pastedRosterText)}
                        className="bg-amber-400 hover:bg-amber-300 text-black px-4 py-2.5 font-mono text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 border-0"
                        disabled={!pastedRosterText.trim()}
                      >
                        🚀 Parse & Validate Copied Dataset
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Parsing Errors within the Setup Wizard */}
              {csvParsingError && (
                <div className="bg-red-955 border-2 border-red-900/60 p-3 text-left shrink-0">
                  <p className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest mb-1">
                    ⚠️ Import Parsing Conflict:
                  </p>
                  <p className="text-[10px] font-mono font-bold text-neutral-350 leading-snug">
                    {csvParsingError}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="border-t-2 border-neutral-850 pt-4 flex gap-3 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setPastedRosterText('');
                  setCsvParsingError(null);
                }}
                className="w-full py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono text-center"
              >
                Close Import Toolkit
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CSV Spreadsheet Bulk Import Review Modal */}
      {showCsvPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in animate-duration-200">
          <div className="bg-neutral-950 border-4 border-amber-500 max-w-4xl w-full p-6 space-y-6 shadow-[10px_10px_0px_0px_rgba(245,158,11,0.25)] relative max-h-[90vh] flex flex-col justify-between">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-4">
              <div className="flex items-center gap-3">
                <Database className="text-amber-500 animate-pulse" size={28} />
                <div>
                  <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase font-black">BULK SPREADSHEET VALIDATION ENGINE</span>
                  <h3 className="text-lg font-black uppercase tracking-tight text-white font-mono">Verify Enrollee Ledger Dataset</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCsvPreviewModal(false);
                  setCsvPreviewRows([]);
                }}
                className="text-neutral-550 hover:text-white transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            {/* Stats Indicators */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-neutral-400 uppercase font-bold">Total Rows</span>
                <span className="text-lg font-mono font-black text-white">{csvPreviewRows.length}</span>
              </div>
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-emerald-500 uppercase font-extrabold">Ready to Enroll</span>
                <span className="text-lg font-mono font-black text-emerald-400">
                  {csvPreviewRows.filter(r => r.isValid).length}
                </span>
              </div>
              <div className="bg-neutral-900 border-2 border-neutral-800 p-3 text-center">
                <span className="block text-[9px] font-mono text-red-500 uppercase font-extrabold">Validation Errors</span>
                <span className="text-lg font-mono font-black text-red-400">
                  {csvPreviewRows.filter(r => !r.isValid).length}
                </span>
              </div>
            </div>

            {/* List Row Preview */}
            <div className="flex-1 overflow-y-auto border-2 border-neutral-800 bg-neutral-950/40 p-1 font-mono text-xs text-white max-h-[40vh]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-neutral-900 text-neutral-450 text-[9px] uppercase tracking-wider sticky top-0">
                    <th className="p-3 border-b border-neutral-850">Row</th>
                    <th className="p-3 border-b border-neutral-850">Pupil Full Name</th>
                    <th className="p-3 border-b border-neutral-850">Hand-entered Class</th>
                    <th className="p-3 border-b border-neutral-850">Verified Grade</th>
                    <th className="p-3 border-b border-neutral-850">Contact / Phone</th>
                    <th className="p-3 border-b border-neutral-850">Discount</th>
                    <th className="p-3 border-b border-neutral-850">Validation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {csvPreviewRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/40 text-[11px]">
                      <td className="p-3 font-semibold text-neutral-500">#{row.rowIndex}</td>
                      <td className="p-3 font-black uppercase text-white">{row.name || <span className="text-red-500 italic">empty</span>}</td>
                      <td className="p-3 text-neutral-400">{row.rawClass || <span className="text-red-500 italic">empty</span>}</td>
                      <td className="p-3">
                        {row.normalizedClass ? (
                          <span className="px-1.5 py-0.5 rounded-sm bg-amber-400/10 text-amber-400 font-extrabold border border-amber-500/25">
                            {row.normalizedClass}
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-sm bg-red-955 text-red-400 font-extrabold border border-red-900/40 uppercase text-[9px]">
                            UNRESOLVED
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-neutral-405">{row.guardianPhone || <span className="text-neutral-600 font-mono">—</span>}</td>
                      <td className="p-3 text-amber-400 font-black">GHC {row.discount.toFixed(2)}</td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-400 bg-emerald-950/20 px-1.5 py-0.5 rounded border border-emerald-990 uppercase">
                              <Check size={10} /> Valid Roster Entry
                            </span>
                          ) : (
                            <div className="space-y-0.5">
                              {row.errors.map((err: string, i: number) => (
                                <span key={i} className="block text-[8px] font-black text-rose-450 bg-red-955 px-1.5 py-0.5 rounded border border-red-900/30 uppercase leading-normal">
                                  🚫 {err}
                                </span>
                              ))}
                            </div>
                          )}
                          {row.warnings.map((warn: string, i: number) => (
                            <span key={i} className="block text-[8px] font-medium text-amber-400 bg-amber-955 px-1.5 py-0.5 rounded border border-amber-900/30 normal-case leading-normal">
                              ⚠️ {warn}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="border-t-2 border-neutral-850 pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowCsvPreviewModal(false);
                  setCsvPreviewRows([]);
                }}
                className="w-1/3 py-3 px-4 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-white font-bold uppercase text-xs tracking-wider transition-colors cursor-pointer font-mono"
              >
                Discard Dataset
              </button>
              
              <button
                type="button"
                disabled={csvPreviewRows.filter(r => r.isValid).length === 0}
                onClick={executeCsvImport}
                className={`w-2/3 py-3 px-4 font-black uppercase text-xs tracking-wider font-mono transition-all flex items-center justify-between cursor-pointer ${
                  csvPreviewRows.some(r => r.isValid)
                    ? 'bg-amber-400 hover:bg-amber-350 text-black hover:scale-[1.01] active:scale-[0.99]'
                    : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700'
                }`}
              >
                <span>🚀 Confirm Bulk Enrollment</span>
                <span className="bg-black/10 px-2 py-0.5 rounded text-[10px]">
                  Import {csvPreviewRows.filter(r => r.isValid).length} Students
                </span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin header with controls */}
      <div className="bg-neutral-900 border-4 border-neutral-800 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-2xl font-black uppercase italic tracking-tight text-white leading-none">Authorized Administration Core</h2>
          <p className="text-xs text-neutral-400 mt-2 font-bold max-w-xl">
            Configure pupil registers, categories, and secure Multi-Factor authorization profiles. Action triggers require verified session levels.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-neutral-950 border-2 border-neutral-850 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'students'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Pupil Registry
          </button>
          <button
            onClick={() => setActiveTab('mfa')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all ${
              activeTab === 'mfa'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            Staff Registry & Security
          </button>
          <button
            onClick={() => setActiveTab('gates')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'gates'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <UserCheck size={13} />
            Gate Assignments
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'database'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Database size={13} />
            Database Connect
          </button>
          <button
            onClick={() => setActiveTab('expenditures')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'expenditures'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <DollarSign size={13} />
            Expenditures
          </button>
          <button
            onClick={() => setActiveTab('adjustments')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'adjustments'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <RefreshCw size={13} />
            Adjust Payments
          </button>
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'whatsapp'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <MessageSquare size={13} />
            WhatsApp Logs
          </button>
          <button
            id="admin-tab-idcards-btn"
            onClick={() => setActiveTab('idcards')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'idcards'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Contact size={13} />
            Generate ID Cards
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 md:flex-none px-5 py-2.5 font-black text-[11px] uppercase tracking-widest transition-all gap-2 flex items-center justify-center ${
              activeTab === 'settings'
                ? 'bg-amber-400 text-black'
                : 'text-neutral-500 hover:text-white'
            }`}
          >
            <Sliders size={13} />
            System Settings
          </button>
        </div>
      </div>

      {activeTab === 'students' ? (
        <div className="space-y-6">
          {/* Daily Administration Audit & Alerts Board */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-neutral-850 pb-3">
              <div className="flex items-center gap-3">
                <ShieldAlert className={(unassignedPupils.length > 0 || missingRegistrations.length > 0) ? "text-red-500 animate-pulse" : "text-emerald-500"} size={22} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest font-mono">
                    Administrative Daily Day-Audit Desk
                  </h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                    Live system check for <span className="text-amber-400">{currentDate}</span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-mono font-black uppercase px-2.5 py-1 border ${
                  (unassignedPupils.length > 0 || missingRegistrations.length > 0)
                    ? 'bg-red-950/40 border-red-900 text-red-500 animate-pulse'
                    : 'bg-emerald-950/40 border-emerald-900 text-emerald-500'
                }`}>
                  {(unassignedPupils.length > 0 || missingRegistrations.length > 0) ? 'Action Required' : 'Cleared & Compliant'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card 1: Missing Daily Registrations */}
              <div className={`p-4 border-2 ${missingRegistrations.length > 0 ? "bg-red-950/10 border-red-900/60" : "bg-neutral-950 border-neutral-850"} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-500 font-mono font-black uppercase tracking-widest block">Daily Check-In Status</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${missingRegistrations.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                      {missingRegistrations.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">Unregistered today</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                    {missingRegistrations.length > 0 
                      ? "Pupils have cleared past physical checkpoints but are missing today's standard GHC 5.00 entry log."
                      : "All active students have completed entry check-ins for the current school day."}
                  </p>
                </div>

                {missingRegistrations.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setShowMissingDetails(!showMissingDetails)}
                      className="text-[10px] font-mono font-black uppercase text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {showMissingDetails ? 'Hide Missing Pupils list [-]' : 'View Missing Pupils list [+]'}
                    </button>
                    
                    {showMissingDetails && (
                      <div className="mt-3 bg-neutral-950/80 border border-neutral-800 p-2.5 max-h-[160px] overflow-y-auto divide-y divide-neutral-850 space-y-2">
                        {missingRegistrations.map(student => (
                          <div key={student.id} className="flex justify-between items-center text-[10px] pt-2 first:pt-0">
                            <div>
                              <span className="font-extrabold text-white uppercase">{student.name}</span>
                              <span className="text-neutral-500 ml-1.5 font-mono">[{student.class}]</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                // Calls context update to record immediate check-in
                                useApp().recordPayment(student.id, true);
                              }}
                              className="px-2 py-0.5 bg-emerald-950/40 hover:bg-emerald-500 hover:text-black border border-emerald-990 text-emerald-400 font-mono text-[9px] font-black uppercase cursor-pointer transition-all"
                            >
                              Check-In
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card 2: Unassigned Pupils */}
              <div className={`p-4 border-2 ${unassignedPupils.length > 0 ? "bg-red-950/10 border-red-900/60" : "bg-neutral-950 border-neutral-850"} flex flex-col justify-between space-y-4`}>
                <div className="space-y-1">
                  <span className="text-[9px] text-neutral-500 font-mono font-black uppercase tracking-widest block">Class Gate Placement</span>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-black font-mono ${unassignedPupils.length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                      {unassignedPupils.length}
                    </span>
                    <span className="text-xs text-neutral-400 font-bold">Unassigned pupils</span>
                  </div>
                  <p className="text-[10px] text-neutral-400 leading-relaxed font-semibold">
                    {unassignedPupils.length > 0 
                      ? "Pupils are enrolled in classes that do not have an active gate teacher assigned to oversee entry logs."
                      : "Every active student belongs to a class with an active assigned gate teacher."}
                  </p>
                </div>

                {unassignedPupils.length > 0 && (
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setShowUnassignedDetails(!showUnassignedDetails)}
                      className="text-[10px] font-mono font-black uppercase text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      {showUnassignedDetails ? 'Hide Unassigned Classes [-]' : 'View Unassigned Classes [+]'}
                    </button>
                    
                    {showUnassignedDetails && (
                      <div className="mt-1 bg-neutral-950/80 border border-neutral-800 p-2.5 max-h-[160px] overflow-y-auto divide-y divide-neutral-850 space-y-2">
                        {Array.from(new Set(unassignedPupils.map(p => p.class))).map(cls => {
                          const clsPupils = unassignedPupils.filter(p => p.class === cls);
                          return (
                            <div key={cls} className="flex justify-between items-center text-[10px] pt-2 first:pt-0">
                              <div>
                                <span className="font-extrabold text-amber-400 font-mono">{cls}: </span>
                                <span className="text-neutral-300 font-semibold">{clsPupils.length} pupil(s)</span>
                              </div>
                              <span className="text-[9px] font-mono text-red-400 uppercase font-bold">No checkpoint teacher</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setActiveTab('gates')}
                      className="w-full text-center py-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-300 font-mono text-[9px] font-black uppercase tracking-wider border border-neutral-800 transition-colors cursor-pointer"
                    >
                      Go to Gate Assignments &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Automated Daily Alerts for 3+ Unpaid Days */}
          {consecutiveUnpaidAlerts.length > 0 ? (
            <div className="bg-neutral-900 border-4 border-red-500 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-neutral-800 pb-3">
                <div className="flex items-center gap-3">
                  <BellRing className="text-red-500 animate-pulse" size={20} />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-red-500 font-mono">
                      Urgent Attendance & Arrears Alerts ({consecutiveUnpaidAlerts.length} Pupils)
                    </h3>
                    <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                      Critical Warning: Pupils with 3+ consecutive unpaid standard school days detected
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsArrearsCollapsed(!isArrearsCollapsed)}
                  className="bg-neutral-950 hover:bg-neutral-800 text-amber-400 border-2 border-neutral-850 px-4 py-2.5 text-xs font-mono font-black uppercase tracking-widest cursor-pointer select-none transition-all duration-150 shrink-0 self-start sm:self-center"
                >
                  {isArrearsCollapsed ? '📂 EXPAND LOG ▾' : '📁 FOLD LOG ▴'}
                </button>
              </div>
              
              {!isArrearsCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {consecutiveUnpaidAlerts.map(({ student, consecutiveDays, unpaidDates }) => (
                    <div key={student.id} className="bg-neutral-950 border-2 border-neutral-850 p-4 flex flex-col justify-between gap-3 hover:border-red-500/40 transition-all">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-black text-white uppercase tracking-tight">{student.name}</span>
                          <span className="text-[9px] font-black text-red-500 bg-red-950/40 border border-red-900/60 px-2 py-0.5 font-mono uppercase tracking-widest shrink-0">
                            {consecutiveDays} days due
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 font-mono text-[9px] text-neutral-450 font-bold uppercase">
                          <div>Class Group: <span className="text-amber-400 font-extrabold">{student.class}</span></div>
                          <div>Guardian Contact: <span className="text-neutral-200">{student.guardianPhone || 'No SMS Verified'}</span></div>
                          <div className="text-red-400/80 leading-normal mt-1.5 normal-case font-medium">
                            Missed: {unpaidDates.join(', ')}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSmsTarget({ student, consecutiveDays, unpaidDates });
                          setSmsSuccess(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-950/20 hover:bg-red-600 border-2 border-red-900 hover:border-red-500 hover:text-white hover:scale-[1.01] active:scale-[0.99] transition-all text-red-400 text-[10px] font-black uppercase tracking-widest cursor-pointer font-mono"
                      >
                        <BellRing size={12} className="stroke-[2.5]" />
                        <span>Send Urgent SMS</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-neutral-900 border-4 border-neutral-800 p-5 flex items-center gap-3">
              <Check className="text-emerald-500 bg-emerald-950/20 p-0.5 border border-emerald-800" size={18} />
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-500 uppercase font-black">All Pupil Catalog Secure</span>
                <p className="text-[9px] text-neutral-400 uppercase font-mono font-bold tracking-wider mt-0.5">
                  No gate clearance arrears of 3+ consecutive days detected for active term pupils.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Column 1: Forms & CSV Imports */}
          <div className="space-y-6 col-span-1">
            {/* Add / Edit student card */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-6">
            {!editStudentObj ? (
              <form onSubmit={handleAddStudentSubmit} className="space-y-5">
                <div className="flex items-center justify-between gap-2 pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <UserPlus size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Register Student</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBulkImportModal(true)}
                    className="bg-neutral-800 hover:bg-amber-400 hover:text-black border border-neutral-700 hover:border-amber-400 px-2.5 py-1 text-[8px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer border-0"
                    id="btn-trigger-bulk-import"
                    title="Bulk import pupils from spreadsheet template or copy-pasted block"
                  >
                    🚀 Bulk Import
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Full Name (English Ledger)
                    </label>
                    <input
                      type="text"
                      required
                      value={newStudentName}
                      onChange={(e) => setNewStudentName(e.target.value)}
                      placeholder="e.g. Priscilla Owusu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Target Class
                      </label>
                      <select
                        value={newStudentClass}
                        onChange={(e) => setNewStudentClass(e.target.value as StudentClass)}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                      >
                        {classes.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Calculated Category
                      </label>
                      <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-amber-400 font-black font-mono uppercase tracking-wider">
                        {getClassCategory(newStudentClass)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Gender
                    </label>
                    <div className="flex gap-3">
                      {(['Male', 'Female'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setNewStudentGender(g)}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            newStudentGender === g
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {g === 'Male' ? '👦 Male' : '👧 Female'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Guardian Phone Number
                    </label>
                    <input
                      type="text"
                      value={newStudentPhone}
                      onChange={(e) => setNewStudentPhone(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 0541234567"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Payment Scheme
                    </label>
                    <div className="flex gap-3 text-center">
                      {(['Daily', 'Term'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setNewStudentPaymentType(t)}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            newStudentPaymentType === t
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {t === 'Daily' ? '📅 Daily Payer' : '🎓 Term Payer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {newStudentPaymentType === 'Term' ? (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Flat Term Fee Amount (GHC)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newStudentTermFee}
                        onChange={(e) => setNewStudentTermFee(Math.max(1, parseFloat(e.target.value) || 0))}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                        placeholder="e.g. 350.00"
                      />
                      <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                        Paying a customized static flat charge of <strong className="text-amber-500">GHC {newStudentTermFee.toFixed(2)}</strong> for the entire term (exempt from daily debt).
                      </p>

                      <div className="mt-4">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Pre-adoption Outstanding Legacy Debt (GHC) - Optional
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={newStudentLegacyDebt || ''}
                          onChange={(e) => setNewStudentLegacyDebt(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                          placeholder="e.g. 150.00"
                        />
                        <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                          Manually enter any pre-adoption outstanding debt (e.g. <strong className="text-red-400">GHC {(newStudentLegacyDebt || 0).toFixed(2)}</strong>) to be integrated into this pupil's ledger and outstanding balance.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Daily Check-In Discount (GHC)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={newStudentDiscount}
                          onChange={(e) => setNewStudentDiscount(Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)))}
                          className="w-1/2 bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                        <div className="flex-1 flex gap-1 font-mono">
                          {[0, 2.50, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setNewStudentDiscount(val)}
                              className={`flex-1 text-[9px] font-mono font-black border transition-all ${
                                newStudentDiscount === val
                                  ? 'bg-amber-400 text-black border-amber-400'
                                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white hover:bg-neutral-850'
                              }`}
                            >
                              {val === 0 ? 'None' : val === 5 ? '100% Free' : `GHC ${val.toFixed(2)}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono text-neutral-500 mt-1 uppercase tracking-wide">
                        Standard fee is GHC 5.00. Effective daily rate: <strong className="text-amber-500">GHC {(5.00 - newStudentDiscount).toFixed(2)}</strong>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Student Passport Photo / Picture
                    </label>
                    {newStudentPhoto ? (
                      <div className="relative w-full aspect-video sm:aspect-[4/3] bg-neutral-950 border-2 border-dashed border-amber-400 p-4 flex flex-col items-center justify-center gap-3">
                        <img 
                          src={newStudentPhoto} 
                          alt="Student passport preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setNewStudentPhoto(null)}
                          className="text-[10px] font-mono font-black text-red-500 hover:text-red-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full min-h-[96px] bg-neutral-950 border-2 border-dashed border-neutral-800 hover:border-neutral-600 p-4 cursor-pointer transition-all">
                        <Upload size={18} className="text-neutral-500 mb-1.5" />
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">Upload Photo/Passport</span>
                        <span className="text-[8px] font-mono text-neutral-600 uppercase mt-0.5">JPEG / PNG up to 2MB</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handlePhotoUpload(e, false)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    id="btn-reset-new-student"
                    type="button"
                    onClick={handleResetAddStudentForm}
                    className="w-5/12 text-[10px] font-black uppercase tracking-widest bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-red-400 hover:text-red-300 py-3.5 transition-all text-center cursor-pointer font-mono"
                  >
                    Reset
                  </button>
                  <button
                    id="btn-submit-new-student"
                    type="submit"
                    className="w-7/12 text-[10px] font-black uppercase tracking-widest bg-white hover:bg-amber-400 text-black py-3.5 transition-all text-center cursor-pointer font-sans"
                  >
                    Confirm Enrollment
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Edit2 size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Modify Pupil File</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditStudentObj(null)}
                    className="text-xs font-black text-neutral-500 hover:text-white uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Full Name (English Ledger)
                    </label>
                    <input
                      type="text"
                      required
                      value={editStudentObj.name}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, name: e.target.value })}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Target Class
                      </label>
                      <select
                        value={editStudentObj.class}
                        onChange={(e) => setEditStudentObj({ ...editStudentObj, class: e.target.value as StudentClass })}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none"
                      >
                        {classes.map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Roll ID (Constant)
                      </label>
                      <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-400 font-extrabold font-mono uppercase tracking-wider">
                        {editStudentObj.rollNumber}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Gender
                    </label>
                    <div className="flex gap-3">
                      {(['Male', 'Female'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setEditStudentObj({ ...editStudentObj, gender: g })}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            (editStudentObj.gender || 'Male') === g
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {g === 'Male' ? '👦 Male' : '👧 Female'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Guardian Phone Number
                    </label>
                    <input
                      type="text"
                      value={editStudentObj.guardianPhone || ''}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, guardianPhone: e.target.value.replace(/\D/g, '') })}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                   <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Pupil Payment Scheme
                    </label>
                    <div className="flex gap-3 text-center">
                      {(['Daily', 'Term'] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditStudentObj({ ...editStudentObj, paymentType: t })}
                          className={`flex-1 py-3 px-4 text-xs font-mono font-black uppercase tracking-widest border-2 transition-all cursor-pointer ${
                            (editStudentObj.paymentType || 'Daily') === t
                              ? 'bg-amber-400 text-black border-amber-400 font-black'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          {t === 'Daily' ? '📅 Daily Payer' : '🎓 Term Payer'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(editStudentObj.paymentType || 'Daily') === 'Term' ? (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Flat Term Fee Amount (GHC)
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={editStudentObj.termFee !== undefined ? editStudentObj.termFee : 350}
                        onChange={(e) => setEditStudentObj({ ...editStudentObj, termFee: Math.max(1, parseFloat(e.target.value) || 0) })}
                        className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                        placeholder="e.g. 350.00"
                      />
                      <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                        Paying a customized static flat charge of <strong className="text-amber-500">GHC {(editStudentObj.termFee !== undefined ? editStudentObj.termFee : 350).toFixed(2)}</strong> for the entire term (exempt from daily debt).
                      </p>

                      <div className="mt-4">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Pre-adoption Outstanding Legacy Debt (GHC)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={editStudentObj.legacyDebt !== undefined ? editStudentObj.legacyDebt : 0}
                          onChange={(e) => setEditStudentObj({ ...editStudentObj, legacyDebt: Math.max(0, parseFloat(e.target.value) || 0) })}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700 font-mono"
                          placeholder="e.g. 150.00"
                        />
                        <p className="text-[9px] font-mono text-neutral-550 mt-1 uppercase tracking-wide">
                          Manually enter any pre-adoption outstanding debt (e.g. <strong className="text-red-400">GHC {(editStudentObj.legacyDebt || 0).toFixed(2)}</strong>) to be integrated into this pupil's ledger and outstanding balance.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                        Daily Check-In Discount (GHC) - Dynamic Group Rate
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.5"
                          value={editStudentObj.discount || 0}
                          onChange={(e) => setEditStudentObj({ ...editStudentObj, discount: Math.max(0, Math.min(5, parseFloat(e.target.value) || 0)) })}
                          className="w-1/2 bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                        />
                        <div className="flex-1 flex gap-1 font-mono">
                          {[0, 2.50, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setEditStudentObj({ ...editStudentObj, discount: val })}
                              className={`flex-1 text-[9px] font-mono font-black border transition-all ${
                                (editStudentObj.discount || 0) === val
                                  ? 'bg-amber-400 text-black border-amber-400'
                                  : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-white hover:bg-neutral-850'
                              }`}
                            >
                              {val === 0 ? 'None' : val === 5 ? '100% Free' : `GHC ${val.toFixed(2)}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[9px] font-mono text-neutral-500 mt-1 uppercase tracking-wide">
                        Standard fee is GHC 5.00. Effective daily rate: <strong className="text-amber-500">GHC {(5.00 - (editStudentObj.discount || 0)).toFixed(2)}</strong>
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Student Passport Photo / Picture
                    </label>
                    {editStudentObj.photoUrl ? (
                      <div className="relative w-full aspect-video sm:aspect-[4/3] bg-neutral-950 border-2 border-dashed border-amber-400 p-4 flex flex-col items-center justify-center gap-3">
                        <img 
                          src={editStudentObj.photoUrl} 
                          alt="Student passport preview" 
                          className="w-16 h-16 rounded-full object-cover border-2 border-amber-400"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={() => setEditStudentObj({ ...editStudentObj, photoUrl: undefined })}
                          className="text-[10px] font-mono font-black text-red-500 hover:text-red-400 uppercase tracking-wider bg-neutral-900 border border-neutral-800 px-3 py-1.5 transition-colors cursor-pointer"
                        >
                          Remove Photo
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full min-h-[96px] bg-neutral-950 border-2 border-dashed border-neutral-800 hover:border-neutral-600 p-4 cursor-pointer transition-all">
                        <Upload size={18} className="text-neutral-500 mb-1.5" />
                        <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider text-center">Upload Photo/Passport</span>
                        <span className="text-[8px] font-mono text-neutral-600 uppercase mt-0.5">JPEG / PNG up to 2MB</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handlePhotoUpload(e, true)} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2.5">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setEditStudentObj(null)}
                      className="w-1/3 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-700 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors"
                    >
                      Quit
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 text-xs bg-white hover:bg-amber-400 text-black py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
                    >
                      Save Changes
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedIdCardStudent(editStudentObj)}
                    className="w-full h-11 flex items-center justify-center gap-2 text-xs bg-neutral-950 hover:bg-neutral-850 text-amber-400 font-mono font-black border-2 border-neutral-800 hover:border-amber-400 uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Printer size={14} />
                    <span>Print ID Card</span>
                  </button>
                </div>
              </form>
            )}
            </div>

            {/* CSV Bulk Import Card */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-5">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                <Database size={18} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Mass Enrollment Roster</h3>
              </div>

              <p className="text-[11px] text-neutral-350 font-semibold leading-relaxed">
                Onboard whole classrooms or grades simultaneously. Reduce tedious keystroke entries by uploading a custom spreadsheet or copy-pasting active pupil lists directly.
              </p>

              <div className="space-y-4 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkImportModal(true)}
                  className="w-full text-xs font-mono font-black border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black text-amber-400 py-3 uppercase tracking-widest transition-all text-center cursor-pointer flex items-center justify-center gap-2 border-0"
                  id="btn-sidebar-launch-bulk"
                >
                  🚀 Open Import Toolkit
                </button>
                <p className="text-[8px] font-mono text-neutral-500 uppercase tracking-wide text-center">
                  Supports Excel copy/paste cells & standard .CSV files
                </p>
              </div>
            </div>

            {/* Inline Single Student Promotion & Repetition Desk */}
            <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                <Award size={18} className="text-amber-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Academic Progression Desk</h3>
              </div>

              <p className="text-[11px] text-neutral-350 font-semibold leading-relaxed">
                Alter or progress grade levels for a specific pupil. Choose either single logical promotion to the next academic level, or designate custom repetition.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                    Select Active Student
                  </label>
                  <select
                    value={inLinePromoStudentId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setInLinePromoStudentId(id);
                      const currentS = students.find(s => s.id === id);
                      if (currentS) {
                        setInLineRepeatClass(currentS.class);
                      }
                    }}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono text-xs p-3 font-semibold focus:outline-none"
                  >
                    <option value="">-- Choose active student --</option>
                    {students.filter(s => s.active).map(student => (
                      <option key={student.id} value={student.id}>
                        {student.name} ({student.class})
                      </option>
                    ))}
                  </select>
                </div>

                {inLinePromoStudentId && (() => {
                  const studentInHand = students.find(s => s.id === inLinePromoStudentId);
                  if (!studentInHand) return null;

                  const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
                    'Nursery': { nextClass: 'KG1', category: 'Pre-school', completes: false },
                    'KG1':     { nextClass: 'KG2', category: 'Pre-school', completes: false },
                    'KG2':     { nextClass: 'B1',  category: 'Primary',    completes: false },
                    'B1':      { nextClass: 'B2',  category: 'Primary',    completes: false },
                    'B2':      { nextClass: 'B3',  category: 'Primary',    completes: false },
                    'B3':      { nextClass: 'B4',  category: 'Primary',    completes: false },
                    'B4':      { nextClass: 'B5',  category: 'Primary',    completes: false },
                    'B5':      { nextClass: 'B6',  category: 'Primary',    completes: false },
                    'B6':      { nextClass: 'B7',  category: 'JHS',        completes: false },
                    'B7':      { nextClass: 'B8',  category: 'JHS',        completes: false },
                    'B8':      { nextClass: 'B9',  category: 'JHS',        completes: false },
                    'B9':      { nextClass: null,  category: 'JHS',        completes: true }
                  };

                  const mapEntry = CLASS_PROMOTION_MAP[studentInHand.class];
                  const nextClassString = mapEntry?.completes ? 'Completed / Graduate' : mapEntry?.nextClass || 'N/A';

                  return (
                    <div className="space-y-4 pt-2 border-t border-neutral-850">
                      {/* Promo Action Button */}
                      <div className="bg-neutral-950 p-3.5 border border-neutral-800 rounded-sm space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] font-mono tracking-wider">
                          <Award size={12} className="stroke-[2.5]" />
                          <span>Standard Logical Promotion</span>
                        </div>
                        <p className="text-[10px] text-neutral-400 font-semibold">
                          Advance {studentInHand.name} from <strong className="text-white">{studentInHand.class}</strong> to <strong className="text-emerald-400">{nextClassString}</strong>.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser?.role !== 'Administrator') {
                              alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                              return;
                            }
                            if (mapEntry?.completes) {
                              updateStudent({
                                ...studentInHand,
                                active: false
                              });
                              showToast(`Successfully marked ${studentInHand.name} as Completed/Graduated.`);
                            } else if (mapEntry?.nextClass) {
                              updateStudent({
                                ...studentInHand,
                                class: mapEntry.nextClass,
                                category: mapEntry.category
                              });
                              showToast(`Successfully promoted ${studentInHand.name} to ${mapEntry.nextClass}.`);
                            }
                            setInLinePromoStudentId('');
                          }}
                          className="w-full mt-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                        >
                          ⚡ Execute Promotion
                        </button>
                      </div>

                      {/* Repetition Class & Action Block */}
                      <div className="bg-neutral-950 p-3.5 border border-neutral-800 rounded-sm space-y-3">
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[9px] font-mono tracking-wider">
                          <RefreshCw size={11} className="stroke-[2.5]" />
                          <span>Custom Repetition / Assignment</span>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[8px] font-mono text-neutral-500 uppercase font-black">
                            Select Repetition Target Grade
                          </label>
                          <select
                            value={inLineRepeatClass}
                            onChange={(e) => setInLineRepeatClass(e.target.value as StudentClass)}
                            className="w-full bg-neutral-900 border border-neutral-800 text-white font-mono text-[10px] p-2 focus:outline-none focus:border-amber-400"
                          >
                            {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                              <option key={cls} value={cls}>
                                {cls} (Repeat / Assign Grade)
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (currentUser?.role !== 'Administrator') {
                              alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                              return;
                            }
                            const targetCategory = getClassCategory(inLineRepeatClass);
                            updateStudent({
                              ...studentInHand,
                              class: inLineRepeatClass,
                              category: targetCategory,
                              active: true
                            });
                            showToast(`Successfully set ${studentInHand.name} to repeat/enroll in grade: ${inLineRepeatClass}.`);
                            setInLinePromoStudentId('');
                          }}
                          className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                        >
                          🔄 Confirm Repetition
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Directory Listings */}
          <div className="bg-neutral-900 border-4 border-neutral-800 col-span-1 lg:col-span-2 overflow-hidden flex flex-col justify-between">
            <div className="p-6 bg-neutral-950 border-b-2 border-neutral-850 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-1.5">
                <span className="text-[10px] font-black text-neutral-400 font-mono uppercase tracking-widest block">Student Directory Catalog ({filteredStudentsForList.length})</span>
                
                {/* Gender Totals Summary */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[9.5px] font-mono font-bold text-neutral-500 uppercase tracking-widest pb-1 border-b border-neutral-850/35">
                  <span className="text-neutral-450">DIRECTORY:</span>
                  <span className="text-sky-400 font-black">👦 Male: <strong className="text-white">{students.filter(s => s.gender === 'Male').length}</strong></span>
                  <span>/</span>
                  <span className="text-pink-400 font-black">👧 Female: <strong className="text-white">{students.filter(s => s.gender === 'Female').length}</strong></span>
                  {students.filter(s => !s.gender).length > 0 && (
                    <>
                      <span>/</span>
                      <span className="text-neutral-500">Unspecified: <strong className="text-neutral-350">{students.filter(s => !s.gender).length}</strong></span>
                    </>
                  )}
                  {students.some(s => !s.active) && (
                    <>
                      <span className="text-neutral-605">|</span>
                      <span className="text-neutral-450">ACTIVE ONLY:</span>
                      <span className="text-sky-400 font-black">👦 Male: <strong className="text-emerald-400">{students.filter(s => s.active && s.gender === 'Male').length}</strong></span>
                      <span>/</span>
                      <span className="text-pink-400 font-black">👧 Female: <strong className="text-emerald-400">{students.filter(s => s.active && s.gender === 'Female').length}</strong></span>
                    </>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {students.some(s => !s.active) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (currentUser?.role !== 'Administrator') {
                          alert('Access Denied: Only Administrators are permitted to purge deactivated students completely.');
                          return;
                        }
                        const count = students.filter(s => !s.active).length;
                        setDeleteConf({
                          isOpen: true,
                          type: 'purge_inactive',
                          targetName: `ALL ${count} DEACTIVATED STUDENTS`,
                          userInput: '',
                          onConfirm: () => {
                            purgeDeactivatedStudents();
                            showToast(`Successfully purged ${count} deactivated pupil files and clean-wiped all transaction roots.`);
                          }
                        });
                      }}
                      className={`mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 ${
                        currentUser?.role === 'Administrator'
                          ? 'bg-red-600 hover:bg-red-500 text-white border-red-700 shadow-[2px_2px_0px_0px_rgba(220,38,38,0.2)] animate-pulse hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-neutral-950 border-neutral-850 text-neutral-600 cursor-not-allowed opacity-50'
                      }`}
                      title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Permanently erase all deactivated students and their past records'}
                    >
                      <Trash2 size={11} className="stroke-[3]" />
                      <span>Purge Inactive ({students.filter(s => !s.active).length}){currentUser?.role !== 'Administrator' ? ' (Admin only)' : ''}</span>
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser?.role !== 'Administrator') {
                        alert('Access Denied: Only Administrators are permitted to execute student promotions.');
                        return;
                      }
                      setShowPromotionModal(true);
                      setPromotionConfirmedText('');
                    }}
                    className={`mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 ${
                      currentUser?.role === 'Administrator'
                        ? 'border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black hover:border-amber-400 text-amber-400 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)]'
                        : 'bg-neutral-950 border-neutral-850 text-neutral-600 cursor-not-allowed opacity-50'
                    }`}
                    title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Promote all active pupil cohorts to the next grade class level'}
                  >
                    <Award size={11} className="stroke-[3]" />
                    <span>Promote Cohorts {currentUser?.role !== 'Administrator' ? ' (Admin only)' : ''}</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setBulkPrintSelectedIds(students.filter(s => s.active).map(s => s.id));
                      setBulkPrintClassFilter('all');
                      setBulkPrintSearch('');
                      setShowBulkPrintModal(true);
                    }}
                    className="mt-1 px-3 py-1 text-[9px] font-mono font-black uppercase tracking-widest cursor-pointer transition-all flex items-center gap-1.5 border-2 border-amber-500 bg-amber-500/10 hover:bg-amber-400 hover:text-black hover:border-amber-400 text-amber-400 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.15)]"
                    title="Generate and print physical student ID cards with scan QR codes in bulk"
                  >
                    <QrCode size={11} className="stroke-[3]" />
                    <span>Print QR Badges</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setStudentFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    studentFilter === 'all'
                      ? 'bg-amber-400 text-black border-amber-405 shadow-[2px_2px_0px_0px_rgba(251,191,36,0.15)] font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-450 hover:text-white hover:border-neutral-700 font-bold'
                  }`}
                >
                  All ({students.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilter('active')}
                  className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    studentFilter === 'active'
                      ? 'bg-emerald-555 border-emerald-500 bg-emerald-450 text-black shadow-[2px_2px_0px_0px_rgba(52,211,153,0.15)] font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-455 hover:text-white hover:border-neutral-700 font-bold'
                  }`}
                >
                  Active ({students.filter(s => s.active).length})
                </button>
                <button
                  type="button"
                  onClick={() => setStudentFilter('inactive')}
                  className={`px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                    studentFilter === 'inactive'
                      ? 'bg-red-950/40 text-red-500 border-red-800 shadow-[2px_2px_0px_0px_rgba(239,68,68,0.15)] font-black'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-455 hover:text-white hover:border-neutral-700 font-bold'
                  }`}
                >
                  Deactivated ({students.filter(s => !s.active).length})
                </button>
              </div>
            </div>

            {/* Quick Pupil Lookup Bar */}
            <div className="px-6 py-4 bg-neutral-950/60 border-b-2 border-neutral-850 flex items-center gap-3">
              <Search size={14} className="text-neutral-500 shrink-0" />
              <input
                id="admin-student-search"
                type="text"
                placeholder="Search student by name or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 p-0 text-xs text-white placeholder-neutral-650 focus:outline-none focus:ring-0 font-mono font-bold uppercase tracking-wider"
              />
              <VoiceSearchButton
                inputId="admin-student-search"
                onTranscript={(text) => setSearchQuery(text)}
                className="shrink-0"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 border border-neutral-800 bg-neutral-950 font-mono text-[8px] text-neutral-500 rounded-xs leading-none pointer-events-none uppercase font-bold tracking-wider select-none shrink-0">
                Ctrl+K
              </kbd>
              
              {/* Keyboard shortcut info indicator reminder */}
              <div 
                className="hidden md:flex items-center justify-center text-neutral-500 hover:text-amber-400 cursor-help select-none shrink-0"
                title="Keyboard Shortcut Reminder: Press 'Ctrl+K' (or 'Cmd+K' on macOS) from anywhere at any time to focus this student search box instantly"
              >
                <Info size={12} className="stroke-[2.5]" />
              </div>

              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[10px] font-mono font-black text-neutral-400 hover:text-white uppercase transition-all cursor-pointer shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="divide-y-2 divide-neutral-850 overflow-y-auto max-h-[480px]">
              {filteredStudentsForList.length === 0 ? (
                <div className="p-12 text-center text-xs font-mono font-black uppercase text-neutral-500 tracking-wider">
                  📂 No students matching filters found or directory is empty.
                </div>
              ) : (
                filteredStudentsForList.map(st => (
                <div key={st.id} className="p-6 flex justify-between items-center hover:bg-neutral-800/10">
                  <div className="flex items-center gap-4">
                    {/* Student Avatar Widget */}
                    <div className="shrink-0 w-11 h-11 relative">
                      {st.photoUrl ? (
                        <img 
                          src={st.photoUrl} 
                          alt={st.name} 
                          className="w-11 h-11 rounded-full object-cover border-2 border-neutral-800"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-neutral-950 border-2 border-neutral-850 flex items-center justify-center text-xs font-black text-amber-400 font-mono tracking-tighter uppercase">
                          {st.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1.5">
                      <p 
                        onClick={() => setHistoryModalStudent(st)}
                        className={`text-base font-black text-white hover:text-amber-400 cursor-pointer transition-colors uppercase tracking-tight decoration-amber-400 hover:underline flex items-center gap-1.5 ${!st.active ? 'line-through text-neutral-500' : ''}`}
                        title="Click to view full registration history, financial ledger & pass credentials"
                      >
                        {st.name}
                        <span className="text-neutral-500 hover:text-amber-400 text-[10px] lowercase font-mono font-normal no-underline">(view history)</span>
                      </p>
                      <div className="flex gap-2.5 items-center text-[10px] text-neutral-400 font-mono font-bold uppercase tracking-wider">
                        <span className="bg-neutral-955 border border-neutral-800 px-2.5 py-0.5 text-amber-400 font-black">{st.class}</span>
                        {st.gender && (
                          <>
                            <span>•</span>
                            <span className="bg-neutral-955 border border-neutral-800 px-2 py-0.5 text-neutral-300 font-extrabold flex items-center gap-0.5">
                              {st.gender === 'Male' ? '👦 M' : '👧 F'}
                            </span>
                          </>
                        )}
                        <span>•</span>
                        <span>Category: {st.category}</span>
                        <span>•</span>
                        <span>ID: {st.rollNumber}</span>
                        {st.discount !== undefined && st.discount > 0 && (
                          <>
                            <span>•</span>
                            <span className="bg-amber-955 border border-amber-500/35 px-2 py-0.5 text-amber-400 font-black">
                              DISCOUNT: GHC {st.discount.toFixed(2)}/DAY
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* ID Card trigger */}
                    <button
                      type="button"
                      onClick={() => setSelectedIdCardStudent(st)}
                      title="Generate & Print Student ID Card with QR Code"
                      className="p-2 border-2 border-neutral-800 hover:border-amber-400 hover:text-amber-400 bg-neutral-950 text-neutral-400 transition-colors cursor-pointer flex items-center justify-center gap-1 font-mono text-[9px] font-black uppercase tracking-wider"
                    >
                      <Printer size={13} className="stroke-[2.5]" />
                      <span className="hidden sm:inline">Print ID</span>
                    </button>

                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleStudentActive(st)}
                      title={st.active ? 'Deactivate from checkout register' : 'Reactivate into register'}
                      className={`p-2 border-2 transition-colors cursor-pointer ${
                        st.active 
                          ? 'border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 bg-neutral-950' 
                          : 'border-red-800 text-red-500 bg-red-950/20'
                      }`}
                    >
                      {st.active ? <Check size={14} className="stroke-[3]" /> : <X size={14} className="stroke-[3]" />}
                    </button>

                    {/* Edit trigger */}
                    <button
                      onClick={() => handleStartEdit(st)}
                      className="p-2 border-2 border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete trigger */}
                    <button
                      onClick={() => {
                        if (currentUser?.role !== 'Administrator') {
                          alert('Access Denied: Only Administrators are permitted to delete student records completely from the system.');
                          return;
                        }
                        setDeleteConf({
                          isOpen: true,
                          type: 'student',
                          targetId: st.id,
                          targetName: st.name,
                          userInput: '',
                          onConfirm: () => {
                            deleteStudent(st.id);
                            showToast('Pupil record purged.');
                          }
                        });
                      }}
                      className={`p-2 border-2 transition-colors cursor-pointer ${
                        currentUser?.role === 'Administrator'
                          ? 'border-red-900 bg-neutral-950 text-red-500 hover:bg-red-950/30'
                          : 'border-neutral-855 bg-neutral-950 text-neutral-600 cursor-not-allowed opacity-50'
                      }`}
                      title={currentUser?.role !== 'Administrator' ? 'Administrator Only (Access Denied)' : 'Delete Student / Purge'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )))}
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'mfa' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Staff Registration or Editing Card on Left */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 h-fit space-y-5">
            {editStaffObj ? (
              <form onSubmit={handleAdminEditStaffSubmit} className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b-2 border-neutral-800">
                  <div className="flex items-center gap-3">
                    <Edit2 size={18} className="text-amber-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Modify Staff Profile</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => setEditStaffObj(null)}
                    className="text-xs font-black text-neutral-500 hover:text-white uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Staff Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={editStaffObj.name}
                      onChange={(e) => setEditStaffObj({ ...editStaffObj, name: e.target.value })}
                      placeholder="e.g. Mrs. Rebecca Hanson"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Professional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={editStaffObj.email}
                      onChange={(e) => setEditStaffObj({ ...editStaffObj, email: e.target.value })}
                      placeholder="e.g. rebecca.hanson@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={editStaffObj.role === 'Teacher' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Administrative Role
                        </label>
                        <select
                          value={editStaffObj.role}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, role: e.target.value as UserRole, assignedClass: e.target.value === 'Teacher' ? editStaffObj.assignedClass || 'B1' : undefined })}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Teacher">Teacher</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Administrator">Administrator</option>
                          <option value="Headmaster">Headmaster</option>
                        </select>
                      </div>

                      {editStaffObj.role !== 'Teacher' && (
                        <div>
                          <label className="block text-[10px] font-black text-neutral-555 uppercase tracking-widest mb-1.5 font-mono">
                            Scope Level
                          </label>
                          <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-500 font-extrabold font-mono uppercase tracking-wider">
                            {editStaffObj.role === 'Administrator' || editStaffObj.role === 'Headmaster' ? 'All Areas' : 'Accounting Desk'}
                          </div>
                        </div>
                      )}
                    </div>

                    {editStaffObj.role === 'Teacher' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Assigned Gate Checkpoints (Multi-Select)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950/60 p-3.5 border border-neutral-850 rounded">
                          {classes.map(cls => {
                            const currentClasses = editStaffObj.assignedClasses || (editStaffObj.assignedClass ? [editStaffObj.assignedClass] : []);
                            const isChecked = currentClasses.includes(cls);
                            return (
                              <label key={cls} className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer select-none py-1.5 px-2 hover:bg-neutral-900/50 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextClasses = isChecked
                                      ? currentClasses.filter(c => c !== cls)
                                      : [...currentClasses, cls];
                                    setEditStaffObj({
                                      ...editStaffObj,
                                      assignedClasses: nextClasses,
                                      assignedClass: nextClasses[0] || undefined
                                    });
                                  }}
                                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono">{cls}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono">💵 Financial & Momo Payout Profile</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Monthly Stipend/Salary (GHC)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={editStaffObj.stipendSalary || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, stipendSalary: e.target.value })}
                            placeholder="e.g. 1500.00"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Momo Registered No.
                          </label>
                          <input
                            type="text"
                            value={editStaffObj.momoNumber || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, momoNumber: e.target.value })}
                            placeholder="e.g. 0541234567"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Registered Momo Name
                          </label>
                          <input
                            type="text"
                            value={editStaffObj.momoName || ''}
                            onChange={(e) => setEditStaffObj({ ...editStaffObj, momoName: e.target.value })}
                            placeholder="e.g. Mary Appiah"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 bg-neutral-950/40 p-4 border border-neutral-850 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="admin-edit-mfa-checkbox"
                        checked={!!editStaffObj.mfaEnabled}
                        onChange={(e) => setEditStaffObj({ ...editStaffObj, mfaEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-edit-mfa-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Secure MFA Locks
                      </label>
                    </div>

                    <div className="flex items-center gap-3 border-t border-neutral-900 pt-2">
                      <input
                        type="checkbox"
                        id="admin-edit-password-checkbox"
                        checked={!!editStaffObj.passwordEnabled}
                        onChange={(e) => setEditStaffObj({ ...editStaffObj, passwordEnabled: e.target.checked })}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-edit-password-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Password Protection
                      </label>
                    </div>

                    {!!editStaffObj.passwordEnabled && (
                      <div className="mt-1 pl-7">
                        <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1 font-mono">
                          Set Account Password
                        </label>
                        <input
                          type="text"
                          required={!!editStaffObj.passwordEnabled}
                          value={editStaffObj.password || ''}
                          onChange={(e) => setEditStaffObj({ ...editStaffObj, password: e.target.value })}
                          placeholder="Secret password (e.g. secure123)"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditStaffObj(null)}
                    className="w-1/3 text-xs bg-neutral-950 border-2 border-neutral-800 hover:border-neutral-700 text-neutral-400 py-3 font-black uppercase tracking-widest transition-colors"
                  >
                    Quit
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 text-xs bg-white hover:bg-amber-400 text-black py-3 font-black uppercase tracking-widest transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAdminRegisterStaff} className="space-y-5">
                <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
                  <UserPlus size={18} className="text-amber-400" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Register Staff Profile</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Staff Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={adminRegName}
                      onChange={(e) => setAdminRegName(e.target.value)}
                      placeholder="e.g. Mrs. Rebecca Hanson"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                      Professional Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={adminRegEmail}
                      onChange={(e) => setAdminRegEmail(e.target.value)}
                      placeholder="e.g. rebecca.hanson@school.edu"
                      className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className={adminRegRole === 'Teacher' ? 'col-span-2 sm:col-span-1' : 'col-span-2'}>
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                          Administrative Role
                        </label>
                        <select
                          value={adminRegRole}
                          onChange={(e) => setAdminRegRole(e.target.value as UserRole)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-3 px-4 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="Teacher">Teacher</option>
                          <option value="Accountant">Accountant</option>
                          <option value="Administrator">Administrator</option>
                          <option value="Headmaster">Headmaster</option>
                        </select>
                      </div>

                      {adminRegRole !== 'Teacher' && (
                        <div>
                          <label className="block text-[10px] font-black text-neutral-555 uppercase tracking-widest mb-1.5 font-mono">
                            Scope Level
                          </label>
                          <div className="bg-neutral-950 border-2 border-neutral-850 py-3 px-4 text-xs text-neutral-500 font-extrabold font-mono uppercase tracking-wider">
                            {adminRegRole === 'Administrator' || adminRegRole === 'Headmaster' ? 'All Areas' : 'Accounting Desk'}
                          </div>
                        </div>
                      )}
                    </div>

                    {adminRegRole === 'Teacher' && (
                      <div className="space-y-2">
                        <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Assigned Gate Checkpoints (Multi-Select)
                        </label>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 bg-neutral-950/60 p-3.5 border border-neutral-850 rounded">
                          {classes.map(cls => {
                            const isChecked = adminRegClasses.includes(cls);
                            return (
                              <label key={cls} className="flex items-center gap-2 text-xs font-bold text-neutral-300 hover:text-white cursor-pointer select-none py-1.5 px-2 hover:bg-neutral-900/50 rounded transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    const nextClasses = isChecked
                                      ? adminRegClasses.filter(c => c !== cls)
                                      : [...adminRegClasses, cls];
                                    setAdminRegClasses(nextClasses);
                                  }}
                                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                                />
                                <span className="font-mono">{cls}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-neutral-950/80 p-5 border-2 border-neutral-800 rounded space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-neutral-850">
                        <span className="text-xs font-black uppercase tracking-widest text-amber-400 font-mono">💵 Financial & Momo Payout Profile</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Monthly Stipend/Salary (GHC)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={adminRegStipendSalary}
                            onChange={(e) => setAdminRegStipendSalary(e.target.value)}
                            placeholder="e.g. 1500.00"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Momo Registered No.
                          </label>
                          <input
                            type="text"
                            value={adminRegMomoNumber}
                            onChange={(e) => setAdminRegMomoNumber(e.target.value)}
                            placeholder="e.g. 0541234567"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-1.5 font-mono">
                            Registered Momo Name
                          </label>
                          <input
                            type="text"
                            value={adminRegMomoName}
                            onChange={(e) => setAdminRegMomoName(e.target.value)}
                            placeholder="e.g. Mary Appiah"
                            className="w-full bg-neutral-900 border-2 border-neutral-800 py-2.5 px-3.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pt-2 bg-neutral-950/40 p-4 border border-neutral-850 rounded">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="admin-reg-mfa-checkbox"
                        checked={adminRegMfa}
                        onChange={(e) => setAdminRegMfa(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-reg-mfa-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Secure MFA Locks
                      </label>
                    </div>

                    <div className="flex items-center gap-3 border-t border-neutral-900 pt-2">
                      <input
                        type="checkbox"
                        id="admin-reg-password-checkbox"
                        checked={adminRegPasswordEnabled}
                        onChange={(e) => setAdminRegPasswordEnabled(e.target.checked)}
                        className="w-4 h-4 accent-amber-400 cursor-pointer"
                      />
                      <label htmlFor="admin-reg-password-checkbox" className="text-xs text-neutral-300 font-mono uppercase tracking-wider cursor-pointer select-none">
                        Enforce Password Protection
                      </label>
                    </div>

                    {adminRegPasswordEnabled && (
                      <div className="mt-1 pl-7">
                        <label className="block text-[9px] font-black text-neutral-450 uppercase tracking-widest mb-1 font-mono">
                          Set Account Password
                        </label>
                        <input
                          type="text"
                          required={adminRegPasswordEnabled}
                          value={adminRegPassword}
                          onChange={(e) => setAdminRegPassword(e.target.value)}
                          placeholder="Secret password (e.g. secure123)"
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2.5 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400 placeholder:text-neutral-700"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full text-xs font-black uppercase tracking-widest bg-white hover:bg-amber-400 text-black py-3.5 transition-colors cursor-pointer"
                >
                  Register Staff Profile
                </button>
              </form>
            )}
          </div>

          {/* Staff Registry & Security on Right (col-span-2) */}
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6 col-span-1 lg:col-span-2 h-fit">
            <div className="space-y-2 pb-3 border-b-2 border-neutral-800">
              <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                <ShieldAlert size={20} className="text-amber-400" /> Staff Directory, Accounts & Security
              </h3>
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Configure staff user credentials, activate/deactivate portal access, and enforce multi-factor authentication locks.
              </p>
            </div>

            <div className="divide-y-2 divide-neutral-850 border-2 border-neutral-80 w-full overflow-hidden bg-neutral-950">
              {users.map(u => {
                const matchesCurrentUser = currentUser?.id === u.id;
                const isUserActive = u.active !== false;
                
                return (
                  <div key={u.id} className="p-6 flex flex-col xl:flex-row justify-between xl:items-center gap-4 hover:bg-neutral-900/10 transition-colors">
                    <div className="space-y-2">
                       <div className="flex flex-wrap items-center gap-2.5">
                        <p className={`text-base font-black uppercase tracking-tight ${!isUserActive ? 'line-through text-neutral-500' : 'text-white'}`}>{u.name}</p>
                        <span className="text-[10px] font-black text-amber-400 bg-neutral-900 border border-neutral-800 px-2.5 py-0.5 tracking-widest uppercase font-mono">
                          {u.role} {u.role === 'Teacher' ? (
                            u.assignedClasses && u.assignedClasses.length > 0 
                              ? `(Gates: ${u.assignedClasses.join(', ')})`
                              : u.assignedClass 
                                ? `(Gate: ${u.assignedClass})` 
                                : '[No Gates Assigned]'
                          ) : '[All Core]'}
                        </span>
                        {matchesCurrentUser && (
                          <span className="text-[10px] bg-white text-black font-mono font-black px-2.5 py-0.5 uppercase tracking-widest">YOU</span>
                        )}
                        {!isUserActive && (
                          <span className="text-[10px] bg-red-950 border border-red-800 text-red-500 font-extrabold font-mono px-2.5 py-0.5 uppercase tracking-widest">DEACTIVATED</span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 font-mono font-bold">{u.email}</p>
                      {u.mfaEnabled && u.mfaSecret && (
                        <div className="inline-flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono tracking-wider w-full sm:w-auto">
                          <span>TOTP SECURE SECRET-KEY: <strong className="font-extrabold text-amber-400 select-all font-mono">{u.mfaSecret}</strong></span>
                          <span className="hidden sm:inline text-neutral-600">|</span>
                          <span className="text-emerald-450 uppercase font-black">(SIMULATED VALIDATION OTP: <strong className="font-extrabold text-white select-all">123456</strong>)</span>
                        </div>
                      )}

                      {u.passwordEnabled && u.password && (
                        <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 p-3 bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-300 font-mono tracking-wider w-full sm:w-auto">
                          <span>SECURE PASSWORD KEY: <strong className="font-extrabold text-amber-400 select-all font-mono">{u.password}</strong></span>
                        </div>
                      )}

                      {((u.stipendSalary !== undefined && u.stipendSalary > 0) || u.momoNumber) && (
                        <div className="mt-1.5 flex flex-wrap gap-2.5 items-center text-[10px] uppercase font-mono tracking-wider">
                          {u.stipendSalary !== undefined && u.stipendSalary > 0 && (
                            <span className="bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-2.5 py-0.5 rounded font-bold">
                              💵 Stipend: GHC {u.stipendSalary.toFixed(2)}
                            </span>
                          )}
                          {u.momoNumber && (
                            <span className="bg-amber-950/40 text-amber-400 border border-amber-905/30 px-2.5 py-0.5 rounded font-bold">
                              ☎ MoMo: {u.momoNumber} {u.momoName ? `(${u.momoName})` : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* Edit */}
                      <button
                        onClick={() => setEditStaffObj({ ...u })}
                        title={`Edit ${u.name}'s profile`}
                        className="p-2 border-2 border-neutral-800 hover:border-neutral-600 bg-neutral-950 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (currentUser?.role !== 'Administrator') {
                            alert("Access Denied: Only Administrators are permitted to delete staff profiles completely. (Your current role is: " + (currentUser?.role || "Guest") + ")");
                            return;
                          }
                          if (matchesCurrentUser) {
                            alert("Access Denied: You cannot delete your own profile while logged in.");
                            return;
                          }
                          setDeleteConf({
                            isOpen: true,
                            type: 'staff',
                            targetId: u.id,
                            targetName: u.name,
                            userInput: '',
                            onConfirm: () => {
                              const result = deleteStaff(u.id);
                              if (result.success) {
                                showToast(`Staff profile for ${u.name} has been deleted.`);
                              } else {
                                showToast(result.error || "Failed to delete staff member.");
                              }
                            }
                          });
                        }}
                        disabled={matchesCurrentUser}
                        title={
                          matchesCurrentUser 
                            ? "Cannot delete yourself" 
                            : `Delete ${u.name}'s profile`
                        }
                        className={`p-2 border-2 ${
                          matchesCurrentUser
                            ? 'border-neutral-900 bg-neutral-900/30 text-neutral-700 cursor-not-allowed'
                            : 'border-neutral-800 hover:border-red-650 bg-neutral-950 text-neutral-400 hover:text-red-500 transition-colors cursor-pointer'
                        }`}
                      >
                        <Trash2 size={13} />
                      </button>

                      {/* Deactivate Toggle */}
                      <div className="flex items-center gap-2 border-l border-neutral-850 pl-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${isUserActive ? 'text-emerald-450' : 'text-neutral-500'}`}>
                          {isUserActive ? 'ACTIVE' : 'DISABLED'}
                        </span>
                        <button
                          onClick={() => {
                            if (matchesCurrentUser) {
                              showToast("You cannot deactivate your own profile while logged in.");
                              return;
                            }
                            const res = toggleStaffActive(u.id);
                            if (res.success) {
                              showToast(`Staff account for ${u.name} is now ${!isUserActive ? 'Active' : 'Disabled'}.`);
                            } else {
                              showToast(res.error || "Failed to toggle active state.");
                            }
                          }}
                          disabled={matchesCurrentUser}
                          title={matchesCurrentUser ? "Cannot deactivate yourself" : `Toggle portal active access for ${u.name}`}
                          className={`cursor-pointer ${matchesCurrentUser ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          {isUserActive ? (
                            <ToggleRight size={38} className="text-emerald-500 stroke-[1.5]" />
                          ) : (
                            <ToggleLeft size={38} className="text-neutral-700 stroke-[1.5]" />
                          )}
                        </button>
                      </div>

                      {/* MFA Toggle */}
                      <div className="flex items-center gap-2 border-l border-neutral-850 pl-3">
                        <span className={`text-[10px] font-black uppercase tracking-widest font-mono ${u.mfaEnabled ? 'text-amber-400' : 'text-neutral-500'}`}>
                          {u.mfaEnabled ? 'MFA LOCK' : 'MFA OPEN'}
                        </span>
                        <button
                          onClick={() => {
                            toggleMfaForUser(u.id);
                            showToast(`Security settings toggled for ${u.name}.`);
                          }}
                          className="cursor-pointer"
                        >
                          {u.mfaEnabled ? (
                            <ToggleRight size={38} className="text-amber-400 stroke-[1.5]" />
                          ) : (
                            <ToggleLeft size={38} className="text-neutral-700 stroke-[1.5]" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'gates' ? (
        <div className="space-y-6">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-2 border-neutral-800 gap-4">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase italic text-white tracking-tight flex items-center gap-3">
                  <UserCheck size={24} className="text-amber-400" /> Classroom Gates & Checkpoint Teachers Setup
                </h3>
                <p className="text-xs text-neutral-400 font-bold max-w-2xl font-mono uppercase tracking-wider pl-0.5">
                  Designate verified teachers to lead student entry registry validation and gate payment verification at checkpoints.
                </p>
              </div>

              <div className="flex gap-4 font-mono font-bold text-xs uppercase tracking-wider text-right">
                <div className="bg-neutral-950 px-4 py-2.5 border border-neutral-850">
                  <span className="text-neutral-500 mr-2">Core Gates:</span>
                  <span className="text-white">12</span>
                </div>
                <div className="bg-neutral-950 px-4 py-2.5 border border-neutral-850">
                  <span className="text-neutral-500 mr-2">Assigned:</span>
                  <span className="text-amber-400 font-extrabold font-mono">
                    {users.filter(u => u.role === 'Teacher' && (u.assignedClass || (u.assignedClasses && u.assignedClasses.length > 0)) && u.active !== false).length}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid of checkpoint assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {classes.map((cls) => {
                const assignedTeacher = users.find(u => u.role === 'Teacher' && (u.assignedClass === cls || u.assignedClasses?.includes(cls)) && u.active !== false);
                const category = getClassCategory(cls);

                // Default fallbacks for display labels matching AppContext
                let defaultName = 'Madam Mary Appiah';
                if (cls === 'Nursery') defaultName = 'Mrs. Abigail Mensah';
                else if (cls === 'B1') defaultName = 'Mr. Emmanuel Gyamfi';
                else if (cls === 'KG1') defaultName = 'Mrs. Grace Annan';
                else if (cls === 'KG2') defaultName = 'Mrs. Beatrice Boateng';
                else if (cls === 'B2') defaultName = 'Mr. Samuel Osei';
                else if (cls === 'B3') defaultName = 'Mr. Kofi Boateng';
                else if (cls === 'B4') defaultName = 'Mrs. Rita Owusu';
                else if (cls === 'B5') defaultName = 'Mr. Desmond Taylor';
                else if (cls === 'B6') defaultName = 'Mrs. Joyce Arthur';
                else if (cls === 'B7') defaultName = 'Mr. Richard Boadu';
                else if (cls === 'B8') defaultName = 'Madam Faustina Asare';
                else if (cls === 'B9') defaultName = 'Mr. Philip Ansah';

                const activeCount = students.filter(s => s.class === cls && s.active).length;

                return (
                  <div key={cls} className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-5 hover:border-neutral-700 transition">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest bg-neutral-900 border border-neutral-800 px-2 py-0.5 font-mono">
                          {category} LEVEL
                        </span>
                        <h4 className="text-2xl font-black text-white font-mono leading-none pt-2">{cls} Checkpoint</h4>
                        <div className="text-[10px] font-bold text-neutral-450 uppercase tracking-widest font-mono">
                          Enrolment: <span className="text-amber-400 font-extrabold">{activeCount} Pupils</span>
                        </div>
                      </div>
                      
                      {assignedTeacher ? (
                        <span className="text-[9px] font-black font-mono border border-emerald-950 bg-emerald-950/20 text-emerald-400 px-2 py-1 uppercase tracking-widest leading-none">
                          Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-black font-mono border border-neutral-850 bg-neutral-900 text-neutral-500 px-2 py-1 uppercase tracking-widest leading-none">
                          Fallback
                        </span>
                      )}
                    </div>

                    <div className="space-y-3.5 py-3 border-t border-b border-neutral-850">
                      <div className="space-y-1">
                        <span className="text-[9px] text-neutral-500 font-mono uppercase tracking-widest block">Active Gate Teacher</span>
                        <div className="font-mono text-sm leading-tight">
                          {assignedTeacher ? (
                            <span className="text-white font-extrabold">{assignedTeacher.name}</span>
                          ) : (
                            <span className="text-neutral-450 italic font-medium">{defaultName} <span className="text-neutral-600 font-sans font-normal text-xs">(Fallback Default)</span></span>
                          )}
                        </div>
                        {assignedTeacher && (
                          <span className="text-[10px] text-neutral-400 block font-mono truncate pt-0.5">{assignedTeacher.email}</span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest font-mono pl-0.5">
                        Designate Checkpoint Teacher
                      </label>
                      <select
                        value={assignedTeacher?.id || ''}
                        onChange={(e) => handleAssignGateTeacher(cls, e.target.value)}
                        className="w-full bg-neutral-905 border-2 border-neutral-800 focus:border-amber-400 hover:border-neutral-750 text-xs font-mono font-bold text-white py-2.5 px-3.5 focus:outline-none cursor-pointer transition-colors"
                      >
                        <option value="">[Use System Fallback Default]</option>
                        {users
                          .filter(u => u.role === 'Teacher' && u.active !== false)
                          .map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} ({t.email})
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'database' ? (
        <div className="space-y-6">
          <div className="bg-neutral-900 border-4 border-neutral-800 p-8 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b-2 border-neutral-800 gap-4">
              <div className="flex items-center gap-3">
                <Database size={24} className="text-amber-400" />
                <h3 className="text-xl font-black uppercase text-white tracking-tight">Firebase Firestore Status</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${firebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span className={`text-xs font-black uppercase tracking-widest font-mono ${firebaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {firebaseConnected ? 'FIREBASE CLOUD ACTIVE' : 'LOCAL LEDGER OFFLINE-MODE'}
                </span>
              </div>
            </div>

            {/* Ledger Mode Selection Controller */}
            <div className="p-4 bg-neutral-950 border-2 border-neutral-800 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono">Select Database Ledger Mode</h4>
                <p className="text-[11px] text-neutral-400 leading-normal max-w-2xl font-medium">
                  Choose <span className="text-amber-400 font-extrabold">📁 Local Ledger Only</span> to bypass cloud lookups entirely for instantaneous execution and zero network timeouts. Choose <span className="text-emerald-400 font-extrabold">☁️ Firestore Cloud Sync</span> to link with Google Cloud Firestore database.
                </p>
              </div>
              <div className="flex gap-2.5 w-full xl:w-auto">
                <button
                  type="button"
                  id="btn-ledger-local"
                  onClick={() => {
                    setStorageMode('local');
                    showToast('Switched to Standard Local Ledger mode. Blazing-fast and light!');
                  }}
                  className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                    storageMode === 'local'
                      ? 'bg-amber-500 text-black border-amber-500 font-extrabold'
                      : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  📁 Local Ledger Only
                </button>
                <button
                  type="button"
                  id="btn-ledger-cloud"
                  onClick={() => {
                    if (storageMode === 'local') {
                      setShowLedgerSwitchModal(true);
                    } else {
                      setStorageMode('cloud');
                      showToast('Switched to Cloud Database Sync mode.');
                    }
                  }}
                  className={`flex-1 xl:flex-initial px-4 py-2.5 text-xs font-black uppercase tracking-wider font-mono transition-all border-2 cursor-pointer ${
                    storageMode === 'cloud'
                      ? 'bg-emerald-500 text-black border-emerald-500 font-extrabold'
                      : 'bg-transparent text-neutral-400 border-neutral-700 hover:text-white hover:border-neutral-500'
                  }`}
                >
                  ☁️ Firestore Cloud Sync
                </button>
              </div>
            </div>

            {/* Periodic Background Sync Settings */}
            <div className={`p-4 border-2 transition-all ${
              bgSyncEnabled && storageMode === 'cloud'
                ? 'bg-emerald-950/20 border-emerald-900/60'
                : 'bg-neutral-950/50 border-neutral-850'
            } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                    🔄 Periodic Background Sync
                  </h4>
                  {storageMode === 'cloud' && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold ${
                      bgSyncEnabled
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-900 animate-pulse'
                        : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                    }`}>
                      {bgSyncEnabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                  Refresh pupil rosters, student details, and cash check-ins automatically in the background (every 30 seconds) while online. Ensures multi-device changes persist in near-realtime.
                </p>
                
                {bgSyncEnabled && storageMode === 'cloud' && (
                  <div className="flex items-center gap-3 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
                    <span className="flex items-center gap-1.5">
                      Status: 
                      {bgSyncStatus === 'syncing' ? (
                        <span className="text-amber-400 animate-pulse flex items-center gap-1">
                          <span className="inline-block animate-spin">⌛</span> Syncing...
                        </span>
                      ) : bgSyncStatus === 'success' ? (
                        <span className="text-emerald-400">✓ Sync Active & Clean</span>
                      ) : bgSyncStatus === 'error' ? (
                        <span className="text-red-400">✗ Sync Timeout / Error</span>
                      ) : (
                        <span className="text-neutral-400">Idle</span>
                      )}
                    </span>
                    {lastBgSyncTime && (
                      <span className="border-l border-neutral-800 pl-3">
                        Last Active Handshake: <strong className="text-neutral-300">{lastBgSyncTime}</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bgSyncEnabled}
                    onChange={(e) => {
                      if (storageMode !== 'cloud' && e.target.checked) {
                        showToast('Please enable Firestore Cloud Sync first to trigger background syncing.');
                        return;
                      }
                      setBgSyncEnabled(e.target.checked);
                      showToast(
                        e.target.checked
                          ? 'Background sync enabled. The system will sync with Firebase every 30 seconds.'
                          : 'Background sync disabled. Switched back to manual-only synchronization.'
                      );
                    }}
                    disabled={storageMode !== 'cloud'}
                    className="sr-only peer"
                    id="toggle-background-sync"
                  />
                  <div className={`w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 peer-checked:after:bg-white peer-disabled:opacity-50 peer-disabled:cursor-not-allowed ${
                    storageMode !== 'cloud' ? 'opacity-40' : ''
                  }`}></div>
                  <span className={`ml-3 text-xs font-black uppercase tracking-wider font-mono ${
                    storageMode !== 'cloud' ? 'text-neutral-600' : 'text-neutral-300'
                  }`}>
                    {bgSyncEnabled && storageMode === 'cloud' ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            {/* System Audio & Feedback Chime Settings */}
            <div className={`p-4 border-2 transition-all ${
              !audioMuted
                ? 'bg-amber-950/20 border-amber-900/60'
                : 'bg-neutral-950/50 border-neutral-850'
            } flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-3">
                  <h4 className="text-sm font-black uppercase text-white tracking-wider font-mono flex items-center gap-2">
                    🔊 Portal Sound Effects
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-mono leading-none border uppercase tracking-wider font-bold ${
                    !audioMuted
                      ? 'bg-amber-950 text-amber-400 border-amber-900'
                      : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                  }`}>
                    {audioMuted ? 'MUTED' : 'ACTIVE'}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-semibold">
                  Mute/unmute all auditory signals, including successful pupil check-ins (high-register chime), registration duplicate conflicts (low-register buzzer), or QR scan alerts.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!audioMuted}
                    onChange={(e) => {
                      setAudioMuted(!e.target.checked);
                      showToast(
                        e.target.checked
                          ? 'Auditory feedback check-in sound cues ENABLED!'
                          : 'Auditory feedback cues MUTED (Silent mode Active).'
                      );
                    }}
                    className="sr-only peer"
                    id="toggle-system-audio"
                  />
                  <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-0 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-neutral-400 after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400 peer-checked:after:bg-black"></div>
                  <span className="ml-3 text-xs font-black uppercase tracking-wider font-mono text-neutral-300">
                    {!audioMuted ? 'ON' : 'OFF'}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
              <div className="lg:col-span-2 space-y-3">
                <p className="text-xs text-neutral-400 leading-relaxed font-bold">
                  FEETRACK is armed with real-time cloud database syncing powered by Google Cloud Firebase Firestore. By default, records are safely cached in local memory and browser storage. Launching Firebase turns this daily school portal into a durable multi-device cloud system!
                </p>
                {firebaseConnected ? (
                  <div className="p-4 bg-emerald-950/20 border-2 border-emerald-900 text-xs text-neutral-300 leading-relaxed font-medium">
                    <p className="text-emerald-400 font-black mb-1 font-mono">🎉 CLOUD SYNC: VERIFIED ACTIVE</p>
                    Your active student enrollments, staff user credentials, daily check-in payments, and staff roles are communicating live with Firestore. No setup or copy/paste is required.
                  </div>
                ) : (
                  <div className="p-4 bg-amber-950/10 border-2 border-amber-900/60 text-xs text-neutral-300 leading-relaxed font-semibold">
                    <p className="text-amber-400 font-extrabold mb-1">📂 OFFLINE-MODE fallback</p>
                    We detected that your Cloud connection is offline. Connect your browser online or re-initialize to regain real-time Firestore database sync.
                    {firebaseError && (
                      <div className="mt-2.5 p-2 bg-black/40 border border-amber-900/50 rounded text-[10px] text-red-400 font-mono select-text break-words leading-normal">
                        <span className="font-extrabold text-amber-500 mr-1">Error trace:</span>
                        {firebaseError}
                      </div>
                    )}
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          showToast('Re-testing collection links...');
                          await retryFirebaseConnection();
                          showToast('Real-time sync test finalized.');
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-450 text-black font-black uppercase text-[10px] tracking-wider transition-colors inline-flex items-center gap-1.5 cursor-pointer font-mono"
                      >
                        <RefreshCw size={10} className="animate-spin" style={{ animationDuration: '3s' }} />
                        Retry Sync Detection
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-neutral-950 border-2 border-neutral-850 p-6 flex flex-col justify-between gap-4">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">Cloud Seeding Bridge</span>
                <h4 className="text-sm font-black uppercase text-white leading-tight">Bootstrap Local Seeds to Firestore</h4>
                <p className="text-[11px] text-neutral-400 leading-normal font-medium">
                  Push your offline register records, pupil directories, and recorded payment books immediately into your active Cloud Firebase Firestore database.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      showToast('Triggering Firebase firestore sync sequence...');
                      const response = await seedFirebaseFromLocal();
                      showToast(response.message);
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : String(err);
                      console.error('Firebase seeding failed:', err);
                      try {
                        const parsed = JSON.parse(msg);
                        showToast(`Failed: ${parsed.error || 'Check database permissions / rules.'}`);
                      } catch {
                        showToast(`Failed: ${msg.slice(0, 80)}`);
                      }
                    }
                  }}
                  className="w-full py-2.5 text-xs font-black bg-amber-400 hover:bg-amber-350 text-black uppercase tracking-widest cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={14} />
                  Publish To Firestore
                </button>
              </div>
            </div>

            {/* Local Offline Backups & Recovery Hub */}
            <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-neutral-850 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Recurring 30-Minute Task Active
                  </span>
                  <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2 block">
                    <Database size={18} className="text-amber-400" />
                    Offline Local Backup & Recovery Hub
                  </h4>
                  <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                    Automated background task captures state snapshots every 30 minutes. Securely guards directories, terms, and billing logs against data loss in Offline mode.
                  </p>
                </div>

                <div className="flex flex-row md:flex-col items-end gap-1.5 bg-neutral-900 border border-neutral-850 px-4 py-2.5 font-mono select-none shrink-0 w-full md:w-auto text-right">
                  <div className="text-[10px] uppercase text-neutral-500 font-bold tracking-wider">Next Auto Backup In</div>
                  <div className="text-lg font-black text-white leading-none">
                    {Math.floor(localTimeLeft / 60)}m {(localTimeLeft % 60).toString().padStart(2, '0')}s
                  </div>
                </div>
              </div>

              {/* Create Manual Backup Trigger bar */}
              <div className="bg-neutral-900 border border-neutral-850 p-4 flex flex-col md:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                  <input
                    type="text"
                    placeholder="Enter manual backup label (e.g., Before class merge)..."
                    value={backupLabel}
                    onChange={(e) => setBackupLabel(e.target.value)}
                    maxLength={60}
                    className="w-full bg-neutral-950 border-2 border-neutral-800 px-4 py-2 text-xs font-mono font-bold text-white uppercase placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      createBackup(backupLabel.trim() || undefined, false);
                      setBackupLabel('');
                      showToast('Captured fresh local database snapshot.');
                    }}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-neutral-850 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-widest font-mono transition-colors cursor-pointer border-2 border-neutral-750"
                  >
                    Create Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={downloadDatabaseBackup}
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-amber-400 hover:bg-amber-350 text-black font-black text-xs uppercase tracking-widest font-mono transition-colors cursor-pointer border-2 border-amber-500 flex items-center justify-center gap-2"
                  >
                    <Download size={13} />
                    Download Backup JSON
                  </button>
                </div>
              </div>

              {/* Backups List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black tracking-widest uppercase font-mono text-neutral-500">
                    Stored Snapshots ({backups.length}/10 slots used)
                  </span>
                  {backups.length > 0 && (
                    <div className="shrink-0">
                      {showBackupPurgeConfirm ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-mono font-bold uppercase text-red-400 animate-pulse">WIPE ALL?</span>
                          <button
                            type="button"
                            onClick={() => setShowBackupPurgeConfirm(false)}
                            className="text-[9px] font-bold uppercase text-neutral-400 hover:text-white underline font-mono cursor-pointer"
                          >
                            CANCEL
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              clearAllBackups();
                              setShowBackupPurgeConfirm(false);
                              showToast('Cleared all local backups.');
                            }}
                            className="text-[9px] font-bold uppercase text-red-500 hover:text-red-400 underline font-mono cursor-pointer"
                          >
                            CONFIRM
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowBackupPurgeConfirm(true)}
                          className="text-[9px] font-bold uppercase text-neutral-500 hover:text-red-400 underline font-mono transition-colors cursor-pointer"
                        >
                          Purge Backup Cache
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {backups.length === 0 ? (
                  <div className="border border-dashed border-neutral-800 p-8 text-center text-neutral-500 space-y-1.5 font-mono select-none">
                    <Database size={24} className="mx-auto text-neutral-700 stroke-[1.5]" />
                    <p className="text-xs uppercase font-extrabold tracking-wider text-neutral-400">No backup records saved</p>
                    <p className="text-[10px] font-medium leading-relaxed max-w-lg mx-auto uppercase">
                      The automated timer will automatically capture database state. Try creating a manual snapshot above to protect changes dynamically.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-3.5 pr-2 custom-scrollbar">
                    {backups.map(b => (
                      <div key={b.id} className="bg-neutral-900 border border-neutral-850 p-4.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-neutral-700 transition">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-black uppercase text-white truncate max-w-[280px]">
                              {b.label}
                            </span>
                            <span className={`text-[9px] font-black tracking-widest uppercase font-mono px-2 py-0.5 border leading-none shrink-0 ${
                              b.isAuto 
                                ? 'bg-amber-950/20 border-amber-500/20 text-amber-500' 
                                : 'bg-blue-950/20 border-blue-500/20 text-blue-400'
                            }`}>
                              {b.isAuto ? 'AUTO' : 'MANUAL'}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-[10px] leading-none text-neutral-400 font-semibold uppercase">
                            <span>Students: <strong className="text-white">{b.counts.students}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span>Payments: <strong className="text-white">{b.counts.payments}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span>Terms: <strong className="text-white">{b.counts.terms}</strong></span>
                            <span className="border-l border-neutral-800 h-2.5"></span>
                            <span className="text-neutral-500 font-bold">{b.timestamp}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          {showRestoreConfirmId === b.id ? (
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 animate-pulse">ROLLBACK?</span>
                              <button
                                type="button"
                                onClick={() => setShowRestoreConfirmId(null)}
                                className="px-2.5 py-1.5 border border-neutral-800 hover:border-neutral-750 text-[10px] font-black uppercase tracking-wider text-neutral-400 hover:text-white transition cursor-pointer"
                              >
                                CANCEL
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  restoreBackup(b.id);
                                  setShowRestoreConfirmId(null);
                                  showToast(`Restored base state from snapshot: "${b.label}"`);
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-emerald-500 text-[10px] font-black uppercase tracking-wider transition cursor-pointer"
                              >
                                CONFIRM
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setShowRestoreConfirmId(b.id)}
                                className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-black text-[10px] uppercase font-mono tracking-widest border border-neutral-700 transition cursor-pointer"
                              >
                                Restore
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteBackup(b.id);
                                  showToast('Selected backup snapshot deleted.');
                                }}
                                className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/40 rounded transition cursor-pointer"
                                title="Delete backup"
                              >
                                <X size={14} className="stroke-[3]" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Clear Sample / Start Live Data System Utility */}
            <div className="bg-neutral-950 border-2 border-red-950/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-red-500">System Initialization Ledger Tools</span>
                <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
                  <Trash2 size={16} className="text-red-500" />
                  Wipe Simulation / Demo Student Ledger
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-medium">
                  Ready to enroll real pupils and open active school semesters? Permanently delete all sample school registers, student names, classes, and fake historic payment logs. All system accounts (administrator and teacher credentials) remain untouched for secure login.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                {students.length === 0 ? (
                  <div className="px-5 py-3 border border-emerald-900 bg-emerald-950/15 text-emerald-400 text-xs font-mono font-black uppercase tracking-wider text-center">
                    🟢 Register Cleared & Ready!
                  </div>
                ) : showClearConfirm ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase font-mono font-black text-red-400 text-center animate-pulse">⚠️ ARE YOU ABSOLUTELY SURE?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowClearConfirm(false)}
                        className="py-2.5 px-4 text-xs font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 bg-neutral-900 cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          clearSampleStudents();
                          setShowClearConfirm(false);
                          showToast('Sample students database and past transactions cleared successfully.');
                        }}
                        className="py-2.5 px-5 text-xs font-black uppercase bg-red-600 hover:bg-red-500 text-white cursor-pointer transition-colors"
                      >
                        CONFIRM WIPE
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(true)}
                    className="w-full md:w-auto py-3 px-6 text-xs font-black bg-neutral-905 hover:bg-red-600 hover:text-white text-red-500 border border-red-950 hover:border-red-600 uppercase tracking-widest cursor-pointer transition-all font-mono"
                  >
                    WIPE ALL SAMPLE DATA
                  </button>
                )}
              </div>
            </div>

            {/* Reset App Ledger / Factory Reset System Utility */}
            <div className="bg-neutral-950 border-2 border-amber-950/60 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
              <div className="space-y-1.5 max-w-2xl">
                <span className="text-[10px] font-black tracking-widest uppercase font-mono text-amber-500">System Reset Tools</span>
                <h4 className="text-base font-black uppercase text-white leading-tight font-mono flex items-center gap-2">
                  <RefreshCw size={16} className="text-amber-550" />
                  Factory Reset / Rebuild App Ledger
                </h4>
                <p className="text-xs text-neutral-400 leading-relaxed font-semibold">
                  Rebuild the system to system factory seeds. This option completely purges the cache and resets students, staff logins, and daily payments to default starting presets.
                </p>
              </div>
              <div className="w-full md:w-auto shrink-0">
                {showResetConfirm ? (
                  <div className="space-y-2.5">
                    <p className="text-[10px] uppercase font-mono font-black text-amber-400 text-center animate-pulse">⚠️ PURGE & RESTORE DEFAULTS?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowResetConfirm(false)}
                        className="py-2.5 px-4 text-xs font-black uppercase text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700 bg-neutral-900 cursor-pointer"
                      >
                        CANCEL
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          resetData();
                          setShowResetConfirm(false);
                          showToast('System rebuilt to factory seeds. Reloading...');
                          setTimeout(() => {
                            window.location.reload();
                          }, 1000);
                        }}
                        className="py-2.5 px-5 text-xs font-black uppercase bg-amber-550 hover:bg-amber-500 text-black cursor-pointer transition-colors"
                      >
                        CONFIRM RESET
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full md:w-auto py-3 px-6 text-xs font-black bg-neutral-905 hover:bg-amber-500 hover:text-black text-amber-500 border border-amber-950 hover:border-amber-500 uppercase tracking-widest cursor-pointer transition-all font-mono"
                  >
                    RESET APP LEDGER
                  </button>
                )}
              </div>
            </div>

            {/* Staff Setup and Access Instructions */}
            <div className="bg-neutral-950 border-2 border-neutral-800 p-6 space-y-5">
              <div className="flex items-center gap-3 border-b border-neutral-850 pb-3">
                <Share2 className="text-amber-400" size={18} />
                <h4 className="text-xs font-black uppercase text-white tracking-widest font-mono">
                  STAFF ACCOUNTS & MULTI-USER ACCESS INSTANT SETUP
                </h4>
              </div>
              
              <p className="text-xs text-neutral-400 leading-normal font-medium">
                Want to make this application available to other staff members? Follow this simple 3-step checklist to coordinate class fee logs across all devices:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                {/* Step 1 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 01: SHARE PORTAL LINK</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Provide other staff members with the live web address of this school fee tracker. They can open it on any mobile phone, tablet, or classroom computer.
                    </p>
                    <div className="bg-neutral-950 p-2 border border-neutral-800 rounded font-mono text-[9px] text-amber-400 break-all select-all font-bold">
                      {(() => {
                        const raw = getSafeOrigin();
                        if (raw.includes("localhost") || raw.includes("127.0.0.1")) return raw;
                        let clean = raw.replace(/^(https?:\/\/)\d+-/, "$1");
                        if (clean.includes("-dev-")) clean = clean.replace("-dev-", "-pre-");
                        return clean.replace(/:\d+$/, "");
                      })()}
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          const rawOrigin = getSafeOrigin();
                          let cleanOrigin = rawOrigin;
                          if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                            cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                            if (cleanOrigin.includes("-dev-")) {
                              cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                            }
                            cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                          }
                          navigator.clipboard.writeText(cleanOrigin);
                          setCopiedAddress(true);
                          showToast("Copied portal address to clipboard!");
                          setTimeout(() => setCopiedAddress(false), 2000);
                        } catch (err) {
                          const rawOrigin = getSafeOrigin();
                          let cleanOrigin = rawOrigin;
                          if (!rawOrigin.includes("localhost") && !rawOrigin.includes("127.0.0.1")) {
                            cleanOrigin = rawOrigin.replace(/^(https?:\/\/)\d+-/, "$1");
                            if (cleanOrigin.includes("-dev-")) {
                              cleanOrigin = cleanOrigin.replace("-dev-", "-pre-");
                            }
                            cleanOrigin = cleanOrigin.replace(/:\d+$/, "");
                          }
                          alert(`Portal Address: ${cleanOrigin}`);
                        }
                      }}
                      className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-amber-400 transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Copy size={12} />
                      {copiedAddress ? "COPIED DETAILS!" : "COPY SHARABLE URL"}
                    </button>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 02: AUTHORIZE THE EMAIL</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Navigate to the <span className="text-amber-400 font-bold">RBAC & MFA Hub</span> tab above. Register their email, select their class/role, and let them sign in securely.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('mfa')}
                      className="w-full py-2 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-600 text-[10px] font-black uppercase tracking-widest text-neutral-300 transition-colors flex items-center justify-center gap-2 cursor-pointer font-mono"
                    >
                      <Users size={12} />
                      GOTO SECURITY HUB
                    </button>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="bg-neutral-900 border border-neutral-850 p-4 space-y-2 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black text-amber-500 font-mono block">STEP 03: TURN ON CLOUD SYNC</span>
                    <p className="text-neutral-400 text-[11px] leading-relaxed">
                      Make sure database mode is set to <span className="text-emerald-400 font-bold">Cloud Sync</span> on all devices so updates register instantly for all staff teachers in real-time.
                    </p>
                  </div>
                  <div className="bg-neutral-950 px-2.5 py-1.5 border border-neutral-850 text-center text-[10px] uppercase font-bold text-neutral-500 font-mono">
                    STATUS: {storageMode === 'cloud' ? '🟢 SYNCING LIVE' : '⚠️ ISOLATED LOCAL'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'adjustments' ? (
        <AdjustmentsTab />
      ) : activeTab === 'whatsapp' ? (
        <WhatsAppLogsTab />
      ) : activeTab === 'settings' ? (
        <SettingsPanel />
      ) : activeTab === 'idcards' ? (
        <IdCardsGeneratorTab />
      ) : (
        <ExpendituresTab />
      )}
      {/* SMS Urgent notification Modal Overlay */}
      {smsTarget && (
        <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border-4 border-red-500 max-w-md w-full p-8 shadow-[8px_8px_0px_0px_rgba(239,68,68,0.25)] space-y-6">
            <div className="flex items-center gap-3 pb-3 border-b-2 border-neutral-800">
              <ShieldAlert size={20} className="text-red-500 animate-pulse" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white font-mono">Send Urgent Arrears SMS</h3>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-neutral-400 font-bold leading-relaxed">
                Send/copy immediate high-priority check-in arrears notification for pupil: <span className="font-extrabold text-white">{smsTarget.student.name}</span>
              </p>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                    Receiver Guardian Phone Number
                  </label>
                  {smsTarget.student.guardianPhone && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(smsTarget.student.guardianPhone || '');
                        showToast(`Copied Guardian Phone: ${smsTarget.student.guardianPhone}`);
                      }}
                      className="text-[9px] hover:text-white text-amber-400 px-2 py-0.5 border border-amber-500/30 hover:border-amber-400 bg-neutral-950 font-mono uppercase tracking-wider font-extrabold flex items-center gap-1 transition"
                      title="Copy Guardian Contact"
                    >
                      <Copy size={9} />
                      <span>Copy Number</span>
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={smsTarget.student.guardianPhone || ''}
                  onChange={(e) => {
                    const nextPhone = e.target.value.replace(/\D/g, '');
                    setSmsTarget({
                      ...smsTarget,
                      student: { ...smsTarget.student, guardianPhone: nextPhone }
                    });
                  }}
                  placeholder="Type or verify phone number e.g. 0541234567"
                  className="w-full bg-neutral-950 border border-neutral-800 py-2.5 px-3 font-mono text-xs text-white focus:outline-none focus:border-red-500 placeholder:text-neutral-700 font-bold"
                />
              </div>

              <div className="relative group">
                <div className="bg-neutral-950 text-red-405 font-mono text-[10.5px] p-4 border-2 border-neutral-850 leading-relaxed space-y-2 select-text">
                  <div className="text-emerald-400">
                    <span className="text-neutral-500 font-bold uppercase tracking-wider block">Sender Mask: SAAKOCHECK (URGENT)</span>
                    <p className="border-t border-neutral-800/80 my-2 pt-2" />
                    <p>Hello. URGENT ALERT: Our registers show that {smsTarget.student.name} has missed gate check-in fee collections for {smsTarget.consecutiveDays} consecutive school days (Dates: {smsTarget.unpaidDates.join(', ')}). Outstanding: GHC {(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)</p>
                  </div>
                </div>

                <div className="absolute right-2.5 bottom-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `Hello. URGENT ALERT: Our registers show that ${smsTarget.student.name} has missed gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)`;
                      navigator.clipboard.writeText(msg);
                      showToast(`Copied urgent arrears SMS log text!`);
                    }}
                    className="text-[9px] text-amber-400 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded px-2.5 py-1 font-mono font-bold tracking-wider flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    title="Copy full urgent message text"
                  >
                    <Copy size={10} />
                    <span>Copy Full Message</span>
                  </button>
                </div>
              </div>

              {!smsTarget.student.guardianPhone && (
                <p className="text-[10px] text-amber-500 font-bold font-mono uppercase bg-amber-950/20 border border-amber-900/60 p-2 rounded">
                  ⚠️ Alert: No active contact registered. Please enter a verified phone number above.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const msg = `Hello. URGENT ALERT: Our registers show that ${smsTarget.student.name} has missed gate check-in fee collections for ${smsTarget.consecutiveDays} consecutive school days (Dates: ${smsTarget.unpaidDates.join(', ')}). Outstanding: GHC ${(smsTarget.consecutiveDays * 5).toFixed(2)}. Make payments at the gate register to avoid access disruption. - Yakubu Hakeem (Administrator)`;
                    navigator.clipboard.writeText(msg);
                    showToast("Copied SMS text to clipboard!");
                  }}
                  className="flex-1 text-xs bg-neutral-950 border-2 border-amber-500 hover:bg-neutral-800 text-amber-400 py-3 font-mono font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer rounded-none hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Copy size={13} />
                  <span>Copy Text (Local API)</span>
                </button>
                <button
                  type="button"
                  disabled={isSendingSms || !smsTarget.student.guardianPhone}
                  onClick={() => {
                    setIsSendingSms(true);
                    setTimeout(() => {
                      setIsSendingSms(false);
                      setSmsSuccess(true);
                      showToast(`SMS Dispatch Token registered for ${smsTarget.student.name}'s guardian.`);
                      setTimeout(() => {
                        setSmsTarget(null);
                      }, 1200);
                    }, 1500);
                  }}
                  className="flex-1 text-xs bg-red-650 hover:bg-red-600 disabled:bg-neutral-800 disabled:border-neutral-850 disabled:text-neutral-500 border-2 border-red-500 text-white py-3 font-mono font-black flex items-center justify-center gap-2 uppercase tracking-widest transition-all cursor-pointer"
                >
                  {isSendingSms ? (
                    <span className="animate-pulse">DISPATCHING...</span>
                  ) : smsSuccess ? (
                    <>
                      <Check size={14} className="text-emerald-300 stroke-[3]" /> DISPATCHED
                    </>
                  ) : (
                    <span>DISPATCH SIMULATED SMS</span>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setSmsTarget(null)}
                className="w-full text-[10px] bg-neutral-950 border border-neutral-850 hover:border-neutral-750 text-neutral-500 hover:text-neutral-300 py-2 font-black transition-colors uppercase tracking-widest cursor-pointer"
              >
                Close Gateway Overlay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Student Portfolio Ledger and Registration History Modal */}
      {historyModalStudent && (() => {
        const studentPayments = payments.filter(p => p.studentId === historyModalStudent.id);
        const totalPaidThisTerm = studentPayments.reduce((sum, p) => sum + p.amount, 0);
        const totalRegisteredDays = studentPayments.filter(p => !p.isAbsent).length;
        const totalAbsentDays = studentPayments.filter(p => p.isAbsent).length;

        return (
          <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white">
              
              {/* Header section */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <Users size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Student Portfolio Ledger</span>
                    <h3 className="text-base font-black uppercase tracking-tight">{historyModalStudent.name}</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Check-in statistics, custom billing logs and credentials for active school term.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryModalStudent(null)} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                  title="Close History Portfolio"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Stats overview bento grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Academic credentials */}
                <div className="bg-neutral-950 p-4 border border-neutral-800 rounded-sm space-y-3">
                  <span className="text-[9px] font-mono text-neutral-500 uppercase font-black block tracking-widest border-b border-neutral-900 pb-1">Academic Status</span>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[9.5px] text-neutral-450 block uppercase font-bold">Grade Level</span>
                      <strong className="text-white text-[13px]">{historyModalStudent.class}</strong>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-neutral-455 block uppercase font-bold">Category</span>
                      <strong className="text-amber-400 text-[11px]">{historyModalStudent.category}</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[9.5px] text-neutral-450 block uppercase font-bold">Identity Code</span>
                      <strong className="text-white text-[11px]">{historyModalStudent.rollNumber || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-[9.5px] text-neutral-455 block uppercase font-bold">Enrollment</span>
                      <span className={`text-[10px] font-black px-1.5 py-0.2 uppercase rounded ${historyModalStudent.active ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' : 'bg-red-955 text-red-500 border border-red-900/30'}`}>
                        {historyModalStudent.active ? 'Active' : 'Suspended'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs font-mono pt-1">
                    <span className="text-[9.5px] text-neutral-500 block uppercase font-bold">Guardian Verified Contact</span>
                    <strong className="text-neutral-300 tracking-tight font-extrabold">{historyModalStudent.guardianPhone || 'No registered mobile'}</strong>
                  </div>
                </div>

                {/* Term Financial ledger stats */}
                <div className="bg-neutral-955 border border-neutral-800 p-4 rounded-sm space-y-2.5 flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-neutral-500 uppercase font-black block tracking-widest border-b border-neutral-900 pb-1">Payment Balance</span>
                    
                    <div className="flex justify-between items-baseline pt-1.5">
                      <span className="text-[10px] font-bold text-neutral-400 font-mono uppercase">Total Paid (Term):</span>
                      <span className="text-xl font-black text-amber-400 font-mono tracking-tighter">
                        GHC {totalPaidThisTerm.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-2.5 border border-neutral-900 rounded-xs flex items-center justify-around text-center text-xs font-mono gap-1">
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Checked In</span>
                      <strong className="text-emerald-400 font-black text-sm">{totalRegisteredDays}d</strong>
                    </div>
                    <div className="h-6 w-[1.5px] bg-neutral-900" />
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Logged Absent</span>
                      <strong className="text-red-500 font-black text-sm">{totalAbsentDays}d</strong>
                    </div>
                    <div className="h-6 w-[1.5px] bg-neutral-900" />
                    <div>
                      <span className="text-[8px] text-neutral-500 block uppercase font-black">Billing Scheme</span>
                      <span className="text-[9px] bg-neutral-900 border border-neutral-800 text-amber-500 px-1 py-0.2 block rounded font-black mt-0.5">
                        {historyModalStudent.paymentType || 'Daily'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Registration and check-ins timeline history log */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-black text-neutral-400 uppercase tracking-widest block font-bold">
                  Presence Chronicle & Registration History ({studentPayments.length} entries)
                </span>
                
                <div className="bg-neutral-950 border border-neutral-850 rounded-sm overflow-hidden divide-y divide-neutral-900 max-h-[220px] overflow-y-auto">
                  {studentPayments.length === 0 ? (
                    <div className="p-8 text-center text-xs font-mono font-bold uppercase text-neutral-500 tracking-wide">
                      No matching check-in logs or daily transactions recorded for this student.
                    </div>
                  ) : (
                    [...studentPayments].sort((a,b) => b.date.localeCompare(a.date)).map((pay) => (
                      <div key={pay.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-900/45 text-xs font-mono">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${pay.isAbsent ? 'bg-red-500' : 'bg-emerald-400'}`} />
                          <div>
                            <span className="text-white font-black block font-bold text-[11px]">{pay.date}</span>
                            <span className="text-[9.5px] text-neutral-500 block">
                              Collector: {pay.collectedBy || 'Staff Registrar'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {pay.isAbsent ? (
                            <span className="text-[10px] bg-red-950 text-red-400 border border-red-900/40 px-2 py-0.5 text-right font-black uppercase rounded-xs">
                              Absent
                            </span>
                          ) : (
                            <div className="text-right">
                              <span className="text-[10.5px] text-emerald-400 font-black block">
                                GHC {pay.amount.toFixed(2)}
                              </span>
                              <span className="text-[8px] text-neutral-550 block uppercase tracking-wide">
                                Present / Paid
                              </span>
                            </div>
                          )}

                          <span className={`text-[8.5px] select-none font-bold px-1.5 py-0.2 border rounded-sm uppercase ${pay.verified ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' : 'bg-amber-951 text-amber-300 border-amber-900/30'}`}>
                            {pay.verified ? 'Verified' : 'Pending'}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3 font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIdCardStudent(historyModalStudent);
                    setHistoryModalStudent(null);
                  }}
                  className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <QrCode size={14} className="stroke-[2.5]" />
                  <span>Generate QR Access ID Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHistoryModalStudent(null)}
                  className="w-full sm:w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-medium uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                >
                  Close Portfolio
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Student ID Card Print Modal */}
      {selectedIdCardStudent && (() => {
        const student = selectedIdCardStudent;
        const isDarkTheme = idCardTheme === 'dark';

        const handleDirectPrint = () => {
          let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
          if (!printIframe) {
            printIframe = document.createElement('iframe');
            printIframe.id = 'idcard-print-iframe';
            printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
            document.body.appendChild(printIframe);
          }

          const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
          if (!iframeDoc) return;

          // Force colors explicitly with direct styles
          const cardBgFront = isDarkTheme 
            ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
            : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

          const cardBgBack = isDarkTheme 
            ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
            : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';

          const textMain = isDarkTheme ? 'color: #ffffff !important;' : 'color: #111111 !important;';
          const textMuted = isDarkTheme ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
          const borderCol = isDarkTheme ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
          const subBg = isDarkTheme ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

          const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA Student ID - ${student.name}</title>
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
        border: 1.5px solid ${isDarkTheme ? '#3f3f46' : '#d4d4d8'} !important;
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
        background-color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
      }
      .header {
        padding: 8px 10px 4px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        background-color: #fbbf24 !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        ${textMain}
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
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
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
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
        background-color: ${isDarkTheme ? '#000000' : '#e4e4e7'} !important;
        border: 1px solid ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
        padding: 0.5px 2px;
        border-radius: 1.5px;
        font-size: 5px;
        margin-left: 2px;
        ${textMain}
      }
      .term-label {
        font-weight: 900;
        color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;
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
        border-top: 1px dashed ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;
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
        background-color: ${isDarkTheme ? '#09090b' : '#f4f4f5'} !important;
        border: 1px solid ${isDarkTheme ? '#18181b' : '#e4e4e7'} !important;
        ${textMuted}
      }
      .barcode-area {
        background-color: #ffffff !important;
        padding: 3px 10px;
        border-top: 1px solid ${isDarkTheme ? '#27272a' : '#e4e4e7'} !important;
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
            <div class="logo-badge">SH</div>
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
              ${student.photoUrl 
                ? `<img src="${student.photoUrl}" alt="${student.name}" />`
                : `<div class="avatar-placeholder">${student.name.slice(0, 2).toUpperCase()}</div>`
              }
            </div>
            <span class="avatar-label">STUDENT INFO</span>
          </div>

          <div class="details">
            <div>
              <span class="field-label">Pupil Name</span>
              <span class="field-val-name">${student.name}</span>
            </div>
            <div class="meta-grid">
              <div>
                <span class="field-label">Class</span>
                <span class="field-val-meta">${student.class}</span>
              </div>
              <div>
                <span class="field-label">Gender</span>
                <span class="field-val-gender">${student.gender || '—'}</span>
              </div>
            </div>
            <div class="reg-id-box">
              REG-ID: <span class="reg-id-badge">${student.rollNumber || 'SHC-' + student.id.substring(0, 5).toUpperCase()}</span>
            </div>
          </div>

          <div class="qr-code-box">
            <img class="qr-code-img" src="${idCardQrDataUrl}" />
            <span class="qr-label">GATE PASS</span>
          </div>
        </div>

        <div class="footer">
          <div class="footer-left">
            SYSTEM ACCREDITED <span class="footer-expiry">EXP: ${expiryInfo.expiryDate}</span>
          </div>
          <div class="term-label">${expiryInfo.termName.toUpperCase()}</div>
        </div>
      </div>

      <div class="id-card id-card-back">
        <div class="accent-top" style="background-color: ${isDarkTheme ? '#27272a' : '#d4d4d8'} !important;"></div>
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
              <span class="contact-val">${student.guardianPhone || 'NOT ENROLLED'}</span>
            </div>
            <div style="text-align: right;">
              <span class="contact-label">Authorized Registrar</span>
              <span class="contact-val" style="color: ${isDarkTheme ? '#fbbf24' : '#d97706'} !important;">YAKUBU HAKEEM</span>
            </div>
          </div>

          <div class="status-banner-back">
            Validation Active &bull; Valid thru Term Closure ({expiryInfo.expiryDate})
          </div>
        </div>

        <div class="barcode-area">
          <div class="barcode-lines">
            ${Array.from({ length: 32 }).map((_, idx) => `
              <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
            `).join('')}
          </div>
          <div class="barcode-label">
            *SHCA-${student.id.substring(0, 8).toUpperCase()}*
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
          <div id="id-card-modal-container" className="fixed inset-0 z-50 bg-neutral-955/95 backdrop-blur-md flex items-center justify-center p-4 font-sans overflow-y-auto">
            <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-400 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(251,191,36,0.15)] text-white flex flex-col">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4 shrink-0">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <Contact size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-450 font-mono tracking-widest font-black uppercase block font-bold">Credential Printing Desk</span>
                    <h3 className="text-base font-black uppercase tracking-tight">Student Access Badge Issuer</h3>
                    <p className="text-[11px] text-neutral-401 mt-1">
                      Preview and generate official double-sided laminating cards. Perfect size for standard wallets.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedIdCardStudent(null)} 
                  className="p-1 cursor-pointer text-neutral-450 hover:text-white transition-colors"
                  title="Close Window"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Theme Settings Panel */}
              <div className="bg-neutral-950 p-4 border-2 border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] uppercase font-mono tracking-wider font-extrabold text-amber-400 block font-black">BADGE THEME OPTION:</span>
                  <p className="text-[11px] text-neutral-400">Choose custom look. Carbon uses dark premium styling. Light saves printer ink / toner.</p>
                </div>
                <div className="flex items-center gap-1 bg-neutral-900 p-1 border border-neutral-800 rounded">
                  <button
                    type="button"
                    onClick={() => setIdCardTheme('dark')}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider rounded-xs transition-all cursor-pointer ${idCardTheme === 'dark' ? 'bg-amber-400 text-black font-black' : 'text-neutral-500 hover:text-neutral-200'}`}
                  >
                    Carbon Midnight
                  </button>
                  <button
                    type="button"
                    onClick={() => setIdCardTheme('light')}
                    className={`px-3 py-1.5 font-mono text-[10px] uppercase font-bold tracking-wider rounded-xs transition-all cursor-pointer ${idCardTheme === 'light' ? 'bg-amber-400 text-black font-black' : 'text-neutral-500 hover:text-neutral-200'}`}
                  >
                    Eco Ink-Saver
                  </button>
                </div>
              </div>

              {/* Print Target Grid Card Content (Aesthetic Preview) */}
              <div id="id-card-print-target" className="flex flex-col md:flex-row items-center justify-center gap-6 py-4 px-2 bg-neutral-950 border-2 border-neutral-800 rounded p-6">
                
                {/* Front Side Card Cardboard */}
                <div className={`w-[340px] h-[215px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                  idCardTheme === 'dark'
                    ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                    : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                }`}>
                  {/* Visual Top Accent Pattern */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-amber-400" />
                  <div className="absolute top-1.5 right-6 w-16 h-12 bg-amber-400/5 rounded-full blur-xl pointer-events-none" />

                  {/* Card Top Header */}
                  <div className={`px-3.5 pt-3 flex items-center justify-between border-b pb-1.5 ${
                    idCardTheme === 'dark' ? 'border-neutral-800/60' : 'border-neutral-200'
                  }`}>
                    <div className="flex items-center gap-1.5">
                      {/* Tiny Logo mark */}
                      <div className="w-5 h-5 bg-amber-400 text-neutral-905 rounded-sm flex items-center justify-center font-black text-[10px] tracking-tighter">
                        SH
                      </div>
                      <div>
                        <span className={`text-[10px] font-black uppercase tracking-wider block ${
                          idCardTheme === 'dark' ? 'text-white' : 'text-neutral-800'
                        }`}>SHCA-Sawla</span>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-1.5">
                      {expiryInfo.isExpired ? (
                        <span className="text-[6.5px] font-black bg-red-950/80 text-red-400 border border-red-900/40 py-0.5 px-1.5 rounded-sm uppercase tracking-wider animate-pulse">
                          Expired
                        </span>
                      ) : expiryInfo.isNearingExpiry ? (
                        <span className="text-[6.5px] font-black bg-amber-955/80 text-amber-400 border border-amber-900/40 py-0.5 px-1.5 rounded-sm uppercase tracking-wider animate-pulse">
                          ⚠️ Renewal Due
                        </span>
                      ) : null}
                      <span className="text-[6.5px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-905 py-0.5 px-1.5 rounded-sm uppercase tracking-wide">
                        Active Pass
                      </span>
                    </div>
                  </div>

                  {/* Card Main content with Photo & Details */}
                  <div className="px-3.5 py-2 flex gap-3 flex-1 items-center">
                    {/* Left Avatar Passport area */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-16 h-16 rounded-md flex items-center justify-center overflow-hidden shrink-0 ${
                        idCardTheme === 'dark' ? 'bg-neutral-955 border-neutral-750' : 'bg-neutral-200 border-neutral-350'
                      }`}>
                        {student.photoUrl ? (
                          <img 
                            src={student.photoUrl} 
                            alt={student.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className={`font-mono font-black text-[18px] uppercase ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                          }`}>
                            {student.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className={`text-[5px] font-mono tracking-widest uppercase font-black ${
                        idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                      }`}>STUDENT INFO</span>
                    </div>

                    {/* Middle details column */}
                    <div className="flex-1 space-y-1">
                      <div>
                        <span className={`text-[7px] font-mono block uppercase font-bold ${
                          idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                        }`}>Pupil Name</span>
                        <span className={`text-xs font-black block uppercase tracking-tight line-clamp-1 ${
                          idCardTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                        }`}>
                          {student.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <span className={`text-[7px] font-mono block uppercase font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                          }`}>Class</span>
                          <span className="text-[10px] font-extrabold text-amber-500 font-mono">
                            {student.class}
                          </span>
                        </div>
                        <div>
                          <span className={`text-[7px] font-mono block uppercase font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                          }`}>Gender</span>
                          <span className={`text-[9px] font-bold ${
                            idCardTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'
                          }`}>
                            {student.gender || '—'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-0.5">
                        <span className={`text-[7.5px] font-mono block font-bold ${
                          idCardTheme === 'dark' ? 'text-neutral-450' : 'text-neutral-600'
                        }`}>
                          REG-ID: <strong className={`px-1 py-0.5 border rounded-xs ml-0.5 ${
                            idCardTheme === 'dark' ? 'text-white bg-neutral-950 border-neutral-800' : 'text-neutral-900 bg-neutral-200 border-neutral-300'
                          }`}>{student.rollNumber || 'SHC-'+student.id.substring(0,5).toUpperCase()}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Right QR Code column */}
                    <div className="flex flex-col items-center justify-center gap-1 shrink-0 bg-white p-1 rounded-sm border border-neutral-300">
                      {idCardQrDataUrl ? (
                        <img 
                          src={idCardQrDataUrl}
                          alt="Student QR Verification Key"
                          className="w-12 h-12"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-neutral-200 animate-pulse rounded-sm" />
                      )}
                      <span className="text-[5.5px] font-black text-black font-mono tracking-tighter uppercase leading-none">GATE PASS</span>
                    </div>
                  </div>

                  {/* Card Footer Banner */}
                  <div className={`border-t px-3 py-1 flex items-center justify-between text-[6.5px] font-mono ${
                    idCardTheme === 'dark' ? 'bg-neutral-955 border-neutral-850 text-neutral-500' : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                  }`}>
                    <span className="font-bold flex items-center gap-1.5">
                      <span>SYSTEM ACCREDITED</span>
                      <span className={`text-[5.5px] border px-1 py-0.2 rounded-sm font-black tracking-tighter ${
                        idCardTheme === 'dark' ? 'bg-neutral-900 border-neutral-800 text-neutral-401' : 'bg-neutral-200 border-neutral-300 text-neutral-705'
                      }`}>
                        EXP: {expiryInfo.expiryDate}
                      </span>
                    </span>
                    <span className="text-amber-600 font-extrabold">{expiryInfo.termName.toUpperCase()}</span>
                  </div>
                </div>

                {/* Back Side Card Cardboard */}
                <div className={`w-[340px] h-[215px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                  idCardTheme === 'dark'
                    ? 'bg-gradient-to-bl from-neutral-900 via-neutral-955 to-neutral-900 text-white border-neutral-700'
                    : 'bg-gradient-to-bl from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                }`}>
                  {/* Visual Accent bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                    idCardTheme === 'dark' ? 'bg-neutral-800' : 'bg-neutral-300'
                  }`} />

                  {/* Back Header */}
                  <div className={`px-4 pt-3 pb-1 border-b ${
                    idCardTheme === 'dark' ? 'border-neutral-850' : 'border-neutral-200'
                  }`}>
                    <span className={`text-[7.5px] font-black font-mono tracking-widest block uppercase ${
                      idCardTheme === 'dark' ? 'text-neutral-550' : 'text-neutral-450'
                    }`}>SECURITY POLICY & INSTRUCTIONS</span>
                  </div>

                  {/* Back core info list */}
                  <div className="px-4 py-2 flex flex-col justify-center flex-1 space-y-2">
                    <ol className={`list-decimal list-inside text-[7px] font-bold space-y-1 ${
                      idCardTheme === 'dark' ? 'text-neutral-401' : 'text-neutral-600'
                    }`}>
                      <li>This card remains the property of SHCA-Sawla.</li>
                      <li>Always present this card for scanning &amp; gate check-ins.</li>
                      <li>Loss of credential elements must be reported immediately.</li>
                      <li>Unauthorized duplication or counterfeit transfer is strictly prohibited.</li>
                    </ol>

                    <div className="flex items-center justify-between pt-1 font-mono text-[7px]">
                      <div>
                        <span className="text-neutral-500 block text-[6px]">Guardian Mobile</span>
                        <span className={`font-extrabold ${idCardTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-800'}`}>{student.guardianPhone || 'NOT ENROLLED'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-neutral-500 block text-[6px]">Authorized Registrar</span>
                        <span className="text-amber-500 font-black">YAKUBU HAKEEM</span>
                      </div>
                    </div>

                    {expiryInfo.isExpired ? (
                      <div className="bg-red-950/80 border border-red-900/55 rounded px-2 py-1 text-center font-mono text-[5.8px] text-red-400 font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                        <span>⚠️ SHCA BADGE EXPIRED</span>
                        <span>&bull;</span>
                        <span>CONTACT ACCREDITED OFFICERS</span>
                      </div>
                    ) : expiryInfo.isNearingExpiry ? (
                      <div className="bg-amber-955/80 border border-amber-900/55 rounded px-2 py-1 text-center font-mono text-[5.8px] text-amber-400 font-black uppercase tracking-wider animate-pulse flex items-center justify-center gap-1.5 shrink-0">
                        <span>⚠️ RENEWAL DUE</span>
                        <span>&bull;</span>
                        <span>{expiryInfo.daysRemaining} school days remaining</span>
                      </div>
                    ) : (
                      <div className={`px-2 py-0.5 border rounded text-center text-[5.5px] font-extrabold font-mono tracking-tight uppercase shrink-0 ${
                        idCardTheme === 'dark' ? 'bg-neutral-950 border-neutral-900 text-neutral-450' : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                      }`}>
                        Validation Active &amp; Valid thru Term Closure ({expiryInfo.expiryDate})
                      </div>
                    )}
                  </div>

                  {/* Authentic bottom barcode graphics overlay */}
                  <div className="bg-white px-4 py-2 flex flex-col items-center justify-center shrink-0 border-t border-neutral-200">
                    {/* Pure stylized CSS barcode lines */}
                    <div className="w-full h-5 flex items-stretch gap-[1.5px] bg-white opacity-90">
                      {[3,2,1,4,1,3,1,2,3,1,2,1,4,1,2,3,1,2,1,2,3,1,4,1,2,3,4,1,2,3,1,2,1,2,3,4,1,2].map((w,i) => (
                        <div 
                          key={i} 
                          className="bg-black flex-1" 
                          style={{ opacity: i % 2 === 0 ? 1 : 0 }} 
                        />
                      ))}
                    </div>
                    <span className="text-[6px] font-mono text-neutral-500 font-bold tracking-[0.2em] uppercase mt-0.5">
                      *SHCA-{student.id.substring(0,8).toUpperCase()}*
                    </span>
                  </div>
                </div>

              </div>

              {/* Actions Footer */}
              <div id="id-card-actions-panel" className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="flex-1 py-3 px-4 bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(251,191,36,0.25)]"
                >
                  <Printer size={14} className="stroke-[2.5]" />
                  <span>Direct Print Badge (Isolated Print Flow)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedIdCardStudent(null)}
                  className="w-full sm:w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                >
                  Quit Preview
                </button>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Bulk QR Pass / Credentials Badge Generator Modal */}
      {showBulkPrintModal && (() => {
        const previewStudent = students.find(s => s.id === bulkPreviewStudentId);
        const termName = activeTerm?.name || "Active School Term";
        const expiryDate = activeTerm?.endDate || "Term End Date";

        const isFilteredSelected = bulkFilteredStudents.every(s => bulkPrintSelectedIds.includes(s.id));
        const handleToggleSelectAllFiltered = () => {
          if (isFilteredSelected) {
            // Deselect all filtered
            setBulkPrintSelectedIds(prev => prev.filter(id => !bulkFilteredStudents.some(s => s.id === id)));
          } else {
            // Select all filtered
            setBulkPrintSelectedIds(prev => {
              const otherSelected = prev.filter(id => !bulkFilteredStudents.some(s => s.id === id));
              return [...otherSelected, ...bulkFilteredStudents.map(s => s.id)];
            });
          }
        };

        return (
          <div className="fixed inset-0 z-50 bg-neutral-950/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="relative w-full max-w-5xl bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(245,158,11,0.15)] text-white flex flex-col md:max-h-[90vh]">
              
              {/* Header */}
              <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-400/10 border border-amber-400 text-amber-300 shrink-0">
                    <QrCode size={20} />
                  </div>
                  <div>
                    <span className="text-[9px] text-amber-400 font-mono tracking-widest font-black uppercase block">Bulk ID Issuer Desk</span>
                    <h3 className="text-base font-black uppercase tracking-tight">Print QR Gate Check-In Passes</h3>
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Batch generate QR student credentials. Selected student badges are formatted into a grid for paper-saving prints.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBulkPrintModal(false)} 
                  className="p-1 cursor-pointer text-neutral-400 hover:text-white transition-colors"
                  title="Close Bulk Issuer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1">
                
                {/* Column Left: Filters & Selection Directory */}
                <div className="lg:col-span-5 flex flex-col space-y-4 overflow-hidden h-full">
                  <div className="space-y-2 shrink-0">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Step 1: Filter Directory Listing
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <select
                          value={bulkPrintClassFilter}
                          onChange={(e) => setBulkPrintClassFilter(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                        >
                          <option value="all">All Classes</option>
                          {classes.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search student..."
                          value={bulkPrintSearch}
                          onChange={(e) => setBulkPrintSearch(e.target.value)}
                          className="w-full bg-neutral-950 border-2 border-neutral-800 py-2 px-3 text-xs font-mono font-bold text-white placeholder-neutral-700 focus:outline-none focus:border-amber-400 uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-1 px-2.5 bg-neutral-950/50 border border-neutral-800/60 rounded-xs text-[10px] font-mono font-bold tracking-wide shrink-0">
                    <span className="text-neutral-400 uppercase">
                      Found: <strong className="text-amber-400">{bulkFilteredStudents.length}</strong> pupil records
                    </span>
                    <button
                      type="button"
                      onClick={handleToggleSelectAllFiltered}
                      className="text-amber-400 hover:text-white font-black uppercase tracking-wider text-[9px] cursor-pointer"
                    >
                      {isFilteredSelected ? "⬜ Deselect All" : "☑️ Select All"}
                    </button>
                  </div>

                  {/* Scrollable list */}
                  <div className="flex-1 overflow-y-auto border-2 border-neutral-800 bg-neutral-950 divide-y divide-neutral-850/50 rounded-sm pr-1 min-h-[220px]">
                    {bulkFilteredStudents.length === 0 ? (
                      <div className="p-8 text-center text-xs font-mono font-black uppercase text-neutral-600">
                        No students match the criteria.
                      </div>
                    ) : (
                      bulkFilteredStudents.map(st => {
                        const isSelected = bulkPrintSelectedIds.includes(st.id);
                        const isPreviewing = bulkPreviewStudentId === st.id;
                        return (
                          <div 
                            key={st.id} 
                            onClick={() => setBulkPreviewStudentId(st.id)}
                            className={`p-2.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                              isPreviewing ? 'bg-neutral-800/40 border-l-4 border-amber-400' : 'hover:bg-neutral-850/20'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkPrintSelectedIds(prev => [...prev, st.id]);
                                  } else {
                                    setBulkPrintSelectedIds(prev => prev.filter(id => id !== st.id));
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-2 border-neutral-700 bg-neutral-950 text-amber-500 focus:ring-0 cursor-pointer"
                              />
                              <div className="min-w-0" onClick={() => setBulkPreviewStudentId(st.id)}>
                                <span className={`text-[11px] font-black uppercase block tracking-tight line-clamp-1 cursor-pointer ${isSelected ? 'text-white' : 'text-neutral-450'}`}>
                                  {st.name}
                                </span>
                                <span className="text-[8.5px] font-mono font-bold text-neutral-500 uppercase tracking-widest block mt-0.5">
                                  ID: {st.rollNumber || st.id.substring(0, 8).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-400/5 px-2 py-0.5 uppercase shrink-0 border border-amber-400/10">
                              {st.class}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Column Right: Interactive Previewer */}
                <div className="lg:col-span-7 flex flex-col space-y-4 border-t lg:border-t-0 lg:border-l border-neutral-800/80 lg:pl-6 pt-4 lg:pt-0 overflow-y-auto">
                  <div className="flex items-center justify-between shrink-0">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                      Step 2: Real-time Aesthetic Layout Preview
                    </label>
                    <div className="flex items-center gap-1 bg-neutral-950 p-1 border-2 border-neutral-800 text-[9px] font-mono">
                      <button
                        type="button"
                        onClick={() => setBulkPrintTheme('dark')}
                        className={`px-2 py-0.5 uppercase font-black tracking-wider transition-colors cursor-pointer ${
                          bulkPrintTheme === 'dark' ? 'bg-amber-400 text-black' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Midnight
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkPrintTheme('light')}
                        className={`px-2 py-0.5 uppercase font-black tracking-wider transition-colors cursor-pointer ${
                          bulkPrintTheme === 'light' ? 'bg-amber-400 text-black' : 'text-neutral-400 hover:text-white'
                        }`}
                      >
                        Eco-Ink
                      </button>
                    </div>
                  </div>

                  {previewStudent ? (
                    <div className="flex-1 flex flex-col justify-center items-center gap-6 py-6 px-4 bg-neutral-950 border-2 border-neutral-800 rounded p-6">
                      
                      {/* Live Front Preview */}
                      <div className="flex flex-col xl:flex-row items-center gap-6">
                        
                        {/* Front Card */}
                        <div className={`w-[314px] h-[198px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                          bulkPrintTheme === 'dark'
                            ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                            : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-400" />
                          
                          {/* Card Header */}
                          <div className={`px-3 pt-2.5 flex items-center justify-between border-b pb-1 ${
                            bulkPrintTheme === 'dark' ? 'border-neutral-800/60' : 'border-neutral-200'
                          }`}>
                            <div className="flex items-center gap-1">
                              <div className="w-4.5 h-4.5 bg-amber-400 text-black rounded-xs flex items-center justify-center font-black text-[9px] tracking-tighter">
                                SH
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider block ${
                                bulkPrintTheme === 'dark' ? 'text-white' : 'text-neutral-800'
                              }`}>SHCA-Sawla</span>
                            </div>
                            <span className="text-[5.5px] font-black bg-emerald-950/80 text-emerald-400 border border-emerald-905 py-0.5 px-1.5 rounded-sm uppercase tracking-wide">
                              Active Pass
                            </span>
                          </div>

                          {/* Card Body */}
                          <div className="px-3 py-1 flex gap-2.5 flex-1 items-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <div className={`w-13 h-13 rounded flex items-center justify-center overflow-hidden shrink-0 border ${
                                bulkPrintTheme === 'dark' ? 'bg-neutral-955 border-neutral-750' : 'bg-neutral-200 border-neutral-350'
                              }`}>
                                {previewStudent.photoUrl ? (
                                  <img 
                                    src={previewStudent.photoUrl} 
                                    alt={previewStudent.name} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className={`font-mono font-black text-[15px] uppercase ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                                  }`}>
                                    {previewStudent.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <span className={`text-[4.5px] font-mono tracking-widest uppercase font-black ${
                                bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-400'
                              }`}>STUDENT INFO</span>
                            </div>

                            <div className="flex-1 space-y-1">
                              <div>
                                <span className={`text-[6px] font-mono block uppercase font-bold ${
                                  bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                }`}>Pupil Name</span>
                                <span className={`text-[11px] font-black block uppercase tracking-tight line-clamp-1 ${
                                  bulkPrintTheme === 'dark' ? 'text-white' : 'text-neutral-900'
                                }`}>
                                  {previewStudent.name}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-1">
                                <div>
                                  <span className={`text-[6px] font-mono block uppercase font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                  }`}>Class</span>
                                  <span className="text-[9.5px] font-extrabold text-amber-500 font-mono">
                                    {previewStudent.class}
                                  </span>
                                </div>
                                <div>
                                  <span className={`text-[6px] font-mono block uppercase font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-500' : 'text-neutral-450'
                                  }`}>Gender</span>
                                  <span className={`text-[8px] font-bold ${
                                    bulkPrintTheme === 'dark' ? 'text-neutral-300' : 'text-neutral-700'
                                  }`}>
                                    {previewStudent.gender || '—'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[7px] font-mono uppercase tracking-wide flex items-center gap-1 text-neutral-400">
                                REG-ID:
                                <strong className={`font-mono px-1 border rounded-sm ${
                                  bulkPrintTheme === 'dark' ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-neutral-800'
                                }`}>
                                  {previewStudent.rollNumber || 'SHC-' + previewStudent.id.substring(0, 5).toUpperCase()}
                                </strong>
                              </div>
                            </div>

                            <div className={`p-1 border rounded shrink-0 flex flex-col items-center justify-center gap-0.5 bg-white`}>
                              {bulkQrCodes[previewStudent.id] ? (
                                <img 
                                  src={bulkQrCodes[previewStudent.id]} 
                                  alt="QR Code Pass" 
                                  className="w-10 h-10 object-contain"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-neutral-100 flex items-center justify-center">
                                  <RefreshCw size={12} className="text-neutral-400 animate-spin" />
                                </div>
                              )}
                              <span className="text-[4px] font-mono font-black tracking-widest text-neutral-950">GATE PASS</span>
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className={`px-3.5 py-1 text-[6.5px] font-mono border-t flex items-center justify-between ${
                            bulkPrintTheme === 'dark' ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-450' : 'bg-neutral-100 border-neutral-200 text-neutral-600'
                          }`}>
                            <span>SYSTEM ACCREDITED <strong className={`font-black ${bulkPrintTheme === 'dark' ? 'text-white' : 'text-black'}`}>EXP: {expiryDate}</strong></span>
                            <span className="text-amber-500 font-extrabold font-mono text-[6.5px] uppercase tracking-wider">{termName}</span>
                          </div>
                        </div>

                        {/* Back Card */}
                        <div className={`w-[314px] h-[198px] relative rounded-xl border-2 shadow-xl overflow-hidden flex flex-col justify-between shrink-0 transition-all duration-300 ${
                          bulkPrintTheme === 'dark'
                            ? 'bg-gradient-to-br from-neutral-900 via-neutral-900 to-black text-white border-neutral-700'
                            : 'bg-gradient-to-br from-white via-neutral-50 to-neutral-100 text-neutral-900 border-neutral-300 shadow-sm'
                        }`}>
                          <div className="absolute top-0 left-0 right-0 h-1 bg-neutral-800" />
                          <div className="px-3.5 pt-2 border-b pb-1 border-neutral-800/50">
                            <span className="text-[7.5px] font-mono font-extrabold text-neutral-400 uppercase tracking-widest">
                              SECURITY CARD POLICY &amp; RULES
                            </span>
                          </div>

                          <div className="px-3.5 py-1.5 flex-1 flex flex-col justify-between">
                            <ol className="text-[6.5px] list-decimal list-inside space-y-0.5 text-neutral-400 font-bold leading-tight">
                              <li>This card remains the property of SHCA-Sawla.</li>
                              <li>Always present this card for scanning &amp; gate check-ins.</li>
                              <li>Loss of credential elements must be reported immediately.</li>
                              <li>Unauthorized duplication or counterfeit transfer is prohibited.</li>
                            </ol>

                            <div className="grid grid-cols-2 gap-2 text-[6.5px] font-mono border-t border-dashed border-neutral-800/40 pt-1.5 mt-1">
                              <div>
                                <span className="text-neutral-500 block text-[5px]">Guardian Mobile</span>
                                <strong className="text-white block uppercase tracking-tight">{previewStudent.guardianPhone || 'NOT ENROLLED'}</strong>
                              </div>
                              <div className="text-right">
                                <span className="text-neutral-500 block text-[5px]">Authorized Registrar</span>
                                <strong className="text-amber-400 block uppercase tracking-tight">YAKUBU HAKEEM</strong>
                              </div>
                            </div>

                            <div className="text-center text-[5px] font-mono font-black py-0.5 bg-neutral-950/40 border border-neutral-850 text-neutral-500 uppercase tracking-widest rounded-sm mt-1">
                              Validation Active &bull; Valid thru Term Closure ({expiryDate})
                            </div>
                          </div>

                          <div className="bg-white px-3 py-1.5 border-t border-neutral-800/30 flex flex-col items-center justify-center shrink-0">
                            <div className="w-full flex items-stretch gap-[0.5px] h-3 bg-white">
                              {Array.from({ length: 32 }).map((_, idx) => (
                                <div key={idx} className={`flex-1 bg-black ${idx % 3 === 0 || idx % 4 === 1 ? 'opacity-100' : 'opacity-0'}`} />
                              ))}
                            </div>
                            <span className="text-[5.5px] font-mono font-bold text-neutral-600 tracking-wider block mt-0.5">
                              *SHCA-{previewStudent.id.substring(0, 8).toUpperCase()}*
                            </span>
                          </div>
                        </div>

                      </div>

                    </div>
                  ) : (
                    <div className="flex-1 bg-neutral-950 border-2 border-neutral-800 rounded p-12 text-center text-xs font-mono font-black uppercase text-neutral-600 flex items-center justify-center">
                      No active student selected for preview.
                    </div>
                  )}
                </div>

              </div>

              {/* Bottom Actions */}
              <div className="border-t border-neutral-800 pt-5 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="text-xs font-mono text-neutral-400">
                  Total Selected: <strong className="text-amber-400 font-extrabold text-sm">{bulkPrintSelectedIds.length}</strong> student passes ready.
                </div>
                
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleBulkPrint}
                    disabled={bulkPrintSelectedIds.length === 0}
                    className="flex-1 sm:flex-initial py-3 px-6 bg-amber-400 hover:bg-amber-300 disabled:bg-neutral-800 disabled:text-neutral-600 text-black font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(251,191,36,0.25)]"
                  >
                    <Printer size={14} className="stroke-[2.5]" />
                    <span>PRINT {bulkPrintSelectedIds.length} SELECTED BADGES</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBulkPrintModal(false)}
                    className="w-full sm:w-auto py-3 px-5 bg-neutral-950 hover:bg-neutral-850 text-neutral-450 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850 cursor-pointer"
                  >
                    Close Desk
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Academic Cohort Promotion Modal Overlay */}
      {showPromotionModal && (
        <div className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-neutral-900 border-4 border-amber-500 p-6 md:p-8 space-y-6 shadow-[8px_8px_0px_0px_rgba(245,158,11,0.15)] text-white">
            <div className="flex justify-between items-start border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <Award size={22} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest font-mono">Academic Year Promotion Desk</h3>
                  <p className="text-[10px] text-neutral-400 uppercase font-mono font-bold mt-0.5">
                    {promotionTab === 'bulk' ? 'Bulk Grade Cohort Management' : 'Single Student Promotion & Repetition'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowPromotionModal(false);
                  setSelectedPromoStudentId('');
                }} 
                className="p-1 cursor-pointer text-neutral-450 hover:text-white transition-colors"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-neutral-800 gap-1">
              <button
                type="button"
                onClick={() => setPromotionTab('bulk')}
                className={`flex-1 py-2 px-4 text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'bulk'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                👥 Bulk Cohorts
              </button>
              <button
                type="button"
                onClick={() => setPromotionTab('single')}
                className={`flex-1 py-2 px-4 text-xs font-mono font-black uppercase tracking-wider border-b-2 transition-all ${
                  promotionTab === 'single'
                    ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-neutral-400 hover:text-white'
                }`}
              >
                👤 Single Student
              </button>
            </div>

            {promotionTab === 'bulk' ? (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <p className="text-neutral-300 leading-relaxed font-semibold">
                    This utility will promote all currently active pupils school-wide to the next academic level in bulk. Pupils in final year <strong className="text-amber-400 font-mono">B9 (JHS 3)</strong> will be marked completed/graduated and set to inactive.
                  </p>

                  <div className="bg-neutral-950 border border-neutral-850 p-4 space-y-3">
                    <span className="text-[9px] font-mono font-black text-neutral-500 uppercase tracking-widest block font-bold">Standard Grade Cohort Transition Flow</span>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10px] text-neutral-300 divide-y divide-neutral-900">
                      <div className="flex justify-between py-1 border-none"><span>Nursery ➜ KG 1</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1 border-none"><span>KG 1 ➜ KG 2</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>KG 2 ➜ B1 (Primary)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B1 ➜ B2</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B2 ➜ B3</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B3 ➜ B4</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B4 ➜ B5</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B5 ➜ B6</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B6 ➜ B7 (JHS 1)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B7 ➜ B8</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B8 ➜ B9 (JHS 3)</span> <span className="text-emerald-400 font-bold">Promoted</span></div>
                      <div className="flex justify-between py-1"><span>B9 ➜ Left/Graduated</span> <span className="text-amber-500 font-bold">Graduated</span></div>
                    </div>
                  </div>

                  <div className="bg-amber-955/15 border border-amber-500/20 p-4 font-mono text-[10px] text-amber-500 uppercase font-black tracking-widest leading-relaxed font-bold">
                    ⚠️ WARNING: THIS PERFORMANCE ACTION IS PERMANENT AND NOT REVERSIBLE. IT WILL INSTANTLY ALTER THE GRADE BINDINGS OF ALL {students.filter(s => s.active).length} ACTIVE PUPILS. 
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Confirm Mass Promotion Action</label>
                    <p className="text-[10px] text-neutral-400 font-semibold mb-1">Type the word <strong className="text-white font-mono">PROMOTE</strong> below to authorize savior database updates:</p>
                    <input
                      type="text"
                      value={promotionConfirmedText}
                      onChange={(e) => setPromotionConfirmedText(e.target.value)}
                      placeholder="Type PROMOTE here..."
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono uppercase text-xs p-3 font-black focus:outline-none"
                    />
                  </div>
                </div>

                <div className="border-t border-neutral-800 pt-4 flex gap-3">
                  <button
                    type="button"
                    disabled={promotionConfirmedText !== 'PROMOTE'}
                    onClick={() => {
                      promoteAllStudents();
                      showToast("Successfully completed mass cohort promotions school-wide! Inactive pupils purged.");
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                    }}
                    className={`flex-1 py-3 px-4 font-black uppercase text-xs tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 border-none ${
                      promotionConfirmedText === 'PROMOTE'
                        ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-[4px_4px_0px_0px_#10b981]'
                        : 'bg-neutral-950 text-neutral-600 border border-neutral-850 cursor-not-allowed opacity-50'
                    }`}
                  >
                    ⚡ Execute Cohort Promotions
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                      setPromotionConfirmedText('');
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Abort
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-4 font-sans text-xs">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-mono font-black text-neutral-450 tracking-wider block font-bold">Select Student to Manage</label>
                    <select
                      value={selectedPromoStudentId}
                      onChange={(e) => setSelectedPromoStudentId(e.target.value)}
                      className="w-full bg-neutral-950 border-2 border-neutral-800 focus:border-amber-400 text-white font-mono text-xs p-3 font-semibold focus:outline-none"
                    >
                      <option value="">-- Choose active student --</option>
                      {students.filter(s => s.active).map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name} ({student.class}) - {student.rollNumber || 'No RFID'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPromoStudentId && (() => {
                    const studentInHand = students.find(s => s.id === selectedPromoStudentId);
                    if (!studentInHand) return null;

                    const CLASS_PROMOTION_MAP: Record<StudentClass, { nextClass: StudentClass | null; category: 'Pre-school' | 'Primary' | 'JHS'; completes: boolean }> = {
                      'Nursery': { nextClass: 'KG1', category: 'Pre-school', completes: false },
                      'KG1':     { nextClass: 'KG2', category: 'Pre-school', completes: false },
                      'KG2':     { nextClass: 'B1',  category: 'Primary',    completes: false },
                      'B1':      { nextClass: 'B2',  category: 'Primary',    completes: false },
                      'B2':      { nextClass: 'B3',  category: 'Primary',    completes: false },
                      'B3':      { nextClass: 'B4',  category: 'Primary',    completes: false },
                      'B4':      { nextClass: 'B5',  category: 'Primary',    completes: false },
                      'B5':      { nextClass: 'B6',  category: 'Primary',    completes: false },
                      'B6':      { nextClass: 'B7',  category: 'JHS',        completes: false },
                      'B7':      { nextClass: 'B8',  category: 'JHS',        completes: false },
                      'B8':      { nextClass: 'B9',  category: 'JHS',        completes: false },
                      'B9':      { nextClass: null,  category: 'JHS',        completes: true }
                    };

                    const mapEntry = CLASS_PROMOTION_MAP[studentInHand.class];
                    const nextClassString = mapEntry?.completes ? 'Completed/Graduated' : mapEntry?.nextClass || 'N/A';
                    
                    return (
                      <div className="space-y-4">
                        {/* Student Info Card */}
                        <div className="bg-neutral-950 border border-neutral-800 p-4 rounded-sm flex items-center gap-4">
                          {studentInHand.photoUrl ? (
                            <img
                              src={studentInHand.photoUrl}
                              alt={studentInHand.name}
                              referrerPolicy="no-referrer"
                              className="w-12 h-12 rounded object-cover border-2 border-neutral-800"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded flex items-center justify-center text-neutral-500 font-mono font-bold uppercase text-lg">
                              {studentInHand.name.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span className="text-amber-400 font-black font-mono text-[9px] tracking-wider block uppercase font-bold">Selected Student Record</span>
                            <span className="text-xs font-black text-white block truncate uppercase">{studentInHand.name}</span>
                            <div className="flex items-center gap-2 mt-1 text-[9px] font-mono text-neutral-400">
                              <span>Grade: <strong className="text-white">{studentInHand.class}</strong> ({studentInHand.category})</span>
                              <span>&bull;</span>
                              <span>ID: <strong className="text-white">{studentInHand.id.substring(0,8)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Actions Desk */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Promotion Option Block */}
                          <div className="bg-neutral-950/60 border border-neutral-850 p-4 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase text-[9px] font-mono tracking-wider">
                                <Award size={13} className="stroke-[2]" />
                                <span>Academic Promotion</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-semibold">
                                Promote this student to the next logical academic standard class level. 
                              </p>
                              <div className="mt-3 bg-neutral-900 p-2 border border-neutral-850 rounded-sm font-mono text-[10px] space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Current Rank:</span>
                                  <span className="font-extrabold text-neutral-300">{studentInHand.class}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-neutral-500">Next Target:</span>
                                  <span className="font-extrabold text-emerald-400 uppercase">{nextClassString}</span>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role !== 'Administrator') {
                                  alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                                  return;
                                }
                                if (mapEntry?.completes) {
                                  updateStudent({
                                    ...studentInHand,
                                    active: false
                                  });
                                  showToast(`Successfully marked ${studentInHand.name} as Completed/Graduated and set to inactive.`);
                                } else if (mapEntry?.nextClass) {
                                  updateStudent({
                                    ...studentInHand,
                                    class: mapEntry.nextClass,
                                    category: mapEntry.category
                                  });
                                  showToast(`Successfully promoted ${studentInHand.name} to ${mapEntry.nextClass} (${mapEntry.category}).`);
                                }
                                setSelectedPromoStudentId('');
                              }}
                              className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                            >
                              ⚡ Promote to {mapEntry?.completes ? 'Graduate' : nextClassString}
                            </button>
                          </div>

                          {/* Repetition Block */}
                          <div className="bg-neutral-950/60 border border-neutral-850 p-4 space-y-3 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 text-amber-500 font-bold uppercase text-[9px] font-mono tracking-wider">
                                <RefreshCw size={12} className="stroke-[2]" />
                                <span>Class Repetition</span>
                              </div>
                              <p className="text-[10px] text-neutral-400 mt-2 leading-relaxed font-semibold">
                                Retain this student in their current grade class, or select a custom class to repeat.
                              </p>
                              <div className="mt-3 space-y-2">
                                <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest block font-bold">Select Target Grade</span>
                                <select
                                  id="single-student-repeat-class-selector"
                                  className="w-full bg-neutral-900 border border-neutral-800 text-neutral-300 font-mono text-[10px] p-2 focus:outline-none focus:border-amber-400"
                                  defaultValue={studentInHand.class}
                                >
                                  {['Nursery', 'KG1', 'KG2', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'B9'].map(cls => (
                                    <option key={cls} value={cls}>
                                      {cls} (Repeat grade class)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                if (currentUser?.role !== 'Administrator') {
                                  alert('Access Denied: Only Administrators are permitted to make student grade alterations.');
                                  return;
                                }
                                const selectEl = document.getElementById('single-student-repeat-class-selector') as HTMLSelectElement;
                                const targetClass = selectEl?.value as StudentClass;
                                
                                if (targetClass) {
                                  const targetCategory = getClassCategory(targetClass);
                                  updateStudent({
                                    ...studentInHand,
                                    class: targetClass,
                                    category: targetCategory,
                                    active: true
                                  });
                                  showToast(`Successfully set ${studentInHand.name} to repeat/enroll in grade class: ${targetClass}.`);
                                }
                                setSelectedPromoStudentId('');
                              }}
                              className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-black font-mono font-black uppercase text-[10px] tracking-wider border-none rounded-sm transition-colors cursor-pointer"
                            >
                              🔄 Confirm Repetition Grade
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {!selectedPromoStudentId && (
                    <div className="bg-neutral-950/40 border border-neutral-850 border-dashed rounded-sm p-8 text-center text-neutral-500 font-mono text-[10px] leading-relaxed">
                      Select a pupil from school registry roster above to start single promotion / repetition desk operations.
                    </div>
                  )}
                </div>

                <div className="border-t border-neutral-800 pt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPromotionModal(false);
                      setSelectedPromoStudentId('');
                    }}
                    className="w-1/3 py-3 px-4 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white font-mono uppercase text-xs tracking-wider transition-colors border border-neutral-850"
                  >
                    Close Desk
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
