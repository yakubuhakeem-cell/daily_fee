/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';

interface SchoolLogoProps {
  size?: number;
  className?: string;
  lightBackground?: boolean;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ 
  size = 120, 
  className = '', 
  lightBackground = false 
}) => {
  const { systemSettings } = useApp();

  if (systemSettings?.schoolLogoUrl) {
    return (
      <img 
        src={systemSettings.schoolLogoUrl} 
        alt={systemSettings.schoolName || "School Logo"} 
        width={size}
        height={size}
        className={`object-contain select-none shrink-0 rounded-full border border-neutral-800 shadow-sm ${className}`}
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
      />
    );
  }

  const schoolName = (systemSettings?.schoolName || "SAAKO HOLY CHILD ACADEMY").toUpperCase();
  const location = systemSettings?.customLocation || "Sawla";
  const motto = systemSettings?.customMotto || "Holiness Is Our Key";

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 400 400" 
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      id="saako-holy-child-crest"
    >
      <defs>
        {/* Arc pathway for curving the main academy text around the upper hemisphere */}
        <path 
          id="academy-text-arc" 
          d="M 52 205 A 148 148 0 1 1 348 205" 
          fill="none" 
        />
      </defs>

      {/* 1. Outer Cream Circular Disc */}
      <circle 
        cx="200" 
        cy="200" 
        r="190" 
        fill={lightBackground ? "#ffffff" : "#f6f1ec"} 
        stroke="#04563a" 
        strokeWidth="11" 
      />

      {/* 2. Inner circular thin border */}
      <circle 
        cx="200" 
        cy="200" 
        r="146" 
        fill="none" 
        stroke="#04563a" 
        strokeWidth="3.5" 
      />

      {/* 3. Curved Heading: Dynamic Name */}
      <text>
        <textPath 
          href="#academy-text-arc" 
          startOffset="50%" 
          textAnchor="middle" 
          fill="#04563a" 
          fontWeight="900" 
          fontSize="23" 
          letterSpacing="1px" 
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {schoolName}
        </textPath>
      </text>

      {/* 4. Core Shield/Badge Group */}
      <g id="central-heraldic-shield">
        {/* Upper Segment of core shield (radius 102, center 200,185): Mid vibrant green fill */}
        <path 
          d="M 98 185 A 102 102 0 0 1 302 185 Z" 
          fill="#009e60" 
          stroke="#04563a" 
          strokeWidth="3"
        />

        {/* Lower Left Segment of core shield: Deep pine forest green. */}
        <path 
          d="M 98 185 A 102 102 0 0 0 200 287 L 200 185 Z" 
          fill="#024227" 
          stroke="#04563a" 
          strokeWidth="3"
        />

        {/* Lower Right Segment of core shield: Soft cream-white color */}
        <path 
          d="M 200 185 L 200 287 A 102 102 0 0 0 302 185 Z" 
          fill="#fbf7f4" 
          stroke="#04563a" 
          strokeWidth="3"
        />
      </g>

      {/* 5. Details Inside Upper Hemisphere (White Open book & Writing quill pen) */}
      <g id="upper-hemisphere-book-pen">
        {/* Open book backing lines representing cover */}
        <path 
          d="M 134 180 C 168 174, 192 174, 200 181 C 208 174, 232 174, 266 180" 
          fill="none" 
          stroke="#ffffff" 
          strokeWidth="6" 
          strokeLinecap="round"
        />
        
        {/* Left page outline */}
        <path 
          d="M 200 180 C 185 160, 163 160, 138 168 L 138 141 C 163 133, 185 133, 200 153 Z" 
          fill="#d0f2e5" 
          stroke="#ffffff" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Right page outline */}
        <path 
          d="M 200 180 C 215 160, 237 160, 262 168 L 262 141 C 237 133, 215 133, 200 153 Z" 
          fill="#d0f2e5" 
          stroke="#ffffff" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />

        {/* Writing quill pen leaning diagonally over the pages */}
        <path 
          d="M 241 114 L 189 171 L 184 172 L 187 167 L 235 110 Z" 
          fill="#ffffff" 
          stroke="#04563a" 
          strokeWidth="1.5"
        />
        <line x1="225" y1="126" x2="201" y2="152" stroke="#04563a" strokeWidth="1.5" />
      </g>

      {/* 6. Details Inside Lower-Left Hemisphere (Crossed tools: Farming Hoe & Cutlass) */}
      <g id="lower-left-farming-tools">
        {/* Shovel blade/hoe head in gray-blue */}
        <path 
          d="M 125 240 Q 120 230 131 228 L 150 242 L 139 254 Z" 
          fill="#b0bec5" 
          stroke="#37474f" 
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        
        {/* Hoe handle line */}
        <line 
          x1="127" 
          y1="239" 
          x2="187" 
          y2="208" 
          stroke="#cca480" 
          strokeWidth="4" 
          strokeLinecap="round"
        />

        {/* Cutlass curved blade crossing hoe */}
        <path 
          d="M 179 248 C 170 230, 155 212, 140 204 L 144 200 C 160 209, 175 228, 184 246 Z" 
          fill="#eceff1" 
          stroke="#455a64" 
          strokeWidth="1.5" 
          strokeLinecap="round"
        />
        {/* Cutlass handle */}
        <rect 
          x="181" 
          y="245" 
          width="5" 
          height="10" 
          transform="rotate(25 181 245)" 
          fill="#6d4c41" 
          stroke="#3e2723" 
          strokeWidth="1.2"
        />
      </g>

      {/* 7. Details Inside Lower-Right Hemisphere (Sweeper straw broom) */}
      <g id="lower-right-hearth-broom">
        {/* Tied dark handle wrapping */}
        <path 
          d="M 222 205 L 232 200 L 236 211 L 226 216 Z" 
          fill="#212121" 
          stroke="#000000" 
          strokeWidth="1"
        />
        
        {/* Multiple straws branching out to sweep */}
        <line x1="227" y1="205" x2="263" y2="263" stroke="#424242" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="227" y1="205" x2="251" y2="267" stroke="#333333" strokeWidth="2.0" strokeLinecap="round" />
        <line x1="227" y1="205" x2="274" y2="257" stroke="#424242" strokeWidth="2.0" strokeLinecap="round" />
        <line x1="227" y1="205" x2="241" y2="268" stroke="#212121" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="227" y1="205" x2="281" y2="249" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="227" y1="205" x2="232" y2="269" stroke="#555555" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Bound gold bands over top and neck of the broom straws */}
        <rect x="225" y="209" width="9" height="3" rx="0.5" fill="#fbc02d" />
        <rect x="227" y="215" width="10" height="3.5" rx="0.5" fill="#fbc02d" transform="rotate(-15 227 215)" />
      </g>

      {/* 8. Symmetrical Curved Dark Green Banner/Ribbon */}
      <g id="bottom-crest-banner">
        {/* Left Circular Year Badge */}
        <circle cx="106" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
        <text 
          x="106" 
          y="308" 
          textAnchor="middle" 
          fill="#ffffff" 
          fontWeight="900" 
          fontSize="13" 
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          20
        </text>

        {/* Right Circular Year Badge */}
        <circle cx="294" cy="303" r="18" fill="#024227" stroke="#04563a" strokeWidth="2.5" />
        <text 
          x="294" 
          y="308" 
          textAnchor="middle" 
          fill="#ffffff" 
          fontWeight="900" 
          fontSize="13" 
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          03
        </text>

        {/* Main Ribbon background banner */}
        <path 
          d="M 120 307 Q 200 334 280 307 L 277 285 Q 200 312 123 285 Z" 
          fill="#024227" 
          stroke="#04563a" 
          strokeWidth="3.5"
          strokeLinejoin="round"
        />

        {/* Centre Label text Dynamic Location inside banner */}
        <text 
          x="200" 
          y="304" 
          textAnchor="middle" 
          fill="#ffffff" 
          fontWeight="900" 
          fontSize="14" 
          letterSpacing="1px"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          {location}
        </text>
      </g>

      {/* 9. Motto at bottom: Dynamic Motto */}
      <text 
        x="200" 
        y="346" 
        textAnchor="middle" 
        fill="#024227" 
        fontWeight="900" 
        fontSize="13" 
        letterSpacing="0.8px"
        fontFamily="Georgia, serif"
      >
        {motto}
      </text>
    </svg>
  );
};
