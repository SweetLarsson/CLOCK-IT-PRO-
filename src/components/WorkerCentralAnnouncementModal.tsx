import React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Megaphone,
  Image as ImageIcon,
  FileText,
  ClipboardList,
  Star,
  CheckCircle2,
  AlertCircle,
  X,
  Send,
  Sparkles,
  RefreshCw,
  Check
} from "lucide-react";
import { CentralAnnouncement } from "../types.js";

interface WorkerCentralAnnouncementModalProps {
  announcement: CentralAnnouncement | null;
  workerId: string;
  workerName: string;
  workerEmail?: string;
  workerDepartment?: string;
  tenantId: string;
  themeClass: any;
  translations?: any;
  onDismiss: () => void;
  onSubmitted: () => void;
}

export const WorkerCentralAnnouncementModal: React.FC<WorkerCentralAnnouncementModalProps> = ({
  announcement,
  workerId,
  workerName,
  workerEmail,
  workerDepartment,
  tenantId,
  themeClass,
  translations = {},
  onDismiss,
  onSubmitted
}) => {
  const [rating, setRating] = React.useState<number>(0);
  const [hoverRating, setHoverRating] = React.useState<number>(0);
  const [feedback, setFeedback] = React.useState("");
  const [formAnswers, setFormAnswers] = React.useState<{ [fieldId: string]: any }>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  if (!announcement || !announcement.isActive) return null;

  const isFormType = announcement.type === "form";
  const hasRating = isFormType && announcement.enableRating !== false;

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        tenant_id: tenantId,
        worker_id: workerId,
        worker_name: workerName,
        worker_email: workerEmail,
        worker_department: workerDepartment,
        rating: rating > 0 ? rating : undefined,
        feedback: feedback.trim(),
        formAnswers
      };

      const res = await fetch(`/api/tenant/announcements/${announcement.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSubmittedSuccess(true);
        setTimeout(() => {
          onSubmitted();
        }, 1500);
      } else {
        const errData = await res.json();
        setErrorMessage(errData.error || "Failed to submit response.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimpleAcknowledge = async () => {
    try {
      setIsSubmitting(true);
      await fetch(`/api/tenant/announcements/${announcement.id}/acknowledge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant_id: tenantId, worker_id: workerId, worker_name: workerName })
      });
      setIsSubmittedSuccess(true);
      setTimeout(() => {
        onSubmitted();
      }, 1000);
    } catch (err) {
      onDismiss();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="worker_central_announcement_overlay"
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onDismiss}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden ${themeClass.cardBg} ${themeClass.accentBorder}`}
      >
        {/* Header Bar */}
        <div className={`p-5 sm:p-6 border-b flex items-center justify-between ${themeClass.innerBg} ${themeClass.accentBorder}`}>
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/25">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 font-mono block">
                Central Announcement
              </span>
              <h3 className={`font-bold text-base sm:text-lg ${themeClass.textTitle}`}>
                {announcement.title}
              </h3>
            </div>
          </div>

          <button
            id="worker_announcement_dismiss_btn"
            onClick={onDismiss}
            className={`h-8 w-8 rounded-xl flex items-center justify-center border transition-colors cursor-pointer ${themeClass.inputBg} ${themeClass.textMuted} hover:${themeClass.textTitle}`}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Priority indicator if urgent or important */}
          {announcement.priority && announcement.priority !== "normal" && (
            <div className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 ${
              announcement.priority === "urgent"
                ? "bg-red-500/15 border border-red-500/30 text-red-400"
                : "bg-amber-500/15 border border-amber-500/30 text-amber-400"
            }`}>
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{announcement.priority.toUpperCase()} NOTICE</span>
            </div>
          )}

          {/* Picture if Picture Announcement */}
          {announcement.type === "picture" && announcement.imageUrl && (
            <div className="rounded-2xl overflow-hidden border shadow-md">
              <img
                src={announcement.imageUrl}
                alt={announcement.title}
                className="w-full max-h-64 object-cover"
              />
            </div>
          )}

          {/* Content Body */}
          {announcement.content && (
            <div className={`text-xs sm:text-sm font-light leading-relaxed whitespace-pre-wrap p-4 rounded-2xl border ${themeClass.innerBg} ${themeClass.accentBorder} ${themeClass.textTitle}`}>
              {announcement.content}
            </div>
          )}

          {/* Form & Rating Fields if Form Announcement */}
          {isFormType && (
            <form onSubmit={handleSubmitResponse} className="space-y-4">
              {/* Star Rating Bar */}
              {hasRating && (
                <div className={`p-4 rounded-2xl border text-center space-y-2.5 ${themeClass.innerBg} ${themeClass.accentBorder}`}>
                  <label className={`block text-xs font-bold ${themeClass.textTitle}`}>
                    {announcement.ratingPrompt || "How would you rate this update / initiative?"}
                  </label>

                  <div className="flex items-center justify-center space-x-2 py-1">
                    {[1, 2, 3, 4, 5].map((starVal) => {
                      const isFilled = (hoverRating || rating) >= starVal;
                      return (
                        <button
                          key={starVal}
                          type="button"
                          onMouseEnter={() => setHoverRating(starVal)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRating(starVal)}
                          className="p-1.5 transition-transform hover:scale-125 cursor-pointer focus:outline-none"
                        >
                          <Star
                            className={`h-7 w-7 transition-colors ${
                              isFilled
                                ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                                : "text-neutral-500 hover:text-neutral-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {rating > 0 && (
                    <span className="text-[11px] font-bold text-amber-400 block font-mono">
                      {rating} of 5 Stars Selected
                    </span>
                  )}
                </div>
              )}

              {/* Dynamic form questions */}
              {announcement.formFields && announcement.formFields.map((field) => (
                <div key={field.id} className="space-y-1.5 text-left">
                  <label className={`block text-xs font-semibold ${themeClass.textTitle}`}>
                    {field.label} {field.required && <span className="text-red-400">*</span>}
                  </label>
                  {field.type === "textarea" ? (
                    <textarea
                      rows={3}
                      value={formAnswers[field.id] || ""}
                      onChange={(e) => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                      placeholder="Enter your detailed response..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${themeClass.inputBg}`}
                    />
                  ) : (
                    <input
                      type="text"
                      value={formAnswers[field.id] || ""}
                      onChange={(e) => setFormAnswers({ ...formAnswers, [field.id]: e.target.value })}
                      placeholder="Your answer..."
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${themeClass.inputBg}`}
                    />
                  )}
                </div>
              ))}

              {/* General Feedback Comment Box */}
              <div className="space-y-1.5 text-left">
                <label className={`block text-xs font-semibold ${themeClass.textTitle}`}>
                  Additional Feedback or Comments
                </label>
                <textarea
                  rows={2}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share any thoughts, questions, or ideas..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs outline-none ${themeClass.inputBg}`}
                />
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form submit button */}
              <button
                id="worker_submit_announcement_feedback_btn"
                type="submit"
                disabled={isSubmitting || isSubmittedSuccess}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Submitting Response...</span>
                  </>
                ) : isSubmittedSuccess ? (
                  <>
                    <Check className="h-4 w-4 text-white" />
                    <span>Thank You! Feedback Recorded</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>Submit Feedback & Complete</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Simple acknowledgment for Picture / Text announcements */}
          {!isFormType && (
            <div className="pt-2">
              <button
                id="worker_acknowledge_announcement_btn"
                type="button"
                disabled={isSubmitting || isSubmittedSuccess}
                onClick={handleSimpleAcknowledge}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-950/40 active:scale-95 transition-all cursor-pointer flex items-center justify-center space-x-2 min-h-[44px]"
              >
                {isSubmittedSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Announcement Acknowledged</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Acknowledge & Close</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
