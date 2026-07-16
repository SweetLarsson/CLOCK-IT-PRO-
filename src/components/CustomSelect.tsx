import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";

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
  theme?: "army" | "navy" | "dark" | "light";
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

  // Close when clicked outside
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

  const selectedOption = options.find((opt) => opt.value === value);

  // Expanded color theme configurations matching application styles perfectly
  const themeClasses = {
    army: {
      dropdownBg: "bg-[#182413] border-[#2D3E24] shadow-2xl",
      optionSelected: "bg-[#25361E] text-emerald-400 font-semibold rounded-xl",
      optionHover: "text-[#E5F3DD] hover:bg-[#25361E]/75 dark:hover:bg-[#25361E]/75 rounded-xl",
      optionUnselected: "text-[#A1C094]",
      separator: "border-[#2D3E24]"
    },
    navy: {
      dropdownBg: "bg-[#111A31] border-[#1C2B54] shadow-2xl",
      optionSelected: "bg-[#243361] text-cyan-400 font-semibold rounded-xl",
      optionHover: "text-[#E1E8F0] hover:bg-[#243361]/70 dark:hover:bg-[#243361]/70 rounded-xl",
      optionUnselected: "text-[#94A5C1]",
      separator: "border-[#1C2B54]"
    },
    dark: {
      dropdownBg: "bg-[#0D0D0D] border-[#262626] shadow-2xl",
      optionSelected: "bg-[#1A1A1A] text-cyan-400 font-semibold rounded-xl",
      optionHover: "text-white hover:bg-[#1A1A1A]/70 dark:hover:bg-[#1A1A1A]/70 rounded-xl",
      optionUnselected: "text-neutral-400",
      separator: "border-[#262626]"
    },
    light: {
      dropdownBg: "bg-white border-neutral-200 shadow-xl",
      optionSelected: "bg-neutral-150 text-cyan-600 font-semibold rounded-xl",
      optionHover: "text-slate-900 hover:bg-neutral-50 rounded-xl",
      optionUnselected: "text-slate-650",
      separator: "border-neutral-200"
    }
  };

  const currentTheme = themeClasses[theme] || themeClasses.dark;

  return (
    <div ref={containerRef} id={id} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between text-left transition-all relative border outline-none min-h-[44px] pr-10 cursor-pointer ${className}`}
      >
        <span className="truncate pr-2">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {/* Properly padded chevron down icon */}
        <span className="absolute right-4.5 top-1/2 -translate-y-1/2 flex items-center justify-center text-neutral-400 dark:text-neutral-500 pointer-events-none transition-transform duration-200">
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {/* Styled Dropdown List with Rounded Corners based on active theme */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 mt-1.5 z-50 rounded-2xl p-1.5 max-h-60 overflow-y-auto border ${currentTheme.dropdownBg} ${dropdownClassName}`}
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
                      onClick={() => {
                        onChange(opt.value);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors cursor-pointer min-w-0 flex items-center ${
                        isSelected
                          ? currentTheme.optionSelected
                          : `${currentTheme.optionUnselected} ${currentTheme.optionHover}`
                      }`}
                    >
                      <span className="truncate text-left w-full block">
                        {opt.label}
                      </span>
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
      )}
    </div>
  );
}
