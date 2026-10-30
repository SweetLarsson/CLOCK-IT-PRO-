/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Building, 
  UserCheck, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  Key, 
  CheckCircle2, 
  XCircle, 
  ArrowRight,
  Eye,
  EyeOff,
  QrCode,
  ChevronDown,
  X,
  CreditCard,
  KeyRound,
  Send,
  RefreshCw,
  ShieldCheck,
  Calendar
} from "lucide-react";
import CustomSelect, { SelectOption } from "./CustomSelect.js";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const BIRTH_MONTH_OPTIONS: SelectOption[] = MONTH_NAMES.map((name, idx) => ({
  value: String(idx + 1),
  label: name
}));

const BIRTH_DAY_OPTIONS: SelectOption[] = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: String(i + 1)
}));

interface AuthScreensProps {
  onLoginSuccess: (data: { user: any; tenant: any; subscription: any }) => void;
  onNavigateHome: () => void;
  translations: any;
}

export default function AuthScreens({ onLoginSuccess, onNavigateHome, translations }: AuthScreensProps) {
  const [activeTab, setActiveTab] = useState<"login" | "registerAdmin" | "registerWorker">("login");
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPass, setShowPass] = useState(false);

  // Direct Social Auth (Google & Apple)
  const [isSocialSubmitting, setIsSocialSubmitting] = useState(false);

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsSocialSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Determine target email: typed email if present, or default SSO account
    const ssoEmail = email.trim() || (provider === "google" ? "admin@apextech.com" : "bob@apextech.com");
    const ssoName = provider === "google" ? "Google Workspace User" : "Apple ID User";

    // Standard OAuth Popup authorization window simulation
    try {
      const authPopup = window.open(
        "about:blank",
        `${provider}_oauth_popup`,
        "width=500,height=600,left=250,top=120"
      );
      if (authPopup) {
        authPopup.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>${provider === "google" ? "Google Accounts" : "Sign in with Apple ID"}</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center; }
                .card { background: #161e2e; border: 1px solid #2d3748; padding: 24px; border-radius: 16px; max-width: 380px; width: 100%; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5); }
                .spinner { border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid #38bdf8; border-radius: 50%; width: 28px; height: 28px; animation: spin 0.8s linear infinite; margin: 16px auto; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .email { color: #38bdf8; font-family: monospace; font-weight: 600; font-size: 13px; margin-top: 4px; }
              </style>
            </head>
            <body>
              <div class="card">
                <div style="font-size: 16px; font-weight: 700;">Connecting to ${provider === "google" ? "Google Workspace" : "Apple ID"}</div>
                <div class="spinner"></div>
                <div style="font-size: 12px; color: #94a3b8;">Authorizing session for:</div>
                <div class="email">${ssoEmail}</div>
              </div>
              <script>
                setTimeout(() => { window.close(); }, 750);
              </script>
            </body>
          </html>
        `);
      }
    } catch (e) {
      // Ignore popup blocker fallback
    }

    try {
      const response = await fetch("/api/auth/social-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          email: ssoEmail,
          name: ssoName,
          tenant_id: companyCode || undefined
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `${provider === "google" ? "Google" : "Apple"} SSO authentication failed`);
      }

      if (rememberMe) {
        localStorage.setItem("clock_it_session", JSON.stringify(data));
      }

      setSuccessMsg(`Authenticated via ${provider === "google" ? "Google Workspace" : "Apple ID"}! Access granted.`);
      setTimeout(() => {
        onLoginSuccess(data);
      }, 700);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSocialSubmitting(false);
    }
  };

  // Admin Registration State
  const [companyName, setCompanyName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [showAdminPass, setShowAdminPass] = useState(false);
  const [adminGender, setAdminGender] = useState("Male");

  // Pre-registration Subscription states
  const [subscriptionToken, setSubscriptionToken] = useState("");
  const [selectedPlanCode, setSelectedPlanCode] = useState("");
  const [gatewaySelected, setGatewaySelected] = useState<"card" | "paystack" | "opay" | null>("card");
  const [billingProgress, setBillingProgress] = useState<string | null>(null);
  const [adminBypassCode, setAdminBypassCode] = useState("");

  // Worker Registration State
  const [workerFirst, setWorkerFirst] = useState("");
  const [workerLast, setWorkerLast] = useState("");
  const [workerPhone, setWorkerPhone] = useState("");
  const [workerEmail, setWorkerEmail] = useState("");
  const [workerPass, setWorkerPass] = useState("");
  const [showWorkerPass, setShowWorkerPass] = useState(false);
  const [companyCode, setCompanyCode] = useState("default-tenant"); // tenant_id to join
  const [isFromQr, setIsFromQr] = useState(false);
  const [workerGender, setWorkerGender] = useState("Male");
  const [workerBirthDay, setWorkerBirthDay] = useState<number | "">("");
  const [workerBirthMonth, setWorkerBirthMonth] = useState<number | "">("");
  const [registeredCompanyName, setRegisteredCompanyName] = useState<string>("Apex Tech Global Ltd");

  // Forgot Password Modal State (Resend API Integration)
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState<"request" | "verify">("request");
  const [forgotResetCode, setForgotResetCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotDemoCode, setForgotDemoCode] = useState<string | null>(null);

  // Lock background scrolling when forgot password modal is active
  useEffect(() => {
    if (showForgotPasswordModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showForgotPasswordModal]);

  // Worker dynamic department selection and legal signing
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [availableDepts, setAvailableDepts] = useState<{ id: string; name: string }[]>([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Alphabetically sorted departments
  const sortedDepts = React.useMemo(() => {
    return [...availableDepts].sort((a, b) => a.name.localeCompare(b.name));
  }, [availableDepts]);

  // Set the first alphabetized department as default when sorted list changes and select state is empty
  React.useEffect(() => {
    if (sortedDepts.length > 0 && !selectedDeptId) {
      setSelectedDeptId(sortedDepts[0].id);
    }
  }, [sortedDepts, selectedDeptId]);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [digitalSignature, setDigitalSignature] = useState("");
  const [termsModalOpen, setTermsModalOpen] = useState(false);

  // Loading & Error States
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-dismiss warning and error messages after 5 seconds
  useEffect(() => {
    if (!forgotError) return;
    const timer = setTimeout(() => {
      setForgotError(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [forgotError]);

  useEffect(() => {
    if (!forgotSuccess) return;
    const timer = setTimeout(() => {
      setForgotSuccess(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [forgotSuccess]);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [errorMsg]);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  // Dynamic loading messages state
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const loadingMessages = [
    "Contacting cloud compliance vaults...",
    "Validating secure tenant handshake...",
    "Registering enterprise node credentials...",
    "Binding cryptographic biometric signature...",
    "Aligning quantum clock triggers...",
    "Sanitizing workspace integrity telemetry...",
    "Securing enterprise workforce channels...",
    "Engaging background system audit..."
  ];

  useEffect(() => {
    if (!loading) return;
    setLoadingMsgIdx(0);
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
    }, 1850);
    return () => clearInterval(interval);
  }, [loading]);

  // Live password validation
  const [passChecks, setPassChecks] = useState({
    length: false,
    upper: false,
    lower: false,
    numeric: false,
    special: false
  });

  const checkPasswordStrength = (pass: string) => {
    setPassChecks({
      length: pass.length >= 8,
      upper: /[A-Z]/.test(pass),
      lower: /[a-z]/.test(pass),
      numeric: /\d/.test(pass),
      special: /[@$!%*?&]/.test(pass)
    });
  };

  const isPasswordValid = () => {
    return Object.values(passChecks).every(Boolean);
  };

  useEffect(() => {
    const currentPass = activeTab === "registerAdmin" ? adminPass : activeTab === "registerWorker" ? workerPass : "";
    checkPasswordStrength(currentPass);
  }, [adminPass, workerPass, activeTab]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get("action");
    const tenantId = params.get("tenant_id");
    if (action === "check-in" && tenantId) {
      setActiveTab("login");
      setCompanyCode(tenantId);
      setIsFromQr(true);
    } else {
      const pending = localStorage.getItem("pending_check_in");
      if (pending) {
        try {
          const { tenantId: pendingTenantId, timestamp } = JSON.parse(pending);
          if (Date.now() - timestamp < 900000) {
            setActiveTab("login");
            setCompanyCode(pendingTenantId);
            setIsFromQr(true);
          }
        } catch (e) {
          // ignore
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!companyCode) {
      setAvailableDepts([]);
      setSelectedDeptId("");
      return;
    }
    const fetchDepts = async () => {
      try {
        const response = await fetch(`/api/tenant/departments?tenant_id=${encodeURIComponent(companyCode)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.depts) {
            setAvailableDepts(data.depts);
            if (data.depts.length > 0) {
              setSelectedDeptId(data.depts[0].id);
            } else {
              setSelectedDeptId("");
            }
          }
        }
      } catch (err) {
        console.error("Failed to load departments during registration:", err);
      }
    };
    fetchDepts();
  }, [companyCode]);

  // Fetch dynamic company name associated with the Unique ID
  useEffect(() => {
    const targetId = (companyCode || "default-tenant").trim();
    let isMounted = true;
    fetch(`/api/tenant?tenant_id=${encodeURIComponent(targetId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.tenant?.name) {
          setRegisteredCompanyName(data.tenant.name);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [companyCode]);

  // Automatically populate digital signature with worker's full name
  useEffect(() => {
    const fullName = `${workerFirst} ${workerLast}`.trim();
    setDigitalSignature(fullName);
  }, [workerFirst, workerLast]);

  const handleOpenForgotPassword = () => {
    setForgotEmail(email || "");
    setForgotStep("request");
    setForgotResetCode("");
    setForgotNewPassword("");
    setForgotConfirmPassword("");
    setForgotError(null);
    setForgotSuccess(null);
    setForgotDemoCode(null);
    setShowForgotPasswordModal(true);
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes("@")) {
      setForgotError("Please enter a valid registered email address.");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      const data = await response.json();
      if (response.ok) {
        setForgotSuccess(data.message);
        if (data.demoResetCode) {
          setForgotDemoCode(data.demoResetCode);
        }
        setForgotStep("verify");
      } else {
        setForgotError(data.error || "Unable to process password reset request. Please check the email address and try again.");
      }
    } catch (err: any) {
      setForgotError("Network anomaly occurred. Please verify your connection and retry.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotResetCode || !forgotNewPassword) {
      setForgotError("Please enter both the 6-digit verification PIN and your new password.");
      return;
    }
    if (forgotResetCode.trim().length !== 6) {
      setForgotError("The verification PIN must be exactly 6 digits.");
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError("The new password and confirmation password do not match.");
      return;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(forgotNewPassword)) {
      setForgotError("Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&).");
      return;
    }

    setForgotLoading(true);
    setForgotError(null);
    setForgotSuccess(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          resetCode: forgotResetCode.trim(),
          newPassword: forgotNewPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setForgotSuccess(data.message);
        setSuccessMsg("Password reset successfully! Please sign in with your new password.");
        setTimeout(() => {
          setShowForgotPasswordModal(false);
          setPassword("");
          setEmail(forgotEmail.trim());
        }, 1800);
      } else {
        setForgotError(data.error || "Password reset verification failed. Please check the PIN and retry.");
      }
    } catch (err: any) {
      setForgotError("Network communication error. Please verify your connection and retry.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login trace failed");
      }
      
      if (rememberMe) {
        localStorage.setItem("clock_it_session", JSON.stringify(data));
      }

      setSuccessMsg("System entry authorized!");
      setTimeout(() => {
        onLoginSuccess(data);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !adminPhone || !adminEmail || !adminPass) return;

    if (!isPasswordValid()) {
      setErrorMsg("Password security rules must be completely satisfied.");
      return;
    }

    const tokenToSend = subscriptionToken || adminBypassCode;
    if (!tokenToSend) {
      setErrorMsg("An active subscription or administrative authorization is required.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/register-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          phone: adminPhone,
          email: adminEmail,
          password: adminPass,
          subscriptionToken: tokenToSend
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Company registration failed.");
      }

      // Mark newly registered account to allow interactive tour sequence
      try {
        localStorage.setItem(`is_new_user_${(data.user?.id || adminEmail).toLowerCase()}`, "true");
        localStorage.setItem(`clock_it_new_registration_${(data.user?.id || adminEmail).toLowerCase()}`, "true");
      } catch (e) {}

      setSuccessMsg("Workspace configured! Please sign in with your credentials.");
      setTimeout(() => {
        setEmail(adminEmail);
        setPassword(adminPass);
        setActiveTab("login");
        setCompanyName("");
        setAdminPhone("");
        setAdminEmail("");
        setAdminPass("");
        setSubscriptionToken("");
        setSelectedPlanCode("");
        setGatewaySelected(null);
        setBillingProgress(null);
        setAdminBypassCode("");
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWorkerRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerFirst || !workerLast || !workerPhone || !workerEmail || !workerPass || !companyCode) return;

    if (!isPasswordValid()) {
      setErrorMsg("Password must fully adhere to safety rules");
      return;
    }

    if (!agreedTerms) {
      setErrorMsg("You must read and sign the Legal Terms and Privacy Policy before submitting.");
      return;
    }

    const expectedName = (workerFirst.trim() + " " + workerLast.trim()).toLowerCase();
    if (digitalSignature.trim().toLowerCase() !== expectedName) {
      setErrorMsg(`Your digital signature must exactly match your full name: "${workerFirst} ${workerLast}"`);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch("/api/auth/register-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: workerFirst,
          lastName: workerLast,
          phone: workerPhone,
          email: workerEmail,
          password: workerPass,
          companyId: companyCode,
          registeredViaQr: isFromQr,
          department_id: selectedDeptId,
          gender: workerGender,
          birthDay: workerBirthDay ? Number(workerBirthDay) : undefined,
          birthMonth: workerBirthMonth ? Number(workerBirthMonth) : undefined,
          localDate: new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0'),
          localTime: new Date().toTimeString().split(" ")[0]
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Worker registry failed.");
      }

      setSuccessMsg("Associated worker cataloged! Sign in via main Login desk.");
      setTimeout(() => {
        setEmail(workerEmail);
        setPassword(workerPass);
        setActiveTab("login");
        setWorkerFirst("");
        setWorkerLast("");
        setWorkerPhone("");
        setWorkerEmail("");
        setWorkerPass("");
        setAgreedTerms(false);
        setDigitalSignature("");
        setSuccessMsg(null);
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const autofillDemoAdmins = () => {
    setEmail("admin@apextech.com");
    setPassword("EnterpriseAdmin2026!");
    setPassChecks({ length: true, upper: true, lower: true, numeric: true, special: true });
  };

  const autofillDemoWorker = () => {
    setEmail("bob@apextech.com");
    setPassword("EnterpriseAdmin2026!");
    setPassChecks({ length: true, upper: true, lower: true, numeric: true, special: true });
  };

  return (
    <div id="auth_desk" onClick={onNavigateHome} className="min-h-screen flex items-center justify-center p-6 bg-[#0A0A0A] text-[#E5E5E5] select-none font-sans cursor-pointer">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl bg-[#0D0D0D] text-[#E5E5E5] rounded-3xl shadow-2xl p-8 sm:p-12 border border-[#262626] cursor-default relative">
        
        {/* Home Button */}
        <div className="flex items-center justify-between mb-6">
          <button 
            type="button"
            onClick={onNavigateHome}
            className="text-neutral-400 hover:text-cyan-400 font-semibold text-xs tracking-wider flex items-center space-x-1.5 transition-colors cursor-pointer bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2"
          >
            <span>&larr; {translations.navHome || "Back to Home"}</span>
          </button>
        </div>

        {/* Header Controls */}
        <div>
            <div className="flex bg-[#131313] border border-[#262626] rounded-2xl p-1 mb-8">
              <button 
                id="auth_tab_login"
                onClick={() => { setActiveTab("login"); setErrorMsg(null); }}
                className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all flex items-center justify-center space-x-1.5 ${activeTab === "login" ? "bg-[#1f1f1f] text-cyan-400 shadow-xl border border-white/5" : "text-neutral-400 hover:text-white"}`}
              >
                <span>Signin</span>
              </button>
              {!isFromQr && (
                <button 
                  id="auth_tab_reg_admin"
                  onClick={() => { setActiveTab("registerAdmin"); setErrorMsg(null); }}
                  className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all ${activeTab === "registerAdmin" ? "bg-[#1f1f1f] text-cyan-400 shadow-xl border border-white/5" : "text-neutral-400 hover:text-white"}`}
                >
                  New Company
                </button>
              )}
              {isFromQr && (
                <button 
                  id="auth_tab_reg_worker"
                  onClick={() => { setActiveTab("registerWorker"); setErrorMsg(null); }}
                  className={`flex-1 py-3 text-xs sm:text-sm font-semibold rounded-xl text-center cursor-pointer transition-all ${activeTab === "registerWorker" ? "bg-[#1f1f1f] text-cyan-400 shadow-xl border border-white/5" : "text-neutral-400 hover:text-white"}`}
                >
                  Signup
                </button>
              )}
            </div>

            {/* Notifications */}
            {errorMsg && (
              <div className="bg-red-950/20 border border-red-550/30 text-red-400 px-4 py-3.5 rounded-2xl text-xs flex items-center space-x-2.5 mb-6">
                <XCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3.5 rounded-2xl text-xs flex items-center space-x-2.5 mb-6">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 animate-bounce" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* TAB CONTENT: LOGIN */}
            {activeTab === "login" && (
              <form id="auth_login_form" onSubmit={handleLoginSubmit} className="space-y-5">
                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400">{translations.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                    <input 
                      type="email" 
                      placeholder="e.g. admin@apextech.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-[#111] focus:bg-[#151515] text-[#E5E5E5] border border-[#262626] rounded-xl py-3.5 pl-11 pr-10 text-sm font-medium outline-none focus:border-cyan-500 focus:shadow-xs min-h-[44px]"
                      required
                    />
                    {email && (
                      <button
                        type="button"
                        onClick={() => setEmail("")}
                        className="absolute right-4 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-xs font-semibold text-neutral-400">{translations.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                    <input 
                      type={showPass ? "text" : "password"} 
                      placeholder="••••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#111] focus:bg-[#151515] text-[#E5E5E5] border border-[#262626] rounded-xl py-3.5 pl-11 pr-16 text-sm font-medium outline-none focus:border-cyan-500 focus:shadow-xs min-h-[44px]"
                      required
                    />
                    {password && (
                      <button
                        type="button"
                        onClick={() => setPassword("")}
                        className="absolute right-11 top-[15px] text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-semibold pt-1">
                  <label className="flex items-center space-x-2 text-neutral-450 cursor-pointer text-neutral-400">
                    <input 
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#262626] bg-[#111] text-cyan-400 focus:ring-cyan-500" 
                    />
                    <span>Remain logged in</span>
                  </label>
                  <button 
                    id="auth_forgot_password_btn"
                    type="button"
                    onClick={handleOpenForgotPassword}
                    className="text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer transition-colors"
                  >
                    Forgot Password?
                  </button>
                </div>

                <button 
                  id="auth_login_submit"
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-98 cursor-pointer rounded-xl py-4 font-semibold text-white shadow-lg shadow-cyan-950/50 flex items-center justify-center space-x-2 transition-all min-h-[44px] mt-6 border border-cyan-500/10"
                >
                  <span>{loading ? "Authorizing..." : translations.loginBtn}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <div className="relative my-6 flex items-center justify-center">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#262626]"></div>
                  </div>
                  <span className="relative bg-[#0d0d0d] px-3 text-xs text-neutral-500 uppercase tracking-widest font-mono">Or continue with</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    id="auth_google_login_btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      // Disabled alternative button - do nothing when selected
                    }}
                    className="flex items-center justify-center space-x-2.5 py-3 bg-[#111] hover:bg-[#131313] text-[#E5E5E5] border border-[#262626] rounded-xl text-xs font-semibold transition-all cursor-default min-h-[44px] select-none"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.97 1 12 1 7.24 1 3.21 3.74 1.25 7.74l3.86 3c.96-2.87 3.66-4.7 6.89-4.7z"/>
                      <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.27H12v4.51h6.44c-.28 1.47-1.11 2.71-2.36 3.55l3.66 2.84c2.14-1.97 3.75-4.87 3.75-8.63z"/>
                      <path fill="#FBBC05" d="M5.11 14.74c-.25-.74-.39-1.53-.39-2.34s.14-1.6.39-2.34l-3.86-3C.43 8.75 0 10.33 0 12s.43 3.25 1.25 4.95l3.86-3.21z"/>
                      <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.66-2.84c-1.11.74-2.53 1.19-4.3 1.19-3.23 0-5.93-1.83-6.89-4.7l-3.86 3C3.21 20.26 7.24 23 12 23z"/>
                    </svg>
                    <span>Google</span>
                  </button>
                  <button
                    id="auth_apple_login_btn"
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      // Disabled alternative button - do nothing when selected
                    }}
                    className="flex items-center justify-center space-x-2.5 py-3 bg-[#111] hover:bg-[#131313] text-[#E5E5E5] border border-[#262626] rounded-xl text-xs font-semibold transition-all cursor-default min-h-[44px] select-none"
                  >
                    <svg className="h-4 w-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.56 2.95-1.39z"/>
                    </svg>
                    <span>Apple</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB CONTENT: ADMIN REGISTRATION */}
            {activeTab === "registerAdmin" && (
              <div className="space-y-6">
                {!subscriptionToken ? (
                  /* STEP 1: GATEWAY SUBSCRIPTION WORKFLOW */
                  <div className="space-y-6 text-neutral-200 font-sans">
                    <div className="text-center space-y-1.5">
                      <h3 className="text-xs font-bold text-cyan-400 tracking-wide uppercase">
                        Step 1: Activate Subscription Plan
                      </h3>
                      <p className="text-xs text-neutral-400 leading-relaxed max-w-md mx-auto">
                        To protect database clusters and isolate business domains, new company registries are gated behind an active, verified subscription.
                      </p>
                    </div>

                    {/* Subscription Packages Selection */}
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        {
                          code: "starter",
                          name: "Starter Plan",
                          price: "₦10,000",
                          desc: "Pragmatic workspace supporting up to 10 employees safely."
                        },
                        {
                          code: "business",
                          name: "Business Plan",
                          price: "₦30,000",
                          desc: "Designed for expanding business operations supporting 11-50 employees."
                        },
                        {
                          code: "growth",
                          name: "Growth Plan",
                          price: "₦50,050",
                          desc: "Pragmatic workspace supporting up to 51-100 employees safely."
                        },
                        {
                          code: "enterprise",
                          name: "Enterprise Plan",
                          price: "₦150,000",
                          desc: "Pragmatic workspace supporting unlimited employees and priority compilations."
                        }
                      ].map((plan) => (
                        <div
                          key={plan.code}
                          onClick={() => {
                            setSelectedPlanCode(plan.code);
                            setGatewaySelected(null);
                            setBillingProgress(null);
                          }}
                          className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                            selectedPlanCode === plan.code
                              ? "border-cyan-500 bg-cyan-950/15 ring-1 ring-cyan-500"
                              : "border-[#262626] bg-[#111] hover:border-neutral-600"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                                {plan.name}
                              </span>
                              <p className="text-xs text-neutral-300 font-light mt-1">
                                {plan.desc}
                              </p>
                            </div>
                            <span className="text-xs font-bold text-white whitespace-nowrap ml-4">
                              {plan.price}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Active Gateway and Checkout simulation */}
                    {selectedPlanCode && (
                      <div className="space-y-4 pt-4 border-t border-dashed border-[#262626] animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-neutral-300">
                            Select Checkout Channel:
                          </h4>
                          {gatewaySelected && (
                            <span className="text-[9px] tracking-wider font-mono text-cyan-400 uppercase bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/30">
                              Active: {gatewaySelected}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <button
                            id="gateway_card_btn"
                            type="button"
                            onClick={() => {
                              setGatewaySelected("card");
                              setBillingProgress(null);
                            }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                              gatewaySelected === "card"
                                ? "border-cyan-500 bg-cyan-950/20 text-cyan-300 ring-1 ring-cyan-500/40"
                                : "border-[#262626] bg-[#111] text-neutral-400 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <CreditCard className="h-4 w-4 text-cyan-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400">CARD</span>
                            </div>
                            <div>
                              <strong className="block text-xs font-semibold text-white">Card Gateway</strong>
                              <span className="text-[8px] opacity-70">Visa, Mastercard, Verve</span>
                            </div>
                          </button>

                          <button
                            id="gateway_paystack_btn"
                            type="button"
                            onClick={() => {
                              setGatewaySelected("paystack");
                              setBillingProgress(null);
                            }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                              gatewaySelected === "paystack"
                                ? "border-blue-500 bg-blue-950/20 text-blue-300 ring-1 ring-blue-500/40"
                                : "border-[#262626] bg-[#111] text-neutral-400 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <ShieldCheck className="h-4 w-4 text-blue-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-blue-400">PAYSTACK</span>
                            </div>
                            <div>
                              <strong className="block text-xs font-semibold text-white">Paystack</strong>
                              <span className="text-[8px] opacity-70">Secured checkout</span>
                            </div>
                          </button>

                          <button
                            id="gateway_opay_btn"
                            type="button"
                            onClick={() => {
                              setGatewaySelected("opay");
                              setBillingProgress(null);
                            }}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between cursor-pointer transition-all ${
                              gatewaySelected === "opay"
                                ? "border-emerald-500 bg-emerald-950/20 text-emerald-300 ring-1 ring-emerald-500/40"
                                : "border-[#262626] bg-[#111] text-neutral-400 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1.5">
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">OPAY</span>
                            </div>
                            <div>
                              <strong className="block text-xs font-semibold text-white">OPay Wallet</strong>
                              <span className="text-[8px] opacity-70">Instant simulation</span>
                            </div>
                          </button>
                        </div>

                        {/* Simulated Checkout Form */}
                        {gatewaySelected && (
                          <div className="p-4 bg-[#111] border border-[#262626] rounded-2xl space-y-3.5 animate-fade-in">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-neutral-400 flex items-center space-x-1.5">
                              <CreditCard className="h-3.5 w-3.5 text-cyan-500" />
                              <span>Simulated Card Credentials</span>
                            </span>

                            <div className="grid grid-cols-1 gap-3 text-xs">
                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] font-semibold text-neutral-400">Cardholder Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. John Doe"
                                  defaultValue="Corporate Subscriber"
                                  className="w-full text-xs bg-[#151515] text-white border border-[#262626] rounded-xl py-2.5 px-3 font-medium outline-none"
                                  required
                                />
                              </div>

                              <div className="flex flex-col space-y-1">
                                <label className="text-[10px] font-semibold text-neutral-400">Card Number</label>
                                <input
                                  type="text"
                                  placeholder="5061 0000 1234 5678"
                                  defaultValue="5061 0299 8831 4452"
                                  className="w-full text-xs bg-[#151515] text-white border border-[#262626] rounded-xl py-2.5 px-3 font-medium outline-none"
                                  maxLength={19}
                                  required
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col space-y-1">
                                  <label className="text-[10px] font-semibold text-neutral-400">Expiration Date</label>
                                  <input
                                    type="text"
                                    placeholder="MM/YY"
                                    defaultValue="12/29"
                                    className="w-full text-xs bg-[#151515] text-white border border-[#262626] rounded-xl py-2.5 px-3 font-medium outline-none"
                                    maxLength={5}
                                    required
                                  />
                                </div>
                                <div className="flex flex-col space-y-1">
                                  <label className="text-[10px] font-semibold text-neutral-400">CVV / Secure Code</label>
                                  <input
                                    type="password"
                                    placeholder="•••"
                                    defaultValue="382"
                                    className="w-full text-xs bg-[#151515] text-white border border-[#262626] rounded-xl py-2.5 px-3 font-medium outline-none"
                                    maxLength={3}
                                    required
                                  />
                                </div>
                              </div>
                            </div>

                            {billingProgress && (
                              <div className="bg-cyan-950/40 border border-cyan-800/60 p-3 rounded-xl text-[10px] font-mono text-cyan-400 animate-pulse">
                                {billingProgress}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={async () => {
                                setBillingProgress("1. Connecting to Secure Gateway Handshake...");
                                setTimeout(() => {
                                  setBillingProgress("2. Verifying mock subscription ledger credit...");
                                }, 1000);
                                setTimeout(async () => {
                                  try {
                                    const response = await fetch("/api/billing/pre-register", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        planCode: selectedPlanCode,
                                        paymentMethod: gatewaySelected
                                      })
                                    });
                                    const data = await response.json();
                                    if (response.ok && data.token) {
                                      setBillingProgress("✓ Checkout Synced. Granting Company Registry permission!");
                                      setTimeout(() => {
                                        setSubscriptionToken(data.token);
                                      }, 800);
                                    } else {
                                      setBillingProgress("Verification mismatch. Please try again.");
                                    }
                                  } catch (err) {
                                    setBillingProgress("Verification mismatch. Please try again.");
                                  }
                                }, 2200);
                              }}
                              className="w-full mt-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              Verify checkout on {gatewaySelected.toUpperCase()} Gateway
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Administrative authorization block */}
                    <div className="pt-4 border-t border-[#262626] space-y-2">
                      <span className="text-[10px] font-bold text-neutral-400 block">
                        Administrative Authorization Access
                      </span>
                      <div className="flex space-x-2">
                        <input
                          type="password"
                          placeholder="Enter administrative bypass code..."
                          value={adminBypassCode}
                          onChange={(e) => setAdminBypassCode(e.target.value)}
                          className="flex-1 text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-2.5 px-3 font-medium outline-none focus:border-cyan-500"
                        />
                        {adminBypassCode && (
                          <button
                            type="button"
                            onClick={() => {
                              if (adminBypassCode === "ADMIN_AUTH_CODE" || adminBypassCode === "ADMIN_BYPASS_TOKEN") {
                                setSuccessMsg("✓ Administrative Clearance Approved! Access granted.");
                                setTimeout(() => {
                                  setSubscriptionToken(adminBypassCode);
                                  setSuccessMsg(null);
                                }, 1000);
                              } else {
                                setErrorMsg("Invalid administrative authorization bypass code.");
                              }
                            }}
                            className="px-4 py-2 bg-neutral-800 border border-neutral-700 hover:bg-neutral-750 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                          >
                            Verify Key
                          </button>
                        )}
                      </div>
                      <p className="text-[9px] text-neutral-500 font-light">
                        Tip: Enter "ADMIN_AUTH_CODE" for administrative bypass.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* STEP 2: COMPLETE COMPANY REGISTRATION FORM */
                  <div className="space-y-4">
                    {/* Subscription Activated Banner */}
                    <div className="bg-emerald-950/40 border border-emerald-800/60 p-4 rounded-xl text-xs font-medium text-emerald-400 flex items-center justify-between animate-fade-in font-sans">
                      <div>
                        <strong className="block text-emerald-300 font-bold">✓ Active Subscription Token Attached</strong>
                        <p className="font-light text-neutral-300 leading-relaxed mt-0.5">
                          {subscriptionToken === "ADMIN_AUTH_CODE" || subscriptionToken === "ADMIN_BYPASS_TOKEN"
                            ? "Granted via administrative bypass credentials."
                            : `Plan Activated: ${selectedPlanCode?.toUpperCase()} package. Proceed to setup your workspace.`}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSubscriptionToken("");
                          setSelectedPlanCode("");
                          setGatewaySelected(null);
                          setBillingProgress(null);
                          setAdminBypassCode("");
                        }}
                        className="text-[10px] text-neutral-400 hover:text-white underline cursor-pointer whitespace-nowrap ml-4"
                      >
                        Reset Selection
                      </button>
                    </div>

                    <form id="auth_reg_admin_form" onSubmit={handleAdminRegisterSubmit} className="space-y-4 animate-fade-in">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-400">{translations.companyName}</label>
                          <div className="relative">
                            <Building className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                            <input 
                              type="text" 
                              placeholder="e.g. Apex Tech Ltd"
                              value={companyName}
                              onChange={(e) => setCompanyName(e.target.value)}
                              className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-9 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                              required
                            />
                            {companyName && (
                              <button
                                type="button"
                                onClick={() => setCompanyName("")}
                                className="absolute right-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col space-y-1">
                          <label className="text-[11px] font-semibold text-neutral-400">{translations.phone}</label>
                          <div className="relative">
                            <Phone className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                            <input 
                              type="tel" 
                              placeholder="+234 81..."
                              value={adminPhone}
                              onChange={(e) => setAdminPhone(e.target.value)}
                              className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-9 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                              required
                            />
                            {adminPhone && (
                              <button
                                type="button"
                                onClick={() => setAdminPhone("")}
                                className="absolute right-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400">{translations.email}</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                          <input 
                            type="email" 
                            placeholder="corp-admin@corp.com"
                            value={adminEmail}
                            onChange={(e) => setAdminEmail(e.target.value)}
                            className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3.5 pl-10 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                            required
                          />
                          {adminEmail && (
                            <button
                              type="button"
                              onClick={() => setAdminEmail("")}
                              className="absolute right-3 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col space-y-1">
                        <label className="text-[11px] font-semibold text-neutral-400">{translations.password}</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                          <input 
                            type={showAdminPass ? "text" : "password"} 
                            placeholder="•••••••••••••"
                            value={adminPass}
                            onChange={(e) => setAdminPass(e.target.value)}
                            className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3.5 pl-10 pr-16 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                            required
                          />
                          {adminPass && (
                            <button
                              type="button"
                              onClick={() => setAdminPass("")}
                              className="absolute right-10 top-3.5 text-neutral-400 hover:text-white cursor-pointer animate-fade-in"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                          <button 
                            type="button"
                            onClick={() => setShowAdminPass(!showAdminPass)}
                            className="absolute right-4 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                          >
                            {showAdminPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Live Password checklist panel */}
                      <div className="bg-[#111111] border border-[#262626] p-4 rounded-xl text-xs space-y-2 mt-1 select-none">
                        <span className="font-bold text-neutral-450 text-[10px] uppercase block mb-1 text-neutral-400">Pass Audit Metrics</span>
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div className="flex items-center space-x-1.5">
                            {passChecks.length ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                            <span className={passChecks.length ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyMin}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {passChecks.upper ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                            <span className={passChecks.upper ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyUpper}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {passChecks.lower ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                            <span className={passChecks.lower ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyLower}</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            {passChecks.numeric ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                            <span className={passChecks.numeric ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyNumber}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 col-span-2">
                            {passChecks.special ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                            <span className={passChecks.special ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policySpecial}</span>
                          </div>
                        </div>
                      </div>

                      <button 
                        id="auth_reg_admin_submit"
                        type="submit"
                        disabled={loading || !isPasswordValid()}
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-950/50 active:scale-98 font-bold text-xs py-3.5 rounded-xl flex items-center justify-center space-x-2 cursor-pointer duration-100 disabled:opacity-50 min-h-[44px]"
                      >
                        <span>{loading ? "Syncing Setup..." : translations.signUpAdmin}</span>
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: WORKER REGISTRATION */}
            {activeTab === "registerWorker" && (
              <form id="auth_reg_worker_form" onSubmit={handleWorkerRegisterSubmit} className="space-y-4">
                
                {/* Sign-Up Form Company-Specific Description */}
                <div className="bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-neutral-900/40 border border-cyan-800/50 p-4 rounded-2xl text-xs font-medium space-y-1 block animate-fade-in font-sans shadow-md">
                  <p className="text-neutral-200 leading-relaxed font-semibold">
                    Welcome to Clock-It-Pro Plus. You are about to sign up as an employee into <span className="font-bold text-cyan-400">{registeredCompanyName}</span> account.
                  </p>
                </div>

                {isFromQr && (
                  <div className="bg-cyan-950/30 border border-cyan-800/40 p-3 rounded-xl text-xs font-medium text-cyan-400 space-y-1 block animate-fade-in font-sans">
                    <strong className="block text-cyan-300 font-bold text-[11px]">💎 QR Gate Handshake Active</strong>
                    <p className="font-light text-neutral-300 leading-relaxed text-[11px]">
                      Scanned official company QR terminal pass. Credentials are authenticated and audited against active subscription limits.
                    </p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">{translations.firstName}</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                      <input 
                        type="text" 
                        placeholder="Alice"
                        value={workerFirst}
                        onChange={(e) => setWorkerFirst(e.target.value)}
                        className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-9 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                        required
                      />
                      {workerFirst && (
                        <button
                          type="button"
                          onClick={() => setWorkerFirst("")}
                          className="absolute right-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">{translations.lastName}</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Mendez"
                        value={workerLast}
                        onChange={(e) => setWorkerLast(e.target.value)}
                        className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-4 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                        required
                      />
                      {workerLast && (
                        <button
                          type="button"
                          onClick={() => setWorkerLast("")}
                          className="absolute right-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400">{translations.phone}</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                      <input 
                        type="tel" 
                        placeholder="+234 81..."
                        value={workerPhone}
                        onChange={(e) => setWorkerPhone(e.target.value)}
                        className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-9 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                        required
                      />
                      {workerPhone && (
                        <button
                          type="button"
                          onClick={() => setWorkerPhone("")}
                          className="absolute right-3 top-3 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-neutral-400">Unique ID</label>
                      <span className="text-[9px] font-mono text-cyan-400/90 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-800/30">
                        Read-Only
                      </span>
                    </div>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                      <input 
                        type="text" 
                        value={companyCode || "default-tenant"}
                        readOnly
                        tabIndex={-1}
                        className="w-full text-xs bg-[#141414] text-neutral-300 border border-[#262626] rounded-xl py-3 pl-9 pr-4 font-mono font-semibold outline-none cursor-not-allowed select-none min-h-[44px]"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dynamic Departments Selection */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">
                    {translations.selectDept || "Select Corporate Department"}
                  </label>
                  <div className="relative" ref={deptDropdownRef}>
                    <Building className="absolute left-4 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                    <button
                      type="button"
                      onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)}
                      className="w-full text-left text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3.5 pl-10 pr-10 font-medium outline-none focus:border-cyan-500 min-h-[44px] cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">
                        {sortedDepts.find(d => d.id === selectedDeptId)?.name || (sortedDepts[0]?.name) || "Select Corporate Department"}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-neutral-400 transition-transform duration-200 shrink-0 ${isDeptDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {isDeptDropdownOpen && (
                      <div className="absolute top-[calc(100%+6px)] left-0 w-full bg-[#111] border border-[#262626] rounded-2xl shadow-2xl z-50 py-1.5 overflow-hidden animate-fade-in-down">
                        <div className="max-h-48 overflow-y-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                          {sortedDepts.length > 0 ? (
                            sortedDepts.map((dept) => (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDeptId(dept.id);
                                  setIsDeptDropdownOpen(false);
                                }}
                                className={`w-full text-left font-medium text-xs py-3 px-4 transition-colors block cursor-pointer select-none ${
                                  selectedDeptId === dept.id 
                                    ? "bg-cyan-950/40 text-cyan-400 border-l-2 border-cyan-500 pl-3.5 font-bold" 
                                    : "text-neutral-300 hover:bg-[#181818] hover:text-white"
                                }`}
                              >
                                {dept.name}
                              </button>
                            ))
                          ) : (
                            <button
                              type="button"
                              className="w-full text-left py-3 px-4 text-xs text-neutral-500 font-light"
                              disabled
                            >
                              General Department
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">{translations.email}</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                    <input 
                      type="email" 
                      placeholder="alice@corp.com"
                      value={workerEmail}
                      onChange={(e) => setWorkerEmail(e.target.value)}
                      className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3.5 pl-10 pr-9 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                      required
                    />
                    {workerEmail && (
                      <button
                        type="button"
                        onClick={() => setWorkerEmail("")}
                        className="absolute right-3 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400">Gender</label>
                  <div className="grid grid-cols-2 gap-2 bg-[#111] border border-[#262626] p-1.5 rounded-xl">
                    {(["Male", "Female"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setWorkerGender(g)}
                        className={`py-2 text-[10px] sm:text-xs font-semibold rounded-lg text-center transition-all cursor-pointer ${workerGender === g ? "bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 font-bold" : "text-neutral-450 hover:text-white border border-transparent hover:bg-neutral-900/45"}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Date of Birth Collection (Day & Month only for celebrations & privacy) */}
                <div className="flex flex-col space-y-1.5">
                  <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    {translations.dateOfBirth || "Date of Birth (Day & Month)"}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Month Selector */}
                    <CustomSelect
                      id="auth_worker_birth_month"
                      value={workerBirthMonth ? String(workerBirthMonth) : ""}
                      onChange={(val) => setWorkerBirthMonth(val ? Number(val) : "")}
                      placeholder={translations.birthMonth || "Month of Birth"}
                      options={BIRTH_MONTH_OPTIONS}
                      theme="dark"
                      className="w-full text-xs bg-[#111] hover:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-3.5 pr-10 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                    />

                    {/* Day Selector */}
                    <CustomSelect
                      id="auth_worker_birth_day"
                      value={workerBirthDay ? String(workerBirthDay) : ""}
                      onChange={(val) => setWorkerBirthDay(val ? Number(val) : "")}
                      placeholder={translations.birthDay || "Day of Birth"}
                      options={BIRTH_DAY_OPTIONS}
                      theme="dark"
                      className="w-full text-xs bg-[#111] hover:bg-[#151515] text-white border border-[#262626] rounded-xl py-3 pl-3.5 pr-10 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex flex-col space-y-1">
                  <label className="text-[11px] font-semibold text-neutral-400">{translations.password}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-3.5 w-3.5 text-neutral-400" />
                    <input 
                      type={showWorkerPass ? "text" : "password"} 
                      placeholder="••••••••••••••"
                      value={workerPass}
                      onChange={(e) => setWorkerPass(e.target.value)}
                      className="w-full text-xs bg-[#111] focus:bg-[#151515] text-white border border-[#262626] rounded-xl py-3.5 pl-10 pr-16 font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                      required
                    />
                    {workerPass && (
                      <button
                        type="button"
                        onClick={() => setWorkerPass("")}
                        className="absolute right-10 top-3.5 text-neutral-400 hover:text-white cursor-pointer animate-fade-in"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setShowWorkerPass(!showWorkerPass)}
                      className="absolute right-4 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showWorkerPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Live Password checklist panel */}
                <div className="bg-[#111111] border border-[#262626] p-4 rounded-xl text-xs space-y-2 mt-1 select-none">
                  <span className="font-bold text-neutral-450 text-[10px] uppercase block mb-1 text-neutral-400">Pass Audit Metrics</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="flex items-center space-x-1.5">
                      {passChecks.length ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                      <span className={passChecks.length ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyMin}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {passChecks.upper ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                      <span className={passChecks.upper ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyUpper}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {passChecks.lower ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                      <span className={passChecks.lower ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyLower}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      {passChecks.numeric ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                      <span className={passChecks.numeric ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policyNumber}</span>
                    </div>
                    <div className="flex items-center space-x-1.5 col-span-2">
                      {passChecks.special ? <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" /> : <XCircle className="h-3.5 w-3.5 text-neutral-600" />}
                      <span className={passChecks.special ? "text-cyan-300 font-medium" : "text-neutral-500"}>{translations.policySpecial}</span>
                    </div>
                  </div>
                </div>

                {/* Legal Terms & Agreement Signature Section */}
                <div className="space-y-3 pt-2 border-t border-[#262626] mt-3 animate-fade-in">
                  <div className="flex items-start space-x-2.5">
                    <input
                      id="legal_terms_checkbox"
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={(e) => setAgreedTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-cyan-500 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                      required
                    />
                    <label htmlFor="legal_terms_checkbox" className="text-xs text-neutral-400 select-none">
                      {translations.legalTermsLabel || "I agree to the Legal Terms, Data Auditing, and Privacy Policy"}{" "}
                      <button
                        type="button"
                        onClick={() => setTermsModalOpen(true)}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium cursor-pointer inline-block ml-1"
                      >
                        [View Terms]
                      </button>
                    </label>
                  </div>

                  <div className="flex flex-col space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-neutral-400">
                        {translations.legalTermsSignature || "Digital Signature"}
                      </label>
                      <span className="text-[9px] font-mono text-emerald-400/90 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/30">
                        Auto-Populated
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="Enter First & Last Name to populate signature"
                      value={digitalSignature}
                      readOnly
                      tabIndex={-1}
                      className="w-full text-xs bg-[#141414] text-cyan-300 font-mono border border-[#262626] rounded-xl py-3 px-4 font-semibold cursor-not-allowed select-none outline-none min-h-[44px]"
                      required
                    />
                    {workerFirst && workerLast ? (
                      <span className="text-[10px] text-neutral-500 select-none">
                        Cryptographic signature generated for: <span className="font-mono text-cyan-400 font-semibold">{workerFirst} {workerLast}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 select-none">
                        Signature automatically syncs with your registered name.
                      </span>
                    )}
                  </div>
                </div>

                <button 
                  id="auth_reg_worker_submit"
                  type="submit"
                  disabled={loading || !isPasswordValid()}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-950/50 active:scale-98 font-bold text-xs py-3.5 rounded-xl flex items-center justify-center space-x-2 cursor-pointer duration-100 disabled:opacity-50 min-h-[44px]"
                >
                  <span>{loading ? "Cataloging Worker..." : translations.signUpWorker}</span>
                </button>
              </form>
            )}

          </div>

          {/* Optional Footer Text */}
          <div className="text-center text-[10px] text-gray-400 font-mono mt-8">
            CLOCK-IT PRO+ INTEGRITY SERVICE &bull; SECURE WORKSPACE
          </div>

          {/* Beautiful Legal Terms Modal */}
          {termsModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in font-sans">
              <div className="w-full max-w-lg bg-[#0d0d0d]/95 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto scrollbar-none">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                  <h3 className="text-xs font-bold text-white tracking-widest uppercase text-cyan-400">
                    🛡️ CLOCK-IT PRO+ Legal & Data Audit Policy
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setTermsModalOpen(false)}
                    className="text-neutral-500 hover:text-white font-mono text-xs cursor-pointer focus:outline-none"
                  >
                    [CLOSE]
                  </button>
                </div>
                
                <div className="text-[7px] md:text-[8px] leading-[1.2] text-neutral-400 space-y-3 font-sans text-justify">
                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 1: Registration Validation & Device Fingerprint Binding</strong>
                    By logging or registering your worker catalog profile, you explicitly authorize binding this credential account to this visual execution machine. Your profile values (<strong>Email address</strong>, <strong>User credentials (userId)</strong>, <strong>Legal Full Names</strong>, and <strong>Phone number</strong>) are securely registered, cross-examined, and strictly audited against active enterprise settings.
                  </p>
                  
                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 2: Contactless QR Verification Integrity</strong>
                    Daily QR attendance scanners rotate synchronously via secure network time. Any attempt to spoof location coordinates, mirror graphic templates, or utilize visual screenshots constitute immediate non-compliance and will log infraction notices to corporate administrators.
                  </p>

                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 3: Audit Compliance Settings & Operational Metrics</strong>
                    Your workspace administrator configures guidelines regarding lateness buffers, overtime thresholds, and exemption approvals. Completed profiles consent to synchronization across these global enterprise configurations.
                  </p>

                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 4: Biometric Proof of Attendance Consent</strong>
                    The system requests permission to access the device's camera to record verification thumbnails during shift changes. You explicitly consent to the cloud-caching and automated auditing of these visual indicators for verification tracking.
                  </p>

                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 5: Multi-Tenant Partition Separation Boundaries</strong>
                    Strict logical row-level security isolates all business records. You acknowledge that under no conditions can any credential holders access or query indices outside of their registered company domain identifier.
                  </p>

                  <p>
                    <strong className="text-cyan-400 text-[9px] uppercase tracking-wider block">Section 6: Limitation of Liability & Metric Integrity</strong>
                    THE PLATFORM IS PROVIDED "AS IS" AND IS NOT RESPONSIBLE FOR LATE ASSIGNMENTS, NETWORK CELLULAR LATENESS, CAMERA FOCUS BLURRING, OR ARBITRATIVE WAGE TERMINATION DEBATES INITIATED BY EMPLOYERS.
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-850 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setAgreedTerms(true);
                      setTermsModalOpen(false);
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors active:scale-95"
                  >
                    I Accept & Agree
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FORGOT PASSWORD MODAL (RESEND API INTEGRATION) */}
          {showForgotPasswordModal && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8 py-8 sm:py-12 bg-black/85 backdrop-blur-md overflow-y-auto"
              onClick={() => setShowForgotPasswordModal(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#111111] border border-[#262626] text-[#E5E5E5] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 relative my-auto max-h-[calc(100vh-4rem)] overflow-y-auto scrollbar-thin animate-fade-in"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#262626] pb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <KeyRound className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white font-display">
                        {forgotStep === "request" ? "Reset Your Password" : "Enter Verification PIN"}
                      </h3>
                      <p className="text-[11px] text-neutral-400">
                        {forgotStep === "request" 
                          ? "Enter your email to receive a verification PIN" 
                          : "Verification code sent to your email"}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Status Messages */}
                {forgotError && (
                  <div className="bg-red-950/30 border border-red-500/40 text-red-300 px-4 py-3 rounded-2xl text-xs flex items-start space-x-2.5">
                    <XCircle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5" />
                    <span className="leading-relaxed">{forgotError}</span>
                  </div>
                )}
                {forgotSuccess && (
                  <div className="bg-emerald-950/30 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl text-xs flex items-start space-x-2.5">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-400 mt-0.5" />
                    <span className="leading-relaxed">{forgotSuccess}</span>
                  </div>
                )}

                {/* STEP 1: REQUEST CODE */}
                {forgotStep === "request" ? (
                  <form onSubmit={handleForgotPasswordRequest} className="space-y-5">
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Enter the email address associated with your account. We will send a 6-digit verification PIN to reset your password.
                    </p>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Registered Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                        <input
                          id="forgot_password_email_input"
                          type="email"
                          placeholder="e.g. employee@company.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full bg-[#181818] focus:bg-[#1e1e1e] text-[#E5E5E5] border border-[#333333] rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowForgotPasswordModal(false)}
                        className="flex-1 py-3 bg-[#181818] hover:bg-[#222222] text-neutral-300 border border-[#333333] rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        id="forgot_password_send_btn"
                        type="submit"
                        disabled={forgotLoading || !forgotEmail}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950/40"
                      >
                        {forgotLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Sending PIN...</span>
                          </>
                        ) : (
                          <>
                            <span>Send Reset PIN</span>
                            <Send className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* STEP 2: ENTER PIN AND SET NEW PASSWORD */
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                    <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-2xl flex items-center justify-between text-xs">
                      <span className="text-neutral-300 truncate max-w-[240px]">
                        Target: <strong className="text-cyan-400 font-mono">{forgotEmail}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotStep("request");
                          setForgotError(null);
                        }}
                        className="text-cyan-400 hover:underline text-[11px] font-semibold cursor-pointer"
                      >
                        Change
                      </button>
                    </div>

                    {forgotDemoCode && (
                      <div className="p-2.5 bg-amber-950/20 border border-amber-500/30 text-amber-300 text-[11px] rounded-xl flex items-center justify-between font-mono">
                        <span>Demo PIN: <strong>{forgotDemoCode}</strong></span>
                        <button
                          type="button"
                          onClick={() => setForgotResetCode(forgotDemoCode)}
                          className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[10px] font-bold cursor-pointer"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">6-Digit Verification PIN</label>
                      <input
                        id="forgot_password_code_input"
                        type="text"
                        maxLength={6}
                        placeholder="••••••"
                        value={forgotResetCode}
                        onChange={(e) => setForgotResetCode(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full bg-[#181818] focus:bg-[#1e1e1e] text-center tracking-[0.4em] font-mono text-xl text-cyan-400 border border-[#333333] rounded-xl py-3 text-sm font-bold outline-none focus:border-cyan-500 min-h-[44px]"
                        required
                      />
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                        <input
                          id="forgot_password_new_pass"
                          type={showForgotNewPass ? "text" : "password"}
                          placeholder="Min 8 chars, uppercase, number & symbol"
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          className="w-full bg-[#181818] focus:bg-[#1e1e1e] text-[#E5E5E5] border border-[#333333] rounded-xl py-3.5 pl-11 pr-11 text-sm font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                          className="absolute right-4 top-3.5 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          {showForgotNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-xs font-semibold text-neutral-300">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-3.5 h-4 w-4 text-neutral-400" />
                        <input
                          id="forgot_password_confirm_pass"
                          type={showForgotNewPass ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={forgotConfirmPassword}
                          onChange={(e) => setForgotConfirmPassword(e.target.value)}
                          className="w-full bg-[#181818] focus:bg-[#1e1e1e] text-[#E5E5E5] border border-[#333333] rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none focus:border-cyan-500 min-h-[44px]"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep("request")}
                        className="flex-1 py-3 bg-[#181818] hover:bg-[#222222] text-neutral-300 border border-[#333333] rounded-xl text-xs font-semibold cursor-pointer transition-all"
                      >
                        Back
                      </button>
                      <button
                        id="forgot_password_commit_btn"
                        type="submit"
                        disabled={forgotLoading || !forgotResetCode || !forgotNewPassword}
                        className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center justify-center space-x-2 shadow-lg shadow-cyan-950/40"
                      >
                        {forgotLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Updating...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4" />
                            <span>Set New Password</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* Entertainingly Beautiful Loading Overlay */}
          {loading && (
            <div className="fixed inset-0 z-55 flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-6 font-sans select-none">
              <div className="relative flex items-center justify-center h-32 w-32 mb-8">
                {/* Glowing Outer Ring */}
                <div className="absolute inset-0 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 animate-spin"></div>
                {/* Glowing Inner Ring (Reverse direction) */}
                <div className="absolute inset-2 rounded-full border-4 border-blue-500/10 border-b-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.2s' }}></div>
                {/* Center Core Pulse */}
                <div className="absolute inset-6 rounded-full bg-cyan-500/20 shadow-lg shadow-cyan-500/30 border border-cyan-500/40 animate-pulse"></div>
                <div className="absolute h-4 w-4 rounded-full bg-cyan-400 shadow-md shadow-cyan-400 animate-pulse"></div>
              </div>

              {/* Status Header */}
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#E5E5E5] text-center mb-3">
                Processing Secure Workspace Pipeline
              </h4>

              {/* Dynamic Entertaining Status Message */}
              <div className="h-6 flex items-center justify-center max-w-sm">
                <p className="text-xs text-cyan-400 font-mono font-medium text-center animate-pulse">
                  {loadingMessages[loadingMsgIdx]}
                </p>
              </div>

              {/* Technical Indicator details */}
              <div className="mt-8 flex items-center space-x-2.5 text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
                <span>SECT_NODE: ACTIVE</span>
                <span>•</span>
                <span>AUDIT: STRICT</span>
                <span>•</span>
                <span>UTILITY: 3000 DEV</span>
              </div>
            </div>
          )}

      </div>
    </div>
  );
}
