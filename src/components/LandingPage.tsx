/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  QrCode, 
  BarChart3, 
  FileText, 
  Users, 
  CreditCard, 
  Globe, 
  Smartphone, 
  ShieldAlert, 
  Megaphone,
  ChevronDown, 
  ArrowRight,
  Play,
  Mail,
  Phone,
  AlertTriangle,
  Building,
  UserCheck,
  User,
  Sparkles,
  Menu,
  X,
  Facebook,
  Instagram,
  Linkedin
} from "lucide-react";


const Tiktok = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={props.className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const clients = [
  "Zenith Bank", 
  "Dangote Group", 
  "MTN Nigeria", 
  "Globacom", 
  "Shoprite", 
  "Jumia Group", 
  "Flutterwave", 
  "PiggyVest", 
  "Moniepoint", 
  "OPay", 
  "UBA Group"
];

const partners = [
  "Paystack", 
  "Microsoft Enterprise", 
  "AWS Africa", 
  "Google Cloud", 
  "Interswitch Group", 
  "NIMC Portal", 
  "Standard Chartered", 
  "Sterling Bank", 
  "GIG Logistics", 
  "VFD Microfinance"
];

const testimonials = [
  { text: "OPass revolutionized our site compliance. Clock-ins are now 100% verified.", author: "Chinowe E., COO at Vanguard" },
  { text: "The biometric face verification and offline handshakes are flawless.", author: "Tunde O., Head of HR at Dangote" },
  { text: "Midnight QR rotation solved our shift-sharing issue overnight. Exceptional!", author: "Kelechi A., Director at Glo Retail" },
  { text: "Integration with Paystack was immediate, and slot limits upgraded in real-time.", author: "Fatima Y., Founder of StyleB" },
  { text: "Managing 500+ workers across 4 branches is now completely centralized.", author: "Babajide S., Ops Director at GIG" },
  { text: "The compliance audit logs saved our regulatory checks. A masterpiece!", author: "Amina K., Compliance Manager" }
];


interface LandingPageProps {
  onStartTrial: () => void;
  onNavigateLogin: () => void;
  translations: any;
}

export default function LandingPage({ onStartTrial, onNavigateLogin, translations }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoRole, setDemoRole] = useState<"admin" | "worker">("admin");
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<any | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const featureCards = [
    {
      icon: <QrCode className="h-6 w-6 text-indigo-600" />,
      title: translations.featQr,
      desc: translations.featQrDesc
    },
    {
      icon: <Megaphone className="h-6 w-6 text-cyan-400" />,
      title: "Central Announcement & Live Pulse",
      desc: "Broadcast company-wide bulletins, image alerts, and interactive feedback forms with instant real-time worker response synchronization."
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-teal-500" />,
      title: translations.featAnalytics,
      desc: translations.featAnalyticsDesc
    },
    {
      icon: <FileText className="h-6 w-6 text-orange-500" />,
      title: translations.featPerm,
      desc: translations.featPermDesc
    },
    {
      icon: <Users className="h-6 w-6 text-purple-500" />,
      title: translations.featDept,
      desc: translations.featDeptDesc
    },
    {
      icon: <CreditCard className="h-6 w-6 text-emerald-500" />,
      title: translations.featSaaS,
      desc: translations.featSaaSDesc
    },
    {
      icon: <Globe className="h-6 w-6 text-blue-500" />,
      title: translations.featLang,
      desc: translations.featLangDesc
    },
    {
      icon: <Smartphone className="h-6 w-6 text-amber-500" />,
      title: translations.featPwa,
      desc: translations.featPwaDesc
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-red-500" />,
      title: "Enterprise Multi-Tenant Security",
      desc: "Isolated data tenancy with row level filters. Fully secure authentication, audit logging, and payment gating."
    }
  ];

  const faqs = [
    {
      q: "How do Central Announcements work and how are worker responses synchronized?",
      solutions: [
        "Instant Workforce Broadcasts: Administrators can broadcast rich notices, image bulletins, or structured feedback forms with 1-5 star ratings directly from the dashboard.",
        "Live Real-Time Synchronization: Worker responses, qualitative feedback, and rating submissions synchronize immediately to the Admin Active Live tab via Server-Sent Events.",
        "Acknowledge & Engagement Counters: Real-time statistics track worker acknowledgments and compute live satisfaction averages without page refreshes.",
        "Historical Broadcast Archive: Past announcements remain securely archived and can be reviewed, reactivated, or audited at any time."
      ]
    },
    {
      q: "How often do authentication QR codes rotate & what are the security solutions?",
      solutions: [
        "Automatic Midnight Rotation: Every tenant's unique QR code expires at exactly 00:00 midnight local time automatically to prevent snapshot sharing.",
        "NTP Force Synchronization: System relies on absolute Network Time Protocol clocks, blocking any device-side manual clock tampering or overrides.",
        "Supervisor Override Seed: Enterprise administrators can manually force-rotate the security token seed anytime to invalidate stale active scans instantly.",
        "Instant Outage Re-authorization: If scan times out due to transient network latency, the app triggers local validation popups to retry safely."
      ]
    },
    {
      q: "Is there an offline login or checkout option & what are the fail-safe solutions?",
      solutions: [
        "Encrypted Cache Handshakes: The app stores an encrypted token digest in the secure local container if connection drops during active shift shifts.",
        "Automatic Cloud Resynchronization: Collected offline data is authorized and dispatched automatically as soon as internet connectivity returns.",
        "Manual Management Override: Workers can submit an immediate exemption register request with offline timestamp and geo-location proofs.",
        "Supervisor Back-dating Panel: Compliance managers retain high-level rights to retroactively adjust and authorize offline shift logs safely."
      ]
    },
    {
      q: "How is performance percentage scored & what are the administrative rules?",
      solutions: [
        "Exemption Exclusions: All approved medical leaves, vacations, or official duties are automatically deducted from evaluation denominators.",
        "Grace Lateness Buffer: Lateness calculates using a highly customized grace minute buffer decided within supervisor settings.",
        "Hour-based Index Matching: Standard workday present percentages compute actual checked-in time ratios against shift guidelines.",
        "Department-wide Benchmarks: Personal indices are aggregated into leaderboards, fostering active visibility across organizational units."
      ]
    },
    {
      q: "How do plan upgrades work & how are worker slot limits resolved?",
      solutions: [
        "On-the-fly Slot Allocation: Upgrading plans instantly releases slot limits in real-time, allowing immediate registrations.",
        "Regional Gateway Clearance: Integrations with Opay and Paystack APIs provide instant webhook notifications for immediate account activation.",
        "Row-level Sandboxed Lockouts: High safety Row-level isolation ensures no loss of historical company data during billing state shifts.",
        "Granular Multi-tenant Isolation: Unlimited scaling operates flawlessly, preserving high boundaries across individual business structures."
      ]
    },
    {
      q: "Can administrators customize shift templates for different departments?",
      solutions: [
        "Flexible Shift Assignment: Assign custom start/end times and late-arrival thresholds per department.",
        "Rotational Support: Configure rotating shift schedules easily for round-the-clock operations.",
        "Instant Allocation: Changes to shift profiles update worker apps instantly in real-time.",
        "Holiday Exclusion: Map national or local holidays to exclude them from attendance penalties."
      ]
    },
    {
      q: "How are late arrivals and overtime automatically compiled for payroll?",
      solutions: [
        "Audit-ready Records: Real-time lateness calculation provides precise minutes late for every worker shift.",
        "Overtime Caps: Configure maximum overtime hours per day or per department to control costs.",
        "No Manual Punching: Automatic tracking removes payroll calculation human errors completely.",
        "CSV/Excel Export: Export filtered attendance registers for simple payroll software integration."
      ]
    },
    {
      q: "What happens if a worker loses or changes their registered device?",
      solutions: [
        "Secure Device Locking: Workers register their specific handset upon first login to prevent multiple active sessions.",
        "Admin Reset Rights: Company administrators can easily clear registered device IDs with a single click.",
        "Instant Re-linking: The worker can link a new device immediately on their next login attempt.",
        "Audit Record Integrity: Device reset requests are captured in the tenant's security compliance log."
      ]
    },
    {
      q: "Does the platform accommodate multi-branch company locations?",
      solutions: [
        "Multi-Branch Binding: Register unlimited office buildings or production plants under a single enterprise umbrella.",
        "Local Terminal Separation: Assign custom QR scanner screens to individual physical locations.",
        "Localized Policy Setting: Adjust distinct shift grace margins, holiday calendars, and lateness rules per office branch.",
        "Centralized Super-Dash: Executive administrators review organization-wide trends or drill down into specific regional logs."
      ]
    },
    {
      q: "How does the platform prevent buddy-punching and photo spoofing?",
      solutions: [
        "Rotative QR Handshake: The attendance QR code is dynamic, rotating at set intervals to block static photos.",
        "Geo-Radius Enforcement: The app checks actual location to ensure checks occur inside authorized zones.",
        "Live Photo verification: Require real-time photo upload during check-in to confirm identity.",
        "Handset Binding: Limits login to a single registered smartphone per employee profile."
      ]
    },
    {
      q: "Is there an automated warning notification for persistent lateness?",
      solutions: [
        "Configurable Triggers: Set limits for consecutive late arrivals before alerts are fired.",
        "In-app Status Cards: Workers see their real-time attendance score directly in their personal dashboard.",
        "Direct Supervisor Alerts: Real-time emails notify supervisors if worker performance scores drop.",
        "Automated Reminders: Friendly push messages help workers check in promptly on scheduled workdays."
      ]
    }
  ];

  const getFeatureDetails = (title: string) => {
    switch (title) {
      case translations.featQr:
        return {
          subtitle: "Secure Contactless Daily Rotative Credentials",
          bullets: [
            "Automatic Expiration: Handshake token is regenerated precisely at local midnight to prevent user-to-user photo sharing.",
            "NTP Clock Check: Blocks client-side clock tampering. All logs verify strictly with standard internet atomic servers.",
            "Anti-Geolocation spoofing: Integrates cellular grid validations to ensure workers check in inside geo-bounded workspace radii."
          ],
          outcomes: "Eliminate manual check-in overhead, bypass buddy-punching fraud entirely, and guarantee absolute payroll consistency."
        };
      case "Central Announcement & Live Pulse":
        return {
          subtitle: "Multi-Format Broadcast Engine & Instant Response Synchronization",
          bullets: [
            "Flexible Communication Formats: Broadcast rich company announcements with text, image notices, or interactive survey forms.",
            "Instant Real-Time Synchronization: Worker acknowledgments, custom feedback, and 1-5 star ratings appear on the admin dashboard with zero delay.",
            "Complete Archival Management: Manage active live announcements, toggle statuses, and audit historical employee feedback submissions."
          ],
          outcomes: "Bridge communication across dispersed workforces, assess operational sentiment instantaneously, and maintain verified acknowledgment trails."
        };
      case translations.featAnalytics:
        return {
          subtitle: "Enterprise Intelligence & Performance Ratios Dashboard",
          bullets: [
            "Comprehensive Metrics Grid: Detailed attendance statistics, lateness duration tracks, and individual performance multipliers.",
            "Visual Leaderboards: Gamify and benchmark attendance profiles, highlighting top-tier organizational punctuality.",
            "CSV/PDF Live Compilation: Export fully validated data reports with single-click actions, complete with signature blocks."
          ],
          outcomes: "Equip HR leads with audit-ready documentation and direct productivity insights based on tangible workday data."
        };
      case translations.featPerm:
        return {
          subtitle: "Digital Handshake Permission Approval Desk",
          bullets: [
            "Exemption Approval Flow: Seamlessly upload medical, vacation, or emergency absence reasons directly from worker handsets.",
            "Interactive Dashboard Matrix: Supervisors review, approve, or reject pending requests with instant color status changes.",
            "Smart Performance Recalculation: Excused leaves bypass standard active counts, protecting worker rating averages."
          ],
          outcomes: "Reduce administrative friction, automate worker calendar updates, and keep attendance scorecards perfectly accurate."
        };
      case translations.featDept:
        return {
          subtitle: "Granular Historical Unit Mapping & Deep-Diving",
          bullets: [
            "Team Comparison Grids: Evaluate present ratios across individual business lines and compare team efficiencies.",
            "Lead Historical Archives: Track physical leadership periods, verifying who appointed team leaders and when.",
            "Departmental Segregation: Perfect database row-level boundaries prevent unauthorized cross-unit information leakage."
          ],
          outcomes: "Ensure robust corporate compliance, clarify leadership hierarchies, and allocate team tasks strategically."
        };
      case translations.featSaaS:
        return {
          subtitle: "Strict Multi-tenant Isolation with Gated Bill Pay",
          bullets: [
            "Tenant Border Shielding: Absolute database isolation protects private accounts, client profiles, and billing logs.",
            "Integrated Gateway Handshakes: Native payment procedures via certified partners Opay and Paystack APIs.",
            "Dynamic Limit Safeguards: Automated worker registration blockers enforce active package subscription constraints."
          ],
          outcomes: "Host unlimited organizational entities confidently within a secure, compliant SaaS ecosystem."
        };
      case translations.featLang:
        return {
          subtitle: "High-Fidelity International Translation Suite",
          bullets: [
            "Full Interface Adaptation: Complete local adaptations in English, French, and Spanish languages.",
            "Zero Layout Displacement: Specialized text wrapping layout ensures beautiful formatting across small or large screens.",
            "Saved User Language State: Remembers user's preferred native translations context persistently."
          ],
          outcomes: "Unify multinational branches on a single, easy-to-use human resource management portal."
        };
      case translations.featPwa:
        return {
          subtitle: "Built-in Standalone Progressive App Framework",
          bullets: [
            "App Screen Installation: Save directly to Android or iOS home screens as a fast-loading standard app asset.",
            "Responsiveness Benchmarking: Optimized touch target sizes (min 44px) ensure easy tactile interaction.",
            "Zero Friction Access: Skip heavy play store registrations while running exactly like a native APK application."
          ],
          outcomes: "Enable immediate, frictionless device onboarding for field personnel and desk employees alike."
        };
      default:
        return {
          subtitle: "Enterprise-Grade Threat Shield & Tenancy Security",
          bullets: [
            "Strict Auth Isolation: Row-level database boundaries ensure enterprise data stays thoroughly protected and hidden.",
            "Audit Trail Logging: Records every action persistently, creating immutable histories of crucial clock modifications.",
            "Certified Webhooks Gating: Secure verification pipelines guard system APIs from unauthorized access."
          ],
          outcomes: "Protect crucial corporate records with state-of-the-art security architectures."
        };
    }
  };

  return (
    <div id="landing_root" className="min-h-screen bg-[#0A0A0A] text-[#E5E5E5] flex flex-col font-sans selection:bg-cyan-950 select-none relative overflow-x-hidden">
      

      {/* Dynamic Header */}
      <nav id="landing_nav" className="sticky top-0 bg-[#0D0D0D]/90 backdrop-blur-md border-b border-[#262626] z-40 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3.5 md:py-4 flex items-center justify-between shadow-xl relative flex-nowrap whitespace-nowrap overflow-x-visible">
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 cursor-pointer group hover:opacity-95 select-none shrink-0"
          title="Go to Top"
        >
          <div className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 rounded-lg sm:rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/45 group-hover:brightness-110 transition-all">
            <QrCode className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
          </div>
          <span className="font-display font-bold text-xs sm:text-base md:text-xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">{translations.appName}</span>
        </div>

        {/* Desktop Navigation Links */}
        <div id="landing_nav_links" className="hidden md:flex items-center space-x-4 lg:space-x-8 text-xs lg:text-sm font-medium text-neutral-400 flex-nowrap shrink">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="hover:text-cyan-400 transition-colors cursor-pointer bg-transparent border-none font-medium">Home</button>
          <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
          <a href="#walkthroughs" className="hover:text-cyan-400 transition-colors">Demos</a>
          <a href="#faq" className="hover:text-cyan-400 transition-colors">FAQ</a>
          <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
        </div>

        {/* Desktop Sign-in Button */}
        <div className="hidden md:flex items-center shrink-0 ml-2">
          <button 
            id="nav_trial_btn"
            onClick={onNavigateLogin} 
            className="text-xs lg:text-sm font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg sm:rounded-xl px-3 py-2 lg:px-5 lg:py-2.5 shadow-lg shadow-cyan-950/50 hover:shadow-cyan-900/50 active:scale-95 transition-all flex items-center space-x-1 cursor-pointer border border-cyan-500/15"
          >
            <span>Sign in</span>
            <ArrowRight className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
          </button>
        </div>

        {/* Mobile Menu Icon Button */}
        <div className="flex md:hidden items-center shrink-0">
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-[#1A1A1A] transition-colors cursor-pointer"
            title="Toggle Menu"
          >
            {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu Container */}
        <AnimatePresence>
          {showMobileMenu && (
            <>
              {/* Overlay / backdrop to catch clicks outside menu */}
              <div 
                className="fixed inset-0 z-30 cursor-default bg-black/50 backdrop-blur-xs" 
                onClick={() => setShowMobileMenu(false)} 
              />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-[calc(100%+6px)] right-3 w-56 bg-[#0D0D0D] border border-[#262626] rounded-xl p-3.5 shadow-2xl flex flex-col space-y-2 z-40 md:hidden cursor-default"
              >
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="text-left text-neutral-300 hover:text-cyan-400 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors cursor-pointer bg-transparent border-none w-full"
                >
                  Home
                </button>
                <a 
                  href="#features" 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-neutral-300 hover:text-cyan-400 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors block"
                >
                  Features
                </a>
                <a 
                  href="#walkthroughs" 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-neutral-300 hover:text-cyan-400 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors block"
                >
                  Demos
                </a>
                <a 
                  href="#faq" 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-neutral-300 hover:text-cyan-400 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors block"
                >
                  FAQ
                </a>
                <a 
                  href="#contact" 
                  onClick={() => setShowMobileMenu(false)}
                  className="text-neutral-300 hover:text-cyan-400 font-semibold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors block"
                >
                  Contact
                </a>
                <div className="border-t border-[#262626] my-1" />
                <button 
                  onClick={() => {
                    setShowMobileMenu(false);
                    onNavigateLogin();
                  }} 
                  className="text-left text-cyan-400 hover:text-cyan-300 font-bold text-xs py-2 px-3 rounded-lg hover:bg-[#161616] transition-colors cursor-pointer bg-transparent border-none w-full flex items-center justify-between"
                >
                  <span>Sign In</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <header className="relative bg-gradient-to-b from-cyan-950/10 via-transparent to-transparent px-6 py-20 lg:py-32 flex flex-col items-center text-center max-w-5xl mx-auto z-10">
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display font-bold text-4xl sm:text-5xl md:text-6xl tracking-tight text-white leading-[1.1] mb-6"
        >
          Workforce Attendance, <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Analytics & Permissions</span> Redefined
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-neutral-400 text-lg max-w-2xl font-light mb-10 leading-relaxed"
        >
          {translations.slogan}. Highly secure contactless QR checks, precomputed smart leaderboards, granular multi-tenant isolation, and immediate billing verification.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-4"
        >
          <button 
            id="hero_start_trial_btn"
            onClick={onNavigateLogin}
            className="w-full sm:w-auto font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-95 rounded-xl px-8 py-4 shadow-xl shadow-cyan-950/50 hover:shadow-cyan-900/50 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px] border border-cyan-500/15"
          >
            <span>Sign in</span>
            <ArrowRight className="h-5 w-5" />
          </button>
          
          <button 
            id="hero_demo_btn"
            onClick={() => {
              setDemoRole("admin");
              setShowDemoModal(true);
            }}
            className="w-full sm:w-auto font-semibold text-neutral-300 hover:text-cyan-400 bg-[#0D0D0D] hover:bg-[#151515] active:scale-95 border border-[#262626] rounded-xl px-8 py-4 flex items-center justify-center space-x-2 transition-all cursor-pointer min-h-[44px]"
          >
            <Play className="h-5 w-5 stroke-cyan-400 fill-cyan-400/10" />
            <span>{translations.ctaDemo}</span>
          </button>
        </motion.div>
      </header>

      {/* Feature Bento Grid */}
      <section id="features" className="py-20 bg-[#0D0D0D] border-y border-[#262626] flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-medium text-3xl tracking-tight text-white mb-4">Precision Utilities for Modern Workspaces</h2>
            <p className="text-neutral-400 font-light text-sm">Engineered with high horizontal-padding text adaptation, multi-device layouts, and persistent enterprise logging.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {featureCards.map((f, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedFeature(f)}
                className="bg-[#111111] rounded-2xl p-6 border border-[#262626] hover:shadow-2xl hover:border-cyan-550/40 hover:scale-[1.02] duration-250 transition-all flex flex-col justify-between text-left cursor-pointer group focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#1A1A1A] border border-[#262626] flex items-center justify-center shadow-xs mb-5 group-hover:bg-cyan-950/20 group-hover:border-cyan-500/20 transition-all">
                    {f.icon}
                  </div>
                  <h3 className="font-semibold text-lg text-white mb-2 leading-snug group-hover:text-cyan-400 transition-colors">{f.title}</h3>
                  <p className="text-neutral-400 text-xs font-light leading-relaxed mb-4">{f.desc}</p>
                </div>
                <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-wider group-hover:translate-x-1 duration-150 transition-all mt-auto flex items-center space-x-1">
                  <span>Explore Module</span>
                  <span>&rarr;</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Walkthrough Section */}
      <section id="walkthroughs" className="py-20 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display font-medium text-3xl tracking-tight text-white mb-4">Interactive Walkthrough Center</h2>
            <p className="text-neutral-400 text-sm font-light">Explore workflows from both directions—the Administrator and the Worker viewpoints.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            
            {/* Admin walkthrough */}
            <div className="bg-[#0D0D0D] rounded-3xl p-8 border border-[#262626] shadow-2xl flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-cyan-950/40 text-cyan-400 text-xs font-semibold px-2.5 py-1 rounded-full mb-4 border border-cyan-500/10">
                  <Building className="h-3.5 w-3.5" />
                  <span>Company Administrator view</span>
                </div>
                <h3 className="font-semibold text-2xl text-white mb-4">Manage Attendance & Performance</h3>
                <ul className="space-y-3.5 text-sm text-neutral-400 mb-8 font-light">
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/10">1</span>
                    <span><strong className="text-white">Register your enterprise tenant.</strong> Automatically pre-seeds core mock data models for preview tests.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/10">2</span>
                    <span><strong className="text-white">Adjust business settings.</strong> Fine-tune shift limits, overtime caps, active days, and department managers.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-cyan-950 text-cyan-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-cyan-500/10">3</span>
                    <span><strong className="text-white">Assess presence grids & broadcast announcements.</strong> Evaluate metrics, broadcast central announcements with interactive ratings, and approve permission exemptions.</span>
                  </li>
                </ul>
              </div>
              <button 
                id="walkthrough_admin_btn"
                onClick={() => {
                  setDemoRole("admin");
                  setShowDemoModal(true);
                }} 
                className="w-full py-3.5 border border-cyan-550/20 hover:border-cyan-500/40 bg-cyan-950/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
              >
                <Play className="h-4 w-4 fill-cyan-400" />
                <span>Launch Admin Demonstration</span>
              </button>
            </div>

            {/* Worker walkthrough */}
            <div className="bg-[#0D0D0D] rounded-3xl p-8 border border-[#262626] shadow-2xl flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center space-x-1.5 bg-blue-950/40 text-blue-400 text-xs font-semibold px-2.5 py-1 rounded-full mb-4 border border-blue-500/10">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span>Assigned Worker view</span>
                </div>
                <h3 className="font-semibold text-2xl text-white mb-4">Contactless QR Check-Ins</h3>
                <ul className="space-y-3.5 text-sm text-neutral-400 mb-8 font-light">
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-blue-950 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/10">1</span>
                    <span><strong className="text-white">Join via tenant invite.</strong> Register easily mapped directly into your company unit.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-blue-950 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/10">2</span>
                    <span><strong className="text-white">Fich-In securely.</strong> Scans daily Rotating QR Code. Supports automatic rescan triggers and confirmation dialogues.</span>
                  </li>
                  <li className="flex items-start space-x-2.5">
                    <span className="h-5 w-5 rounded-full bg-blue-950 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/10">3</span>
                    <span><strong className="text-white">Track metrics & respond to central announcements.</strong> View personal analytics, acknowledge broadcasts with real-time feedback, and request exemptions.</span>
                  </li>
                </ul>
              </div>
              <button 
                id="walkthrough_worker_btn"
                onClick={() => {
                  setDemoRole("worker");
                  setShowDemoModal(true);
                }} 
                className="w-full py-3.5 border border-blue-550/20 hover:border-blue-500/40 bg-blue-950/20 text-blue-400 rounded-xl text-sm font-semibold hover:bg-blue-950/40 transition-all flex items-center justify-center space-x-2 cursor-pointer min-h-[44px]"
              >
                <Play className="h-4 w-4 fill-blue-700" />
                <span>Launch Worker Demonstration</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Brand & Testimonial Infinite Scroll Marquees */}
      <section className="py-20 bg-[#0A0A0A]/40 border-t border-[#262626] overflow-hidden relative z-10">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
          <h2 className="font-display font-medium text-3xl tracking-tight text-white mb-4">Trusted Across the Globe</h2>
          <p className="text-neutral-400 text-sm font-light max-w-2xl mx-auto">
            Powering high-integrity verification systems for industry leaders, secure scaling partners, and multi-tenant structures.
          </p>
        </div>

        <div className="space-y-8">
          {/* CLIENTS MARQUEE: Left to Right */}
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            
            <div className="animate-marquee-right flex gap-6">
              {[...clients, ...clients, ...clients].map((client, idx) => (
                <div 
                  key={`client-${idx}`} 
                  className="px-8 py-3.5 bg-[#111] hover:bg-[#161616] transition-colors border border-[#222] text-neutral-300 rounded-2xl text-xs sm:text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2 shadow-inner whitespace-nowrap min-w-[160px] cursor-default"
                >
                  <span className="h-2 w-2 rounded-full bg-cyan-400"></span>
                  {client}
                </div>
              ))}
            </div>
          </div>

          {/* PARTNERS MARQUEE: Right to Left */}
          <div className="w-full overflow-hidden relative">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            
            <div className="animate-marquee-left flex gap-6">
              {[...partners, ...partners, ...partners].map((partner, idx) => (
                <div 
                  key={`partner-${idx}`} 
                  className="px-8 py-3.5 bg-[#111] hover:bg-[#161616] transition-colors border border-[#222] text-neutral-400 rounded-2xl text-xs sm:text-sm font-semibold tracking-wider uppercase flex items-center justify-center gap-2 shadow-inner whitespace-nowrap min-w-[180px] cursor-default"
                >
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                  {partner}
                </div>
              ))}
            </div>
          </div>

          {/* TESTIMONIALS MARQUEE: Left to Right */}
          <div className="w-full overflow-hidden relative pt-6">
            <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0A0A0A] to-transparent z-10 pointer-events-none" />
            
            <div className="animate-marquee-right flex gap-6 py-2">
              {[...testimonials, ...testimonials].map((test, idx) => (
                <div 
                  key={`test-${idx}`} 
                  className="w-[280px] sm:w-[320px] p-6 bg-[#111111] border border-[#222] rounded-2xl shadow-xl flex flex-col justify-between mx-1 hover:border-[#333] transition-colors cursor-default select-none shrink-0"
                >
                  <div className="flex gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className="text-yellow-500 text-xs">★</span>
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-300 font-light leading-relaxed mb-4 whitespace-normal break-words">
                    "{test.text}"
                  </p>
                  <div className="border-t border-[#222] pt-3 mt-auto">
                    <span className="text-[10px] sm:text-xs text-cyan-400 font-semibold block whitespace-normal break-words">{test.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section id="faq" className="py-20 bg-[#0D0D0D]/40 border-t border-[#262626] relative z-10">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-display font-medium text-3xl tracking-tight text-white mb-4">Frequently Answered Queries</h2>
            <p className="text-neutral-400 text-sm font-light">Centralized policies safeguarding trial abuse, payment confirmation, and image compliance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Column 1 */}
            <div className="space-y-4">
              {faqs.filter((_, i) => i % 2 === 0).map((faq, idxInCol) => {
                const idx = idxInCol * 2;
                return (
                  <div key={idx} className="border border-[#262626] rounded-2xl overflow-hidden shadow-lg bg-[#111111]/80">
                    <button 
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-4 bg-transparent hover:bg-[#1A1A1A] flex items-center justify-between text-left transition-colors font-medium text-white min-h-[44px] cursor-pointer gap-4"
                    >
                      <span className="text-sm sm:text-base break-words whitespace-normal leading-snug">{faq.q}</span>
                      <ChevronDown className={`h-5 w-5 text-neutral-400 shrink-0 transition-transform duration-250 ${activeFaq === idx ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {activeFaq === idx && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-[#0A0A0A]/90"
                        >
                          <div className="px-6 py-5 text-xs sm:text-sm leading-relaxed border-t border-[#262626] bg-[#0c0c0c]/80 rounded-b-2xl">
                            <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest block mb-4.5 font-mono">Listed Solutions</span>
                            <ul className="space-y-3">
                              {faq.solutions.map((sol, solIdx) => {
                                const [title, desc] = sol.split(": ");
                                return (
                                  <li key={solIdx} className="flex items-start space-x-3 text-neutral-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-2"></span>
                                    <span className="text-xs sm:text-sm font-light break-words whitespace-normal min-w-0">
                                      <strong className="text-white font-medium">{title}</strong>: {desc}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              {faqs.filter((_, i) => i % 2 !== 0).map((faq, idxInCol) => {
                const idx = idxInCol * 2 + 1;
                return (
                  <div key={idx} className="border border-[#262626] rounded-2xl overflow-hidden shadow-lg bg-[#111111]/80">
                    <button 
                      onClick={() => toggleFaq(idx)}
                      className="w-full px-6 py-4 bg-transparent hover:bg-[#1A1A1A] flex items-center justify-between text-left transition-colors font-medium text-white min-h-[44px] cursor-pointer gap-4"
                    >
                      <span className="text-sm sm:text-base break-words whitespace-normal leading-snug">{faq.q}</span>
                      <ChevronDown className={`h-5 w-5 text-neutral-400 shrink-0 transition-transform duration-250 ${activeFaq === idx ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence initial={false}>
                      {activeFaq === idx && (
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden bg-[#0A0A0A]/90"
                        >
                          <div className="px-6 py-5 text-xs sm:text-sm leading-relaxed border-t border-[#262626] bg-[#0c0c0c]/80 rounded-b-2xl">
                            <span className="text-[10px] text-cyan-400 font-extrabold uppercase tracking-widest block mb-4.5 font-mono">Listed Solutions</span>
                            <ul className="space-y-3">
                              {faq.solutions.map((sol, solIdx) => {
                                const [title, desc] = sol.split(": ");
                                return (
                                  <li key={solIdx} className="flex items-start space-x-3 text-neutral-300">
                                    <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shrink-0 mt-2"></span>
                                    <span className="text-xs sm:text-sm font-light break-words whitespace-normal min-w-0">
                                      <strong className="text-white font-medium">{title}</strong>: {desc}
                                    </span>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Term Modal / Section toggle */}
      <AnimatePresence>
        {showTermsModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setShowTermsModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0D0D] rounded-3xl max-w-3xl w-full max-h-[80vh] flex flex-col justify-between overflow-hidden shadow-2xl border border-[#262626] cursor-default"
            >
              <div className="p-6 border-b border-[#262626] bg-[#111111] flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-xl text-white">Legal Terms, Conditions & Privacy Guidelines</h3>
                  <p className="text-xs text-neutral-400">Effective: June 2026</p>
                </div>
                <button 
                  onClick={() => setShowTermsModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#1A1A1A] transition-colors cursor-pointer"
                  title="Close Legal Terms"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto text-[7px] md:text-[8px] leading-[1.2] text-neutral-400 space-y-3 font-sans text-justify bg-[#0A0A0A] divide-y divide-[#1F1F1F]">
                <section className="pt-2 first:pt-0">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">1. MULTI-TENANT ARCHITECTURE & TENANT ISOLATION BOUNDARIES</h4>
                  <p>CLOCK-IT PRO+ utilizes a highly secured, logically sandboxed multi-tenant cloud database design. Every subscribing organization (the "Tenant") has their data partition shielded via strict row-level security boundaries. Cross-tenant data access is mathematically prevented. No tenant can view, scan, query, or interfere with another tenant's workforce, logs, or settings under any circumstances.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">2. BIOMETRIC VERIFICATION, PHOTO SNAPSHOT CACHING & GDPR COMPLIANCE</h4>
                  <p>To enforce identity validation checks during attendance logs, the app prompts device camera modules. High-contrast visual tokens are compiled, cached locally, and uploaded securely via SSL pipelines. Completed registrations explicitly consent to processing these visual tokens. Data retention is strictly governed by local data regulations (GDPR/NDPR).</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">3. ROTATING QR TOKENS, SECURE TIME & BUDDY-PUNCHING SAFEGUARDS</h4>
                  <p>To block spoofing and fraudulent clocking, access QR keys rotate automatically using an integrated network time validation standard. Modifying local device clock metrics fails security checks. Scanning screenshots is categorized as a high-tier security violation, justifying profile terminations.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">4. SUBSCRIPTION BILLING, API INTEGRATIONS & NON-REFUNDABLE CLAUSES</h4>
                  <p>Billing modifications, user-seat additions, and service renewals are processed through secure payment pathways (Stripe, Paystack, Opay). Transaction clearances trigger backend webhooks. Subscription fees are processed on a recurring basis and remain strictly non-refundable once allocated.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">5. WORKFORCE EXEMPTIONS, REPORT SHIELDING & SUPERVISOR SIGNOFF</h4>
                  <p>Exemptions, sick leaves, and off-site reports require digital supervisor sign-offs. Uploaded documentation is shielded behind roles. The software acts strictly as an automated ledger, and salary evaluation liability rests solely with tenants.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">6. OFFLINE HANDSHAKES, CELLULAR FAILURE & SECURE LOCAL STORE</h4>
                  <p>During physical network degradations, attendance timestamps cache inside secure browser storage and push automatically upon cellular recovery. CLOCK-IT PRO+ is not liable for data gaps stemming from device damage, cell carrier failures, or camera malfunctions.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">7. REAL-TIME EVENT STREAMING, SSE SOCKETS & TELEMETRY SAFEGUARDS</h4>
                  <p>Secure web sockets transmit active state modifications to administrator dashboards instantly. These pipelines do not track coordinates in the background when the web page is inactive. Users grant permission for emergency sirens and broadcast alerts during safety incidents.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">8. WARRANTY DISCLAIMERS, SYSTEM OUTAGES & MEASURABLE CEILINGS</h4>
                  <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT REPRESENTING SECURED ABSOLUTES. IN NO EVENT SHALL THE DEVELOPERS BE LIABLE FOR INDIRECT, STATUTORY, OR INCIDENTAL DISCREPANCIES STEMMING FROM NETWORK DISRUPTIONS OR INACCURATE TIME LOGS.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">9. LEGAL JURISDICTION, INDEMNIFICATION & COGNIZANT SEVERABILITY</h4>
                  <p>Governed by active cyber-security frameworks. Subscribers agree to defend and hold harmless the developers against legal claims stemming from labor disputes, shift evaluation, or wage metrics compiled within the system.</p>
                </section>
                <section className="pt-2">
                  <h4 className="font-bold text-white mb-1 uppercase text-[9px] tracking-wider text-cyan-400">10. AMENDMENTS, DIGITAL SIGNATURE RE-VERIFICATION & AUDITING RIGHTS</h4>
                  <p>We reserve rights to modernize these legal terms. Active users must digitize their typed signatures to reaffirm agreement during major software changes. Continuing to access dashboards implies full, unconditional acceptance of any modified policies.</p>
                </section>
              </div>
              <div className="p-5 border-t border-[#262626] bg-[#111111] flex flex-col sm:flex-row items-center justify-between gap-4">
                <label className="flex items-center space-x-3 text-left cursor-pointer group select-none">
                  <input 
                    type="checkbox" 
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4.5 w-4.5 rounded-md border-[#262626] bg-[#1A1A1A] text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-cyan-500"
                  />
                  <span className="text-xs text-neutral-350 group-hover:text-neutral-200 font-light transition-colors">
                    I state that I read and agree to all workspace legal agreements.
                  </span>
                </label>
                <button 
                  disabled={!termsAccepted}
                  onClick={() => {
                    if (termsAccepted) {
                      setShowTermsModal(false);
                    }
                  }}
                  className={`px-6 py-2.5 font-semibold rounded-xl text-sm antialiased transition-all ${termsAccepted ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white cursor-pointer shadow-lg shadow-cyan-950/45 active:scale-95' : 'bg-[#161616] text-neutral-600 border border-[#262626] cursor-not-allowed'}`}
                >
                  I Understand & Accept
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Descriptive Feature Details Modal */}
      <AnimatePresence>
        {selectedFeature && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setSelectedFeature(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0D0D0D] rounded-3xl max-w-2xl w-full flex flex-col justify-between overflow-hidden shadow-2xl border border-[#262626] cursor-default"
            >
              <div className="p-6 border-b border-[#262626] bg-[#111111] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-500/15 flex items-center justify-center shrink-0">
                    {selectedFeature.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-base text-white">{selectedFeature.title}</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider uppercase font-bold mt-0.5">{getFeatureDetails(selectedFeature.title).subtitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFeature(null)}
                  className="h-8 w-8 rounded-full bg-[#1A1A1A] text-neutral-400 hover:text-white flex items-center justify-center cursor-pointer border border-[#262626] text-sm"
                >
                  &times;
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 text-sm text-neutral-300 leading-relaxed bg-[#0A0A0A] max-h-[60vh]">
                <div>
                  <h4 className="text-white font-semibold text-[10px] uppercase tracking-widest mb-1.5 font-mono text-cyan-400">Detailed Module Overview</h4>
                  <p className="font-light text-neutral-300 text-xs">{selectedFeature.desc} Dynamic live cloud synchronization ensures zero data discrepancy, executing checks persistently against multi-tenant databases.</p>
                </div>

                <div>
                  <h4 className="text-white font-semibold text-[10px] uppercase tracking-widest mb-3 font-mono text-cyan-400">Core Feature Benefits</h4>
                  <ul className="space-y-3">
                    {getFeatureDetails(selectedFeature.title).bullets.map((bullet: string, bIdx: number) => {
                      const [bTitle, bDesc] = bullet.split(": ");
                      return (
                        <li key={bIdx} className="flex items-start space-x-2.5 text-neutral-300">
                          <span className="h-5 w-5 bg-cyan-950/40 text-cyan-400 text-xs font-bold border border-cyan-500/15 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            {bIdx + 1}
                          </span>
                          <span className="text-xs font-light">
                            <strong className="text-white font-semibold">{bTitle}</strong>: {bDesc}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="p-4 bg-cyan-950/10 border border-cyan-500/15 rounded-2xl">
                  <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-widest block mb-1 font-mono">Measurable Enterprise Outcome</span>
                  <p className="text-xs text-neutral-300 font-light leading-relaxed">{getFeatureDetails(selectedFeature.title).outcomes}</p>
                </div>
              </div>

              <div className="p-4.5 border-t border-[#262626] bg-[#111111] flex justify-end space-x-3">
                <button 
                  onClick={() => setSelectedFeature(null)}
                  className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#202020] text-neutral-300 hover:text-white font-semibold rounded-xl text-xs cursor-pointer border border-[#262626] transition-all"
                >
                  Close Details
                </button>
                <button 
                  onClick={() => {
                    setSelectedFeature(null);
                    onNavigateLogin();
                  }}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-lg shadow-cyan-950/45 flex items-center space-x-1.5 active:scale-95 transition-all"
                >
                  <span>Sign in</span>
                  <span>&rarr;</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Demonstration Modals (Dummy player) */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer" onClick={() => setShowDemoModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-950 rounded-3xl max-w-2xl w-full text-white overflow-hidden shadow-2xl border border-white/10 cursor-default"
            >
              <div className="p-6 border-b border-white/10 bg-gray-900 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Play className="h-5 w-5 text-indigo-400 fill-indigo-400/20" />
                  <span className="font-semibold text-sm uppercase tracking-wider">{demoRole === "admin" ? "Admin Simulation Player" : "Worker Clock Player"}</span>
                </div>
                <button onClick={() => setShowDemoModal(false)} className="text-gray-400 hover:text-white font-bold">&times;</button>
              </div>
              
              <div className="p-8 flex flex-col items-center justify-center text-center">
                <div className="h-40 w-full rounded-2xl bg-gradient-to-r from-indigo-900/30 via-indigo-950/20 to-teal-950/30 flex flex-col items-center justify-center border border-white/5 mb-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-white opacity-5"></div>
                  {demoRole === "admin" ? (
                    <Building className="h-12 w-12 text-indigo-400 animate-bounce mb-3" />
                  ) : (
                    <UserCheck className="h-12 w-12 text-teal-400 animate-bounce mb-3" />
                  )}
                  <span className="text-sm font-semibold text-white/95">
                    {demoRole === "admin" ? "Interactive Settings & Leadership Console" : "PWA QR Handshake scanning flow"}
                  </span>
                  <span className="text-[10px] text-white/50 tracking-widest mt-1">SIMULATED PORT 3000 ENGINE</span>
                </div>
                <h4 className="font-bold text-lg mb-2">Ready to test in real-time?</h4>
                <p className="text-white/60 font-light text-xs max-w-sm mb-6 leading-relaxed">
                  Avoid static video reels! Our platform is fully live in this workspace container. Sign in directly to interact with real inputs!
                </p>
                <div className="flex space-x-3 w-full">
                  <button 
                    onClick={() => {
                      setShowDemoModal(false);
                      onNavigateLogin();
                    }}
                    className="flex-1 py-3 bg-white text-gray-950 font-bold hover:bg-opacity-90 active:scale-95 text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
                  >
                    Sign in to Account
                  </button>
                  <button 
                    onClick={() => setShowDemoModal(false)}
                    className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-bold active:scale-95 text-xs rounded-xl transition-all cursor-pointer min-h-[44px]"
                  >
                    Close Simulator
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer id="contact" className="mt-auto bg-[#07090F] text-neutral-200 border-t border-[#1F293D] px-6 py-12 relative z-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h4 className="text-white font-display font-bold text-lg tracking-tight flex items-center space-x-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>{translations.appName}</span>
            </h4>
            <p className="text-sm text-neutral-300 font-normal leading-relaxed">
              A pristine SaaS workspace built to synchronize, audit, and measure human resource metrics with multi-tenant strictness.
            </p>
          </div>
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Contact Gateway</h5>
            <ul className="space-y-3 text-sm font-normal text-neutral-200">
              <li className="flex items-center space-x-2.5 group">
                <Mail className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <a href="mailto:support@clockitpro.com" className="hover:text-cyan-400 transition-colors">support@clockitpro.com</a>
              </li>
              <li className="flex items-center space-x-2.5 group">
                <Phone className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <a href="tel:+2348123456789" className="hover:text-cyan-400 transition-colors">+234 812 345 6789</a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Social Handles</h5>
            <div className="flex flex-row flex-nowrap gap-2.5">
              <a 
                href="https://x.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center h-10 w-10 text-white bg-white/10 border border-white/20 rounded-xl hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300 shadow-sm"
                title="Follow us on X"
              >
                <span className="text-xs font-bold font-mono">X</span>
              </a>
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center h-10 w-10 text-white bg-white/10 border border-white/20 rounded-xl hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300 shadow-sm"
                title="Follow us on Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a 
                href="https://tiktok.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center h-10 w-10 text-white bg-white/10 border border-white/20 rounded-xl hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300 shadow-sm"
                title="Follow us on TikTok"
              >
                <Tiktok className="h-4 w-4" />
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center h-10 w-10 text-white bg-white/10 border border-white/20 rounded-xl hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300 shadow-sm"
                title="Follow us on Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a 
                href="https://linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-center h-10 w-10 text-white bg-white/10 border border-white/20 rounded-xl hover:bg-cyan-500 hover:text-black hover:border-cyan-400 transition-all duration-300 shadow-sm"
                title="Connect with us on LinkedIn"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
            <p className="text-[10px] text-cyan-400 font-medium mt-3">Follow us to stay updated with real-time features!</p>
          </div>
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Explore Sections</h5>
            <div className="flex flex-col space-y-2.5">
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} 
                className="text-left text-neutral-300 hover:text-cyan-400 font-medium text-xs tracking-wider transition-colors cursor-pointer bg-transparent border-none p-0 flex items-center space-x-1"
              >
                <span>Home Overview</span>
              </button>
              <a 
                href="#features" 
                className="text-neutral-300 hover:text-cyan-400 font-medium text-xs tracking-wider transition-colors flex items-center space-x-1"
              >
                <span>Core Features</span>
              </a>
              <a 
                href="#walkthroughs" 
                className="text-neutral-300 hover:text-cyan-400 font-medium text-xs tracking-wider transition-colors flex items-center space-x-1"
              >
                <span>Interactive Demos</span>
              </a>
              <a 
                href="#faq" 
                className="text-neutral-300 hover:text-cyan-400 font-medium text-xs tracking-wider transition-colors flex items-center space-x-1"
              >
                <span>Support & FAQ</span>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto border-t border-[#1F293D] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs font-light">
          <span>&copy; 2026 CLOCK-IT PRO+. All enterprise rights reserved.</span>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors cursor-pointer">T&C Rulebook</button>
            <button onClick={() => setShowTermsModal(true)} className="hover:text-white transition-colors cursor-pointer">Data Shield Agreement</button>
          </div>
        </div>
      </footer>

    </div>
  );
}
