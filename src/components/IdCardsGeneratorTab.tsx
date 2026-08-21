/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { useApp, getStudentB9ExpiryDate } from '../context/AppContext';
import { SchoolLogo } from './SchoolLogo';
import { Student, StudentClass, UserAccount, UserRole } from '../types';
import { formatPupilId } from '../utils/pupilIdUtils';
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
  Trash2,
  Users,
  Briefcase,
  BadgeCheck
} from 'lucide-react';

// Mapping accent colors
const getAccentColorHex = (color: string) => {
  switch (color) {
    case 'emerald': return '#10b981';
    case 'blue': return '#3b82f6';
    case 'red': return '#ef4444';
    case 'violet': return '#8b5cf6';
    case 'orange': return '#f97316';
    case 'pink': return '#ec4899';
    case 'cyan': return '#06b6d4';
    case 'gold': return '#d97706';
    case 'amber':
    default: return '#fbbf24';
  }
};

const getAccentDullHex = (color: string) => {
  switch (color) {
    case 'emerald': return '#047857';
    case 'blue': return '#1d4ed8';
    case 'red': return '#b91c1c';
    case 'violet': return '#6d28d9';
    case 'orange': return '#c2410c';
    case 'pink': return '#be185d';
    case 'cyan': return '#0e7490';
    case 'gold': return '#b45309';
    case 'amber':
    default: return '#d97706';
  }
};

export const IdCardsGeneratorTab: React.FC = () => {
  const { 
    students, 
    updateStudent, 
    users,
    updateStaff,
    registerStaff,
    activeTerm, 
    currentDate,
    playFeedbackSound,
    systemSettings
  } = useApp();

  // Mode state: 'pupil' | 'staff'
  const [activeMode, setActiveMode] = useState<'pupil' | 'staff'>('pupil');
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');

  const getLogoSvgHtml = (size = 18, forceFallback = false): string => {
    if (systemSettings?.schoolLogoUrl && !forceFallback) {
      const fallbackSvg = getLogoSvgHtml(size, true);
      return `
        <div style="display: inline-block; width: ${size}px; height: ${size}px; position: relative; vertical-align: middle;">
          <img src="${systemSettings.schoolLogoUrl}" style="width: ${size}px; height: ${size}px; object-fit: contain; border-radius: 50%;" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline-block';" />
          <span style="display: none; width: ${size}px; height: ${size}px; vertical-align: top;">
            ${fallbackSvg}
          </span>
        </div>
      `;
    }
    const sName = (systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY').toUpperCase();
    const sLoc = systemSettings?.customLocation || 'Sawla';
    const sMotto = systemSettings?.customMotto || 'Holiness Is Our Key';
    return `
      <svg width="${size}" height="${size}" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" style="border-radius: 50%;">
        <defs>
          <path id="academy-text-arc" d="M 52 205 A 148 148 0 1 1 348 205" fill="none" />
        </defs>
        <circle cx="200" cy="200" r="190" fill="#ffffff" stroke="#04563a" strokeWidth="11" />
        <circle cx="200" cy="200" r="146" fill="none" stroke="#04563a" strokeWidth="3.5" />
        <text>
          <textPath href="#academy-text-arc" startOffset="50%" textAnchor="middle" fill="#04563a" fontWeight="900" fontSize="23" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">
            ${sName}
          </textPath>
        </text>
        <g id="central-heraldic-shield">
          <path d="M 98 185 A 102 102 0 0 1 302 185 Z" fill="#009e60" stroke="#04563a" strokeWidth="3" />
          <path d="M 98 185 A 102 102 0 0 0 200 287 L 200 185 Z" fill="#024227" stroke="#04563a" strokeWidth="3" />
          <path d="M 200 185 L 200 287 A 102 102 0 0 0 302 185 Z" fill="#fbf7f4" stroke="#04563a" strokeWidth="3" />
        </g>
        <g id="upper-hemisphere-book-pen">
          <path d="M 134 180 C 168 174, 192 174, 200 181 C 208 174, 232 174, 266 180" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
          <path d="M 200 180 C 185 160, 163 160, 138 168 L 138 141 C 163 133, 185 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 200 180 C 215 160, 237 160, 262 168 L 262 141 C 237 133, 215 133, 200 153 Z" fill="#d0f2e5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 241 114 L 189 171 L 184 172 L 187 167 L 235 110 Z" fill="#ffffff" stroke="#04563a" strokeWidth="1.5" />
          <line x1="225" y1="126" x2="201" y2="152" stroke="#04563a" strokeWidth="1.5" />
        </g>
        <g id="lower-left-farming-tools">
          <path d="M 125 240 Q 120 230 131 228 L 150 242 L 139 254 Z" fill="#b0bec5" stroke="#37474f" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="127" y1="239" x2="187" y2="208" stroke="#cca480" strokeWidth="4" strokeLinecap="round" />
          <path d="M 179 248 C 170 230, 155 212, 140 204 L 144 200 C 160 209, 175 228, 184 246 Z" fill="#eceff1" stroke="#455a64" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        <g id="lower-right-hearth-broom">
          <path d="M 222 205 L 232 200 L 236 211 L 226 216 Z" fill="#212121" stroke="#000000" strokeWidth="1" />
          <line x1="227" y1="205" x2="263" y2="263" stroke="#424242" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="227" y1="205" x2="251" y2="267" stroke="#333333" strokeWidth="2.0" strokeLinecap="round" />
          <line x1="227" y1="205" x2="274" y2="257" stroke="#424242" strokeWidth="2.0" strokeLinecap="round" />
          <line x1="227" y1="205" x2="241" y2="268" stroke="#212121" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="227" y1="205" x2="281" y2="249" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="227" y1="205" x2="232" y2="269" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="225" y="209" width="9" height="3" rx="0.5" fill="#fbc02d" />
          <rect x="227" y="215" width="10" height="3.5" rx="0.5" fill="#fbc02d" transform="rotate(-15 227 215)" />
        </g>
        <g id="bottom-crest-banner">
          <circle cx="106" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
          <text x="106" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">20</text>
          <circle cx="294" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
          <text x="294" y="308" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="13" fontFamily="system-ui, -apple-system, sans-serif">03</text>
          <path d="M 120 307 Q 200 334 280 307 L 277 285 Q 200 312 123 285 Z" fill="#024227" stroke="#04563a" strokeWidth="3.5" strokeLinejoin="round" />
          <text x="200" y="304" textAnchor="middle" fill="#ffffff" fontWeight="900" fontSize="14" letterSpacing="1px" fontFamily="system-ui, -apple-system, sans-serif">${sLoc}</text>
        </g>
        <text x="200" y="346" textAnchor="middle" fill="#024227" fontWeight="900" fontSize="13" letterSpacing="0.8px" fontFamily="Georgia, serif">${sMotto}</text>
      </svg>
    `;
  };

  // Design styles: 'classic' | 'tech' | 'artistic' | 'bold-banner' | 'vintage' | 'modern-minimal' | 'geometric-cyber' | 'royal-gold'
  const [cardDesignStyle, setCardDesignStyle] = useState<'classic' | 'tech' | 'artistic' | 'bold-banner' | 'vintage' | 'modern-minimal' | 'geometric-cyber' | 'royal-gold'>('classic');

  // Search and selection state
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Customization options
  const [cardTheme, setCardTheme] = useState<'dark' | 'light' | 'green-blue' | 'emerald-teal' | 'royal-purple' | 'sunset-orange' | 'neon-cyan' | 'vintage-parchment' | 'coral-pink'>('green-blue');
  const [accentColor, setAccentColor] = useState<'amber' | 'emerald' | 'blue' | 'red' | 'violet' | 'orange' | 'pink' | 'cyan' | 'gold'>('amber');
  const [showQrCode, setShowQrCode] = useState(true);
  const [customExpiry, setCustomExpiry] = useState('');

  // Font Customization
  const [cardFontFamily, setCardFontFamily] = useState<'sans' | 'serif' | 'mono' | 'space' | 'playfair'>('sans');
  const [cardFontSize, setCardFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [cardFontColor, setCardFontColor] = useState<'theme' | 'white' | 'black' | 'yellow' | 'green' | 'blue' | 'purple'>('theme');

  // Activation Status for Local Form Workspace
  const [editDeactivated, setEditDeactivated] = useState(false);

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

  // Editable Staff form fields
  const [editRole, setEditRole] = useState<UserRole>('Teacher');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editStaffPhone, setEditStaffPhone] = useState('');

  const classes: StudentClass[] = [
    'Nursery', 'KG1', 'KG2',
    'B1', 'B2', 'B3', 'B4', 'B5', 'B6',
    'B7', 'B8', 'B9'
  ];

  // Resolve selected student and staff
  const activeStudent = students.find(s => s.id === selectedStudentId);
  const activeStaff = users.find(u => u.id === selectedStaffId);

  // Initialize selected entity into workspace
  useEffect(() => {
    if (activeMode === 'pupil' && activeStudent) {
      setEditName(activeStudent.name);
      setEditClass(activeStudent.class);
      setEditRollNumber(activeStudent.rollNumber || '');
      setEditGender(activeStudent.gender);
      setEditGuardianPhone(activeStudent.guardianPhone || '');
      setEditDeactivated(!!activeStudent.idCardDeactivated);
    } else if (activeMode === 'staff' && activeStaff) {
      setEditName(activeStaff.name);
      setEditEmail(activeStaff.email);
      setEditRole(activeStaff.role);
      setEditEmployeeId(activeStaff.employeeId || 'EMP-' + activeStaff.id.substring(activeStaff.id.indexOf('_') + 1).slice(0, 6).toUpperCase());
      setEditDepartment(activeStaff.department || 'Academic');
      setEditStaffPhone(activeStaff.momoNumber || '');
      setEditGender(undefined);
      setEditDeactivated(!!activeStaff.idCardDeactivated);
    } else {
      setEditName('');
      setEditRollNumber('');
      setEditGuardianPhone('');
      setEditEmail('');
      setEditEmployeeId('');
      setEditDepartment('');
      setEditStaffPhone('');
      setEditDeactivated(false);
    }
    stopCamera();
  }, [selectedStudentId, selectedStaffId, activeMode]);

  // Generate QR Code for the active entity
  useEffect(() => {
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (targetEntity) {
      const qrPayload = JSON.stringify({
        id: targetEntity.id,
        name: targetEntity.name,
        type: activeMode,
        ...(activeMode === 'pupil' 
          ? { rollNumber: (targetEntity as Student).rollNumber || '' }
          : { employeeId: (targetEntity as any).employeeId || '' }
        )
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
  }, [activeStudent, activeStaff, activeMode]);

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

  // Filter staff based on search query
  const filteredStaff = users.filter(u => {
    const matchesSearch = searchQuery.trim() === '' ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.employeeId && u.employeeId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.department && u.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  // Calculate default expiration
  const getExpiryInfo = (studentClass?: string) => {
    const termName = activeTerm?.name || "Term Calendar";
    // Default expiration is end of the term, let's say 2026-08-31 or activeTerm's last day
    const termDays = activeTerm?.schoolDays || [];
    const lastDay = termDays[termDays.length - 1] || "2026-08-14";
    
    let expiryDate = lastDay;
    if (studentClass) {
      expiryDate = getStudentB9ExpiryDate(studentClass, currentDate, activeTerm);
    }
    
    return {
      termName,
      expiryDate: customExpiry || expiryDate,
      isExpired: expiryDate < currentDate
    };
  };

  const expiryInfo = getExpiryInfo(activeStudent?.class);

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
      case 'violet':
        if (type === 'bg') return 'bg-violet-500';
        if (type === 'text') return 'text-violet-400';
        if (type === 'border') return 'border-violet-500';
        if (type === 'hoverBg') return 'hover:bg-violet-600';
        return 'focus:ring-violet-400';
      case 'orange':
        if (type === 'bg') return 'bg-orange-500';
        if (type === 'text') return 'text-orange-400';
        if (type === 'border') return 'border-orange-500';
        if (type === 'hoverBg') return 'hover:bg-orange-600';
        return 'focus:ring-orange-400';
      case 'pink':
        if (type === 'bg') return 'bg-pink-500';
        if (type === 'text') return 'text-pink-400';
        if (type === 'border') return 'border-pink-500';
        if (type === 'hoverBg') return 'hover:bg-pink-600';
        return 'focus:ring-pink-400';
      case 'cyan':
        if (type === 'bg') return 'bg-cyan-500';
        if (type === 'text') return 'text-cyan-400';
        if (type === 'border') return 'border-cyan-500';
        if (type === 'hoverBg') return 'hover:bg-cyan-600';
        return 'focus:ring-cyan-400';
      case 'gold':
        if (type === 'bg') return 'bg-amber-500';
        if (type === 'text') return 'text-amber-500';
        if (type === 'border') return 'border-amber-500';
        if (type === 'hoverBg') return 'hover:bg-amber-600';
        return 'focus:ring-amber-500';
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
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (videoRef.current && targetEntity) {
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
        
        if (activeMode === 'pupil' && activeStudent) {
          updateStudent({
            ...activeStudent,
            photoUrl: dataUrl
          });
        } else if (activeMode === 'staff' && activeStaff) {
          updateStaff(
            activeStaff.id,
            activeStaff.name,
            activeStaff.email,
            activeStaff.role,
            activeStaff.assignedClass,
            !!activeStaff.mfaEnabled,
            !!activeStaff.passwordEnabled,
            activeStaff.password || '',
            activeStaff.assignedClasses,
            activeStaff.stipendSalary,
            activeStaff.momoNumber,
            activeStaff.momoName,
            dataUrl,
            activeStaff.employeeId,
            activeStaff.department
          );
        }
        
        stopCamera();
        if (playFeedbackSound) playFeedbackSound('click');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (file && targetEntity) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const size = Math.min(img.width, img.height);
          canvas.width = 350;
          canvas.height = 350;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const xOffset = (img.width - size) / 2;
            const yOffset = (img.height - size) / 2;
            ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, 350, 350);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

            if (activeMode === 'pupil' && activeStudent) {
              updateStudent({
                ...activeStudent,
                photoUrl: dataUrl
              });
            } else if (activeMode === 'staff' && activeStaff) {
              updateStaff(
                activeStaff.id,
                activeStaff.name,
                activeStaff.email,
                activeStaff.role,
                activeStaff.assignedClass,
                !!activeStaff.mfaEnabled,
                !!activeStaff.passwordEnabled,
                activeStaff.password || '',
                activeStaff.assignedClasses,
                activeStaff.stipendSalary,
                activeStaff.momoNumber,
                activeStaff.momoName,
                dataUrl,
                activeStaff.employeeId,
                activeStaff.department
              );
            }
          }
          if (playFeedbackSound) playFeedbackSound('click');
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (targetEntity && window.confirm(`Remove profile photograph for ${targetEntity.name}?`)) {
      if (activeMode === 'pupil' && activeStudent) {
        updateStudent({
          ...activeStudent,
          photoUrl: undefined
        });
      } else if (activeMode === 'staff' && activeStaff) {
        updateStaff(
          activeStaff.id,
          activeStaff.name,
          activeStaff.email,
          activeStaff.role,
          activeStaff.assignedClass,
          !!activeStaff.mfaEnabled,
          !!activeStaff.passwordEnabled,
          activeStaff.password || '',
          activeStaff.assignedClasses,
          activeStaff.stipendSalary,
          activeStaff.momoNumber,
          activeStaff.momoName,
          '', // clear
          activeStaff.employeeId,
          activeStaff.department
        );
      }
    }
  };

  // Profile data updates
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (!targetEntity || !editName.trim()) return;

    setIsUpdatingProfile(true);
    try {
      if (activeMode === 'pupil' && activeStudent) {
        updateStudent({
          ...activeStudent,
          name: editName.trim(),
          class: editClass,
          rollNumber: editRollNumber.trim(),
          gender: editGender,
          guardianPhone: editGuardianPhone.trim(),
          idCardDeactivated: editDeactivated
        });
        alert('Student registration profile successfully synchronized!');
      } else if (activeMode === 'staff' && activeStaff) {
        const result = updateStaff(
          activeStaff.id,
          editName.trim(),
          editEmail.trim() || activeStaff.email,
          editRole,
          activeStaff.assignedClass,
          !!activeStaff.mfaEnabled,
          !!activeStaff.passwordEnabled,
          activeStaff.password || '',
          activeStaff.assignedClasses,
          activeStaff.stipendSalary,
          editStaffPhone.trim() || activeStaff.momoNumber,
          activeStaff.momoName,
          activeStaff.photoUrl,
          editEmployeeId.trim(),
          editDepartment.trim(),
          activeStaff.gender,
          activeStaff.employmentType,
          editDeactivated
        );
        if (result.success) {
          alert('Staff profile successfully synchronized!');
        } else {
          alert(result.error || 'Failed to update staff profile.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update registration profile.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Helper to resolve font colors
  const getFontColorHex = (fontColor: string, isDarkTheme: boolean) => {
    switch (fontColor) {
      case 'white': return '#ffffff';
      case 'black': return '#111111';
      case 'yellow': return '#fbbf24';
      case 'green': return '#10b981';
      case 'blue': return '#3b82f6';
      case 'purple': return '#8b5cf6';
      case 'theme':
      default: return isDarkTheme ? '#ffffff' : '#111111';
    }
  };

  const getFontFamilyStyle = (font: string) => {
    switch (font) {
      case 'serif': return "font-family: 'Georgia', serif !important;";
      case 'mono': return "font-family: 'JetBrains Mono', monospace !important;";
      case 'space': return "font-family: 'Space Grotesk', sans-serif !important;";
      case 'playfair': return "font-family: 'Playfair Display', serif !important;";
      case 'sans':
      default: return "font-family: 'Inter', sans-serif !important;";
    }
  };

  // Direct Print Layout Renderer using standard hidden iframe
  const handlePrintBadge = () => {
    const targetEntity = activeMode === 'pupil' ? activeStudent : activeStaff;
    if (!targetEntity) return;

    let printIframe = document.getElementById('idcard-print-iframe') as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement('iframe');
      printIframe.id = 'idcard-print-iframe';
      printIframe.setAttribute('style', 'position:fixed; right:0; bottom:0; width:0; height:0; border:0; pointer-events:none;');
      document.body.appendChild(printIframe);
    }

    const iframeDoc = printIframe.contentWindow?.document || printIframe.contentDocument;
    if (!iframeDoc) return;

    const isDark = cardTheme !== 'light' && cardTheme !== 'vintage-parchment';
    
    const accentHex = getAccentColorHex(accentColor);
    const accentDullHex = getAccentDullHex(accentColor);

    const isPupil = activeMode === 'pupil';
    const name = targetEntity.name;
    const photoUrl = targetEntity.photoUrl;
    const expiryDateStr = isPupil ? expiryInfo.expiryDate : "Permanent";
    
    // Abstracted fields for multi-side layout
    const labelLine1 = isPupil ? "Class" : "Role / Job Title";
    const valLine1 = isPupil ? (targetEntity as Student).class : (targetEntity as UserAccount).role;
    
    const labelLine2 = isPupil ? "Gender" : "Department";
    const valLine2 = isPupil ? ((targetEntity as Student).gender || '—') : ((targetEntity as any).department || 'Academic');

    const labelLine3 = isPupil ? "REG-ID" : "Employee ID";
    const valLine3 = isPupil 
      ? ((targetEntity as Student).rollNumber || formatPupilId(targetEntity as Student, systemSettings))
      : ((targetEntity as any).employeeId || 'EMP-' + targetEntity.id.substring(targetEntity.id.indexOf('_') + 1).slice(0, 6).toUpperCase());

    const qrLabel = isPupil ? "GATE PASS" : "STAFF ACCESS";
    const footerLeftLabel = isPupil ? "SYSTEM ACCREDITED" : "STAFF REGISTERED";
    const footerRightLabel = isPupil ? expiryInfo.termName : "SHCA SECURITY";

    const guardianOrPhoneLabel = isPupil ? "Guardian Mobile" : "Contact Phone";
    const guardianOrPhoneVal = isPupil 
      ? ((targetEntity as Student).guardianPhone || 'NOT ENROLLED')
      : ((targetEntity as UserAccount).momoNumber || 'NOT ENROLLED');

    const isDeactivated = !!targetEntity.idCardDeactivated;
    const passStatusBadge = isDeactivated 
      ? 'deactivated-pass-badge'
      : isPupil 
        ? (expiryInfo.isExpired ? 'expired-pass-badge' : 'active-pass-badge')
        : 'staff-pass-badge';
    const passStatusText = isDeactivated 
      ? 'Deactivated'
      : isPupil 
        ? (expiryInfo.isExpired ? 'Expired' : 'Active Pass')
        : 'Staff Pass';

    // Font layout overrides
    const chosenFontColorHex = getFontColorHex(cardFontColor, isDark);
    const textMain = `color: ${chosenFontColorHex} !important;`;
    const fontStyleAttr = getFontFamilyStyle(cardFontFamily);
    const sizeMultiplier = cardFontSize === 'small' ? 0.9 : cardFontSize === 'large' ? 1.1 : 1.0;

    // Set background styling depending on selected design style
    let cardBgFront = '';
    let cardBgBack = '';

    if (cardTheme === 'green-blue') {
      const gridOverlay = cardDesignStyle === 'tech' 
        ? ', linear-gradient(to right, rgba(20, 184, 166, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.08) 1px, transparent 1px)' 
        : '';
      const backgroundSize = cardDesignStyle === 'tech' ? 'background-size: 100% 100%, 16px 16px !important;' : '';
      cardBgFront = `
        background: linear-gradient(135deg, #0f5132 0%, #115e59 40%, #1e3a8a 100%)${gridOverlay} !important;
        ${backgroundSize}
        color: #ffffff !important;
        border: 1.5px solid #14b8a6 !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #0a3622 0%, #0f766e 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #0d9488 !important;
      `;
    } else if (cardTheme === 'emerald-teal') {
      const gridOverlay = cardDesignStyle === 'tech' 
        ? ', linear-gradient(to right, rgba(16, 185, 129, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(16, 185, 129, 0.08) 1px, transparent 1px)' 
        : '';
      const backgroundSize = cardDesignStyle === 'tech' ? 'background-size: 100% 100%, 16px 16px !important;' : '';
      cardBgFront = `
        background: linear-gradient(135deg, #04351c 0%, #064e3b 100%)${gridOverlay} !important;
        ${backgroundSize}
        color: #ffffff !important;
        border: 1.5px solid #10b981 !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #022c22 0%, #042f2e 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #059669 !important;
      `;
    } else if (cardTheme === 'royal-purple') {
      cardBgFront = `
        background: linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #4c1d95 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #a78bfa !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #110c36 0%, #2e1065 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #7c3aed !important;
      `;
    } else if (cardTheme === 'sunset-orange') {
      cardBgFront = `
        background: linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #b45309 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #fb923c !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #431407 0%, #7c2d12 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #ea580c !important;
      `;
    } else if (cardTheme === 'neon-cyan') {
      cardBgFront = `
        background: linear-gradient(135deg, #020617 0%, #0f172a 60%, #083344 100%) !important;
        color: #22d3ee !important;
        border: 1.5px solid #06b6d4 !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #020617 0%, #0f172a 100%) !important;
        color: #06b6d4 !important;
        border: 1.5px solid #0891b2 !important;
      `;
    } else if (cardTheme === 'vintage-parchment') {
      cardBgFront = `
        background: linear-gradient(135deg, #fefaf0 0%, #f9f5e8 50%, #f1ebcf 100%) !important;
        color: #3b2314 !important;
        border: 1.5px solid #854d0e !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #fefaf0 0%, #ebdcb9 100%) !important;
        color: #3b2314 !important;
        border: 1.5px solid #a16207 !important;
      `;
    } else if (cardTheme === 'coral-pink') {
      cardBgFront = `
        background: linear-gradient(135deg, #881337 0%, #9d174d 50%, #701a75 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #f472b6 !important;
      `;
      cardBgBack = `
        background: linear-gradient(135deg, #500724 0%, #4d0751 100%) !important;
        color: #ffffff !important;
        border: 1.5px solid #db2777 !important;
      `;
    } else {
      if (cardDesignStyle === 'tech') {
        const gridColor = isDark ? 'rgba(251, 191, 36, 0.05)' : 'rgba(251, 191, 36, 0.09)';
        const mainBg = isDark ? '#121212' : '#ffffff';
        cardBgFront = `
          background-color: ${mainBg} !important;
          background-image: linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px) !important;
          background-size: 16px 16px !important;
          color: ${isDark ? '#ffffff' : '#111111'} !important;
        `;
      } else if (cardDesignStyle === 'artistic') {
        const glowColor = accentHex + '20';
        const mainBg = isDark ? '#171717' : '#fcfcfc';
        cardBgFront = `
          background: radial-gradient(circle at 50px 50px, ${glowColor}, ${mainBg}) !important;
          color: ${isDark ? '#ffffff' : '#111111'} !important;
        `;
      } else if (cardDesignStyle === 'bold-banner') {
        const mainBg = isDark ? '#1a1a1a' : '#fefefe';
        cardBgFront = `
          background: ${mainBg} !important;
          color: ${isDark ? '#ffffff' : '#111111'} !important;
        `;
      } else if (cardDesignStyle === 'vintage') {
        cardBgFront = `
          background: linear-gradient(135deg, #fdfbf7 0%, #f5efe6 100%) !important;
          color: #2b1b17 !important;
          border: 3px double ${accentHex} !important;
          font-family: 'Georgia', serif !important;
        `;
      } else if (cardDesignStyle === 'modern-minimal') {
        const mainBg = isDark ? '#0c0c0c' : '#fcfcfc';
        cardBgFront = `
          background: ${mainBg} !important;
          color: ${isDark ? '#f5f5f5' : '#171717'} !important;
          border: 1px solid ${isDark ? '#262626' : '#e5e5e5'} !important;
          border-radius: 12px !important;
        `;
      } else if (cardDesignStyle === 'geometric-cyber') {
        cardBgFront = `
          background-color: #030712 !important;
          background-image: linear-gradient(60deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px), linear-gradient(-60deg, rgba(6, 182, 212, 0.05) 1px, transparent 1px) !important;
          background-size: 24px 24px !important;
          color: #e0f2fe !important;
          border: 1.5px solid #06b6d4 !important;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.2) !important;
        `;
      } else if (cardDesignStyle === 'royal-gold') {
        cardBgFront = `
          background: linear-gradient(135deg, #1e1b4b 0%, #111827 100%) !important;
          color: #fef08a !important;
          border: 2px solid #eab308 !important;
          box-shadow: inset 0 0 15px rgba(234, 179, 8, 0.25) !important;
        `;
      } else {
        // Classic
        cardBgFront = isDark 
          ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
          : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';
      }

      if (cardDesignStyle === 'vintage') {
        cardBgBack = `
          background: linear-gradient(135deg, #fdfbf7 0%, #ebdcb9 100%) !important;
          color: #2b1b17 !important;
          border: 3px double ${accentHex} !important;
          font-family: 'Georgia', serif !important;
        `;
      } else if (cardDesignStyle === 'geometric-cyber') {
        cardBgBack = `
          background: #020617 !important;
          color: #22d3ee !important;
          border: 1.5px solid #0891b2 !important;
        `;
      } else if (cardDesignStyle === 'royal-gold') {
        cardBgBack = `
          background: linear-gradient(135deg, #0f172a 0%, #020617 100%) !important;
          color: #fef08a !important;
          border: 2px solid #d97706 !important;
        `;
      } else {
        cardBgBack = isDark 
          ? 'background: linear-gradient(135deg, #171717 0%, #0a0a0a 100%) !important; color: #ffffff !important;'
          : 'background: linear-gradient(135deg, #ffffff 0%, #f9f9f9 100%) !important; color: #111111 !important; border: 1.5px solid #d4d4d8 !important;';
      }
    }

    const textMuted = isDark ? 'color: #8e8e93 !important;' : 'color: #52525b !important;';
    const borderCol = isDark ? 'border-color: #27272a !important;' : 'border-color: #e4e4e7 !important;';
    const subBg = isDark ? 'background-color: #0c0a09 !important;' : 'background-color: #f4f4f5 !important;';

    const docContent = `
<!DOCTYPE html>
<html>
  <head>
    <title>SHCA ID - ${name}</title>
    <meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&family=JetBrains+Mono:wght@400;700;800&family=Space+Grotesk:wght@400;500;700;900&family=Playfair+Display:wght@400;700&display=swap" rel="stylesheet">
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
        ${fontStyleAttr}
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
      .staff-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #1e3a8a !important;
        color: #93c5fd !important;
        border: 1px solid #3b82f6 !important;
        padding: 1px 3px;
        border-radius: 2px;
        text-transform: uppercase;
      }
      .deactivated-pass-badge {
        font-size: 5.5px;
        font-weight: 900;
        background-color: #7f1d1d !important;
        color: #fca5a5 !important;
        border: 1px solid #ef4444 !important;
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
        position: relative;
        z-index: 2;
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
        font-size: ${5.5 * sizeMultiplier}px !important;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 700;
        text-transform: uppercase;
        ${textMuted}
      }
      .field-val-name {
        font-size: ${9.5 * sizeMultiplier}px !important;
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
        font-size: ${7.5 * sizeMultiplier}px !important;
        font-weight: 900;
        font-family: 'JetBrains Mono', monospace;
        color: ${accentHex} !important;
      }
      .field-val-gender {
        font-size: ${7.5 * sizeMultiplier}px !important;
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
      .qr-code-box-large {
        width: 84px;
        height: 84px;
        background-color: #ffffff !important;
        padding: 3px;
        border-radius: 4px;
        border: 1px solid ${isDark ? '#27272a' : '#d4d4d8'} !important;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 2px;
        box-sizing: border-box;
        margin-left: auto;
      }
      .qr-code-img {
        width: 34px;
        height: 34px;
      }
      .qr-code-img-large {
        width: 66px;
        height: 66px;
      }
      .qr-label {
        font-size: 3.5px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        color: #000000 !important;
        letter-spacing: 0.1px;
        line-height: 1;
      }
      .qr-label-large {
        font-size: 6px;
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
        position: relative;
        z-index: 2;
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

      /* CUSTOM DESIGN STYLES */
      .id-card.style-bold-banner .header {
        background-color: ${accentHex} !important;
        margin-top: 0 !important;
        padding-top: 8px !important;
        border-bottom: none !important;
      }
      .id-card.style-bold-banner .header .logo-text {
        color: #000000 !important;
      }
      .id-card.style-bold-banner .header .logo-badge {
        background-color: #000000 !important;
        color: ${accentHex} !important;
      }
      .id-card.style-bold-banner .header-logo-container {
        color: #000000 !important;
      }
      .id-card.style-bold-banner .active-pass-badge {
        background-color: #000000 !important;
        color: ${accentHex} !important;
        border: 1px solid #000000 !important;
      }
      .id-card.style-bold-banner .staff-pass-badge {
        background-color: #000000 !important;
        color: ${accentHex} !important;
        border: 1px solid #000000 !important;
      }
      .watermark {
        position: absolute;
        font-size: 75px;
        font-weight: 900;
        opacity: 0.04;
        font-family: 'Inter', sans-serif;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-15deg);
        pointer-events: none;
        letter-spacing: -2px;
        color: ${isDark ? '#ffffff' : '#000000'};
        z-index: 1;
      }
      .style-tech .tech-overlay {
        position: absolute;
        font-size: 4px;
        font-family: 'JetBrains Mono', monospace;
        font-weight: 900;
        opacity: 0.25;
        top: 6px;
        right: 120px;
        letter-spacing: 0.5px;
        z-index: 1;
      }
      .style-artistic .avatar {
        border-radius: 50% !important;
        border: 2px solid ${accentHex} !important;
      }
      .style-vintage * {
        font-family: 'Georgia', 'Times New Roman', serif !important;
      }
      .style-vintage .logo-badge {
        border-radius: 50% !important;
        font-style: italic;
      }
      .style-vintage .field-label {
        font-family: 'Georgia', serif !important;
        font-style: italic;
      }
      .style-modern-minimal {
        border-radius: 12px !important;
        border-width: 1px !important;
      }
      .style-modern-minimal .header, .style-modern-minimal .footer {
        border: none !important;
        background: transparent !important;
      }
      .style-modern-minimal .avatar {
        border-radius: 8px !important;
        border: none !important;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
      }
      .style-geometric-cyber {
        clip-path: polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%);
      }
      .style-geometric-cyber * {
        font-family: 'JetBrains Mono', monospace !important;
      }
      .style-geometric-cyber .avatar {
        clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
        border: 1px solid ${accentHex} !important;
      }
      .style-royal-gold {
        border: 2px solid #eab308 !important;
      }
      .style-royal-gold .header {
        border-bottom: 1px solid #eab308 !important;
      }
      .style-royal-gold .logo-badge {
        background-color: #eab308 !important;
        color: #000000 !important;
      }
      .style-royal-gold .avatar {
        border: 2px solid #eab308 !important;
        box-shadow: 0 0 8px rgba(234, 179, 8, 0.3) !important;
      }
    </style>
  </head>
  <body>
    <div class="print-container">
      <div class="id-card style-${cardDesignStyle}">
        ${cardDesignStyle === 'bold-banner' ? `<div class="watermark">${isPupil ? 'SHCA' : 'STAFF'}</div>` : ''}
        ${cardDesignStyle === 'tech' ? `<div class="tech-overlay">SYS:SEC_VERIFIED // LOC:SAWLA</div>` : ''}
        ${cardDesignStyle === 'geometric-cyber' ? `<div class="tech-overlay" style="color: ${accentHex} !important; opacity: 0.4;">CYBER_PASS // AUTH_SECURE</div>` : ''}
        <div class="accent-top"></div>
        <div class="header">
          <div class="header-logo-container">
            ${getLogoSvgHtml(18)}
            <div class="logo-text">${(systemSettings?.schoolName || 'SHCA-SAWLA').toUpperCase()}</div>
          </div>
          <div>
            <span class="${passStatusBadge}">
              ${passStatusText}
            </span>
          </div>
        </div>

        <div class="main-content">
          <div class="avatar-container">
            <div class="avatar">
              ${photoUrl 
                ? `<img src="${photoUrl}" alt="${name}" />`
                : `<div class="avatar-placeholder" style="color: ${accentHex} !important;">${name.slice(0, 2).toUpperCase()}</div>`
              }
            </div>
            <span class="avatar-label">${isPupil ? 'STUDENT INFO' : 'STAFF MEMBER'}</span>
          </div>

          <div class="details">
            <div>
              <span class="field-label">${isPupil ? 'Pupil Name' : 'Staff Name'}</span>
              <span class="field-val-name">${name}</span>
            </div>
            <div class="meta-grid">
              <div>
                <span class="field-label">${labelLine1}</span>
                <span class="field-val-meta" style="color: ${accentHex} !important;">${valLine1}</span>
              </div>
              <div>
                <span class="field-label">${labelLine2}</span>
                <span class="field-val-gender">${valLine2}</span>
              </div>
            </div>
            <div class="reg-id-box">
              ${labelLine3}: <span class="reg-id-badge">${valLine3}</span>
            </div>
          </div>

          ${showQrCode ? `
          <div class="${isPupil ? 'qr-code-box-large' : 'qr-code-box'}">
            <img class="${isPupil ? 'qr-code-img-large' : 'qr-code-img'}" src="${qrCodeDataUrl}" />
            <span class="${isPupil ? 'qr-label-large' : 'qr-label'}">${qrLabel}</span>
          </div>
          ` : ''}
        </div>

        <div class="footer">
          <div class="footer-left">
            ${footerLeftLabel} <span class="footer-expiry">EXP: ${expiryDateStr}</span>
          </div>
          <div class="term-label" style="color: ${accentHex} !important;">${footerRightLabel.toUpperCase()}</div>
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
              <span class="contact-label">${guardianOrPhoneLabel}</span>
              <span class="contact-val">${guardianOrPhoneVal}</span>
            </div>
            <div style="text-align: right;">
              <span class="contact-label">Authorized Registrar</span>
              <span class="contact-val" style="color: ${accentDullHex} !important;">YAKUBU HAKEEM</span>
            </div>
          </div>

          <div class="status-banner-back" style="${isDeactivated ? 'background-color: #7f1d1d !important; color: #fca5a5 !important; border-color: #ef4444 !important;' : ''}">
            ${isDeactivated 
              ? 'STATUS: DEACTIVATED &bull; CARD VOID &amp; ACCESS RESTRICTED' 
              : `Validation Active &bull; Valid thru Term Closure (${expiryInfo.expiryDate})`
            }
          </div>
        </div>

        <div class="barcode-area">
          <div class="barcode-lines">
            ${Array.from({ length: 32 }).map((_, idx) => `
              <div class="barcode-bar" style="opacity: ${idx % 3 === 0 || idx % 4 === 1 ? 1 : 0};"></div>
            `).join('')}
          </div>
          <div class="barcode-label">
            *SHCA-${targetEntity.id.substring(0, 8).toUpperCase()}*
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
      {/* LEFT COLUMN: Entity Directory (Pupils vs Staff) */}
      <div className="lg:col-span-4 bg-neutral-900 border-4 border-neutral-800 p-5 flex flex-col h-[650px] space-y-4">
        
        {/* Toggle Mode Buttons */}
        <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1 border border-neutral-850 rounded">
          <button
            type="button"
            onClick={() => {
              setActiveMode('pupil');
              setSearchQuery('');
            }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'pupil' 
                ? 'bg-amber-400 text-black' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Users size={12} />
            <span>Pupils ({students.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('staff');
              setSearchQuery('');
            }}
            className={`py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === 'staff' 
                ? 'bg-amber-400 text-black' 
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            <Briefcase size={12} />
            <span>Staff ({users.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-800">
          <Contact className="text-amber-400 shrink-0" size={18} />
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">
              {activeMode === 'pupil' ? 'Select Student' : 'Select Staff'}
            </h3>
            <p className="text-[10px] text-neutral-400 uppercase font-mono mt-0.5">
              {activeMode === 'pupil' ? 'Enrolled pupil registry' : 'Authorized staff & instructors'}
            </p>
          </div>
        </div>

        {/* Directory Filters */}
        <div className="space-y-3 font-mono">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-neutral-500" size={14} />
            <input
              id="idcard-search-input"
              type="text"
              placeholder={activeMode === 'pupil' ? "SEARCH NAME/ROLL..." : "SEARCH NAME/ROLE/DEP..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-950 border-2 border-neutral-850 py-2 pl-9 pr-4 text-xs text-white placeholder-neutral-600 uppercase font-black focus:outline-none focus:border-amber-400 rounded-sm"
            />
          </div>

          {activeMode === 'pupil' && (
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
          )}
        </div>

        {/* Search Results list */}
        <div className="flex-1 overflow-y-auto divide-y divide-neutral-850 bg-neutral-950/60 border border-neutral-850 p-2 space-y-1 rounded-sm">
          {activeMode === 'pupil' ? (
            filteredStudents.length === 0 ? (
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
                          <span className={`text-[10px] font-mono font-black ${isSelected ? 'text-amber-450' : 'text-neutral-500'}`}>
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
            )
          ) : (
            filteredStaff.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500 font-mono uppercase tracking-wider">
                No matching staff found.
              </div>
            ) : (
              filteredStaff.map(staff => {
                const isSelected = staff.id === selectedStaffId;
                return (
                  <div
                    id={`staff-selector-item-${staff.id}`}
                    key={staff.id}
                    onClick={() => setSelectedStaffId(staff.id)}
                    className={`p-3 cursor-pointer transition-all flex items-center justify-between border ${
                      isSelected 
                        ? 'bg-amber-400 border-amber-450 text-black font-black' 
                        : 'hover:bg-neutral-850 border-transparent text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800 flex items-center justify-center">
                        {staff.photoUrl ? (
                          <img 
                            src={staff.photoUrl} 
                            alt={staff.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className={`text-[10px] font-mono font-black ${isSelected ? 'text-amber-450' : 'text-neutral-500'}`}>
                            {staff.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs uppercase truncate ${isSelected ? 'font-black text-black' : 'font-extrabold text-white'}`}>
                          {staff.name}
                        </p>
                        <p className={`text-[9px] font-mono uppercase ${isSelected ? 'text-neutral-800' : 'text-neutral-450'}`}>
                          {staff.role} • {staff.department || 'ACADEMIC'}
                        </p>
                      </div>
                    </div>
                    {isSelected && <Check className="text-black shrink-0 stroke-[3.5]" size={14} />}
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: ID Card Workspace */}
      <div className="lg:col-span-8 space-y-6">
        {((activeMode === 'pupil' && !activeStudent) || (activeMode === 'staff' && !activeStaff)) ? (
          <div className="bg-neutral-900 border-4 border-dashed border-neutral-800 h-[650px] flex flex-col items-center justify-center text-center p-8 space-y-4 rounded-sm">
            <Contact size={48} className="text-neutral-650 animate-bounce" />
            <div className="max-w-md">
              <h4 className="text-base font-black uppercase text-neutral-400 tracking-wider">
                No {activeMode === 'pupil' ? 'Student' : 'Staff'} Selected
              </h4>
              <p className="text-xs text-neutral-550 mt-1 leading-relaxed">
                Choose an active profile from the left-hand directory panel to begin configuring, capturing portrait photos, and issuing print-ready laminated ID access badges.
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
                    <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">
                      Full {activeMode === 'pupil' ? 'Pupil' : 'Staff'} Name
                    </label>
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

                  {activeMode === 'pupil' ? (
                    <>
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
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Staff Role</label>
                          <select
                            id="idcard-role-select"
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as UserRole)}
                            className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value="Teacher">TEACHER</option>
                            <option value="Administrator">ADMINISTRATOR</option>
                            <option value="Registrar">REGISTRAR</option>
                            <option value="Proprietor">PROPRIETOR</option>
                            <option value="Accountant">ACCOUNTANT</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Department</label>
                          <input
                            type="text"
                            value={editDepartment}
                            onChange={(e) => setEditDepartment(e.target.value)}
                            placeholder="e.g. Academic"
                            className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Employee ID</label>
                          <input
                            type="text"
                            value={editEmployeeId}
                            onChange={(e) => setEditEmployeeId(e.target.value)}
                            placeholder="e.g. EMP-101"
                            className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Contact Phone</label>
                          <div className="relative">
                            <Phone className="absolute left-2.5 top-2.5 text-neutral-500" size={12} />
                            <input
                              type="text"
                              value={editStaffPhone}
                              onChange={(e) => setEditStaffPhone(e.target.value)}
                              placeholder="e.g. +233..."
                              className="w-full bg-neutral-950 border border-neutral-800 py-2 pl-8 pr-3 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold uppercase text-neutral-400 mb-1">Email Address</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="e.g. staff@sawla.edu"
                          className="w-full bg-neutral-950 border border-neutral-800 p-2 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-400"
                        />
                      </div>
                    </>
                  )}

                  {/* Card Activation Status Toggle */}
                  <div className="p-3 bg-neutral-950 border border-neutral-850 space-y-2 rounded-sm">
                    <span className="block text-[9px] font-bold uppercase text-neutral-400">ID Card Activation Status</span>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-neutral-300">
                        {editDeactivated ? (
                          <span className="text-red-400 font-black uppercase flex items-center gap-1">
                            ● Card Deactivated
                          </span>
                        ) : (
                          <span className="text-emerald-400 font-black uppercase flex items-center gap-1">
                            ● Card Active
                          </span>
                        )}
                      </span>
                      <button
                        id="idcard-deactivate-toggle-btn"
                        type="button"
                        onClick={() => {
                          setEditDeactivated(!editDeactivated);
                          if (playFeedbackSound) playFeedbackSound('click');
                        }}
                        className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider border-2 transition-all cursor-pointer ${
                          editDeactivated
                            ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500 hover:bg-emerald-900/30'
                            : 'bg-red-950/20 text-red-400 border-red-500 hover:bg-red-900/30'
                        }`}
                      >
                        {editDeactivated ? 'RE-ACTIVATE' : 'DEACTIVATE'}
                      </button>
                    </div>
                    <p className="text-[8px] text-neutral-500 leading-relaxed uppercase">
                      * Deactivating the card marks it as void and restricts access during automatic checks.
                    </p>
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
                  {((activeMode === 'pupil' && activeStudent?.photoUrl) || (activeMode === 'staff' && activeStaff?.photoUrl)) && (
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

            {/* WORKSPACE COLUMN 2: Badge Settings & Real-time preview */}
            <div className="space-y-6">
              
              {/* Badge Visual Settings Toolbar */}
              <div className="bg-neutral-900 border-4 border-neutral-800 p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2.5 border-b border-neutral-800">
                  <Sparkles className="text-amber-400" size={16} />
                  <h3 className="text-xs font-black uppercase tracking-widest text-white">3. Badge Visual Settings</h3>
                </div>

                <div className="space-y-3 font-mono text-xs">
                  {/* Design Style Selector */}
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-1.5 font-black">Layout & Design Style</span>
                    <select
                      id="idcard-design-style-select"
                      value={cardDesignStyle}
                      onChange={(e) => setCardDesignStyle(e.target.value as any)}
                      className="w-full bg-neutral-950 border border-neutral-800 p-2 text-amber-400 font-black uppercase focus:outline-none focus:border-amber-400 cursor-pointer rounded-sm"
                    >
                      <option value="classic">★ Classic Professional Layout</option>
                      <option value="tech">🛰 Tech/Modern Hologram Grid</option>
                      <option value="artistic">🎨 Artistic Rounded Minimal</option>
                      <option value="bold-banner">🔥 Bold Solid Banner</option>
                      <option value="vintage">📜 Elegant Vintage Script</option>
                      <option value="modern-minimal">🤍 Modern Pristine Minimal</option>
                      <option value="geometric-cyber">⚡ Geometric Cyber/Sci-Fi</option>
                      <option value="royal-gold">⚜ Majestic Royal Gold Certificate</option>
                    </select>
                  </div>

                  {/* Theme Selector */}
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-1.5">Card Theme Options</span>
                    <div className="grid grid-cols-3 gap-1.5 bg-neutral-950 p-1.5 border border-neutral-850 rounded">
                      <button
                        id="idcard-theme-green-blue-btn"
                        type="button"
                        onClick={() => setCardTheme('green-blue')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'green-blue' ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Oceanic Breeze"
                      >
                        Oceanic
                      </button>
                      <button
                        id="idcard-theme-emerald-teal-btn"
                        type="button"
                        onClick={() => setCardTheme('emerald-teal')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'emerald-teal' ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Forest Emerald"
                      >
                        Emerald
                      </button>
                      <button
                        id="idcard-theme-royal-purple-btn"
                        type="button"
                        onClick={() => setCardTheme('royal-purple')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'royal-purple' ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Royal Purple"
                      >
                        Royal
                      </button>
                      <button
                        id="idcard-theme-sunset-orange-btn"
                        type="button"
                        onClick={() => setCardTheme('sunset-orange')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'sunset-orange' ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Sunset Gold"
                      >
                        Sunset
                      </button>
                      <button
                        id="idcard-theme-neon-cyan-btn"
                        type="button"
                        onClick={() => setCardTheme('neon-cyan')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'neon-cyan' ? 'bg-gradient-to-r from-cyan-900 to-slate-950 text-cyan-400 font-black border border-cyan-800' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Neon Cyan"
                      >
                        Neon
                      </button>
                      <button
                        id="idcard-theme-vintage-parchment-btn"
                        type="button"
                        onClick={() => setCardTheme('vintage-parchment')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'vintage-parchment' ? 'bg-amber-100 text-neutral-900 font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Vintage Parchment"
                      >
                        Parchment
                      </button>
                      <button
                        id="idcard-theme-coral-pink-btn"
                        type="button"
                        onClick={() => setCardTheme('coral-pink')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'coral-pink' ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Coral Pink"
                      >
                        Coral
                      </button>
                      <button
                        id="idcard-theme-dark-btn"
                        type="button"
                        onClick={() => setCardTheme('dark')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'dark' ? 'bg-neutral-800 text-white font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Midnight Carbon"
                      >
                        Carbon
                      </button>
                      <button
                        id="idcard-theme-light-btn"
                        type="button"
                        onClick={() => setCardTheme('light')}
                        className={`py-1 px-1 text-center font-bold text-[8.5px] uppercase tracking-wider rounded transition-all cursor-pointer truncate ${cardTheme === 'light' ? 'bg-white text-black font-black' : 'text-neutral-500 hover:text-neutral-300'}`}
                        title="Laser Ivory White"
                      >
                        Ivory
                      </button>
                    </div>
                  </div>

                  {/* Accent Color Picker */}
                  <div>
                    <span className="block text-[9px] font-bold uppercase text-neutral-400 mb-1.5">Accent Color Schemes</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'amber', label: 'Gold', color: 'bg-amber-400 border-amber-500 text-amber-400' },
                        { id: 'emerald', label: 'Green', color: 'bg-emerald-500 border-emerald-600 text-emerald-400' },
                        { id: 'blue', label: 'Blue', color: 'bg-blue-500 border-blue-600 text-blue-400' },
                        { id: 'red', label: 'Red', color: 'bg-red-500 border-red-600 text-red-400' },
                        { id: 'violet', label: 'Violet', color: 'bg-violet-500 border-violet-600 text-violet-400' },
                        { id: 'orange', label: 'Orange', color: 'bg-orange-500 border-orange-600 text-orange-400' },
                        { id: 'pink', label: 'Pink', color: 'bg-pink-500 border-pink-600 text-pink-400' },
                        { id: 'cyan', label: 'Cyan', color: 'bg-cyan-500 border-cyan-600 text-cyan-400' },
                        { id: 'gold', label: 'Royal Gold', color: 'bg-amber-500 border-amber-600 text-amber-500' }
                      ].map(acc => (
                        <button
                          key={acc.id}
                          type="button"
                          onClick={() => setAccentColor(acc.id as any)}
                          className={`p-1.5 border flex items-center justify-center gap-1 rounded transition-all cursor-pointer uppercase font-black text-[8px] tracking-wide ${
                            accentColor === acc.id 
                              ? 'bg-neutral-950 border-white text-white font-black scale-[1.03]' 
                              : 'bg-neutral-950/40 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${acc.color.split(' ')[0]}`} />
                          <span className="truncate">{acc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Expiry Override (For student only) */}
                  {activeMode === 'pupil' && (
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
                  )}

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

                  {/* Font Customization Fields */}
                  <div className="border-t border-neutral-800 pt-3.5 space-y-3">
                    <span className="block text-[9.5px] font-black uppercase text-amber-400 tracking-wider">Typography Customization</span>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {/* Font Family */}
                      <div>
                        <span className="block text-[8px] font-black uppercase text-neutral-400 mb-1">Font Family</span>
                        <select
                          id="idcard-font-family-select"
                          value={cardFontFamily}
                          onChange={(e) => setCardFontFamily(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2 text-[10px] text-white focus:outline-none focus:border-amber-400 cursor-pointer rounded-sm uppercase font-bold"
                        >
                          <option value="sans">💻 Inter Sans</option>
                          <option value="serif">✍ Georgia Serif</option>
                          <option value="mono">📟 Space Mono</option>
                          <option value="space">🌌 Space Grotesk</option>
                          <option value="playfair">📜 Playfair</option>
                        </select>
                      </div>

                      {/* Font Size */}
                      <div>
                        <span className="block text-[8px] font-black uppercase text-neutral-400 mb-1">Font Size Scale</span>
                        <select
                          id="idcard-font-size-select"
                          value={cardFontSize}
                          onChange={(e) => setCardFontSize(e.target.value as any)}
                          className="w-full bg-neutral-950 border border-neutral-800 p-2 text-[10px] text-white focus:outline-none focus:border-amber-400 cursor-pointer rounded-sm uppercase font-bold"
                        >
                          <option value="small">▼ Small (90%)</option>
                          <option value="medium">■ Normal (100%)</option>
                          <option value="large">▲ Large (110%)</option>
                        </select>
                      </div>
                    </div>

                    {/* Font Color */}
                    <div>
                      <span className="block text-[8px] font-black uppercase text-neutral-400 mb-1">Override Text Color</span>
                      <select
                        id="idcard-font-color-select"
                        value={cardFontColor}
                        onChange={(e) => setCardFontColor(e.target.value as any)}
                        className="w-full bg-neutral-950 border border-neutral-800 p-2 text-[10px] text-white focus:outline-none focus:border-amber-400 cursor-pointer rounded-sm uppercase font-bold"
                      >
                        <option value="theme">✨ Theme Matching (Default)</option>
                        <option value="white">⚪ Laser White</option>
                        <option value="black">⚫ Midnight Black</option>
                        <option value="yellow">🟡 Amber Gold</option>
                        <option value="green">🟢 Emerald Green</option>
                        <option value="blue">🔵 Cobalt Blue</option>
                        <option value="purple">🟣 Royal Violet</option>
                      </select>
                    </div>
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
        {((activeMode === 'pupil' && activeStudent) || (activeMode === 'staff' && activeStaff)) && (() => {
          const targetEntity = activeMode === 'pupil' ? activeStudent! : activeStaff!;
          const name = targetEntity.name;
          const photoUrl = targetEntity.photoUrl;
          const isPupil = activeMode === 'pupil';
          const expiryDateStr = isPupil ? expiryInfo.expiryDate : "Permanent";
          
          // Labels
          const labelLine1 = isPupil ? "Class" : "Role / Job Title";
          const valLine1 = isPupil ? (targetEntity as Student).class : (targetEntity as UserAccount).role;
          
          const labelLine2 = isPupil ? "Gender" : "Department";
          const valLine2 = isPupil ? ((targetEntity as Student).gender || '—') : ((targetEntity as any).department || 'Academic');

          const labelLine3 = isPupil ? "REG-ID" : "Employee ID";
          const valLine3 = isPupil 
            ? ((targetEntity as Student).rollNumber || formatPupilId(targetEntity as Student, systemSettings))
            : ((targetEntity as any).employeeId || 'EMP-' + targetEntity.id.substring(targetEntity.id.indexOf('_') + 1).slice(0, 6).toUpperCase());

          const qrLabel = isPupil ? "Gate Pass" : "Staff Access";
          const footerLeftLabel = isPupil ? "SYSTEM ACCREDITED" : "STAFF REGISTERED";
          const footerRightLabel = isPupil ? expiryInfo.termName : "SHCA Security";

           const guardianOrPhoneLabel = isPupil ? "Guardian Mobile" : "Contact Phone";
          const guardianOrPhoneVal = isPupil 
            ? ((targetEntity as Student).guardianPhone || 'NOT ENROLLED')
            : ((targetEntity as UserAccount).momoNumber || 'NOT ENROLLED');

          const accentHex = getAccentColorHex(accentColor);
          const isLightTheme = cardTheme === 'light' || cardTheme === 'vintage-parchment';
          
          let frontThemeClasses = '';
          let backThemeClasses = '';
          
          switch (cardTheme) {
            case 'green-blue':
              frontThemeClasses = 'bg-gradient-to-br from-[#0f5132] via-[#115e59] to-[#1e3a8a] text-white border-teal-500';
              backThemeClasses = 'bg-gradient-to-br from-[#0a3622] to-[#0f766e] text-white border-teal-600';
              break;
            case 'emerald-teal':
              frontThemeClasses = 'bg-gradient-to-br from-[#04351c] to-[#064e3b] text-white border-emerald-500';
              backThemeClasses = 'bg-gradient-to-br from-[#022c22] to-[#042f2e] text-white border-emerald-600';
              break;
            case 'royal-purple':
              frontThemeClasses = 'bg-gradient-to-br from-[#1e1b4b] via-[#311042] to-[#4c1d95] text-white border-purple-400';
              backThemeClasses = 'bg-gradient-to-br from-[#110c36] to-[#2e1065] text-white border-purple-500';
              break;
            case 'sunset-orange':
              frontThemeClasses = 'bg-gradient-to-br from-[#7c2d12] via-[#9a3412] to-[#b45309] text-white border-orange-400';
              backThemeClasses = 'bg-gradient-to-br from-[#431407] to-[#7c2d12] text-white border-orange-500';
              break;
            case 'neon-cyan':
              frontThemeClasses = 'bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#083344] text-cyan-400 border-cyan-500';
              backThemeClasses = 'bg-gradient-to-br from-[#020617] to-[#0f172a] text-cyan-500 border-cyan-600';
              break;
            case 'vintage-parchment':
              frontThemeClasses = 'bg-gradient-to-br from-[#fefaf0] via-[#f9f5e8] to-[#f1ebcf] text-[#3b2314] border-amber-800';
              backThemeClasses = 'bg-gradient-to-br from-[#fefaf0] to-[#ebdcb9] text-[#3b2314] border-amber-700';
              break;
            case 'coral-pink':
              frontThemeClasses = 'bg-gradient-to-br from-[#881337] via-[#9d174d] to-[#701a75] text-white border-pink-400';
              backThemeClasses = 'bg-gradient-to-br from-[#500724] to-[#4d0751] text-white border-pink-500';
              break;
            case 'dark':
              frontThemeClasses = 'bg-gradient-to-br from-neutral-900 to-neutral-950 text-white border-neutral-800';
              backThemeClasses = 'bg-gradient-to-br from-neutral-950 to-neutral-900 text-white border-neutral-800';
              break;
            default: // light
              frontThemeClasses = 'bg-gradient-to-br from-white to-neutral-50 text-neutral-900 border-neutral-300';
              backThemeClasses = 'bg-gradient-to-br from-neutral-50 to-white text-neutral-900 border-neutral-300';
              break;
          }

          let fontClass = 'font-sans';
          if (cardFontFamily === 'serif' || (cardFontFamily === 'sans' && cardDesignStyle === 'vintage')) {
            fontClass = 'font-serif';
          } else if (cardFontFamily === 'mono' || (cardFontFamily === 'sans' && (cardDesignStyle === 'tech' || cardDesignStyle === 'geometric-cyber'))) {
            fontClass = 'font-mono';
          } else if (cardFontFamily === 'space') {
            fontClass = 'font-sans';
          } else if (cardFontFamily === 'playfair') {
            fontClass = 'font-serif';
          }

          let previewFamily = '"Space Grotesk", sans-serif';
          if (cardFontFamily === 'serif') previewFamily = 'Georgia, serif';
          else if (cardFontFamily === 'mono') previewFamily = '"Space Mono", monospace';
          else if (cardFontFamily === 'space') previewFamily = '"Space Grotesk", sans-serif';
          else if (cardFontFamily === 'playfair') previewFamily = '"Playfair Display", serif';
          else {
            if (cardDesignStyle === 'vintage') previewFamily = 'Georgia, serif';
            else if (cardDesignStyle === 'tech' || cardDesignStyle === 'geometric-cyber') previewFamily = '"Space Mono", monospace';
          }

          const liveSizeMultiplier = cardFontSize === 'small' ? 0.9 : cardFontSize === 'large' ? 1.1 : 1.0;
          const chosenPreviewColor = getFontColorHex(cardFontColor, !isLightTheme);

          let customFrontStyle: React.CSSProperties = {
            fontFamily: previewFamily,
            fontSize: `${12 * liveSizeMultiplier}px`
          };
          let customBackStyle: React.CSSProperties = {
            fontFamily: previewFamily,
            fontSize: `${12 * liveSizeMultiplier}px`
          };

          if (cardFontColor !== 'theme') {
            customFrontStyle.color = chosenPreviewColor;
            customBackStyle.color = chosenPreviewColor;
          }

          if (cardDesignStyle === 'vintage') {
            customFrontStyle = {
              ...customFrontStyle,
              border: `3px double ${accentHex}`
            };
            customBackStyle = {
              ...customBackStyle,
              border: `3px double ${accentHex}`
            };
          } else if (cardDesignStyle === 'geometric-cyber') {
            customFrontStyle = {
              ...customFrontStyle,
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'
            };
            customBackStyle = {
              ...customBackStyle,
              clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%)'
            };
          } else if (cardDesignStyle === 'royal-gold') {
            customFrontStyle = {
              ...customFrontStyle,
              borderColor: '#eab308',
              borderWidth: '2px',
              boxShadow: 'inset 0 0 15px rgba(234, 179, 8, 0.25)'
            };
            customBackStyle = {
              ...customBackStyle,
              borderColor: '#d97706',
              borderWidth: '2px'
            };
          } else if (cardDesignStyle === 'tech') {
            customFrontStyle = {
              ...customFrontStyle,
              backgroundImage: cardTheme === 'green-blue'
                ? 'radial-gradient(circle at 10% 20%, rgba(20, 184, 166, 0.15) 0%, transparent 40%), linear-gradient(0deg, rgba(20, 184, 166, 0.04) 1px, transparent 1px)'
                : cardTheme === 'emerald-teal'
                ? 'radial-gradient(circle at 10% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 40%), linear-gradient(0deg, rgba(16, 185, 129, 0.04) 1px, transparent 1px)'
                : 'radial-gradient(circle at 10% 20%, rgba(251, 191, 36, 0.08) 0%, transparent 40%), linear-gradient(0deg, rgba(251,191,36,0.05) 1px, transparent 1px)',
              backgroundSize: '100% 100%, 8px 8px'
            };
          } else if (cardDesignStyle === 'artistic') {
            customFrontStyle = {
              ...customFrontStyle,
              backgroundImage: 'radial-gradient(circle at 80% 80%, rgba(20, 184, 166, 0.12) 0%, transparent 60%)'
            };
          }

          return (
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
                    className={`w-[324px] h-[204px] rounded-lg border-2 overflow-hidden relative ${fontClass} flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.02] ${frontThemeClasses}`}
                    style={customFrontStyle}
                  >
                    {/* Watermark for bold style */}
                    {cardDesignStyle === 'bold-banner' && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                        <span className={`text-[75px] font-black rotate-[-15deg] opacity-[0.03] tracking-tighter ${cardTheme !== 'light' ? 'text-white' : 'text-black'}`}>
                          {isPupil ? 'SHCA' : 'STAFF'}
                        </span>
                      </div>
                    )}

                    {/* Tech overlay text */}
                    {cardDesignStyle === 'tech' && (
                      <div className="absolute top-[34px] right-2.5 pointer-events-none select-none text-[4.2px] font-mono opacity-30 text-amber-400 font-black">
                        SYS:SEC_VERIFIED // SAWLA
                      </div>
                    )}

                    {/* Accent Top Lip */}
                    <div className={`absolute top-0 left-0 right-0 h-[4.5px] ${getAccentClass('bg')}`} />
                    
                    {/* Header */}
                    <div className={`mt-[4.5px] px-2.5 py-1.5 flex items-center justify-between border-b ${
                      cardDesignStyle === 'bold-banner' 
                        ? `${getAccentClass('bg')} text-black` 
                        : (!isLightTheme ? 'border-neutral-800' : 'border-neutral-200')
                    }`}>
                      <div className="flex items-center gap-1.5">
                        <SchoolLogo size={16} className="rounded-full overflow-hidden bg-white/10 shrink-0" />
                        <span className={`font-black text-[8px] uppercase tracking-wider ${
                          cardDesignStyle === 'bold-banner' ? 'text-black' : (!isLightTheme ? 'text-white' : 'text-neutral-800')
                        }`}>
                          {systemSettings?.schoolName || "SAAKO HOLY CHILD ACADEMY"}
                        </span>
                      </div>
                      <div>
                        <span 
                          style={{ fontSize: `${5 * liveSizeMultiplier}px` }}
                          className={`font-black uppercase px-1 py-0.5 border rounded-sm tracking-wider ${
                            editDeactivated
                              ? 'bg-red-950/80 text-red-300 border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
                              : isPupil 
                                ? (expiryInfo.isExpired 
                                  ? 'bg-red-950/40 text-red-400 border-red-900' 
                                  : 'bg-emerald-950/40 text-emerald-400 border-emerald-900')
                                : 'bg-blue-950/40 text-blue-400 border-blue-900'
                          }`}
                        >
                          {editDeactivated ? 'Deactivated' : isPupil ? (expiryInfo.isExpired ? 'Expired' : 'Active Pass') : 'Staff Pass'}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="px-2.5 py-1.5 flex items-center gap-2 flex-1 relative z-10">
                      {/* Avatar Block */}
                      <div className="flex flex-col items-center gap-[1.5px] shrink-0">
                        <div className={`w-[54px] h-[54px] border overflow-hidden flex items-center justify-center ${
                          cardDesignStyle === 'artistic' ? 'rounded-full' : 'rounded-[4.5px]'
                        } ${
                          !isLightTheme ? 'bg-neutral-950 border-neutral-800' : 'bg-neutral-100 border-neutral-300'
                        }`}
                        style={cardDesignStyle === 'artistic' ? { borderWidth: '2px', borderColor: 'var(--color-amber-400)' } : undefined}
                        >
                          {photoUrl ? (
                            <img 
                              src={photoUrl} 
                              alt={name} 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <span className={`text-base font-mono font-black ${getAccentClass('text')}`}>
                              {name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span 
                          style={{ fontSize: `${4.8 * liveSizeMultiplier}px` }}
                          className="font-mono font-bold text-neutral-500 uppercase tracking-widest"
                        >
                          {isPupil ? 'Student Info' : 'Staff Member'}
                        </span>
                      </div>

                      {/* Meta Info Block */}
                      <div className="flex-1 space-y-[1.5px] min-w-0">
                        <div>
                          <span 
                            style={{ fontSize: `${5.5 * liveSizeMultiplier}px` }}
                            className="font-mono font-bold text-neutral-500 uppercase block leading-none"
                          >
                            {isPupil ? 'Pupil Name' : 'Staff Name'}
                          </span>
                          <span 
                            style={{ fontSize: `${9.5 * liveSizeMultiplier}px` }}
                            className={`font-black uppercase truncate block leading-tight max-w-[130px] ${!isLightTheme ? 'text-white' : 'text-black'}`}
                          >
                            {name}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-1">
                          <div className="min-w-0">
                            <span 
                              style={{ fontSize: `${5.5 * liveSizeMultiplier}px` }}
                              className="font-mono font-bold text-neutral-500 uppercase block leading-none"
                            >{labelLine1}</span>
                            <span 
                              style={{ fontSize: `${7.5 * liveSizeMultiplier}px` }}
                              className={`font-mono font-black truncate block ${getAccentClass('text')}`}
                            >{valLine1}</span>
                          </div>
                          <div className="min-w-0">
                            <span 
                              style={{ fontSize: `${5.5 * liveSizeMultiplier}px` }}
                              className="font-mono font-bold text-neutral-500 uppercase block leading-none"
                            >{labelLine2}</span>
                            <span 
                              style={{ fontSize: `${7.5 * liveSizeMultiplier}px` }}
                              className={`font-bold truncate block ${!isLightTheme ? 'text-white' : 'text-neutral-800'}`}
                            >{valLine2}</span>
                          </div>
                        </div>

                        <div 
                          style={{ fontSize: `${5.5 * liveSizeMultiplier}px` }}
                          className="font-mono text-neutral-500 uppercase leading-none"
                        >
                          {labelLine3}: <span 
                            style={{ fontSize: `${7.5 * liveSizeMultiplier}px` }}
                            className={`font-black px-1 py-[0.5px] border rounded-[1.5px] ml-0.5 ${!isLightTheme ? 'bg-neutral-950 border-neutral-800 text-white' : 'bg-neutral-100 border-neutral-300 text-neutral-800'}`}
                          >
                            {valLine3}
                          </span>
                        </div>
                      </div>

                      {/* QR Access Badge */}
                      {showQrCode && qrCodeDataUrl && (
                        <div className={`${isPupil ? 'w-[84px] h-[84px] p-[3px] rounded-md gap-[2px]' : 'w-[42px] h-[42px] p-[1.5px] rounded-sm gap-[0.5px]'} bg-white border border-neutral-300 flex flex-col items-center justify-center shrink-0 ml-auto`}>
                          <img src={qrCodeDataUrl} className={isPupil ? 'w-[66px] h-[66px]' : 'w-[34px] h-[34px]'} />
                          <span className={`${isPupil ? 'text-[6px]' : 'text-[3.5px]'} font-mono font-black text-black tracking-widest uppercase leading-none`}>{qrLabel}</span>
                        </div>
                      )}
                    </div>

                    {/* Card Bottom Footer */}
                    <div className={`px-2.5 py-1.5 flex items-center justify-between text-[5.8px] font-mono border-t relative z-10 ${
                      !isLightTheme ? 'border-neutral-800 bg-neutral-950/60' : 'border-neutral-200 bg-neutral-100'
                    }`}>
                      <div className="text-neutral-500 font-bold uppercase tracking-wide">
                        {footerLeftLabel} <span className={`font-black ml-1 px-1 border rounded-[1.5px] text-[5px] ${!isLightTheme ? 'bg-black border-neutral-800 text-white' : 'bg-neutral-250 border-neutral-350 text-neutral-850'}`}>EXP: {expiryDateStr}</span>
                      </div>
                      <div className={`font-black uppercase tracking-wide ${getAccentClass('text')}`}>
                        {footerRightLabel}
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
                    className={`w-[324px] h-[204px] rounded-lg border-2 overflow-hidden relative ${fontClass} flex flex-col justify-between shadow-2xl transition-all hover:scale-[1.02] ${backThemeClasses}`}
                    style={customBackStyle}
                  >
                    {/* Accent Top Lip */}
                    <div className={`absolute top-0 left-0 right-0 h-[4.5px] ${!isLightTheme ? 'bg-neutral-800' : 'bg-neutral-300'}`} />
                    
                    {/* Header */}
                    <div className={`mt-[4.5px] px-2.5 py-1.5 flex items-center justify-between border-b ${!isLightTheme ? 'border-neutral-800' : 'border-neutral-200'}`}>
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
                        !isLightTheme ? 'border-neutral-800' : 'border-neutral-300'
                      }`}>
                        <div>
                          <span className="text-[4.5px] text-neutral-500 block leading-none">{guardianOrPhoneLabel}</span>
                          <span className={`font-black ${!isLightTheme ? 'text-white' : 'text-neutral-800'}`}>{guardianOrPhoneVal}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[4.5px] text-neutral-500 block leading-none">Authorized Registrar</span>
                          <span className={`font-black ${getAccentClass('text')}`}>YAKUBU HAKEEM</span>
                        </div>
                      </div>

                      {/* Status bar */}
                      <div className={`rounded-sm py-[1.5px] text-center text-[5px] font-mono font-black uppercase tracking-wider border transition-all ${
                        editDeactivated
                          ? 'bg-red-950/80 border-red-900 text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.3)]'
                          : !isLightTheme 
                            ? 'bg-neutral-950 border-neutral-850 text-neutral-500' 
                            : 'bg-neutral-100 border-neutral-250 text-neutral-500'
                      }`}>
                        {editDeactivated 
                          ? 'STATUS: DEACTIVATED \u2022 CARD VOID & ACCESS RESTRICTED' 
                          : `Validation Active \u2022 Valid thru Term Closure (${expiryInfo.expiryDate})`
                        }
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
                        *SHCA-{targetEntity.id.substring(0, 8).toUpperCase()}*
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          );
        })()}

      </div>
    </div>
  );
};
