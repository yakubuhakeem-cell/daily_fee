/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SystemSettings } from '../types';
import { Save, RefreshCw, Check, Landmark, School, Sparkles, Info, Palette } from 'lucide-react';
import { SchoolLogo } from './SchoolLogo';

export const SettingsPanel: React.FC = () => {
  const { systemSettings, updateSystemSettings, playFeedbackSound, storageMode } = useApp();
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Local state for the settings form
  const [schoolName, setSchoolName] = useState(systemSettings?.schoolName || 'SAAKO HOLY CHILD ACADEMY');
  const [systemName, setSystemName] = useState(systemSettings?.systemName || 'FEETRACK');
  const [schoolLogoUrl, setSchoolLogoUrl] = useState(systemSettings?.schoolLogoUrl || '');
  const [baselineDailyFee, setBaselineDailyFee] = useState(systemSettings?.baselineDailyFee ?? 5.00);
  const [baselineTermFee, setBaselineTermFee] = useState(systemSettings?.baselineTermFee ?? 350.00);
  const [currencyCode, setCurrencyCode] = useState(systemSettings?.currencyCode || 'GHC');
  const [customMotto, setCustomMotto] = useState(systemSettings?.customMotto || 'Holiness Is Our Key');
  const [customLocation, setCustomLocation] = useState(systemSettings?.customLocation || 'Sawla');
  const [primaryColor, setPrimaryColor] = useState(systemSettings?.primaryColor || '#fbbf24');
  const [adminWhatsAppPhone, setAdminWhatsAppPhone] = useState(systemSettings?.adminWhatsAppPhone || '');
  const [autoSendCheckInAlert, setLocalAutoSendCheckInAlert] = useState(systemSettings?.autoSendCheckInAlert ?? false);
  const [autoSendArrearsAlert, setLocalAutoSendArrearsAlert] = useState(systemSettings?.autoSendArrearsAlert ?? false);

  // Sub-tabs state
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'appearance'>('appearance');

  // Interactive templates/presets to quickly theme the app
  const presets = [
    {
      name: 'Saako Holy Child',
      schoolName: 'SAAKO HOLY CHILD ACADEMY',
      systemName: 'FEETRACK',
      schoolLogoUrl: '',
      baselineDailyFee: 5.00,
      baselineTermFee: 350.00,
      currencyCode: 'GHC',
      customMotto: 'Holiness Is Our Key',
      customLocation: 'Sawla',
      primaryColor: '#fbbf24'
    },
    {
      name: 'Apex International Prep',
      schoolName: 'Apex International Preparatory',
      systemName: 'APEXPAY',
      schoolLogoUrl: 'https://images.unsplash.com/photo-1594708767771-a7502209ff51?w=150&auto=format&fit=crop&q=60',
      baselineDailyFee: 10.00,
      baselineTermFee: 750.00,
      currencyCode: 'GHC',
      customMotto: 'Striving For Excellence',
      customLocation: 'Accra',
      primaryColor: '#0ea5e9'
    },
    {
      name: 'Excel Primary Academy',
      schoolName: 'Excel Primary Academy',
      systemName: 'EXCELLEDGER',
      schoolLogoUrl: 'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=150&auto=format&fit=crop&q=60',
      baselineDailyFee: 4.00,
      baselineTermFee: 300.00,
      currencyCode: 'GHC',
      customMotto: 'Knowledge is Power',
      customLocation: 'Kumasi',
      primaryColor: '#10b981'
    },
    {
      name: 'British International School',
      schoolName: 'BRITISH SCHOOL OF SAWLA',
      systemName: 'BSS-TRACK',
      schoolLogoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=60',
      baselineDailyFee: 20.00,
      baselineTermFee: 1500.00,
      currencyCode: 'USD',
      customMotto: 'Lead, Learn, Inspire',
      customLocation: 'Sawla District',
      primaryColor: '#f43f5e'
    }
  ];

  const applyPreset = (preset: typeof presets[0]) => {
    setSchoolName(preset.schoolName);
    setSystemName(preset.systemName);
    setSchoolLogoUrl(preset.schoolLogoUrl);
    setBaselineDailyFee(preset.baselineDailyFee);
    setBaselineTermFee(preset.baselineTermFee);
    setCurrencyCode(preset.currencyCode);
    setCustomMotto(preset.customMotto);
    setCustomLocation(preset.customLocation);
    setPrimaryColor(preset.primaryColor);
    
    playFeedbackSound('success');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    const payload: SystemSettings = {
      schoolName,
      systemName: systemName.toUpperCase().replace(/\s+/g, ''),
      schoolLogoUrl,
      baselineDailyFee: Number(baselineDailyFee),
      baselineTermFee: Number(baselineTermFee),
      currencyCode,
      customMotto,
      customLocation,
      primaryColor,
      adminWhatsAppPhone,
      autoSendCheckInAlert,
      autoSendArrearsAlert
    };

    const isOk = await updateSystemSettings(payload);
    setLoading(false);

    if (isOk) {
      setSuccess(true);
      playFeedbackSound('success');
      setTimeout(() => setSuccess(false), 3000);
    } else {
      playFeedbackSound('error');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-2" id="system-settings-panel">
      {/* Tab Header Banner */}
      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-lg shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/10 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-widest font-black">
                Config Engine
              </span>
              <span className="bg-neutral-800 text-neutral-400 font-mono text-[9px] px-2 py-0.5 rounded border border-neutral-700/50 uppercase">
                {storageMode === 'cloud' ? '☁️ Cloud Persisted' : '💾 Local Storage'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">System Identity & Rate Settings</h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              Customize the system default rates, school names, currency symbols, and titles. Changes propagate instantly to active dashboards, registers, check-in gates, and audited statements.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-neutral-950/50 border border-neutral-800 p-2 rounded">
            <SchoolLogo size={44} className="shrink-0" />
            <div className="font-mono text-left">
              <span className="text-[10px] text-neutral-500 block">Preview Badge Logo</span>
              <span className="text-xs font-bold text-neutral-300 block truncate max-w-[130px]">{schoolName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation for System Settings */}
      <div className="flex border-b border-neutral-800 gap-6 mt-4 pb-0.5">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('appearance');
            playFeedbackSound('success');
          }}
          className={`pb-3 font-mono text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'appearance'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Palette className="w-3.5 h-3.5 shrink-0" />
          Appearance & Identity
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('financial');
            playFeedbackSound('success');
          }}
          className={`pb-3 font-mono text-[11px] font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeSubTab === 'financial'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-neutral-500 hover:text-white'
          }`}
        >
          <Landmark className="w-3.5 h-3.5 shrink-0" />
          Financial & Rates
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {activeSubTab === 'appearance' ? (
          /* Sub-tab Content: Appearance & Identity */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-neutral-900/60 border border-neutral-800 shadow-lg p-5 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <School className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-neutral-200 tracking-wider uppercase font-mono">School Branding</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    School / Institution Name
                  </label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white font-sans focus:outline-none transition-colors"
                    placeholder="e.g. SAAKO HOLY CHILD ACADEMY"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    System Title Wrapper (Replaces "FEETRACK")
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={systemName}
                      onChange={(e) => setSystemName(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 pl-3 text-xs text-white uppercase font-mono focus:outline-none transition-colors"
                      placeholder="e.g. FEETRACK"
                    />
                    <span className="absolute right-3 top-2.5 text-[9px] font-mono text-neutral-500 uppercase tracking-wider font-bold">
                      Armed
                    </span>
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1 font-mono">
                    No spaces allowed. This appears as the primary app logo on the login screens and headers.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Custom Logo URL (Image Link)
                  </label>
                  <input
                    type="url"
                    value={schoolLogoUrl}
                    onChange={(e) => setSchoolLogoUrl(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white font-mono focus:outline-none transition-colors"
                    placeholder="https://images.unsplash.com/... or blank to use default SVG Crest"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Provide an image URL. Live-switch back to the circular SVG heraldic badge instantly by leaving this empty.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      Motto Banner Text
                    </label>
                    <input
                      type="text"
                      value={customMotto}
                      onChange={(e) => setCustomMotto(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white focus:outline-none transition-colors"
                      placeholder="Holiness Is Our Key"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                      District / Location Label
                    </label>
                    <input
                      type="text"
                      value={customLocation}
                      onChange={(e) => setCustomLocation(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white focus:outline-none transition-colors"
                      placeholder="Sawla"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tab Right Content: Primary branding color */}
            <div className="bg-neutral-900/60 border border-neutral-800 shadow-lg p-5 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Palette className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-neutral-200 tracking-wider uppercase font-mono">Color Theme Branding</h3>
              </div>

              <div className="space-y-5">
                <div className="bg-neutral-950 border border-neutral-850 p-4 rounded-md space-y-3">
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider">
                    Primary Branding Accent Color
                  </label>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2.5 bg-neutral-900 border border-neutral-850 p-2 rounded">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 border border-neutral-800 bg-neutral-950 p-1 cursor-pointer rounded shrink-0"
                      />
                      <input
                        type="text"
                        maxLength={7}
                        value={primaryColor}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val.startsWith('#') || val.length <= 6) {
                            setPrimaryColor(val);
                          }
                        }}
                        className="w-24 bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded py-1.5 px-2 text-xs text-white font-mono focus:outline-none transition-all"
                        placeholder="#fbbf24"
                      />
                    </div>
                    
                    {/* Swatches for quick selection */}
                    <div className="flex items-center gap-2">
                      {[
                        { hex: '#fbbf24', label: 'Amber (Default)' },
                        { hex: '#10b981', label: 'Emerald' },
                        { hex: '#0ea5e9', label: 'Sky Blue' },
                        { hex: '#f43f5e', label: 'Crimson' },
                        { hex: '#a855f7', label: 'Purple' },
                        { hex: '#4f46e5', label: 'Indigo' },
                        { hex: '#f97316', label: 'Orange' },
                      ].map((swatch) => (
                        <button
                          key={swatch.hex}
                          type="button"
                          onClick={() => {
                            setPrimaryColor(swatch.hex);
                            playFeedbackSound('success');
                          }}
                          className="w-6 h-6 rounded-full border-2 transition-all hover:scale-110 cursor-pointer flex items-center justify-center relative group"
                          style={{
                            backgroundColor: swatch.hex,
                            borderColor: primaryColor.toLowerCase() === swatch.hex.toLowerCase() ? '#ffffff' : 'transparent'
                          }}
                          title={swatch.label}
                        >
                          {primaryColor.toLowerCase() === swatch.hex.toLowerCase() && (
                            <Check className="w-3 h-3 text-black font-black" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-500 font-mono leading-relaxed mt-1">
                    This color accent regulates primary action triggers, status highlight rings, active selection outlines, and navigational widgets wide-scale instantly.
                  </p>
                </div>

                {/* Simulated live feedback representation */}
                <div className="border border-neutral-800 p-4 rounded bg-neutral-950/40 text-left space-y-2">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider block">Live Palette Preview</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 font-mono text-black font-extrabold uppercase rounded" style={{ backgroundColor: primaryColor }}>
                        Solid Accents
                      </span>
                      <span className="text-xs font-mono font-bold" style={{ color: primaryColor }}>
                        Dynamic text highlighting
                      </span>
                    </div>
                    <div className="border-t border-dashed border-neutral-800 pt-2 flex gap-2">
                      <button type="button" className="px-3 py-1.5 border font-mono text-[9px] font-bold uppercase tracking-wider transition" style={{ borderColor: primaryColor, color: primaryColor }}>
                        Outline Buttons
                      </button>
                      <button type="button" className="px-3 py-1.5 font-mono text-[9px] font-black uppercase tracking-wider text-black transition" style={{ backgroundColor: primaryColor }}>
                        Interactive Hover
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Sub-tab Content: Financial & Rates */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
            <div className="bg-neutral-900/60 border border-neutral-800 shadow-lg p-5 rounded-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-neutral-800 pb-3">
                <Landmark className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-black text-neutral-200 tracking-wider uppercase font-mono">Financials & Baseline Rates</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Baseline Gate Fee Rate (Per Day)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-neutral-500">
                      {currencyCode}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={baselineDailyFee}
                      onChange={(e) => setBaselineDailyFee(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 pl-12 text-xs text-white font-mono focus:outline-none transition-colors"
                      placeholder="5.00"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Standard expected check-in collection fee at digital checkpoint gates for pupils on the Daily pay scheme. (E.g. GHC 5.00)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Baseline Term Subscription Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-mono font-bold text-neutral-500">
                      {currencyCode}
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      required
                      value={baselineTermFee}
                      onChange={(e) => setBaselineTermFee(Number(e.target.value))}
                      className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 pl-12 text-xs text-white font-mono focus:outline-none transition-colors"
                      placeholder="350.00"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-500 mt-1">
                    Default billing amount charged per academic term for pupils subscribed under the static Term Payer scheme. (E.g. GHC 350)
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    System Currency Token
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white font-mono focus:outline-none transition-colors uppercase"
                    placeholder="e.g. GHC, USD, NGN"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    The primary text display representing money amounts across transactions, logs, and billing.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider mb-1">
                    Administrator WhatsApp Contact Number
                  </label>
                  <input
                    type="tel"
                    value={adminWhatsAppPhone}
                    onChange={(e) => setAdminWhatsAppPhone(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500/50 rounded p-2 text-xs text-white font-mono focus:outline-none transition-colors"
                    placeholder="e.g. +233241234567"
                  />
                  <p className="text-[10px] text-neutral-500 mt-1">
                    SMS/WhatsApp phone number of the master administrator. Automated notifications for budget goal thresholds (50%, 75%, 100%) will send directly here.
                  </p>
                </div>

                <div className="border-t border-neutral-800 pt-4 mt-2 space-y-3">
                  <span className="block text-xs font-mono font-bold text-neutral-300 uppercase tracking-wider">
                    Automated WhatsApp Alerts
                  </span>
                  
                  <div className="space-y-2.5">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none text-neutral-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={autoSendCheckInAlert}
                        onChange={(e) => setLocalAutoSendCheckInAlert(e.target.checked)}
                        className="mt-0.5 w-4 h-4 bg-neutral-950 border border-neutral-850 rounded focus:ring-0 text-emerald-500 cursor-pointer accent-emerald-500"
                      />
                      <div className="font-mono text-[11px] leading-snug">
                        <span className="font-bold block uppercase text-neutral-300">Auto-Alert Parent on Gate Check-In</span>
                        <span className="text-[10px] text-neutral-500 block leading-normal">
                          Instantly dispatch a real-time WhatsApp check-in confirmation message to the parent's contact number on every registration checkpoint entry.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer select-none text-neutral-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={autoSendArrearsAlert}
                        onChange={(e) => setLocalAutoSendArrearsAlert(e.target.checked)}
                        className="mt-0.5 w-4 h-4 bg-neutral-950 border border-neutral-850 rounded focus:ring-0 text-rose-500 cursor-pointer accent-rose-500"
                      />
                      <div className="font-mono text-[11px] leading-snug">
                        <span className="font-bold block uppercase text-neutral-300">Auto-Alert Parent on Outstandings / Arrears</span>
                        <span className="text-[10px] text-neutral-500 block leading-normal">
                          Automatically dispatch a clear, structured arrears warning notice to parents if a pupil registers at the gate with outstanding fee/daily balance.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-tab Content: Baseline Rate presets or informational banner */}
            <div className="bg-neutral-900/40 border border-neutral-800 p-5 rounded-lg space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 border-b border-neutral-800/60 pb-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <h4 className="text-xs font-bold font-mono uppercase text-neutral-300 tracking-wider">Institution Templates</h4>
                </div>
                <p className="text-[10px] text-neutral-400 leading-relaxed">
                  These quick presets immediately update branding titles, system identifiers, custom logos, currencies, location properties, and baseline school fees in a single click.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {presets.map((preset, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/40 p-3 rounded text-left transition-all active:scale-95 flex flex-col justify-between h-24 group cursor-pointer"
                  >
                    <span className="text-[11px] font-bold text-neutral-200 group-hover:text-emerald-400 transition-colors line-clamp-1 block">
                      {preset.name}
                    </span>
                    <div className="space-y-0.5 mt-2">
                      <span className="text-[8px] font-mono text-neutral-500 block uppercase">
                        Theme Hex: <span style={{ color: preset.primaryColor }}>{preset.primaryColor}</span>
                      </span>
                      <span className="text-[8px] font-mono text-emerald-400/90 block font-bold">
                        {preset.currencyCode} {preset.baselineDailyFee.toFixed(2)}/day
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Actions Section */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800 pt-4">
          <div className="flex items-center gap-2 text-stone-400 font-mono text-xs">
            <Info className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Clicking "Save Config" triggers immediate layout update & saves to the database node.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {success && (
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 animate-pulse bg-emerald-950/40 px-3 py-1.5 border border-emerald-500/20 rounded">
                <Check className="w-3.5 h-3.5 shrink-0" /> Settings updated successfully!
              </span>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/50 text-neutral-950 font-mono tracking-wider uppercase text-[10px] font-black px-5 py-2.5 rounded shadow hover:shadow-emerald-500/10 cursor-pointer transition-all flex items-center gap-2 select-none w-full sm:w-auto justify-center"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                  Storing Setup...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 shrink-0" />
                  Save Config Settings
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
