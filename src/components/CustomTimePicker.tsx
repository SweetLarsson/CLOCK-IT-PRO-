import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Check } from "lucide-react";

interface CustomTimePickerProps {
  value: string; // Expected "HH:MM:SS" or "HH:MM"
  onChange: (timeString: string) => void;
  theme?: "army" | "navy" | "dark" | "light" | string;
  className?: string;
  id?: string;
  disabled?: boolean;
  compact?: boolean;
}

export default function CustomTimePicker({
  value,
  onChange,
  theme = "dark",
  className = "",
  id,
  disabled = false,
  compact = false
}: CustomTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoursContainerRef = useRef<HTMLDivElement>(null);
  const minutesContainerRef = useRef<HTMLDivElement>(null);

  // Position state for portal on desktop
  const [popoverPosition, setPopoverPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    isPlacementAbove: boolean;
  }>({
    left: 0,
    isPlacementAbove: false
  });

  const parsedTheme = useMemo(() => {
    if (theme === "army" || theme === "navy" || theme === "light" || theme === "dark") {
      return theme;
    }
    return "dark";
  }, [theme]);

  // Parse hours, minutes, and seconds
  const { hours, minutes } = useMemo(() => {
    let h = 8;
    let m = 0;
    if (value) {
      const parts = value.split(":");
      if (parts.length >= 2) {
        h = parseInt(parts[0], 10) || 0;
        m = parseInt(parts[1], 10) || 0;
      }
    }
    return {
      hours: Math.min(23, Math.max(0, h)),
      minutes: Math.min(59, Math.max(0, m))
    };
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const popoverWidth = Math.min(300, viewportWidth - 16);

    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    // Flip above if space below is < 300px and space above is greater
    const isPlacementAbove = spaceBelow < 300 && spaceAbove > spaceBelow;

    let left = rect.left;
    if (left + popoverWidth > viewportWidth - 8) {
      left = rect.right - popoverWidth;
    }
    left = Math.max(8, Math.min(left, viewportWidth - popoverWidth - 8));

    if (isPlacementAbove) {
      setPopoverPosition({
        bottom: viewportHeight - rect.top + 6,
        left,
        isPlacementAbove: true
      });
    } else {
      setPopoverPosition({
        top: rect.bottom + 6,
        left,
        isPlacementAbove: false
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScroll = () => {
        updatePosition();
      };
      const handleResize = () => {
        updatePosition();
      };

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
      };
    }
  }, [isOpen, updatePosition]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Scroll to active elements on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (hoursContainerRef.current) {
          const selectedHourEl = hoursContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedHourEl) {
            selectedHourEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
        if (minutesContainerRef.current) {
          const selectedMinEl = minutesContainerRef.current.querySelector('[data-selected="true"]');
          if (selectedMinEl) {
            selectedMinEl.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }, 50);
    }
  }, [isOpen]);

  const handleSelectTime = (newHours: number, newMinutes: number) => {
    const formatted = `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
    if (value && value.split(":").length === 3) {
      const secondsPart = value.split(":")[2] || "00";
      onChange(`${formatted}:${secondsPart}`);
    } else {
      onChange(formatted);
    }
  };

  const hoursArray = Array.from({ length: 24 }, (_, i) => i);
  const minutesArray = Array.from({ length: 60 }, (_, i) => i);
  const commonMinutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const activeThemeClass = useMemo(() => {
    switch (parsedTheme) {
      case "army":
        return {
          triggerBg: "bg-[#182313] border-[#2D4222] text-[#E5F3DD] hover:border-emerald-500/50",
          triggerBadge: "bg-[#25361E] text-emerald-400 border border-[#436134]/50",
          panelBg: "bg-[#182313] border-[#2D4222] text-[#E5F3DD]",
          headerBorder: "border-[#2D4222]",
          headerTitle: "text-[#E5F3DD]",
          panelIcon: "text-emerald-400",
          label: "text-[#7A987D]",
          itemSelected: "bg-emerald-600 text-white font-bold shadow-xs",
          itemUnselected: "hover:bg-[#25361E] text-[#A0BCA2] hover:text-[#E5F3DD]",
          divider: "border-[#2D4222]",
          presetActive: "bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold",
          presetInactive: "bg-[#25361E] text-[#A0BCA2] border border-transparent",
          doneBtn: "bg-gradient-to-r from-emerald-600 to-green-600 hover:brightness-110 text-white font-bold"
        };
      case "navy":
        return {
          triggerBg: "bg-[#111A35] border-[#202E5A] text-[#E1E8F0] hover:border-cyan-500/50",
          triggerBadge: "bg-[#243361] text-cyan-400 border border-[#34498C]/50",
          panelBg: "bg-[#111A35] border-[#202E5A] text-[#E1E8F0]",
          headerBorder: "border-[#202E5A]",
          headerTitle: "text-[#E1E8F0]",
          panelIcon: "text-cyan-400",
          label: "text-[#627D98]",
          itemSelected: "bg-cyan-600 text-white font-bold shadow-xs",
          itemUnselected: "hover:bg-[#243361] text-[#8DA9C4] hover:text-[#E1E8F0]",
          divider: "border-[#202E5A]",
          presetActive: "bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold",
          presetInactive: "bg-[#243361] text-[#8DA9C4] border border-transparent",
          doneBtn: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold"
        };
      case "light":
        return {
          triggerBg: "bg-white border-neutral-200 text-slate-900 hover:border-cyan-500/50",
          triggerBadge: "bg-neutral-100 text-cyan-700 border border-neutral-200",
          panelBg: "bg-white border-neutral-200 text-slate-900",
          headerBorder: "border-neutral-200",
          headerTitle: "text-slate-900",
          panelIcon: "text-cyan-600",
          label: "text-slate-500",
          itemSelected: "bg-cyan-600 text-white font-bold shadow-xs",
          itemUnselected: "hover:bg-neutral-100 text-slate-600 hover:text-slate-900",
          divider: "border-neutral-200",
          presetActive: "bg-cyan-50 text-cyan-700 border border-cyan-200 font-bold",
          presetInactive: "bg-neutral-100 text-slate-600 border border-transparent",
          doneBtn: "bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white font-bold"
        };
      case "dark":
      default:
        return {
          triggerBg: "bg-[#0D0D0D] border-[#262626] text-white hover:border-cyan-500/50",
          triggerBadge: "bg-[#1A1A1A] text-cyan-400 border border-[#333]",
          panelBg: "bg-[#0D0D0D] border-[#262626] text-white",
          headerBorder: "border-[#262626]",
          headerTitle: "text-white",
          panelIcon: "text-cyan-400",
          label: "text-neutral-400",
          itemSelected: "bg-cyan-500 text-black font-bold shadow-xs",
          itemUnselected: "hover:bg-neutral-900 text-gray-400 hover:text-white",
          divider: "border-[#262626]",
          presetActive: "bg-cyan-950 text-cyan-400 border border-cyan-850 font-bold",
          presetInactive: "bg-[#1A1A1A] text-neutral-400 border border-transparent",
          doneBtn: "bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white font-bold"
        };
    }
  }, [parsedTheme]);

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile screen sizes */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[99998] sm:hidden"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            ref={popoverRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "fixed",
              top:
                window.innerWidth >= 640 && popoverPosition.top !== undefined
                  ? `${popoverPosition.top}px`
                  : undefined,
              bottom:
                window.innerWidth >= 640 && popoverPosition.bottom !== undefined
                  ? `${popoverPosition.bottom}px`
                  : undefined,
              left:
                window.innerWidth >= 640
                  ? `${popoverPosition.left}px`
                  : "50%",
              transform:
                window.innerWidth < 640
                  ? "translate(-50%, -50%)"
                  : undefined,
              zIndex: 99999
            }}
            className={`w-[90%] max-w-[310px] rounded-3xl p-4 shadow-2xl select-none border sm:w-72 ${
              window.innerWidth < 640 ? "fixed top-1/2" : ""
            } ${activeThemeClass.panelBg}`}
          >
            <div
              className={`flex justify-between items-center pb-2.5 mb-2.5 border-b ${activeThemeClass.headerBorder}`}
            >
              <span
                className={`text-xs font-bold flex items-center space-x-1 ${activeThemeClass.headerTitle}`}
              >
                <Clock className={`h-3.5 w-3.5 ${activeThemeClass.panelIcon}`} />
                <span>Adjust Time (24h)</span>
              </span>
              <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-neutral-900/30 text-cyan-400">
                {value}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 h-48">
              {/* Hour selection */}
              <div className="flex flex-col space-y-1">
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${activeThemeClass.label}`}
                >
                  Hour (00-23)
                </span>
                <div
                  ref={hoursContainerRef}
                  className="flex flex-col overflow-y-auto overflow-x-hidden h-36 pr-1 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
                >
                  {hoursArray.map((h) => {
                    const isSelected = hours === h;
                    return (
                      <button
                        key={h}
                        type="button"
                        data-selected={isSelected ? "true" : "false"}
                        onClick={() => handleSelectTime(h, minutes)}
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
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
                <span
                  className={`text-[10px] uppercase font-bold tracking-wider ${activeThemeClass.label}`}
                >
                  Minute
                </span>
                <div
                  ref={minutesContainerRef}
                  className="flex flex-col overflow-y-auto overflow-x-hidden h-36 pr-1 space-y-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  style={{ scrollbarWidth: "none" }}
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
                        className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? activeThemeClass.itemSelected
                            : activeThemeClass.itemUnselected
                        }`}
                      >
                        <span>{String(m).padStart(2, "0")}</span>
                        {isCommon && !isSelected && (
                          <span className="text-[8px] opacity-40 font-bold font-mono">5m</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Presets row */}
            <div
              className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] ${activeThemeClass.divider}`}
            >
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
  );

  return (
    <div ref={containerRef} className="relative inline-block w-full" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            if (!isOpen) updatePosition();
            setIsOpen(!isOpen);
          }
        }}
        className={`w-full flex items-center justify-between font-sans transition-all shadow-xs outline-none focus:ring-2 cursor-pointer ${
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
          <span
            className={`text-[10px] uppercase font-mono tracking-wider font-bold px-2 py-0.5 rounded-md ${activeThemeClass.triggerBadge}`}
          >
            24h
          </span>
        )}
      </button>

      {/* Render via Portal */}
      {typeof document !== "undefined" && ReactDOM.createPortal(popoverContent, document.body)}
    </div>
  );
}
