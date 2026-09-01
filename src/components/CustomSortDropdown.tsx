import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUpDown, ChevronDown, Check } from "lucide-react";

export interface SortDropdownOption {
  id: string;
  label: string;
  desc?: string;
}

interface CustomSortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  sortOrder: "asc" | "desc";
  onToggleSortOrder: () => void;
  options: SortDropdownOption[];
  title: string;
  theme?: "army" | "navy" | "dark" | "light" | string;
  className?: string;
}

export default function CustomSortDropdown({
  value,
  onChange,
  sortOrder,
  onToggleSortOrder,
  options,
  title,
  theme = "dark",
  className = ""
}: CustomSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const [position, setPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    isPlacementAbove: boolean;
  }>({
    left: 0,
    width: 260,
    maxHeight: 280,
    isPlacementAbove: false
  });

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const width = Math.min(270, viewportWidth - 16);

    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    // Flip above if space below is < 260px and space above is greater
    const isPlacementAbove = spaceBelow < 260 && spaceAbove > spaceBelow;

    const maxHeight = Math.min(
      320,
      Math.max(140, isPlacementAbove ? spaceAbove - 12 : spaceBelow - 12)
    );

    // Prefer aligning right edge with button right edge if button is on right side of screen
    let left = rect.right - width;
    if (left < 8) {
      left = rect.left;
    }
    // Clamp within viewport
    left = Math.max(8, Math.min(left, viewportWidth - width - 8));

    if (isPlacementAbove) {
      setPosition({
        bottom: viewportHeight - rect.top + 6,
        left,
        width,
        maxHeight,
        isPlacementAbove: true
      });
    } else {
      setPosition({
        top: rect.bottom + 6,
        left,
        width,
        maxHeight,
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
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

  const parsedTheme = useMemo(() => {
    switch (theme) {
      case "army":
        return {
          btnBg: "bg-[#182313] border-[#2D4222] text-[#E5F3DD] hover:border-emerald-500/50",
          popoverBg: "bg-[#182313] border-[#2D4222] text-[#E5F3DD]",
          headerBorder: "border-[#2D4222]",
          mutedText: "text-[#7A987D]",
          optionSelected: "bg-[#25361E] text-emerald-400 font-bold border border-[#436134]/50",
          optionHover: "text-[#E5F3DD] hover:bg-[#25361E]/80",
          optionMuted: "text-[#A0BCA2]",
          toggleBtn: "bg-[#25361E] text-emerald-400 hover:bg-[#2e4326] border border-[#436134]/50"
        };
      case "navy":
        return {
          btnBg: "bg-[#111A35] border-[#202E5A] text-[#E1E8F0] hover:border-cyan-500/50",
          popoverBg: "bg-[#111A35] border-[#202E5A] text-[#E1E8F0]",
          headerBorder: "border-[#202E5A]",
          mutedText: "text-[#627D98]",
          optionSelected: "bg-[#243361] text-cyan-400 font-bold border border-[#34498C]/50",
          optionHover: "text-[#E1E8F0] hover:bg-[#243361]/70",
          optionMuted: "text-[#8DA9C4]",
          toggleBtn: "bg-[#243361] text-cyan-400 hover:bg-[#2b3d75] border border-[#34498C]/50"
        };
      case "light":
        return {
          btnBg: "bg-white border-neutral-200 text-slate-900 hover:border-cyan-500/50",
          popoverBg: "bg-white border-neutral-200 text-slate-900",
          headerBorder: "border-neutral-200",
          mutedText: "text-slate-500",
          optionSelected: "bg-neutral-100 text-cyan-700 font-bold border border-neutral-200",
          optionHover: "text-slate-900 hover:bg-neutral-50",
          optionMuted: "text-slate-600",
          toggleBtn: "bg-neutral-100 text-cyan-700 hover:bg-neutral-200 border border-neutral-200"
        };
      case "dark":
      default:
        return {
          btnBg: "bg-[#0D0D0D] border-[#262626] text-white hover:border-cyan-500/50",
          popoverBg: "bg-[#0D0D0D] border-[#262626] text-white",
          headerBorder: "border-[#262626]",
          mutedText: "text-neutral-400",
          optionSelected: "bg-[#1A1A1A] text-cyan-400 font-bold border border-[#333]",
          optionHover: "text-white hover:bg-[#1A1A1A]/80",
          optionMuted: "text-neutral-400",
          toggleBtn: "bg-[#1A1A1A] text-cyan-400 hover:bg-[#252525] border border-[#333]"
        };
    }
  }, [theme]);

  const selectedOption = options.find((o) => o.id === value);

  const popoverContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.95, y: position.isPlacementAbove ? 6 : -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: position.isPlacementAbove ? 6 : -6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{
            position: "fixed",
            top: position.top !== undefined ? `${position.top}px` : undefined,
            bottom: position.bottom !== undefined ? `${position.bottom}px` : undefined,
            left: `${position.left}px`,
            width: `${position.width}px`,
            maxHeight: `${position.maxHeight}px`,
            zIndex: 99999,
            scrollbarWidth: "none"
          }}
          className={`rounded-2xl border p-2 shadow-2xl overflow-y-auto select-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${parsedTheme.popoverBg}`}
        >
          {/* Header with Title and ASC/DESC Toggle */}
          <div className={`px-2 py-1.5 border-b mb-1.5 flex items-center justify-between ${parsedTheme.headerBorder}`}>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${parsedTheme.mutedText}`}>
              {title}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSortOrder();
              }}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold flex items-center space-x-1 cursor-pointer transition-all active:scale-95 ${parsedTheme.toggleBtn}`}
              title="Toggle Sort Direction"
            >
              <ArrowUpDown className="h-3 w-3" />
              <span>{sortOrder === "asc" ? "A → Z" : "Z → A"}</span>
            </button>
          </div>

          {/* Options List */}
          <div className="space-y-1">
            {options.map((opt) => {
              const isSelected = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? parsedTheme.optionSelected
                      : `${parsedTheme.optionMuted} ${parsedTheme.optionHover}`
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="text-xs font-semibold block truncate">
                      {opt.label}
                    </span>
                    {opt.desc && (
                      <span className={`text-[10px] block truncate opacity-70`}>
                        {opt.desc}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  )}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (!isOpen) updatePosition();
          setIsOpen(!isOpen);
        }}
        className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-2 transition-all cursor-pointer select-none shadow-xs ${
          isOpen ? "border-cyan-500 ring-2 ring-cyan-500/10" : ""
        } ${parsedTheme.btnBg} ${className}`}
      >
        <ArrowUpDown className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-[180px]">
          {selectedOption ? selectedOption.label : "Sort"}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform duration-200 shrink-0 ${
            isOpen ? "rotate-180 text-cyan-400" : ""
          }`}
        />
      </button>

      {/* Render Portal directly to body */}
      {typeof document !== "undefined" && ReactDOM.createPortal(popoverContent, document.body)}
    </div>
  );
}
