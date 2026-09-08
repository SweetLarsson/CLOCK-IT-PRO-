/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Download,
  Smartphone,
  Laptop,
  CheckCircle2,
  X,
  Share2,
  PlusSquare,
  ShieldCheck,
  Zap,
  Wifi,
  Sparkles,
} from "lucide-react";
import {
  isStandalonePwa,
  promptPwaInstall,
  subscribePwaInstall,
  getPwaIconSvg,
} from "../utils/pwaManager.js";

interface PwaInstallProps {
  role: "admin" | "worker";
  tenantName?: string;
  workerName?: string;
  theme?: string;
  variant?: "button" | "banner" | "menu-item" | "header-pill";
  className?: string;
  buttonText?: string;
}

export function PwaInstallComponent({
  role,
  tenantName,
  workerName,
  theme = "dark",
  variant = "button",
  className = "",
  buttonText,
}: PwaInstallProps) {
  const [canInstallNative, setCanInstallNative] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [installStatus, setInstallStatus] = useState<"idle" | "success" | "dismissed">("idle");

  useEffect(() => {
    setIsInstalled(isStandalonePwa());
    const isIosDevice =
      typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as any).MSStream;
    setIsIos(isIosDevice);

    const unsubscribe = subscribePwaInstall((canInstall) => {
      setCanInstallNative(canInstall);
    });

    return () => unsubscribe();
  }, []);

  const handleTriggerInstall = async () => {
    if (canInstallNative) {
      const result = await promptPwaInstall();
      if (result.outcome === "accepted") {
        setInstallStatus("success");
        setIsInstalled(true);
        setTimeout(() => setShowModal(false), 2000);
      } else {
        setInstallStatus("dismissed");
      }
    } else {
      setShowModal(true);
    }
  };

  const isAdmin = role === "admin";
  const appTitle = isAdmin
    ? tenantName
      ? `${tenantName} Admin App`
      : "Admin Portal App"
    : tenantName
    ? `${tenantName} Worker App`
    : "Worker Portal App";

  const appDescription = isAdmin
    ? "Full-featured Administrative Command Center & Shift Oversight PWA"
    : "1-Tap Attendance Check-In, Shift Roster & Permission Terminal PWA";

  const accentColor = isAdmin ? "text-cyan-400" : "text-emerald-400";
  const accentBorder = isAdmin ? "border-cyan-500/40" : "border-emerald-500/40";
  const accentBg = isAdmin ? "bg-cyan-500/10 hover:bg-cyan-500/20" : "bg-emerald-500/10 hover:bg-emerald-500/20";
  const iconDataUri = getPwaIconSvg(role, 256);

  // Variant: Menu Item in Settings
  if (variant === "menu-item") {
    return (
      <>
        <button
          type="button"
          onClick={handleTriggerInstall}
          className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all duration-300 cursor-pointer ${
            isInstalled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              : `${accentBg} ${accentBorder} ${accentColor}`
          } ${className}`}
        >
          <div className="flex items-center space-x-3 text-left">
            <div className="w-9 h-9 rounded-lg bg-black/40 flex items-center justify-center shrink-0">
              {isInstalled ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <Download className={`h-5 w-5 ${accentColor}`} />
              )}
            </div>
            <div>
              <span className="block text-xs font-bold font-mono uppercase tracking-wider">
                {isInstalled ? "App Installed" : (buttonText || (isAdmin ? "Install App" : "Install Worker App"))}
              </span>
              <span className="block text-[10px] opacity-75">
                {isInstalled ? "Running in Standalone App Mode" : "Add to Home Screen & Desktop"}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-black/30 border border-white/10">
            {isInstalled ? "Installed" : "Install"}
          </span>
        </button>

        {showModal && renderModal()}
      </>
    );
  }

  // Variant: Header Pill
  if (variant === "header-pill") {
    return (
      <>
        <button
          type="button"
          onClick={handleTriggerInstall}
          className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-bold transition-all duration-300 cursor-pointer ${
            isInstalled
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              : `${accentBg} ${accentBorder} ${accentColor} hover:scale-105 active:scale-95 shadow-sm`
          } ${className}`}
          title={isInstalled ? "Running in Standalone PWA Mode" : `Install ${appTitle}`}
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{isInstalled ? "PWA Active" : `Install ${isAdmin ? "Admin" : "Worker"} App`}</span>
        </button>

        {showModal && renderModal()}
      </>
    );
  }

  // Variant: Banner
  if (variant === "banner") {
    if (isInstalled) return null; // Don't show promotional banner if already installed

    return (
      <>
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg backdrop-blur-md ${accentBg} ${accentBorder} ${className}`}
        >
          <div className="flex items-center space-x-3.5 w-full sm:w-auto">
            <img
              src={iconDataUri}
              alt="PWA Icon"
              className="h-12 w-12 rounded-xl border border-white/10 shadow-md shrink-0 select-none"
            />
            <div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-mono font-bold uppercase tracking-wider ${accentColor}`}>
                  {isAdmin ? "Admin Portal PWA" : "Worker Portal PWA"}
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-black/40 font-bold border border-white/10 text-white/90 uppercase">
                  Standalone
                </span>
              </div>
              <p className="text-xs font-semibold text-white/90 mt-0.5">{appTitle}</p>
              <p className="text-[11px] text-white/60 font-light">{appDescription}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleTriggerInstall}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center space-x-2 transition-all duration-300 cursor-pointer shadow-md ${
                isAdmin
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/20 hover:scale-105 active:scale-95"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20 hover:scale-105 active:scale-95"
              }`}
            >
              <Download className="h-4 w-4 shrink-0" />
              <span>Install App</span>
            </button>
          </div>
        </div>

        {showModal && renderModal()}
      </>
    );
  }

  // Default Button variant
  return (
    <>
      <button
        type="button"
        onClick={handleTriggerInstall}
        className={`px-4 py-2 rounded-xl border flex items-center space-x-2.5 text-xs font-bold transition-all duration-300 cursor-pointer ${
          isInstalled
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : `${accentBg} ${accentBorder} ${accentColor} hover:scale-105 active:scale-95 shadow-md`
        } ${className}`}
      >
        <Download className="h-4 w-4 shrink-0" />
        <span>{isInstalled ? "App Installed" : `Install ${isAdmin ? "Admin" : "Worker"} App`}</span>
      </button>

      {showModal && renderModal()}
    </>
  );

  function renderModal() {
    return (
      <AnimatePresence>
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={() => setShowModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-neutral-950 border border-neutral-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-white relative overflow-hidden"
          >
            {/* Header / Close */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center space-x-3.5">
                <img
                  src={iconDataUri}
                  alt="PWA App Icon"
                  className="w-14 h-14 rounded-2xl border border-white/10 shadow-lg shadow-black/60 shrink-0"
                />
                <div>
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-mono font-bold uppercase tracking-wider ${accentColor}`}
                    >
                      {isAdmin ? "Admin Portal" : "Worker Workspace"}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-800 font-bold border border-neutral-700 text-neutral-300">
                      PWA
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold tracking-tight mt-0.5 text-white">{appTitle}</h3>
                  <span className="text-xs text-neutral-400 font-light block">
                    {tenantName || "Enterprise Platform"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Feature Highlights */}
            <div className="grid grid-cols-3 gap-2.5 py-4 border-y border-neutral-800/80 my-4 text-center">
              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/60">
                <Zap className={`h-4 w-4 mx-auto mb-1 ${accentColor}`} />
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                  Instant Load
                </span>
                <span className="text-[9px] text-neutral-500 font-light leading-tight block mt-0.5">
                  1-Tap Launcher
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/60">
                <Wifi className={`h-4 w-4 mx-auto mb-1 ${accentColor}`} />
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                  Offline Sync
                </span>
                <span className="text-[9px] text-neutral-500 font-light leading-tight block mt-0.5">
                  Local Cache
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/60">
                <ShieldCheck className={`h-4 w-4 mx-auto mb-1 ${accentColor}`} />
                <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-300">
                  Full Screen
                </span>
                <span className="text-[9px] text-neutral-500 font-light leading-tight block mt-0.5">
                  No Browser Bars
                </span>
              </div>
            </div>

            {/* Instruction Guides */}
            <div className="space-y-3 mb-6 text-xs text-neutral-300">
              {canInstallNative ? (
                <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200">
                  <p className="font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    Ready for 1-Tap Installation
                  </p>
                  <p className="text-[11px] text-cyan-300/80 mt-1 font-light">
                    Click the button below to install this {isAdmin ? "Admin Portal" : "Worker Terminal"} directly to your home screen or desktop application list.
                  </p>
                </div>
              ) : isIos ? (
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Smartphone className="h-4 w-4 text-indigo-400" />
                    Install on iOS (iPhone / iPad):
                  </p>
                  <ol className="list-decimal list-inside text-[11px] text-neutral-300 space-y-1.5 font-light">
                    <li>
                      Tap the <strong className="text-white font-semibold">Share</strong> button (
                      <Share2 className="h-3 w-3 inline text-cyan-400 mx-0.5" />
                      ) in Safari's bottom toolbar.
                    </li>
                    <li>
                      Scroll down and select <strong className="text-white font-semibold">"Add to Home Screen"</strong> (
                      <PlusSquare className="h-3 w-3 inline text-emerald-400 mx-0.5" />
                      ).
                    </li>
                    <li>
                      Confirm by tapping <strong className="text-white font-semibold">"Add"</strong> in the top right corner.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
                  <p className="font-bold text-white flex items-center gap-1.5">
                    <Laptop className="h-4 w-4 text-cyan-400" />
                    Desktop / Android Installation:
                  </p>
                  <p className="text-[11px] text-neutral-400 font-light leading-relaxed">
                    Click the <strong className="text-white font-medium">Install icon (⊕)</strong> located in your browser's URL address bar, or open your browser menu and select <strong className="text-white font-medium">"Install {appTitle}"</strong>.
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Action Button */}
            {canInstallNative ? (
              <button
                type="button"
                onClick={handleTriggerInstall}
                className={`w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center space-x-2 transition-all duration-300 cursor-pointer shadow-lg ${
                  isAdmin
                    ? "bg-cyan-500 hover:bg-cyan-400 text-black shadow-cyan-500/25 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>Install {appTitle} Now</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-full py-3 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer"
              >
                Got It
              </button>
            )}
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }
}
