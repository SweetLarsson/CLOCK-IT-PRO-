import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Image as ImageIcon,
  FileText,
  ClipboardList,
  Star,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Upload,
  RefreshCw,
  Send,
  Eye,
  Radio,
  Clock,
  Sparkles,
  Users,
  MessageSquare,
  BarChart3,
  Power
} from "lucide-react";
import { CentralAnnouncement, AnnouncementType, AnnouncementFormField, AnnouncementFeedbackSubmission } from "../types.js";
import CustomSelect from "./CustomSelect";

interface ApplicationCentralAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  adminThemeClass: any;
  isDarkMode: boolean;
  theme?: "army" | "navy" | "dark" | "light";
  translations?: any;
}

export const ApplicationCentralAnnouncementModal: React.FC<ApplicationCentralAnnouncementModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  adminThemeClass,
  isDarkMode,
  theme = "dark",
  translations = {}
}) => {
  const [activeTab, setActiveTab] = React.useState<"create" | "feedback" | "history">("create");
  const [announcements, setAnnouncements] = React.useState<CentralAnnouncement[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = React.useState<CentralAnnouncement | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  // Form State for creating / editing announcement
  const [announcementType, setAnnouncementType] = React.useState<AnnouncementType>("picture");
  const [title, setTitle] = React.useState("");
  const [content, setContent] = React.useState("");
  const [imageUrl, setImageUrl] = React.useState("");
  const [priority, setPriority] = React.useState<"normal" | "urgent" | "important">("normal");
  const [isActiveBroadcast, setIsActiveBroadcast] = React.useState(true);
  const [enableRating, setEnableRating] = React.useState(true);
  const [ratingPrompt, setRatingPrompt] = React.useState("How would you rate this update / work initiative?");
  const [formFields, setFormFields] = React.useState<AnnouncementFormField[]>([
    {
      id: "feedback_comment",
      label: "Your Feedback & Suggestions",
      type: "textarea",
      required: false
    }
  ]);
  const [selectedSubmission, setSelectedSubmission] = React.useState<AnnouncementFeedbackSubmission | null>(null);

  // Helper to load offline cached announcements from localStorage
  const loadCachedAnnouncements = React.useCallback((tId: string) => {
    try {
      const cachedList = localStorage.getItem(`app_announcements_${tId}`);
      const cachedActive = localStorage.getItem(`app_active_announcement_${tId}`);
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (Array.isArray(parsed)) {
          setAnnouncements(parsed);
        }
      }
      if (cachedActive) {
        const parsed = JSON.parse(cachedActive);
        if (parsed) {
          setActiveAnnouncement(parsed);
        }
      }
    } catch (e) {
      // ignore parsing error
    }
  }, []);

  // Fetch announcements
  const fetchAnnouncements = React.useCallback(async () => {
    const effectiveTenantId = tenantId || "default-tenant";
    try {
      const res = await fetch(`/api/tenant/announcements?tenant_id=${encodeURIComponent(effectiveTenantId)}`);
      if (res.ok) {
        const data = await res.json();
        const annList = data.announcements || [];
        const actAnn = data.activeAnnouncement || null;
        setAnnouncements(annList);
        setActiveAnnouncement(actAnn);

        try {
          localStorage.setItem(`app_announcements_${effectiveTenantId}`, JSON.stringify(annList));
          if (actAnn) {
            localStorage.setItem(`app_active_announcement_${effectiveTenantId}`, JSON.stringify(actAnn));
          } else {
            localStorage.removeItem(`app_active_announcement_${effectiveTenantId}`);
          }
        } catch (e) {}
      } else {
        loadCachedAnnouncements(effectiveTenantId);
      }
    } catch (err) {
      // Graceful offline fallback: load cached state without throwing unhandled error
      loadCachedAnnouncements(effectiveTenantId);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, loadCachedAnnouncements]);

  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  const handleTabChange = (tab: "create" | "feedback" | "history") => {
    setActiveTab(tab);
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTop = 0;
    }
  };

  React.useEffect(() => {
    if (!isOpen) return;
    const effectiveTenantId = tenantId || "default-tenant";
    loadCachedAnnouncements(effectiveTenantId);
    setIsLoading(true);
    fetchAnnouncements();

    // Polling fallback every 5s while modal is open to ensure synchronization
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchAnnouncements();
      }
    }, 5000);

    // Live Server-Sent Events listener for immediate real-time response updates
    let es: EventSource | null = null;
    try {
      es = new EventSource(`/api/events/subscribe?tenant_id=${encodeURIComponent(effectiveTenantId)}`);
      es.onerror = () => {
        // Handled gracefully: EventSource reconnects automatically
      };
      const handleLiveUpdate = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          if (data?.announcement) {
            setActiveAnnouncement((prev) => {
              if (data.announcement.isActive) {
                return data.announcement;
              }
              if (prev && prev.id === data.announcement.id) {
                return null;
              }
              return prev;
            });
            setAnnouncements((prev) => {
              const idx = prev.findIndex((a) => a.id === data.announcement.id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = data.announcement;
                return next;
              }
              return [data.announcement, ...prev];
            });
          } else if (data?.submission && data?.announcement_id) {
            setActiveAnnouncement((prev) => {
              if (!prev || prev.id !== data.announcement_id) return prev;
              const subs = prev.feedbackSubmissions || [];
              const existsIdx = subs.findIndex(
                (s) => s.id === data.submission.id || s.worker_id === data.submission.worker_id
              );
              const updatedSubs = existsIdx >= 0
                ? subs.map((s, i) => (i === existsIdx ? data.submission : s))
                : [data.submission, ...subs];
              return {
                ...prev,
                feedbackSubmissions: updatedSubs,
                acknowledgedWorkerIds: prev.acknowledgedWorkerIds?.includes(data.submission.worker_id)
                  ? prev.acknowledgedWorkerIds
                  : [...(prev.acknowledgedWorkerIds || []), data.submission.worker_id]
              };
            });
          }
          fetchAnnouncements();
        } catch (err) {
          fetchAnnouncements();
        }
      };

      es.addEventListener("ANNOUNCEMENT_ACKNOWLEDGED", handleLiveUpdate);
      es.addEventListener("ANNOUNCEMENT_FEEDBACK_RECEIVED", handleLiveUpdate);
      es.addEventListener("ANNOUNCEMENT_UPDATED", handleLiveUpdate);
      es.onmessage = handleLiveUpdate;
    } catch (err) {
      // Gracefully handle SSE connection failure
    }

    return () => {
      clearInterval(interval);
      if (es) {
        es.close();
      }
    };
  }, [isOpen, tenantId, fetchAnnouncements, loadCachedAnnouncements]);

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage("Image file size should not exceed 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setImageUrl(reader.result);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddFormField = () => {
    const newField: AnnouncementFormField = {
      id: "field_" + Date.now(),
      label: "New Question / Field",
      type: "text",
      required: false
    };
    setFormFields([...formFields, newField]);
  };

  const handleRemoveFormField = (index: number) => {
    setFormFields(formFields.filter((_, idx) => idx !== index));
  };

  const handleUpdateFormField = (index: number, updates: Partial<AnnouncementFormField>) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], ...updates };
    setFormFields(updated);
  };

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage("Please enter an announcement title.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage(null);

      const payload = {
        tenant_id: tenantId,
        type: announcementType,
        title: title.trim(),
        content: content.trim(),
        imageUrl: announcementType === "picture" ? imageUrl : undefined,
        priority,
        isActive: isActiveBroadcast,
        enableRating: announcementType === "form" ? enableRating : false,
        ratingPrompt: ratingPrompt.trim(),
        formFields: announcementType === "form" ? formFields : []
      };

      const res = await fetch("/api/tenant/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setFeedbackSuccessMsg("Central announcement broadcasted successfully to all workers!");
        fetchAnnouncements();
        setActiveTab("feedback");
        setTimeout(() => setFeedbackSuccessMsg(null), 4000);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to publish announcement.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    const effectiveTenantId = tenantId || "default-tenant";
    // Optimistic local update
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    setActiveAnnouncement((prev) => (prev && prev.id === id ? null : prev));
    try {
      const res = await fetch(`/api/tenant/announcements/${id}?tenant_id=${encodeURIComponent(effectiveTenantId)}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.warn("Notice: Delete announcement network issue, local deletion retained:", err);
    }
  };

  const handleToggleActive = async (id: string) => {
    const effectiveTenantId = tenantId || "default-tenant";
    // Optimistic local toggle
    setAnnouncements((prev) =>
      prev.map((a) => {
        if (a.id === id) {
          const newActive = !a.isActive;
          return { ...a, isActive: newActive };
        }
        return a;
      })
    );
    try {
      const res = await fetch(`/api/tenant/announcements/${id}/toggle-active`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: effectiveTenantId })
      });
      if (res.ok) {
        fetchAnnouncements();
      }
    } catch (err) {
      console.warn("Notice: Toggle announcement network issue:", err);
    }
  };

  // Feedback analysis metrics
  const feedbackSubmissions = activeAnnouncement?.feedbackSubmissions || [];
  const ratings = feedbackSubmissions
    .map((s) => s.rating)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const averageRating = ratings.length
    ? (ratings.reduce((acc, curr) => acc + curr, 0) / ratings.length).toFixed(1)
    : "N/A";

  React.useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      id="admin_central_announcement_overlay"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-start justify-center pt-8 sm:pt-12 md:pt-16 pb-8 px-3 sm:px-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -10 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[94vw] sm:max-w-lg md:max-w-[34rem] max-h-[calc(100dvh-5rem)] sm:max-h-[calc(100dvh-7rem)] md:max-h-[82vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
      >
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg}`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25 shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className={`font-display font-bold text-sm sm:text-base truncate ${adminThemeClass.textTitle}`}>
                  Central Announcement
                </h2>
                {activeAnnouncement && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping mr-1" />
                    Live
                  </span>
                )}
              </div>
              <p className={`text-[11px] font-light mt-0.5 truncate ${adminThemeClass.textMuted}`}>
                Broadcast announcements & interactive feedback to workers.
              </p>
            </div>
          </div>

          <button
            id="admin_announcement_close_btn"
            onClick={onClose}
            className={`h-8 w-8 rounded-xl flex items-center justify-center cursor-pointer border transition-colors shrink-0 ${adminThemeClass.inputBg} ${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className={`px-3.5 pt-2 pb-2 border-b flex items-center space-x-1.5 overflow-x-auto scrollbar-none shrink-0 ${adminThemeClass.accentBorder} ${adminThemeClass.innerBg}`}>
          <button
            id="announcement_tab_create"
            onClick={() => handleTabChange("create")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "create"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30"
                : `${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Create</span>
          </button>

          <button
            id="announcement_tab_feedback"
            onClick={() => handleTabChange("feedback")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "feedback"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30"
                : `${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
            }`}
          >
            <BarChart3 className="h-3.5 w-3.5" />
            <span>Active Live & Responses ({feedbackSubmissions.length})</span>
          </button>

          <button
            id="announcement_tab_history"
            onClick={() => handleTabChange("history")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 whitespace-nowrap ${
              activeTab === "history"
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-950/30"
                : `${adminThemeClass.textMuted} hover:${adminThemeClass.textTitle}`
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>Archive ({announcements.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div ref={modalBodyRef} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {feedbackSuccessMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium flex items-center space-x-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{feedbackSuccessMsg}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium flex items-center space-x-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: CREATE / BROADCAST */}
          {activeTab === "create" && (
            <form onSubmit={handlePublishAnnouncement} className="space-y-6">
              {/* Type Selection */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider font-mono mb-2.5 ${adminThemeClass.textMuted}`}>
                  Select Announcement Format
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Picture */}
                  <div
                    onClick={() => setAnnouncementType("picture")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 ${
                      announcementType === "picture"
                        ? "border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/15"
                        : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center">
                      <ImageIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs ${adminThemeClass.textTitle}`}>Picture Announcement</h4>
                      <p className={`text-[11px] font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                        Banner or photo with title & caption
                      </p>
                    </div>
                  </div>

                  {/* Text */}
                  <div
                    onClick={() => setAnnouncementType("text")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 ${
                      announcementType === "text"
                        ? "border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/15"
                        : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs ${adminThemeClass.textTitle}`}>Text Announcement</h4>
                      <p className={`text-[11px] font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                        Official notice with priority tag
                      </p>
                    </div>
                  </div>

                  {/* Form & Rating */}
                  <div
                    onClick={() => setAnnouncementType("form")}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col items-center text-center space-y-2 ${
                      announcementType === "form"
                        ? "border-cyan-500 bg-cyan-500/10 shadow-md shadow-cyan-500/15"
                        : `${adminThemeClass.innerBg} ${adminThemeClass.accentBorder} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-xs ${adminThemeClass.textTitle}`}>Form, Feedback & Rating</h4>
                      <p className={`text-[11px] font-light mt-0.5 ${adminThemeClass.textMuted}`}>
                        Worker questionnaire, ratings & forms
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Title & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className={`block text-xs font-semibold ${adminThemeClass.textTitle}`}>
                    Announcement Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="announcement_title_input"
                    type="text"
                    required
                    placeholder="e.g. End of Quarter Company Townhall & Policy Update"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-medium outline-none transition-all focus:border-cyan-400 ${adminThemeClass.inputBg}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={`block text-xs font-semibold ${adminThemeClass.textTitle}`}>
                    Priority Level
                  </label>
                  <CustomSelect
                    id="announcement_priority_select"
                    value={priority}
                    onChange={(val: any) => setPriority(val)}
                    options={[
                      { value: "normal", label: "Normal Announcement" },
                      { value: "important", label: "Important Notice" },
                      { value: "urgent", label: "Urgent / Action Required" }
                    ]}
                    className={`w-full px-4 py-3 rounded-xl border text-xs font-medium min-h-[44px] ${adminThemeClass.inputBg}`}
                    theme={theme}
                  />
                </div>
              </div>

              {/* Picture Upload (if Picture mode) */}
              {announcementType === "picture" && (
                <div className="space-y-3">
                  <label className={`block text-xs font-semibold ${adminThemeClass.textTitle}`}>
                    Upload Announcement Picture / Flyer
                  </label>
                  <div className={`p-5 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center space-y-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                    {imageUrl ? (
                      <div className="relative group w-full max-w-sm rounded-xl overflow-hidden shadow-md">
                        <img
                          src={imageUrl}
                          alt="Announcement Flyer"
                          className="w-full max-h-56 object-cover rounded-xl"
                        />
                        <button
                          type="button"
                          onClick={() => setImageUrl("")}
                          className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg opacity-90 hover:opacity-100 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                          <Upload className="h-6 w-6" />
                        </div>
                        <div>
                          <label
                            htmlFor="announcement_image_file"
                            className="px-4 py-2 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 font-bold text-xs rounded-xl cursor-pointer transition-colors inline-block"
                          >
                            Choose Image from Device
                          </label>
                          <input
                            id="announcement_image_file"
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                          />
                          <p className={`text-[11px] font-light mt-1.5 ${adminThemeClass.textMuted}`}>
                            PNG, JPG, WEBP supported (Max 5MB)
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Announcement Body / Message */}
              <div className="space-y-1.5">
                <label className={`block text-xs font-semibold ${adminThemeClass.textTitle}`}>
                  {announcementType === "form" ? "Form Description / Instructions" : "Announcement Message"}
                </label>
                <textarea
                  id="announcement_content_input"
                  rows={4}
                  placeholder="Type the full message, guidelines, or instructions for workers..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border text-xs font-normal outline-none transition-all focus:border-cyan-400 ${adminThemeClass.inputBg}`}
                />
              </div>

              {/* Form & Rating Configuration (if Form mode) */}
              {announcementType === "form" && (
                <div className={`p-5 rounded-2xl border space-y-5 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                  {/* Rating Toggle */}
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="space-y-0.5">
                      <h4 className={`text-xs font-bold flex items-center space-x-1.5 ${adminThemeClass.textTitle}`}>
                        <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                        <span>Include 1 to 5 Star Rating</span>
                      </h4>
                      <p className={`text-[11px] font-light ${adminThemeClass.textMuted}`}>
                        Prompt workers to submit an evaluation score
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={enableRating}
                      onChange={(e) => setEnableRating(e.target.checked)}
                      className="h-5 w-5 accent-cyan-500 rounded cursor-pointer"
                    />
                  </div>

                  {enableRating && (
                    <div className="space-y-1.5">
                      <label className={`block text-xs font-semibold ${adminThemeClass.textTitle}`}>
                        Rating Question / Prompt
                      </label>
                      <input
                        type="text"
                        value={ratingPrompt}
                        onChange={(e) => setRatingPrompt(e.target.value)}
                        placeholder="e.g. How satisfied are you with our new department procedures?"
                        className={`w-full px-4 py-2.5 rounded-xl border text-xs outline-none ${adminThemeClass.inputBg}`}
                      />
                    </div>
                  )}

                  {/* Dynamic Form Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-bold uppercase tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                        Custom Form Fields & Questions
                      </label>
                      <button
                        type="button"
                        onClick={handleAddFormField}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Question</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {formFields.map((field, idx) => (
                        <div
                          key={field.id}
                          className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center gap-3 ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}
                        >
                          <span className="text-xs font-mono font-bold text-cyan-400 shrink-0">
                            Q{idx + 1}.
                          </span>
                          <input
                            type="text"
                            value={field.label}
                            onChange={(e) => handleUpdateFormField(idx, { label: e.target.value })}
                            placeholder="Question label..."
                            className={`flex-1 px-3 py-2 rounded-xl border text-xs outline-none min-h-[38px] ${adminThemeClass.inputBg}`}
                          />
                          <div className="w-full sm:w-44 shrink-0">
                            <CustomSelect
                              value={field.type}
                              onChange={(val: any) => handleUpdateFormField(idx, { type: val })}
                              options={[
                                { value: "text", label: "Short Text" },
                                { value: "textarea", label: "Long Feedback Text" },
                                { value: "rating", label: "Rating Scale" }
                              ]}
                              className={`px-3 py-2 rounded-xl border text-xs outline-none min-h-[38px] ${adminThemeClass.inputBg}`}
                              theme={theme}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFormField(idx)}
                            className="p-2 text-red-400 hover:text-red-300 cursor-pointer"
                            title="Remove field"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Broadcast Options & Submit */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t">
                <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActiveBroadcast}
                    onChange={(e) => setIsActiveBroadcast(e.target.checked)}
                    className="h-5 w-5 accent-cyan-500 rounded cursor-pointer"
                  />
                  <span className={`text-xs font-medium ${adminThemeClass.textTitle}`}>
                    Broadcast immediately as Active One-Time Central Announcement
                  </span>
                </label>

                <button
                  id="publish_central_announcement_btn"
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Broadcasting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Broadcast</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ACTIVE LIVE & WORKER RESPONSES */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              {activeAnnouncement ? (
                <div className="space-y-6">
                  {/* Active Card Summary */}
                  <div className={`p-5 rounded-2xl border space-y-4 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                            {activeAnnouncement.type}
                          </span>
                          <span className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                            {activeAnnouncement.title}
                          </span>
                        </div>
                        <p className={`text-xs font-light mt-1 ${adminThemeClass.textMuted}`}>
                          {activeAnnouncement.content}
                        </p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleActive(activeAnnouncement.id)}
                          className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                        >
                          <Power className="h-3.5 w-3.5" />
                          <span>Deactivate Broadcast</span>
                        </button>

                        <button
                          onClick={() => handleDeleteAnnouncement(activeAnnouncement.id)}
                          className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Visual Picture preview if present */}
                    {activeAnnouncement.imageUrl && (
                      <div className="rounded-xl overflow-hidden max-w-xs border">
                        <img
                          src={activeAnnouncement.imageUrl}
                          alt="Live Flyer"
                          className="w-full h-36 object-cover"
                        />
                      </div>
                    )}

                    {/* Stats Metrics */}
                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                      <div className={`p-2.5 rounded-xl border ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                        <span className={`text-[10px] font-mono uppercase tracking-wider block ${adminThemeClass.textMuted}`}>
                          Total Responses
                        </span>
                        <span className="text-xl font-bold text-cyan-400">
                          {feedbackSubmissions.length}
                        </span>
                      </div>

                      <div className={`p-3 rounded-xl border ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                        <span className={`text-[10px] font-mono uppercase tracking-wider block ${adminThemeClass.textMuted}`}>
                          Acknowledged
                        </span>
                        <span className="text-xl font-bold text-emerald-400">
                          {activeAnnouncement.acknowledgedWorkerIds?.length || 0}
                        </span>
                      </div>

                      <div className={`p-3 rounded-xl border ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                        <span className={`text-[10px] font-mono uppercase tracking-wider block ${adminThemeClass.textMuted}`}>
                          Average Rating
                        </span>
                        <div className="flex items-center space-x-1 text-amber-400 text-xl font-bold">
                          <Star className="h-4 w-4 fill-amber-400" />
                          <span>{averageRating}</span>
                        </div>
                      </div>

                      <div className={`p-3 rounded-xl border ${adminThemeClass.cardBg} ${adminThemeClass.accentBorder}`}>
                        <span className={`text-[10px] font-mono uppercase tracking-wider block ${adminThemeClass.textMuted}`}>
                          Broadcast Date
                        </span>
                        <span className={`text-xs font-semibold block mt-1 ${adminThemeClass.textTitle}`}>
                          {new Date(activeAnnouncement.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Worker Submissions List */}
                  <div className="space-y-3">
                    <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                      Worker Feedback & Rating Submissions
                    </h3>

                    {feedbackSubmissions.length === 0 ? (
                      <div className={`p-8 rounded-2xl border text-center ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                        <MessageSquare className="h-8 w-8 mx-auto text-neutral-500 mb-2" />
                        <p className={`text-xs font-medium ${adminThemeClass.textTitle}`}>No worker responses submitted yet</p>
                        <p className={`text-[11px] font-light mt-1 ${adminThemeClass.textMuted}`}>
                          Responses will appear here in real-time as workers fill out the central announcement.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {feedbackSubmissions.map((sub) => (
                          <div
                            key={sub.id}
                            className={`p-4 rounded-2xl border space-y-2.5 transition-all ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2.5">
                                <div className="h-8 w-8 rounded-full bg-cyan-500/15 text-cyan-400 font-bold flex items-center justify-center text-xs">
                                  {sub.worker_name.charAt(0)}
                                </div>
                                <div>
                                  <h4 className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                                    {sub.worker_name}
                                  </h4>
                                  <span className={`text-[10px] font-mono ${adminThemeClass.textMuted}`}>
                                    {new Date(sub.submittedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                </div>
                              </div>

                              {typeof sub.rating === "number" && (
                                <div className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                                  <Star className="h-3.5 w-3.5 fill-amber-400" />
                                  <span>{sub.rating} / 5</span>
                                </div>
                              )}
                            </div>

                            {sub.feedback && (
                              <p className={`text-xs font-normal bg-neutral-950/20 p-2.5 rounded-xl border border-neutral-800 ${adminThemeClass.textTitle}`}>
                                &ldquo;{sub.feedback}&rdquo;
                              </p>
                            )}

                            {sub.formAnswers && Object.keys(sub.formAnswers).length > 0 && (
                              <div className="space-y-1 pt-1 text-[11px]">
                                {Object.entries(sub.formAnswers).map(([k, v]) => (
                                  <div key={k} className="flex space-x-2">
                                    <span className={`font-semibold ${adminThemeClass.textMuted}`}>{k}:</span>
                                    <span className={adminThemeClass.textTitle}>{String(v)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={`p-10 rounded-2xl border text-center space-y-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                  <Radio className="h-10 w-10 mx-auto text-neutral-500 animate-pulse" />
                  <div>
                    <h4 className={`text-sm font-bold ${adminThemeClass.textTitle}`}>No Active Announcement Live</h4>
                    <p className={`text-xs font-light max-w-sm mx-auto mt-1 ${adminThemeClass.textMuted}`}>
                      Switch to the &ldquo;Create / Broadcast&rdquo; tab to create and activate a new central announcement.
                    </p>
                  </div>
                  <button
                    onClick={() => handleTabChange("create")}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer inline-flex items-center space-x-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create Announcement</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ARCHIVE HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <h3 className={`text-xs font-bold uppercase tracking-wider font-mono ${adminThemeClass.textMuted}`}>
                Past Application Central Announcements
              </h3>

              {announcements.length === 0 ? (
                <div className={`p-8 rounded-2xl border text-center ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}>
                  <p className={`text-xs ${adminThemeClass.textMuted}`}>No past announcements found.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((ann) => (
                    <div
                      key={ann.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${adminThemeClass.innerBg} ${adminThemeClass.accentBorder}`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            ann.isActive ? "bg-emerald-500/20 text-emerald-400" : "bg-neutral-800 text-neutral-400"
                          }`}>
                            {ann.isActive ? "Active Live" : "Inactive"}
                          </span>
                          <span className="text-xs font-bold text-cyan-400 uppercase font-mono">
                            [{ann.type}]
                          </span>
                          <h4 className={`text-xs font-bold ${adminThemeClass.textTitle}`}>
                            {ann.title}
                          </h4>
                        </div>
                        <p className={`text-[11px] font-light ${adminThemeClass.textMuted}`}>
                          {new Date(ann.createdAt).toLocaleDateString()} &bull; {ann.feedbackSubmissions?.length || 0} responses
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <button
                          onClick={() => handleToggleActive(ann.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                            ann.isActive
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-emerald-500/15 text-emerald-400"
                          }`}
                        >
                          {ann.isActive ? "Deactivate" : "Activate"}
                        </button>

                        <button
                          onClick={() => handleDeleteAnnouncement(ann.id)}
                          className="p-2 rounded-xl text-red-400 hover:bg-red-500/15 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
