/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import LandingPage from "./components/LandingPage.js";
import AuthScreens from "./components/AuthScreens.js";
import AdminDashboard from "./components/AdminDashboard.js";
import WorkerDashboard from "./components/WorkerDashboard.js";
import { TRANSLATIONS } from "./translations.js";
import { UserRole } from "./types.js";
import { Bell, CheckCircle2, Info, X, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AppSession {
  user: any;
  tenant: any;
  settings: any;
  subscription: any;
}

interface ToastMessage {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
}

const translateToast = (title: string, message: string, lang: string): { title: string; message: string } => {
  const safeTitle = typeof title === "string" ? title : "";
  const safeMessage = typeof message === "string" ? message : "";

  if (lang === "en") return { title: safeTitle, message: safeMessage };

  let t = safeTitle;
  let m = safeMessage;

  // Let's translate Title
  if (safeTitle.toLowerCase().includes("check-in succession") || safeTitle.toLowerCase().includes("check-in success") || safeTitle.toLowerCase().includes("check-in registered")) {
    t = lang === "es" ? "Entrada Exitosa" : "Arrivée Confirmée";
  } else if (safeTitle.toLowerCase().includes("check-out success") || safeTitle.toLowerCase().includes("check-out registered")) {
    t = lang === "es" ? "Salida Exitosa" : "Départ Confirmé";
  } else if (safeTitle.toLowerCase().includes("permission request") || safeTitle.toLowerCase().includes("exemption requested") || safeTitle.toLowerCase().includes("new permission request")) {
    if (safeTitle.toLowerCase().includes("approved")) {
      t = lang === "es" ? "Solicitud de Permiso Aprobada" : "Demande de Permission Approuvée";
    } else if (safeTitle.toLowerCase().includes("rejected")) {
      t = lang === "es" ? "Solicitud de Permiso Rechazada" : "Demande de Permission Refusée";
    } else {
      t = lang === "es" ? "Nueva Solicitud de Permiso" : "Nouvelle Demande de Permission";
    }
  } else if (safeTitle.toLowerCase().includes("profile picture") || safeTitle.toLowerCase().includes("profile image")) {
    t = lang === "es" ? "Foto de Perfil Sincronizada" : "Image de Profil Synchronisée";
  } else if (safeTitle.toLowerCase().includes("company logo")) {
    t = lang === "es" ? "Logotipo de la Empresa Sincronizado" : "Logo de l'Entreprise Synchronisé";
  } else if (safeTitle.toLowerCase().includes("report ready")) {
    t = lang === "es" ? "Informe Listo" : "Rapport Prêt";
  } else if (safeTitle.toLowerCase().includes("validation alert")) {
    t = lang === "es" ? "Alerta de Validación" : "Alerte de Validation";
  } else if (safeTitle.toLowerCase().includes("settings preserved") || safeTitle.toLowerCase().includes("settings saved")) {
    t = lang === "es" ? "Parámetros Conservados" : "Paramètres Enregistrés";
  }

  // Let's translate message pattern-by-pattern
  if (safeMessage.includes("checked in")) {
    const isLate = safeMessage.includes("(LATE)");
    const timeMatch = safeMessage.match(/at\s+(\d{2}:\d{2}:\d{2})/);
    const timeStr = timeMatch ? `a las ${timeMatch[1]}` : "";
    const timeStrFr = timeMatch ? `à ${timeMatch[1]}` : "";
    
    // Extract name
    const endIdx = safeMessage.indexOf(" checked");
    const name = endIdx !== -1 ? safeMessage.substring(0, endIdx) : "Worker";

    if (lang === "es") {
      m = `${name} registró su entrada (${isLate ? "TARDE" : "A TIEMPO"}) ${timeStr}`;
    } else {
      m = `${name} a enregistré son entrée (${isLate ? "EN RETARD" : "À L'HEURE"}) ${timeStrFr}`;
    }
  }
  else if (safeMessage.includes("checked out")) {
    const isOt = safeMessage.includes("(OVERTIME)");
    const timeMatch = safeMessage.match(/at\s+(\d{2}:\d{2}:\d{2})/);
    const timeStr = timeMatch ? `a las ${timeMatch[1]}` : "";
    const timeStrFr = timeMatch ? `à ${timeMatch[1]}` : "";

    const endIdx = safeMessage.indexOf(" checked");
    const name = endIdx !== -1 ? safeMessage.substring(0, endIdx) : "Worker";

    if (lang === "es") {
      m = `${name} registró su salida (${isOt ? "HORAS EXTRA" : "NORMAL"}) ${timeStr}`;
    } else {
      m = `${name} a enregistré sa sortie (${isOt ? "HEURES SUPPLÉMENTAIRES" : "NORMAL"}) ${timeStrFr}`;
    }
  }
  else if (safeMessage.includes("requests") && safeMessage.includes("exemption from")) {
    const reqMatch = safeMessage.match(/(.*?)\s+requests\s+(.*?)\s+exemption\s+from\s+(.*?)\s+to\s+(.*)/);
    if (reqMatch) {
      const name = reqMatch[1];
      const reason = reqMatch[2];
      const start = reqMatch[3];
      const end = reqMatch[4];

      if (lang === "es") {
        m = `${name} solicita exención de tipo ${reason} desde ${start} hasta ${end}`;
      } else {
        m = `${name} demande une exemption (${reason}) du ${start} au ${end}`;
      }
    }
  }
  else if (safeMessage.includes("requested absence for")) {
    const statusApproved = safeMessage.includes("approved") || safeMessage.includes("APPROVED");
    const statusTextEs = statusApproved ? "aprobada" : "rechazada";
    const statusTextFr = statusApproved ? "approuvée" : "refusée";

    const reasonMatch = safeMessage.match(/absence\s+for\s+(.*?)\s+\((.*?)\)/);
    if (reasonMatch) {
      const reason = reasonMatch[1];
      const date = reasonMatch[2];

      if (lang === "es") {
        m = `Su solicitud de ausencia por ${reason} (${date}) fue ${statusTextEs}`;
      } else {
        m = `Votre demande d'absence pour ${reason} (${date}) a été ${statusTextFr}`;
      }
    }
  }
  else if (safeMessage.includes("Your custom identity and company logo")) {
    if (lang === "es") {
      m = "Su identidad personalizada y el logotipo de la empresa ahora coinciden.";
    } else {
      m = "Votre identité personnalisée et le logo de l'entreprise sont désormais associés.";
    }
  }
  else if (safeMessage.includes("Reverted identity and shield emblem")) {
    if (lang === "es") {
      m = "Se han revertido los activos de identidad y el emblema del escudo.";
    } else {
      m = "Actifs d'identité et de l'emblème du bouclier rétablis.";
    }
  }
  else if (safeMessage.includes("Your official corporate asset is now active")) {
    if (lang === "es") {
      m = "Su activo corporativo oficial ahora está activo.";
    } else {
      m = "Votre actif d'entreprise officiel est désormais actif.";
    }
  }
  else if (safeMessage.includes("Reverted to default shield emblem visual")) {
    if (lang === "es") {
      m = "Se ha revertido al diseño del escudo predeterminado.";
    } else {
      m = "Retour au visuel par défaut de l'emblème du bouclier.";
    }
  }
  else if (safeMessage.includes("Download available for compiled")) {
    const typeMatch = safeMessage.match(/compiled\s+(.*?)\s+list/);
    const type = typeMatch ? typeMatch[1] : "export";
    if (lang === "es") {
      m = `Descarga disponible para la lista compilada de ${type}`;
    } else {
      m = `Téléchargement disponible pour la liste compilée de ${type}`;
    }
  }
  else if (safeMessage.includes("Department already exists")) {
    if (lang === "es") {
      m = "El departamento ya existe";
    } else {
      m = "Le département existe déjà";
    }
  }
  else if (safeMessage.includes("authorized entry check-in")) {
    const name = safeMessage.split(" authorized")[0] || "Worker";
    if (lang === "es") {
      m = `${name} autorizó el registro de entrada`;
    } else {
      m = `${name} a autorisé l'enregistrement de l'entrée`;
    }
  }
  else if (safeMessage.includes("authorized exit signout")) {
    const name = safeMessage.split(" authorized")[0] || "Worker";
    if (lang === "es") {
      m = `${name} autorizó la salida`;
    } else {
      m = `${name} a autorisé la sortie`;
    }
  }
  else if (safeMessage.includes("requested") && safeMessage.includes("permission")) {
    const endIdx = safeMessage.indexOf(" requested");
    const name = endIdx !== -1 ? safeMessage.substring(0, endIdx) : "Worker";
    const reasonMatch = safeMessage.match(/requested\s+(.*?)\s+permission/);
    const reason = reasonMatch ? reasonMatch[1] : "exemption";
    if (lang === "es") {
      m = `${name} solicitó permiso de ${reason}`;
    } else {
      m = `${name} a demandé l'autorisation pour ${reason}`;
    }
  }
  else if (safeMessage.includes("policies synchronized globally") || safeMessage.includes("Preserved") || safeMessage.includes("Updated")) {
    if (safeMessage.startsWith("Updated:")) {
      const parts = safeMessage.replace("Updated:", "").trim().split(", ");
      const translatedParts = parts.map(part => {
        if (part.includes("Language")) {
          return lang === "es" ? "Idioma" : "Langue";
        }
        if (part.includes("Theme")) {
          return lang === "es" ? "Tema" : "Thème";
        }
        if (part.includes("Check-In")) {
          return lang === "es" ? "Límite de Entrada" : "Lignes d'arrivée";
        }
        if (part.includes("Check-Out")) {
          return lang === "es" ? "Límite de Salida" : "Heure de départ";
        }
        if (part.includes("Overtime")) {
          return lang === "es" ? "Horas extra" : "Heures supplémentaires";
        }
        if (part.includes("Display")) {
          return lang === "es" ? "Modo de visualización" : "Mode d'affichage";
        }
        return part;
      });
      if (lang === "es") {
        m = `Se actualizaron los parámetros: ${translatedParts.join(", ")}`;
      } else {
        m = `Mise à jour des paramètres: ${translatedParts.join(", ")}`;
      }
    } else {
      if (lang === "es") {
        m = "Las políticas de turnos de la empresa se han sincronizado globalmente.";
      } else {
        m = "Les politiques d'équipe de l'entreprise ont été synchronisées à l'échelle globale.";
      }
    }
  }

  return { title: t, message: m };
};

export default function App() {
  const [session, setSession] = useState<AppSession | null>(null);
  const [currentScreen, setCurrentScreen] = useState<"landing" | "auth">("landing");
  const [allToasts, setAllToasts] = useState<ToastMessage[]>([]);
  const [signInToast, setSignInToast] = useState<{ show: boolean; userEmail: string; userName: string; time: string } | null>(null);

  // Universal modal scroll-lock listener
  useEffect(() => {
    const handleScrollLock = () => {
      const fixedElements = Array.from(document.querySelectorAll(".fixed.inset-0"));
      const isAnyModalActive = fixedElements.some((el) => {
        if (el.classList.contains("pointer-events-none")) return false;
        
        // Ensure the element is visible
        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          return false;
        }
        return el.clientWidth > 0 || el.clientHeight > 0;
      });

      if (isAnyModalActive) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
        document.documentElement.style.overflow = "";
      }
    };

    // Run initially
    handleScrollLock();

    // Setup MutationObserver to watch for modal DOM updates or styling edits
    const observer = new MutationObserver(() => {
      handleScrollLock();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      observer.disconnect();
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, []);

  // Persistent Session checks
  useEffect(() => {
    const saved = localStorage.getItem("clock_it_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSession(parsed);

        if (parsed.tenant?.id) {
          fetch(`/api/tenant/subscription?tenant_id=${parsed.tenant.id}`)
            .then((res) => {
              if (res.ok) return res.json();
            })
            .then((data) => {
              if (data && data.subscription) {
                setSession((prev) => {
                  if (!prev) return prev;
                  const next = { ...prev, subscription: data.subscription };
                  localStorage.setItem("clock_it_session", JSON.stringify(next));
                  return next;
                });
              }
            })
            .catch((err) => console.warn("Failed to sync subscription on restore:", err));
        }
      } catch (e) {
        localStorage.removeItem("clock_it_session");
      }
    }
  }, []);

  // Capture QR code mobile redirection parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const tenantId = params.get("tenant_id");
    if (action === "check-in" && tenantId) {
      localStorage.setItem("pending_check_in", JSON.stringify({ tenantId, timestamp: Date.now() }));
      const saved = localStorage.getItem("clock_it_session");
      if (!saved && !session) {
        setCurrentScreen("auth");
      }
    }
  }, [session]);

  // Theme application on change
  useEffect(() => {
    const theme = session?.settings?.theme || "dark";
    const body = document.body;
    const root = document.documentElement;
    if (theme === "dark" || theme === "army" || theme === "navy") {
      body.classList.add("dark");
      root.classList.add("dark");
      if (theme === "army") {
        body.style.backgroundColor = "#141C10";
      } else if (theme === "navy") {
        body.style.backgroundColor = "#0B132B";
      } else {
        body.style.backgroundColor = "#0A0A0A";
      }
    } else {
      body.classList.remove("dark");
      root.classList.remove("dark");
      body.style.backgroundColor = "#f9fafb";
    }
  }, [session?.settings?.theme]);

  const handleLoginSuccess = (loginData: AppSession) => {
    setSession(loginData);
    setCurrentScreen("landing");

    const userEmail = loginData.user?.email || "";
    const userName = loginData.user?.firstName ? `${loginData.user.firstName} ${loginData.user.lastName}` : "User";
    setSignInToast({
      show: true,
      userEmail,
      userName,
      time: new Date().toLocaleTimeString()
    });

    setTimeout(() => {
      setSignInToast(null);
    }, 5000);
  };

  const handleLogout = () => {
    localStorage.removeItem("clock_it_session");
    setSession(null);
    setCurrentScreen("landing");
  };

  // Central Notification trigger for events
  const addToastNotification = (title: string, message: string) => {
    const id = "toast-" + Math.random().toString(36).substring(2, 9);
    const newToast = { id, title, message, timestamp: new Date() };
    
    setAllToasts((prev) => [newToast, ...prev]);

    // Self-destruct after 5 seconds as specified
    setTimeout(() => {
      setAllToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  // Dismiss Toast helper (Swipe / Click dismiss)
  const dismissToast = (id: string) => {
    setAllToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Translation lookups based on saved setting
  const activeLanguage = session?.settings?.language || "en";
  const translations = TRANSLATIONS[activeLanguage as "en" | "fr" | "es"] || TRANSLATIONS.en;

  // Get current active theme
  const activeTheme = session?.settings?.theme || "dark";
  const getToastClasses = () => {
    switch (activeTheme) {
      case "army":
        return {
          container: "bg-[#182413] border-[#2D3E24] hover:border-[#4A633F]/50 text-[#E6F4DE]",
          title: "text-[#E6F4DE]",
          message: "text-[#A1C094]",
          badge: "bg-[#25361E] text-[#E6F4DE] border border-[#374C2E]",
          closeBtn: "text-[#A1C094] hover:text-[#E6F4DE]"
        };
      case "navy":
        return {
          container: "bg-[#111A31] border-[#1C2B54] hover:border-[#20315F]/50 text-[#ECEFF4]",
          title: "text-[#ECEFF4]",
          message: "text-[#94A5C1]",
          badge: "bg-[#243361] text-[#ECEFF4] border border-[#233566]",
          closeBtn: "text-[#94A5C1] hover:text-[#ECEFF4]"
        };
      case "light":
        return {
          container: "bg-white border-neutral-200 hover:border-cyan-500/20 text-slate-900 shadow-xl",
          title: "text-slate-900",
          message: "text-slate-600",
          badge: "bg-neutral-50 text-cyan-600 border border-neutral-200",
          closeBtn: "text-slate-400 hover:text-slate-900"
        };
      case "dark":
      default:
        return {
          container: "bg-[#0D0D0D] border-[#262626] hover:border-cyan-500/30 text-white",
          title: "text-white/95",
          message: "text-white/75",
          badge: "bg-[#1A1A1A] text-cyan-400 border border-[#333]",
          closeBtn: "text-neutral-400 hover:text-white"
        };
    }
  };
  const toastStyle = getToastClasses();

  const getCenterToastStyle = () => {
    switch (activeTheme) {
      case "army":
        return {
          bg: "bg-[#182413]/95 border-[#2D3E24] text-[#E6F4DE] shadow-[#111c0c]/80",
          accent: "text-emerald-400 bg-[#25361E]/80 border-[#374C2E]",
          textMuted: "text-[#A1C094]"
        };
      case "navy":
        return {
          bg: "bg-[#111A31]/95 border-[#1C2B54] text-[#ECEFF4] shadow-[#090e1c]/80",
          accent: "text-cyan-400 bg-[#243361]/80 border-[#233566]",
          textMuted: "text-[#94A5C1]"
        };
      case "light":
        return {
          bg: "bg-white/95 border-neutral-200 text-slate-900 shadow-neutral-200/50",
          accent: "text-cyan-600 bg-neutral-50 border-neutral-200",
          textMuted: "text-slate-500"
        };
      case "dark":
      default:
        return {
          bg: "bg-[#0d0d0d]/95 border-[#262626] text-white shadow-black/90",
          accent: "text-cyan-400 bg-[#1A1A1A] border-[#333]",
          textMuted: "text-neutral-450"
        };
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between font-sans">
      
      {/* Real-time Toast Drawer at top-right */}
      <div className="fixed top-6 right-4 sm:right-6 left-4 sm:left-auto z-50 pointer-events-none space-y-3.5 max-w-sm sm:w-80 w-auto max-h-[calc(100vh-48px)] overflow-y-auto scrollbar-none flex flex-col items-end">
        <AnimatePresence>
          {allToasts.map((toast) => {
            const localized = translateToast(toast.title, toast.message, activeLanguage);
            return (
              <motion.div 
                key={toast.id}
                initial={{ opacity: 0, x: 50, y: -10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, x: 50 }}
                transition={{ type: "spring", stiffness: 350, damping: 25 }}
                className={`pointer-events-auto border rounded-2xl p-4.5 shadow-2xl flex items-start space-x-3.5 select-none relative group cursor-pointer transition-all duration-200 w-full ${toastStyle.container}`}
                onClick={() => dismissToast(toast.id)}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${toastStyle.badge}`}>
                  <Bell className="h-4.5 w-4.5 animate-swing" />
                </div>
                <div className="flex-1 pr-6">
                  <strong className={`block text-xs uppercase tracking-wider font-extrabold ${toastStyle.title}`}>{localized.title}</strong>
                  <p className={`text-[11px] mt-0.5 font-light leading-relaxed ${toastStyle.message}`}>{localized.message}</p>
                  <span className={`text-[8px] font-mono tracking-widest uppercase block mt-2 opacity-60 ${toastStyle.message}`}>
                    {activeLanguage === "fr" ? "Balayer pour fermer" : activeLanguage === "es" ? "Deslizar para descartar" : "Swipe Dismiss"}
                  </span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); dismissToast(toast.id); }}
                  className={`absolute top-3.5 right-3.5 shrink-0 cursor-pointer ${toastStyle.closeBtn}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {session === null ? (
        currentScreen === "landing" ? (
          <LandingPage 
            translations={translations}
            onStartTrial={() => setCurrentScreen("auth")}
            onNavigateLogin={() => setCurrentScreen("auth")}
          />
        ) : (
          <AuthScreens 
            translations={translations}
            onLoginSuccess={handleLoginSuccess}
            onNavigateHome={() => setCurrentScreen("landing")}
          />
        )
      ) : (
        session.user.role === UserRole.COMPANY_ADMIN ? (
          <AdminDashboard 
            user={session.user}
            tenant={session.tenant}
            subscription={session.subscription}
            initialSettings={session.settings}
            translations={translations}
            onLogout={handleLogout}
            onNotifyAdmin={addToastNotification}
            onSettingsChange={(newSettings) => {
              const updated = { ...session, settings: newSettings };
              setSession(updated);
              localStorage.setItem("clock_it_session", JSON.stringify(updated));
            }}
            onSubscriptionChange={(newSub) => {
              const updated = { ...session, subscription: newSub };
              setSession(updated);
              localStorage.setItem("clock_it_session", JSON.stringify(updated));
            }}
          />
        ) : (
          <WorkerDashboard 
            user={session.user}
            tenant={session.tenant}
            subscription={session.subscription}
            settings={session.settings}
            translations={translations}
            onLogout={handleLogout}
            onNotifyAdmin={addToastNotification}
            onSettingsChange={(newSettings) => {
              const updated = { ...session, settings: newSettings };
              setSession(updated);
              localStorage.setItem("clock_it_session", JSON.stringify(updated));
            }}
            onSubscriptionChange={(newSub) => {
              const updated = { ...session, subscription: newSub };
              setSession(updated);
              localStorage.setItem("clock_it_session", JSON.stringify(updated));
            }}
            onUserUpdate={(updatedUser) => {
              const updated = { ...session, user: updatedUser };
              setSession(updated);
              localStorage.setItem("clock_it_session", JSON.stringify(updated));
            }}
          />
        )
      )}

      {/* Center Toast for new Sign-In */}
      <AnimatePresence>
        {signInToast && (
          <div id="center-signin-toast" className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`pointer-events-auto border rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-4 backdrop-blur-xl flex flex-col items-center text-center ${getCenterToastStyle().bg}`}
              style={{
                boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)"
              }}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 border ${getCenterToastStyle().accent}`}>
                <ShieldCheck className="h-8 w-8" />
              </div>
              <span className={`text-[10px] uppercase font-bold tracking-widest font-mono mb-1 ${getCenterToastStyle().textMuted}`}>New Active Session Started</span>
              <h4 className="font-extrabold text-base leading-tight">Welcome back, {signInToast.userName}!</h4>
              <p className={`text-xs mt-1 font-light ${getCenterToastStyle().textMuted}`}>{signInToast.userEmail}</p>
              
              <div className={`mt-4 pt-3 border-t w-full text-[10px] font-mono flex justify-between items-center ${getCenterToastStyle().textMuted}`} style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <span>Signed In: {signInToast.time}</span>
                <span className="animate-pulse">Active Session</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
