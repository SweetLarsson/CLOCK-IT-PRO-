import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string | React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  className?: string; // Additional Tailwind styling for container trigger button
  placeholder?: string;
  dropdownClassName?: string;
  id?: string;
  theme?: "army" | "navy" | "dark" | "light" | string;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  className = "",
  placeholder = "Select option...",
  dropdownClassName = "",
  id = "",
  theme = "dark"
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Position state for portal
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
    isPlacementAbove: boolean;
  }>({
    left: 0,
    width: 0,
    maxHeight: 240,
    isPlacementAbove: false
  });

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    // If completely scrolled out of view, close
    if (rect.bottom < 0 || rect.top > viewportHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = Math.max(0, viewportHeight - rect.bottom - 12);
    const spaceAbove = Math.max(0, rect.top - 12);

    // Determine whether to display above or below
    // Intelligently flip above if space below is cramped (< 220px) and there is more space above
    const isPlacementAbove = spaceBelow < 220 && spaceAbove > spaceBelow;

    const availableSpace = isPlacementAbove ? spaceAbove - 8 : spaceBelow - 8;
    const maxHeight = Math.min(280, Math.max(100, availableSpace));

    // Ensure width matches field with minimum 160px for readability on narrow mobile viewports
    const minWidth = Math.max(rect.width, 160);
    const width = Math.min(minWidth, viewportWidth - 16);
    const left = Math.max(8, Math.min(rect.left, viewportWidth - width - 8));

    if (isPlacementAbove) {
      setDropdownPosition({
        bottom: viewportHeight - rect.top + 6,
        left,
        width,
        maxHeight,
        isPlacementAbove: true
      });
    } else {
      setDropdownPosition({
        top: rect.bottom + 6,
        left,
        width,
        maxHeight,
        isPlacementAbove: false
      });
    }
  }, []);

  // Update position on open, scroll, resize
  useEffect(() => {
    if (isOpen) {
      updatePosition();

      const handleScroll = () => {
        updatePosition();
      };

      const handleResize = () => {
        updatePosition();
      };

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setIsOpen(false);
        }
      };

      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        window.removeEventListener("scroll", handleScroll, true);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isOpen, updatePosition]);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
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

  // Scroll to selected option on open
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const selectedEl = dropdownRef.current.querySelector<HTMLElement>('[data-selected="true"]');
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  // Expanded color theme configurations matching application styles perfectly
  const themeClasses: Record<
    string,
    {
      dropdownBg: string;
      optionSelected: string;
      optionHover: string;
      optionUnselected: string;
      separator: string;
      checkColor: string;
      activeTrigger: string;
    }
  > = {
    army: {
      dropdownBg: "bg-[#182313] border-[#2D4222] text-[#E5F3DD] shadow-2xl",
      optionSelected:
        "bg-[#25361E] text-emerald-400 font-semibold rounded-xl border border-[#436134]/50 shadow-xs",
      optionHover: "text-[#E5F3DD] hover:bg-[#25361E]/80 rounded-xl",
      optionUnselected: "text-[#A0BCA2]",
      separator: "border-[#2D4222]",
      checkColor: "text-emerald-400",
      activeTrigger: "border-emerald-500 ring-2 ring-emerald-500/30"
    },
    navy: {
      dropdownBg: "bg-[#111A35] border-[#202E5A] text-[#E1E8F0] shadow-2xl",
      optionSelected:
        "bg-[#243361] text-cyan-400 font-semibold rounded-xl border border-[#34498C]/50 shadow-xs",
      optionHover: "text-[#E1E8F0] hover:bg-[#243361]/70 rounded-xl",
      optionUnselected: "text-[#8DA9C4]",
      separator: "border-[#202E5A]",
      checkColor: "text-cyan-400",
      activeTrigger: "border-cyan-500 ring-2 ring-cyan-500/30"
    },
    dark: {
      dropdownBg: "bg-[#0D0D0D] border-[#262626] text-white shadow-2xl",
      optionSelected:
        "bg-[#1A1A1A] text-cyan-400 font-semibold rounded-xl border border-[#333] shadow-xs",
      optionHover: "text-white hover:bg-[#1A1A1A]/80 rounded-xl",
      optionUnselected: "text-neutral-400",
      separator: "border-[#262626]",
      checkColor: "text-cyan-400",
      activeTrigger: "border-cyan-500 ring-2 ring-cyan-500/30"
    },
    light: {
      dropdownBg: "bg-white border-neutral-200 text-slate-900 shadow-xl",
      optionSelected:
        "bg-neutral-100 text-cyan-600 font-semibold rounded-xl border border-neutral-200 shadow-xs",
      optionHover: "text-slate-900 hover:bg-neutral-50 rounded-xl",
      optionUnselected: "text-slate-600",
      separator: "border-neutral-200",
      checkColor: "text-cyan-600",
      activeTrigger: "border-cyan-500 ring-2 ring-cyan-500/30"
    }
  };

  const currentTheme = themeClasses[theme] || themeClasses.dark;

  const dropdownContent = isOpen ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top: dropdownPosition.top !== undefined ? `${dropdownPosition.top}px` : undefined,
        bottom: dropdownPosition.bottom !== undefined ? `${dropdownPosition.bottom}px` : undefined,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: `${dropdownPosition.maxHeight}px`,
        zIndex: 99999,
        scrollbarWidth: "thin"
      }}
      className={`rounded-2xl p-1.5 overflow-y-auto border shadow-2xl select-none custom-dropdown-scroll ${currentTheme.dropdownBg} ${dropdownClassName}`}
    >
      {options.length === 0 ? (
        <div className={`text-center py-3 text-xs ${currentTheme.optionUnselected}`}>
          No options available
        </div>
      ) : (
        <div className="flex flex-col space-y-0.5">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            const shouldAddSeparatorAfter = opt.value === "all";
            return (
              <React.Fragment key={opt.value}>
                <button
                  type="button"
                  data-selected={isSelected ? "true" : undefined}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer min-w-0 flex items-center justify-between space-x-2 rounded-xl ${
                    isSelected
                      ? currentTheme.optionSelected
                      : `${currentTheme.optionUnselected} ${currentTheme.optionHover}`
                  }`}
                >
                  <div className="truncate text-left flex-1 min-w-0">{opt.label}</div>
                  {isSelected && (
                    <Check className={`h-3.5 w-3.5 shrink-0 ${currentTheme.checkColor}`} />
                  )}
                </button>
                {shouldAddSeparatorAfter && (
                  <div className={`border-b my-1 mx-1 ${currentTheme.separator}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            updatePosition();
          }
          setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between text-left transition-all relative border outline-none pr-9 cursor-pointer select-none ${
          isOpen ? currentTheme.activeTrigger : ""
        } ${className}`}
      >
        <div className="truncate pr-1 w-full min-w-0 flex items-center">
          {selectedOption ? selectedOption.label : <span className="truncate">{placeholder}</span>}
        </div>
        {/* Properly padded chevron down icon */}
        <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center text-neutral-400 dark:text-neutral-500 pointer-events-none transition-transform duration-200">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180 text-cyan-500" : ""
            }`}
          />
        </span>
      </button>

      {/* Render via Portal to body so it displays over ALL collapsible containers, cards, and modals */}
      {typeof document !== "undefined" && dropdownContent && ReactDOM.createPortal(dropdownContent, document.body)}
    </div>
  );
}
