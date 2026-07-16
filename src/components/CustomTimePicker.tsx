/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Clock, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CustomTimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (value: string) => void;
  className?: string;
  id?: string;
  theme?: "light" | "dark" | "army" | "navy";
  disabled?: boolean;
  compact?: boolean;
}

export default function CustomTimePicker({
  value = "08:00",
  onChange,
  className = "",
  id = "",
  theme = "dark",
  disabled = false,
  compact = false
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse "HH:MM" string. E.g., "08:00" -> hour: 8, minute: 0
  const parseTime = (timeStr: string) => {
    const parts = (timeStr || "08:00").split(":");
    let hours = parseInt(parts[0], 10);
    if (isNaN(hours)) hours = 8;
    let minutes = parseInt(parts[1], 10);
    if (isNaN(minutes)) minutes = 0;
    return { hours, minutes };
  };

  const { hours, minutes } = parseTime(value);

  // Set hour / minute in 24h format directly
  const handleSelectTime = (h24: number, min: number) => {
    const formattedHour = String(h24).padStart(2, "0");
    const formattedMinute = String(min).padStart(2, "0");
    onChange(`${formattedHour}:${formattedMinute}`);
  };

  // Click outside to close the picker
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const minutesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected hour and minute to the center of their scroll containers when open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (hoursContainerRef.current) {
          const selected = hoursContainerRef.current.querySelector('[data-selected="true"]');
          if (selected) {
            selected.scrollIntoView({ block: "center", behavior: "auto" });
          }
        }
        if (minutesContainerRef.current) {
          const selected = minutesContainerRef.current.querySelector('[data-selected="true"]');
          if (selected) {
            selected.scrollIntoView({ block: "center", behavior: "auto" });
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);



  // Hours array from 00 to 23
  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  // Minutes array from 00 to 59
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);
  const commonMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const parsedTheme = theme || "dark";
  const activeThemeClass = React.useMemo(() => {
    switch (parsedTheme) {
      case "army":
        return {
          triggerBg: "bg-[#182413] hover:bg-[#1E2C18] border-[#2D3E24] text-[#E5F3DD] focus:ring-emerald-550/20",
          triggerIcon: "text-emerald-400",
          triggerBadge: "text-emerald-400 bg-[#25361E]",
          panelBg: "bg-[#182413] border-[#2D3E24] text-[#E5F3DD]",
          headerBorder: "border-[#203118]",
          panelIcon: "text-emerald-400",
          headerTitle: "text-white",
          label: "text-[#A1C094]",
          itemSelected: "bg-[#25361E] text-emerald-400 font-bold",
          itemUnselected: "hover:bg-[#25361E]/50 text-[#A1C094] hover:text-[#E6F4DE]",
          divider: "border-[#2D3E24]",
          presetActive: "bg-[#25361E] text-emerald-400 border border-[#436134] font-bold",
          presetInactive: "bg-[#11180D] text-[#A1C094] border border-transparent",
          doneBtn: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:brightness-110 text-white font-bold"
        };
      case "navy":
        return {
          triggerBg: "bg-[#111A31] hover:bg-[#162342] border-[#1C2B54] text-[#E1E8F0] focus:ring-cyan-555/20",
          triggerIcon: "text-cyan-400",
          triggerBadge: "text-cyan-400 bg-[#243361]",
          panelBg: "bg-[#111A31] border-[#1C2B54] text-[#E1E8F0]",
          headerBorder: "border-[#152140]",
          panelIcon: "text-cyan-400",
          headerTitle: "text-[#ECEFF4]",
          label: "text-[#94A5C1]",
          itemSelected: "bg-[#243361] text-cyan-400 font-bold",
          itemUnselected: "hover:bg-[#243361]/50 text-[#94A5C1] hover:text-white",
          divider: "border-[#1C2B54]",
          presetActive: "bg-[#243361] text-cyan-400 border border-[#34498C] font-bold",
          presetInactive: "bg-[#0E1529] text-[#94A5C1] border border-transparent",
          doneBtn: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold"
        };
      case "light":
        return {
          triggerBg: "bg-white hover:bg-neutral-50 border-neutral-200 text-slate-900 focus:ring-indigo-500/20",
          triggerIcon: "text-indigo-650",
          triggerBadge: "text-indigo-650 bg-indigo-50",
          panelBg: "bg-white border-neutral-205 text-slate-900 shadow-2xl",
          headerBorder: "border-neutral-100",
          panelIcon: "text-indigo-600",
          headerTitle: "text-gray-900",
          label: "text-neutral-450",
          itemSelected: "bg-indigo-600 text-white font-bold",
          itemUnselected: "hover:bg-neutral-100 text-gray-700",
          divider: "border-neutral-100",
          presetActive: "bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold",
          presetInactive: "bg-neutral-100 text-neutral-600 border border-transparent",
          doneBtn: "bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
        };
      case "dark":
      default:
        return {
          triggerBg: "bg-[#111] hover:bg-[#151515] border-[#262626] text-white focus:ring-cyan-500/10",
          triggerIcon: "text-cyan-400",
          triggerBadge: "text-cyan-400 bg-cyan-950/20",
          panelBg: "bg-[#0D0D0D] border-[#262626] text-white shadow-2xl",
          headerBorder: "border-[#262626]",
          panelIcon: "text-cyan-400",
          headerTitle: "text-white",
          label: "text-neutral-400",
          itemSelected: "bg-cyan-500 text-slate-950 font-bold",
          itemUnselected: "hover:bg-neutral-900 text-gray-400 hover:text-white",
          divider: "border-[#262626]",
          presetActive: "bg-cyan-950 text-cyan-400 border border-cyan-850 font-bold",
          presetInactive: "bg-[#1A1A1A] text-neutral-400 border border-transparent",
          doneBtn: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold"
        };
    }
  }, [parsedTheme]);

  return (
    <div ref={containerRef} className="relative inline-block w-full" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between font-sans transition-all shadow-xs outline-none focus:ring-2 ${
          compact 
            ? "px-2 py-1.5 rounded-xl text-xs font-bold" 
            : "px-4 py-2.5 rounded-xl text-xs font-semibold"
        } border ${
          disabled 
            ? "opacity-40 cursor-not-allowed bg-neutral-200 dark:bg-[#151515] text-neutral-400 dark:text-neutral-600 border-neutral-300 dark:border-neutral-800" 
            : activeThemeClass.triggerBg
        } ${className}`}
      >
        <span className="flex items-center space-x-1 w-full justify-center">
          <Clock className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
          <span className="font-mono tracking-tight text-xs font-bold">
            {value || "08:00"}
          </span>
        </span>
        {!compact && (
          <span className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded-md ${activeThemeClass.triggerBadge}`}>
            24h
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop for mobile screen sizes */}
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-45 sm:hidden"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[310px] z-50 rounded-3xl p-4 shadow-2xl select-none text-sans border sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:bottom-auto sm:translate-x-0 sm:translate-y-0 sm:w-72 sm:mt-2 ${activeThemeClass.panelBg}`}
            >
              <div className={`flex justify-between items-center pb-2.5 mb-2.5 border-b ${activeThemeClass.headerBorder}`}>
                <span className={`text-xs font-bold flex items-center space-x-1 ${activeThemeClass.headerTitle}`}>
                  <Clock className={`h-3.5 w-3.5 ${activeThemeClass.panelIcon}`} />
                  <span>Adjust Target Hour (24h)</span>
                </span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-neutral-900/30 text-cyan-400">
                  {value}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 h-48">
                {/* Hour selection */}
                <div className="flex flex-col space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${activeThemeClass.label}`}>Hour (00-23)</span>
                  <div 
                    ref={hoursContainerRef}
                    className="flex flex-col overflow-y-auto overflow-x-hidden h-36 pr-1 space-y-1 scrollbar-thin scrollbar-thumb-neutral-250 dark:scrollbar-thumb-neutral-850 scrollbar-track-transparent"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    {hoursArray.map((h) => {
                      const isSelected = hours === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          data-selected={isSelected ? "true" : "false"}
                          onClick={() => handleSelectTime(h, minutes)}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-center transition-all ${
                            isSelected
                              ? activeThemeClass.itemSelected
                              : activeThemeClass.itemUnselected
                          }`}
                        >
                          {String(h).padStart(2, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minute selection */}
                <div className="flex flex-col space-y-1">
                  <span className={`text-[10px] uppercase font-bold tracking-wider ${activeThemeClass.label}`}>Minute</span>
                  <div 
                    ref={minutesContainerRef}
                    className="flex flex-col overflow-y-auto overflow-x-hidden h-36 pr-1 space-y-1 scrollbar-thin scrollbar-thumb-neutral-250 dark:scrollbar-thumb-neutral-850 scrollbar-track-transparent"
                    style={{ scrollbarWidth: "thin" }}
                  >
                    {minutesArray.map((m) => {
                      const isSelected = minutes === m;
                      const isCommon = commonMinutes.includes(m);
                      return (
                        <button
                          key={m}
                          type="button"
                          data-selected={isSelected ? "true" : "false"}
                          onClick={() => handleSelectTime(hours, m)}
                          className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                            isSelected
                              ? activeThemeClass.itemSelected
                              : activeThemeClass.itemUnselected
                          }`}
                        >
                          <span>{String(m).padStart(2, "0")}</span>
                          {isCommon && !isSelected && <span className="text-[8px] opacity-40 font-bold font-mono">5m</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Quick Presets row */}
              <div className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] ${activeThemeClass.divider}`}>
                <span className={`font-medium font-sans ${activeThemeClass.label}`}>Presets:</span>
                <div className="flex space-x-1 font-sans">
                  {["08:00", "09:00", "17:00", "22:00"].map((preset) => {
                    const isPresetActive = value === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          onChange(preset);
                        }}
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[9px] hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                          isPresetActive
                            ? activeThemeClass.presetActive
                            : activeThemeClass.presetInactive
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Done confirmation action button */}
              <div className={`mt-3 pt-2 border-t ${activeThemeClass.divider}`}>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className={`w-full py-2 text-white font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer transition-all active:scale-[0.97] shadow-sm font-sans ${activeThemeClass.doneBtn}`}
                >
                  <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>Done</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
