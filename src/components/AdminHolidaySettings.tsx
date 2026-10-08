import React, { useState, useEffect } from "react";
import { 
  Calendar, 
  Clock, 
  Globe, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Search, 
  Sparkles, 
  ChevronDown, 
  X,
  AlertCircle,
  CheckCircle2,
  Info
} from "lucide-react";
import { 
  TenantSettings, 
  InternationalHoliday, 
  CustomHoliday 
} from "../types.js";
import { 
  DEFAULT_INTERNATIONAL_HOLIDAYS, 
  GLOBAL_TIMEZONES, 
  getDateInTimezone 
} from "../utils/holidayUtils.js";

interface AdminHolidaySettingsProps {
  settings: TenantSettings;
  onChange: (updatedSettings: TenantSettings) => void;
  adminThemeClass: any;
  translations: any;
}

// Reusable Intelligent Custom Dropdown Modal
interface IntelligentSelectDropdownProps {
  id: string;
  value: number | string;
  options: { value: number | string; label: string }[];
  onChange: (val: any) => void;
  adminThemeClass: any;
  placeholder?: string;
  showIcon?: boolean;
}

const IntelligentSelectDropdown: React.FC<IntelligentSelectDropdownProps> = ({
  id,
  value,
  options,
  onChange,
  adminThemeClass,
  placeholder,
  showIcon = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const [maxDropdownHeight, setMaxDropdownHeight] = useState<number>(240);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => String(o.value) === String(value));

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;

      if (spaceBelow < 250 && spaceAbove > spaceBelow) {
        setPlacement("above");
        setMaxDropdownHeight(Math.min(260, Math.max(120, spaceAbove - 20)));
      } else {
        setPlacement("below");
        setMaxDropdownHeight(Math.min(260, Math.max(120, spaceBelow - 20)));
      }
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen((prev) => !prev);
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const handleScrollOrResize = () => {
      updatePosition();
    };
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={handleToggle}
        className={`w-full text-xs rounded-xl py-3 px-3.5 font-medium outline-none border focus:border-cyan-500 min-h-[44px] flex items-center ${
          showIcon ? "justify-between" : "justify-start"
        } text-left cursor-pointer transition-all ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
      >
        <span className="truncate block w-full">{selectedOption ? selectedOption.label : (placeholder || "Select...")}</span>
        {showIcon && (
          <ChevronDown className={`h-4 w-4 shrink-0 ml-2 transition-transform text-neutral-400 ${isOpen ? "rotate-180" : ""}`} />
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className={`absolute left-0 right-0 z-50 rounded-2xl border shadow-2xl p-1.5 overflow-y-auto scrollbar-thin transition-all ${
            placement === "above" ? "bottom-full mb-2" : "top-full mt-2"
          } ${adminThemeClass.cardBg || adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
          style={{ minWidth: "100%", maxHeight: `${maxDropdownHeight}px` }}
        >
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? "bg-cyan-600 text-white font-bold shadow-xs"
                    : `${adminThemeClass.textTitle} hover:bg-neutral-500/15`
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check className="h-3.5 w-3.5 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const AdminHolidaySettings: React.FC<AdminHolidaySettingsProps> = ({
  settings,
  onChange,
  adminThemeClass,
  translations
}) => {
  // Master Holiday Management Switch (defaults to true if undefined)
  const isHolidayEnabled = settings.holidayManagementEnabled !== false;

  // Timezone (defaults to UTC or Africa/Lagos)
  const currentTimezone = settings.timezone || "UTC";

  // International Holidays (defaults to standard predefined list)
  const intlHolidays: InternationalHoliday[] = (settings.internationalHolidays && settings.internationalHolidays.length > 0)
    ? settings.internationalHolidays
    : DEFAULT_INTERNATIONAL_HOLIDAYS;

  // Custom Holidays
  const customHolidays: CustomHoliday[] = settings.customHolidays || [];

  // Live Timezone Clock Preview
  const [liveTimeStr, setLiveTimeStr] = useState("");
  useEffect(() => {
    const updateTime = () => {
      const tzInfo = getDateInTimezone(new Date(), currentTimezone);
      setLiveTimeStr(`${tzInfo.timeString} • ${tzInfo.formattedDisplay}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [currentTimezone]);

  // Section states
  const [activeSubTab, setActiveSubTab] = useState<"timezone" | "international" | "custom">("timezone");
  const [intlSearch, setIntlSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [enabledAllTabs, setEnabledAllTabs] = useState<Record<string, boolean>>({});

  // Custom Holiday Modal State
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formMonth, setFormMonth] = useState<number>(1);
  const [formDay, setFormDay] = useState<number>(1);
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formRepeatsAnnually, setFormRepeatsAnnually] = useState(true);
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Background scroll lock for custom holiday modal
  useEffect(() => {
    if (showCustomModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCustomModal]);

  // Handlers
  const handleToggleMasterSwitch = () => {
    onChange({
      ...settings,
      holidayManagementEnabled: !isHolidayEnabled
    });
  };

  const handleTimezoneChange = (tz: string) => {
    onChange({
      ...settings,
      timezone: tz
    });
  };

  const handleToggleIntlHoliday = (holidayId: string) => {
    const target = intlHolidays.find((h) => h.id === holidayId);
    const cat = target?.category || "";
    setEnabledAllTabs((prev) => ({
      ...prev,
      [cat]: false,
      [selectedCategory]: false,
      all: false
    }));
    const updated = intlHolidays.map((h) => {
      if (h.id === holidayId) {
        return { ...h, enabled: !h.enabled };
      }
      return h;
    });
    onChange({
      ...settings,
      internationalHolidays: updated
    });
  };

  const handleEnableAllIntl = () => {
    setEnabledAllTabs((prev) => ({
      ...prev,
      [selectedCategory]: true
    }));
    const updated = intlHolidays.map((h) => {
      if (selectedCategory === "all") {
        return { ...h, enabled: true };
      }
      if (h.category === selectedCategory) {
        return { ...h, enabled: true };
      }
      return h;
    });
    onChange({
      ...settings,
      internationalHolidays: updated
    });
  };

  const handleDisableAllIntl = () => {
    setEnabledAllTabs((prev) => ({
      ...prev,
      [selectedCategory]: false
    }));
    const updated = intlHolidays.map((h) => {
      if (selectedCategory === "all") {
        return { ...h, enabled: false };
      }
      if (h.category === selectedCategory) {
        return { ...h, enabled: false };
      }
      return h;
    });
    onChange({
      ...settings,
      internationalHolidays: updated
    });
  };

  const handleOpenAddCustom = () => {
    setEditingCustomId(null);
    setFormName("");
    setFormMonth(new Date().getMonth() + 1);
    setFormDay(new Date().getDate());
    setFormYear(new Date().getFullYear());
    setFormRepeatsAnnually(true);
    setFormDesc("");
    setFormError(null);
    setShowCustomModal(true);
  };

  const handleOpenEditCustom = (holiday: CustomHoliday) => {
    setEditingCustomId(holiday.id);
    setFormName(holiday.name);
    setFormMonth(holiday.month);
    setFormDay(holiday.day);
    setFormYear(holiday.year || new Date().getFullYear());
    setFormRepeatsAnnually(holiday.repeatsAnnually);
    setFormDesc(holiday.description || "");
    setFormError(null);
    setShowCustomModal(true);
  };

  const handleSaveCustomHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFormError("Holiday name is required.");
      return;
    }

    const dateFormatted = `${formYear}-${String(formMonth).padStart(2, "0")}-${String(formDay).padStart(2, "0")}`;

    if (editingCustomId) {
      // Update existing
      const updated = customHolidays.map((ch) => {
        if (ch.id === editingCustomId) {
          return {
            ...ch,
            name: formName.trim(),
            month: formMonth,
            day: formDay,
            year: formRepeatsAnnually ? undefined : formYear,
            repeatsAnnually: formRepeatsAnnually,
            date: dateFormatted,
            description: formDesc.trim()
          };
        }
        return ch;
      });
      onChange({
        ...settings,
        customHolidays: updated
      });
    } else {
      // Create new
      const newCustom: CustomHoliday = {
        id: "custom-hol-" + Math.random().toString(36).substring(2, 10),
        name: formName.trim(),
        month: formMonth,
        day: formDay,
        year: formRepeatsAnnually ? undefined : formYear,
        repeatsAnnually: formRepeatsAnnually,
        date: dateFormatted,
        description: formDesc.trim(),
        enabled: true,
        createdAt: new Date().toISOString()
      };
      onChange({
        ...settings,
        customHolidays: [...customHolidays, newCustom]
      });
    }

    setShowCustomModal(false);
  };

  const handleDeleteCustomHoliday = (id: string) => {
    const updated = customHolidays.filter((ch) => ch.id !== id);
    onChange({
      ...settings,
      customHolidays: updated
    });
  };

  const handleToggleCustomHoliday = (id: string) => {
    const updated = customHolidays.map((ch) => {
      if (ch.id === id) {
        return { ...ch, enabled: !ch.enabled };
      }
      return ch;
    });
    onChange({
      ...settings,
      customHolidays: updated
    });
  };

  // Filtered International Holidays
  const filteredIntl = intlHolidays.filter((h) => {
    const matchesSearch = h.name.toLowerCase().includes(intlSearch.toLowerCase()) ||
      h.description.toLowerCase().includes(intlSearch.toLowerCase());
    const matchesCat = selectedCategory === "all" || h.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const enabledIntlCount = intlHolidays.filter((h) => h.enabled).length;
  const enabledCustomCount = customHolidays.filter((ch) => ch.enabled).length;

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="space-y-4 pt-1 font-sans">
      {/* 1. MASTER ACTIVATION SWITCH CONTAINER */}
      <div 
        id="holiday_management_master_card"
        className={`p-4 rounded-2xl border transition-all duration-200 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex flex-col pr-3">
            <div className="flex items-center space-x-2">
              <span className={`text-[10px] uppercase font-bold tracking-wider font-mono ${adminThemeClass.textTitle}`}>
                {translations.holidayManagement || "Holiday Management"}
              </span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                isHolidayEnabled 
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" 
                  : "bg-neutral-500/15 text-neutral-400 border border-neutral-500/30"
              }`}>
                {isHolidayEnabled ? "Active" : "Paused"}
              </span>
            </div>
            <span className={`text-[11px] font-light leading-snug mt-1 ${adminThemeClass.textMuted}`}>
              {translations.holidayManagementDesc || "Configure company-specific holidays, time zone synchronization, and automatic calendar closures."}
            </span>
          </div>

          {/* Master Toggle Switch */}
          <button
            id="holiday_management_toggle_btn"
            type="button"
            role="switch"
            aria-checked={isHolidayEnabled}
            onClick={handleToggleMasterSwitch}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500/30 ${
              isHolidayEnabled
                ? "bg-cyan-600 border-cyan-500"
                : "bg-neutral-300 dark:bg-neutral-700 border-neutral-400 dark:border-neutral-600"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-neutral-200 shadow-md ring-0 transition duration-200 ease-in-out ${
                isHolidayEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Feature Sub-Navigation Tabs (Visible when enabled) */}
        {isHolidayEnabled && (
          <div className="mt-4 pt-3 border-t border-neutral-200/15 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              id="holiday_subtab_timezone"
              type="button"
              onClick={() => setActiveSubTab("timezone")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubTab === "timezone"
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                  : `${adminThemeClass.cardBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{translations.timeZone || "Time Zone"}</span>
            </button>

            <button
              id="holiday_subtab_international"
              type="button"
              onClick={() => setActiveSubTab("international")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubTab === "international"
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                  : `${adminThemeClass.cardBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{translations.internationalHolidays || "International Holidays"}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                {enabledIntlCount}
              </span>
            </button>

            <button
              id="holiday_subtab_custom"
              type="button"
              onClick={() => setActiveSubTab("custom")}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                activeSubTab === "custom"
                  ? "bg-cyan-600 text-white shadow-sm shadow-cyan-900/30"
                  : `${adminThemeClass.cardBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
              }`}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>{translations.customHolidays || "Custom Holidays"}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-white/20 rounded-full font-mono">
                {customHolidays.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* 2. SUBTAB PANELS (WHEN MASTER SWITCH IS ENABLED) */}
      {isHolidayEnabled ? (
        <div className="space-y-3">
          {/* TAB: TIME ZONE */}
          {activeSubTab === "timezone" && (
            <div 
              id="holiday_panel_timezone"
              className={`p-4 rounded-2xl border space-y-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textTitle}`}>
                    {translations.timeZone || "Company Time Zone"}
                  </span>
                  <p className={`text-xs font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                    {translations.timeZoneDesc || "Local time zone used for attendance scheduling, shift recognition, and holiday calendar synchronization."}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-mono font-bold flex items-center gap-1.5">
                  <Clock className="h-3 w-3 animate-pulse" />
                  <span>{liveTimeStr}</span>
                </div>
              </div>

              {/* Intelligent Custom Timezone Dropdown (NO prefix icon and NO suffix icon on trigger field) */}
              <IntelligentSelectDropdown
                id="admin_settings_timezone_select"
                value={currentTimezone}
                onChange={(val) => handleTimezoneChange(val)}
                options={GLOBAL_TIMEZONES.map((tz) => ({
                  value: tz.value,
                  label: `${tz.region} • ${tz.label} (${tz.offset})`
                }))}
                adminThemeClass={adminThemeClass}
                placeholder="Select company time zone..."
                showIcon={false}
              />

              <div className="flex items-center gap-2 text-[11px] text-neutral-400 bg-cyan-950/20 border border-cyan-800/30 p-2.5 rounded-xl">
                <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                <span>
                  All employee shift cutoffs, holiday announcements, and birthday notifications are timed precisely according to <strong>{currentTimezone}</strong>.
                </span>
              </div>
            </div>
          )}

          {/* TAB: INTERNATIONAL HOLIDAYS */}
          {activeSubTab === "international" && (
            <div 
              id="holiday_panel_international"
              className={`p-4 rounded-2xl border space-y-3.5 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textTitle}`}>
                    {translations.internationalHolidays || "International Holidays"}
                  </span>
                  <p className={`text-xs font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                    {translations.internationalHolidaysDesc || "Recognized global and public holidays available for company observance."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const isCurrentCategoryAllEnabled = Boolean(enabledAllTabs[selectedCategory]);

                    return (
                      <button
                        id="holiday_intl_enable_all_btn"
                        type="button"
                        onClick={handleEnableAllIntl}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                          isCurrentCategoryAllEnabled
                            ? "bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-950/20 font-bold ring-2 ring-emerald-400/40"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Enable All {selectedCategory !== "all" ? `(${selectedCategory.replace("_", " ")})` : ""}</span>
                      </button>
                    );
                  })()}
                  <button
                    id="holiday_intl_disable_all_btn"
                    type="button"
                    onClick={handleDisableAllIntl}
                    className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-neutral-500/15 text-neutral-400 border border-neutral-500/30 hover:bg-neutral-500/25 transition-all cursor-pointer"
                  >
                    Disable All
                  </button>
                </div>
              </div>

              {/* Search & Category Filter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 h-3.5 w-3.5 text-neutral-400" />
                  <input
                    id="holiday_intl_search_input"
                    type="text"
                    placeholder="Search international holiday..."
                    value={intlSearch}
                    onChange={(e) => setIntlSearch(e.target.value)}
                    className={`w-full text-xs rounded-xl py-2 pl-9 pr-3.5 font-medium outline-none border focus:border-cyan-500 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                  />
                  {intlSearch && (
                    <button
                      type="button"
                      onClick={() => setIntlSearch("")}
                      className="absolute right-3 top-2.5 text-neutral-400 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin py-1.5 px-0.5">
                  {[
                    { id: "all", label: "All Holidays" },
                    { id: "international", label: "Global" },
                    { id: "cultural", label: "Cultural" },
                    { id: "un_observance", label: "UN Days" },
                    { id: "regional", label: "Regional" },
                    { id: "heritage", label: "Heritage" }
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 text-[11px] font-semibold rounded-xl transition-all capitalize whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedCategory === cat.id
                          ? "bg-cyan-600 text-white shadow-xs"
                          : `${adminThemeClass.cardBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Holiday List Grid */}
              <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin pr-1.5">
                {filteredIntl.length > 0 ? (
                  filteredIntl.map((h) => (
                    <div
                      key={h.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        h.enabled 
                          ? `${adminThemeClass.cardBg} border-cyan-500/30` 
                          : "opacity-60 bg-neutral-900/40 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold text-center shrink-0 ${
                          h.enabled ? "bg-cyan-500/20 text-cyan-400" : "bg-neutral-800 text-neutral-400"
                        }`}>
                          <span className="block text-[9px] uppercase tracking-wider">{monthNames[h.month - 1]?.slice(0, 3)}</span>
                          <span className="text-sm">{h.day}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                              {h.name}
                            </span>
                            {h.category && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-medium capitalize">
                                {h.category.replace("_", " ")}
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] font-light mt-0.5 leading-snug line-clamp-2 ${adminThemeClass.textMuted}`}>
                            {h.description}
                          </p>
                        </div>
                      </div>

                      {/* Toggle */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={h.enabled}
                        onClick={() => handleToggleIntlHoliday(h.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                          h.enabled ? "bg-cyan-600 border-cyan-500" : "bg-neutral-700 border-neutral-600"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            h.enabled ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-xs text-neutral-400 border border-dashed rounded-xl">
                    No international holidays matched "{intlSearch}".
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: CUSTOM HOLIDAYS */}
          {activeSubTab === "custom" && (
            <div 
              id="holiday_panel_custom"
              className={`p-4 rounded-2xl border space-y-3.5 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className={`text-[10px] uppercase font-bold tracking-wider font-mono block ${adminThemeClass.textTitle}`}>
                    {translations.customHolidays || "Custom Company Holidays"}
                  </span>
                  <p className={`text-xs font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                    {translations.customHolidaysDesc || "Create and manage custom corporate holidays, anniversaries, and company-wide observances."}
                  </p>
                </div>

                <button
                  id="holiday_add_custom_btn"
                  type="button"
                  onClick={handleOpenAddCustom}
                  className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm shadow-cyan-900/30 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{translations.addCustomHoliday || "Add Custom Holiday"}</span>
                </button>
              </div>

              {/* Custom Holidays List */}
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {customHolidays.length > 0 ? (
                  customHolidays.map((ch) => (
                    <div
                      key={ch.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        ch.enabled 
                          ? `${adminThemeClass.cardBg} border-cyan-500/30` 
                          : "opacity-60 bg-neutral-900/40 border-neutral-800"
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] font-bold text-center shrink-0 ${
                          ch.enabled ? "bg-cyan-500/20 text-cyan-400" : "bg-neutral-800 text-neutral-400"
                        }`}>
                          <span className="block text-[9px] uppercase tracking-wider">{monthNames[ch.month - 1]?.slice(0, 3)}</span>
                          <span className="text-sm">{ch.day}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                              {ch.name}
                            </span>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                              ch.repeatsAnnually 
                                ? "bg-cyan-950/60 text-cyan-300 border border-cyan-800/40" 
                                : "bg-neutral-800 text-neutral-400"
                            }`}>
                              {ch.repeatsAnnually ? "Annual" : `Year ${ch.year || ""}`}
                            </span>
                          </div>
                          {ch.description && (
                            <p className={`text-[11px] font-light mt-0.5 leading-snug ${adminThemeClass.textMuted}`}>
                              {ch.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        {/* Active Switch */}
                        <button
                          type="button"
                          role="switch"
                          aria-checked={ch.enabled}
                          onClick={() => handleToggleCustomHoliday(ch.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                            ch.enabled ? "bg-cyan-600 border-cyan-500" : "bg-neutral-700 border-neutral-600"
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                              ch.enabled ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustom(ch)}
                          className="p-1.5 text-neutral-400 hover:text-cyan-400 transition-colors cursor-pointer"
                          title="Edit Holiday"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteCustomHoliday(ch.id)}
                          className="p-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete Holiday"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-xs text-neutral-400 border border-dashed rounded-xl space-y-2">
                    <Calendar className="h-6 w-6 text-neutral-500 mx-auto" />
                    <p>No custom company holidays created yet.</p>
                    <button
                      type="button"
                      onClick={handleOpenAddCustom}
                      className="text-cyan-400 font-bold hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Create first custom holiday
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-xl border border-dashed border-neutral-700/60 text-center text-xs text-neutral-500 space-y-1">
          <Info className="h-4 w-4 mx-auto text-neutral-400" />
          <p className="font-medium text-neutral-400">Holiday Management is currently paused.</p>
          <p className="text-[11px] text-neutral-500">
            Work shifts and attendance calculations proceed on standard active workdays. Toggle the switch above to activate company holiday calendars.
          </p>
        </div>
      )}

      {/* 3. ADD / EDIT CUSTOM HOLIDAY MODAL */}
      {showCustomModal && (
        <div 
          id="custom_holiday_modal_backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        >
          <div 
            id="custom_holiday_modal_card"
            className={`w-full max-w-lg rounded-3xl border shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto space-y-5 animate-fade-in ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/15">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${adminThemeClass.textTitle}`}>
                    {editingCustomId ? "Edit Custom Holiday" : (translations.addCustomHoliday || "Add Custom Holiday")}
                  </h3>
                  <p className={`text-[11px] font-light ${adminThemeClass.textMuted}`}>
                    Set company-specific celebrations, closures, or milestone observances.
                  </p>
                </div>
              </div>

              <button
                id="custom_holiday_modal_close_btn"
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="h-8 w-8 rounded-full border border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Form */}
            <form onSubmit={handleSaveCustomHoliday} className="space-y-4">
              {/* Holiday Name */}
              <div className="flex flex-col space-y-1.5">
                <label className={`text-[11px] font-semibold ${adminThemeClass.textMuted}`}>
                  {translations.holidayName || "Holiday Name"} *
                </label>
                <input
                  id="custom_holiday_input_name"
                  type="text"
                  required
                  placeholder="e.g. Founder's Day / Annual Retreat Day"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className={`w-full text-xs rounded-xl py-3 px-3.5 font-medium outline-none border focus:border-cyan-500 min-h-[44px] ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                />
              </div>

              {/* Date Selection */}
              <div className="grid grid-cols-2 gap-3">
                {/* Month (names ONLY) */}
                <div className="flex flex-col space-y-1.5">
                  <label className={`text-[11px] font-semibold ${adminThemeClass.textMuted}`}>
                    {translations.birthMonth || "Month"}
                  </label>
                  <IntelligentSelectDropdown
                    id="custom_holiday_input_month"
                    value={formMonth}
                    onChange={(val) => setFormMonth(Number(val))}
                    options={monthNames.map((m, idx) => ({
                      value: idx + 1,
                      label: m // Month names ONLY! e.g. "January", "February", no numbers
                    }))}
                    adminThemeClass={adminThemeClass}
                    placeholder="Select Month"
                  />
                </div>

                {/* Day */}
                <div className="flex flex-col space-y-1.5">
                  <label className={`text-[11px] font-semibold ${adminThemeClass.textMuted}`}>
                    {translations.birthDay || "Day"}
                  </label>
                  <IntelligentSelectDropdown
                    id="custom_holiday_input_day"
                    value={formDay}
                    onChange={(val) => setFormDay(Number(val))}
                    options={Array.from({ length: 31 }, (_, i) => ({
                      value: i + 1,
                      label: String(i + 1)
                    }))}
                    adminThemeClass={adminThemeClass}
                    placeholder="Select Day"
                  />
                </div>
              </div>

              {/* Annual Repeat Option */}
              <div className={`p-3.5 rounded-xl border flex items-center justify-between ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                <div className="flex flex-col pr-2">
                  <span className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                    {translations.repeatsAnnually || "Repeats Annually on this Date"}
                  </span>
                  <span className={`text-[11px] font-light ${adminThemeClass.textMuted}`}>
                    {formRepeatsAnnually
                      ? "Automatically recurs every calendar year without manual re-entry."
                      : `Applies specifically to year ${formYear}.`
                    }
                  </span>
                </div>

                <button
                  id="custom_holiday_toggle_annual"
                  type="button"
                  role="switch"
                  aria-checked={formRepeatsAnnually}
                  onClick={() => setFormRepeatsAnnually(!formRepeatsAnnually)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition-colors duration-200 ease-in-out focus:outline-none ${
                    formRepeatsAnnually ? "bg-cyan-600 border-cyan-500" : "bg-neutral-700 border-neutral-600"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      formRepeatsAnnually ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* If not repeating annually, allow selecting specific year */}
              {!formRepeatsAnnually && (
                <div className="flex flex-col space-y-1.5">
                  <label className={`text-[11px] font-semibold ${adminThemeClass.textMuted}`}>
                    Specific Observance Year
                  </label>
                  <input
                    id="custom_holiday_input_year"
                    type="number"
                    min="2020"
                    max="2035"
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className={`w-full text-xs rounded-xl py-3 px-3.5 font-medium outline-none border focus:border-cyan-500 min-h-[44px] ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                  />
                </div>
              )}

              {/* Description & Significance */}
              <div className="flex flex-col space-y-1.5">
                <label className={`text-[11px] font-semibold ${adminThemeClass.textMuted}`}>
                  {translations.holidayDesc || "Background History & Description"}
                </label>
                <textarea
                  id="custom_holiday_input_desc"
                  rows={3}
                  placeholder="Provide context, historical significance, or guidelines regarding company operations on this holiday..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className={`w-full text-xs rounded-xl p-3 font-medium outline-none border focus:border-cyan-500 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} ${adminThemeClass.textTitle}`}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-neutral-200/15">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-neutral-700 text-xs font-semibold text-neutral-300 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  {translations.cancel || "Cancel"}
                </button>
                <button
                  id="custom_holiday_submit_btn"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-md shadow-cyan-900/30 transition-all cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingCustomId ? "Save Changes" : "Create Holiday"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
