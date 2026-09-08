/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../types.js";

export interface PwaManifestConfig {
  role: "admin" | "worker" | "guest";
  tenantName?: string;
  workerName?: string;
  theme?: string;
}

let deferredPrompt: any = null;
const installListeners: Array<(canInstall: boolean) => void> = [];

if (typeof window !== "undefined") {
  // Listen for the beforeinstallprompt event
  window.addEventListener("beforeinstallprompt", (e: any) => {
    e.preventDefault();
    deferredPrompt = e;
    installListeners.forEach((listener) => listener(true));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    console.log("PWA: Application installed successfully to home screen / system!");
  });
}

/**
 * Register Service Worker
 */
export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("PWA: ServiceWorker registration successful with scope: ", reg.scope);
        })
        .catch((err) => {
          console.warn("PWA: ServiceWorker registration failed: ", err);
        });
    });
  }
}

/**
 * Check if the application is currently running in standalone / installed PWA mode
 */
export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

/**
 * Hook or subscriber for PWA install eligibility
 */
export function subscribePwaInstall(callback: (canInstall: boolean) => void): () => void {
  installListeners.push(callback);
  callback(deferredPrompt !== null);
  return () => {
    const index = installListeners.indexOf(callback);
    if (index > -1) installListeners.splice(index, 1);
  };
}

/**
 * Trigger the native browser PWA Install Prompt
 */
export async function promptPwaInstall(): Promise<{ outcome: "accepted" | "dismissed" | "unavailable" }> {
  if (!deferredPrompt) {
    return { outcome: "unavailable" };
  }
  try {
    deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((listener) => listener(false));
    return choiceResult;
  } catch (error) {
    console.error("PWA install error:", error);
    return { outcome: "unavailable" };
  }
}

/**
 * Generate role-specific SVG icon URL encoded for PWA manifests
 */
export function getPwaIconSvg(role: "admin" | "worker" | "guest", size = 512): string {
  const isAdmin = role === "admin";
  const isWorker = role === "worker";

  const primaryColor = isAdmin ? "#06b6d4" : isWorker ? "#10b981" : "#06b6d4";
  const secondaryColor = isAdmin ? "#3b82f6" : isWorker ? "#06b6d4" : "#3b82f6";
  const labelText = isAdmin ? "ADMIN" : isWorker ? "WORKER" : "CLOCK-IT";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Card -->
  <rect width="${size}" height="${size}" rx="100" fill="url(#bgGrad)" />
  <rect width="${size - 16}" height="${size - 16}" x="8" y="8" rx="92" fill="none" stroke="${primaryColor}" stroke-opacity="0.3" stroke-width="6" />

  <!-- Outer Glow Ring -->
  <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * 0.28}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" filter="url(#glow)" opacity="0.4" />
  <circle cx="${size / 2}" cy="${size * 0.44}" r="${size * 0.28}" fill="none" stroke="url(#primaryGrad)" stroke-width="10" />

  ${
    isAdmin
      ? `
  <!-- Admin Shield & Command Center Motif -->
  <path d="M ${size * 0.5} ${size * 0.22} L ${size * 0.68} ${size * 0.3} L ${size * 0.68} ${size * 0.46} C ${size * 0.68} ${size * 0.6} ${size * 0.5} ${size * 0.66} ${size * 0.5} ${size * 0.66} C ${size * 0.5} ${size * 0.66} ${size * 0.32} ${size * 0.6} ${size * 0.32} ${size * 0.46} L ${size * 0.32} ${size * 0.3} Z" fill="url(#primaryGrad)" opacity="0.2" />
  <path d="M ${size * 0.5} ${size * 0.24} L ${size * 0.66} ${size * 0.31} L ${size * 0.66} ${size * 0.45} C ${size * 0.66} ${size * 0.58} ${size * 0.5} ${size * 0.64} ${size * 0.5} ${size * 0.64} C ${size * 0.5} ${size * 0.64} ${size * 0.34} ${size * 0.58} ${size * 0.34} ${size * 0.45} L ${size * 0.34} ${size * 0.31} Z" fill="none" stroke="url(#primaryGrad)" stroke-width="12" stroke-linejoin="round" />
  <!-- Center Star / Check -->
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.08}" fill="url(#primaryGrad)" />
  `
      : isWorker
      ? `
  <!-- Worker Clock & ID Badge Motif -->
  <circle cx="${size * 0.5}" cy="${size * 0.38}" r="${size * 0.09}" fill="url(#primaryGrad)" />
  <path d="M ${size * 0.34} ${size * 0.58} C ${size * 0.34} ${size * 0.48} ${size * 0.66} ${size * 0.48} ${size * 0.66} ${size * 0.58}" fill="none" stroke="url(#primaryGrad)" stroke-width="14" stroke-linecap="round" />
  <!-- Clock hands overlay -->
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.22}" fill="none" stroke="url(#primaryGrad)" stroke-width="6" stroke-dasharray="10 14" opacity="0.6" />
  <path d="M ${size * 0.5} ${size * 0.32} L ${size * 0.5} ${size * 0.44} L ${size * 0.58} ${size * 0.44}" fill="none" stroke="#ffffff" stroke-width="10" stroke-linecap="round" />
  `
      : `
  <!-- Master Clock Motif -->
  <circle cx="${size * 0.5}" cy="${size * 0.44}" r="${size * 0.22}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" />
  <path d="M ${size * 0.5} ${size * 0.3} L ${size * 0.5} ${size * 0.44} L ${size * 0.6} ${size * 0.44}" fill="none" stroke="url(#primaryGrad)" stroke-width="12" stroke-linecap="round" />
  `
  }

  <!-- Bottom Badge Pill -->
  <rect x="${size * 0.18}" y="${size * 0.78}" width="${size * 0.64}" height="${size * 0.13}" rx="${size * 0.065}" fill="url(#primaryGrad)" />
  <text x="${size * 0.5}" y="${size * 0.865}" font-family="system-ui, -apple-system, sans-serif" font-size="${size * 0.055}" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="4">${labelText}</text>
</svg>
  `.trim();

  return "data:image/svg+xml;base64," + (typeof btoa !== "undefined" ? btoa(svg) : Buffer.from(svg).toString("base64"));
}

/**
 * Dynamically configure and inject the role-specific Web App Manifest into the DOM
 */
export function updatePwaManifest(config: PwaManifestConfig) {
  if (typeof document === "undefined") return;

  const { role, tenantName, workerName, theme } = config;

  let manifestName = "CLOCK-IT PRO+ | SaaS Workforce Management";
  let shortName = "CLOCK-IT";
  let startUrl = "/";
  let description = "Enterprise Workforce Attendance & Shift Operations Management";
  let themeColor = "#06b6d4";
  const bgColor = theme === "light" ? "#f8fafc" : theme === "army" ? "#141C10" : theme === "navy" ? "#0B132B" : "#0a0a0a";

  if (role === "admin") {
    manifestName = tenantName ? `${tenantName} - Admin Portal` : "CLOCK-IT Admin Portal";
    shortName = tenantName ? `${tenantName.slice(0, 10)} Admin` : "Admin Portal";
    startUrl = "/?pwa=admin";
    description = `Enterprise Admin Dashboard & Attendance Terminal for ${tenantName || "Organization"}`;
    themeColor = "#06b6d4";
  } else if (role === "worker") {
    manifestName = tenantName
      ? `${tenantName} - Staff Workspace${workerName ? ` (${workerName})` : ""}`
      : "CLOCK-IT Staff Workspace";
    shortName = tenantName ? `${tenantName.slice(0, 10)} Staff` : "Staff Portal";
    startUrl = "/?pwa=worker";
    description = `Worker Attendance Terminal, Shift Check-In & Permission Portal for ${workerName || "Staff"}`;
    themeColor = "#10b981";
  }

  // Construct manifest object
  const icon192 = getPwaIconSvg(role, 192);
  const icon512 = getPwaIconSvg(role, 512);

  const manifestData = {
    id: "/",
    name: manifestName,
    short_name: shortName,
    description,
    start_url: startUrl,
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: role === "worker" ? "portrait-primary" : "any",
    theme_color: themeColor,
    background_color: bgColor,
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: role === "admin" ? "/pwa-admin-192.png" : role === "worker" ? "/pwa-worker-192.png" : "/pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: role === "admin" ? "/pwa-admin-512.png" : role === "worker" ? "/pwa-worker-512.png" : "/pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: role === "admin" ? "/pwa-admin-maskable-512.png" : role === "worker" ? "/pwa-worker-maskable-512.png" : "/pwa-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/pwa-maskable-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts:
      role === "admin"
        ? [
            {
              name: "Attendance Logs",
              short_name: "Logs",
              description: "View real-time attendance logs",
              url: "/?pwa=admin&tab=logs",
              icons: [{ src: "/pwa-admin-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
              name: "Shift Register",
              short_name: "Register",
              description: "View daily shift roster & roll calls",
              url: "/?pwa=admin&tab=register",
              icons: [{ src: "/pwa-admin-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
              name: "Terminal QR Code",
              short_name: "QR Code",
              description: "Display live check-in terminal QR code",
              url: "/?pwa=admin&action=qr",
              icons: [{ src: "/pwa-admin-192.png", sizes: "192x192", type: "image/png" }],
            },
          ]
        : role === "worker"
        ? [
            {
              name: "Check In / Out",
              short_name: "Check-In",
              description: "Scan terminal QR code or submit attendance code",
              url: "/?pwa=worker&action=checkin",
              icons: [{ src: "/pwa-worker-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
              name: "My Shift History",
              short_name: "My Logs",
              description: "Inspect personal attendance records",
              url: "/?pwa=worker&tab=logs",
              icons: [{ src: "/pwa-worker-192.png", sizes: "192x192", type: "image/png" }],
            },
            {
              name: "Request Permission",
              short_name: "Permission",
              description: "Submit leave / exemption request",
              url: "/?pwa=worker&action=permission",
              icons: [{ src: "/pwa-worker-192.png", sizes: "192x192", type: "image/png" }],
            },
          ]
        : [],
  };

  // Set manifest link href to server-backed manifest URL so Chrome & WebAPK engines recognize it
  const manifestEndpoint = `/manifest.webmanifest?role=${role}&tenant=${encodeURIComponent(tenantName || "")}&worker=${encodeURIComponent(workerName || "")}&theme=${theme}`;
  let linkEl = document.querySelector<HTMLLinkElement>("#app-manifest");
  if (!linkEl) {
    linkEl = document.createElement("link");
    linkEl.id = "app-manifest";
    linkEl.rel = "manifest";
    document.head.appendChild(linkEl);
  }
  linkEl.href = manifestEndpoint;

  // Update theme-color and apple-mobile-web-app-title
  let themeColorMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColorMeta) {
    themeColorMeta = document.createElement("meta");
    themeColorMeta.name = "theme-color";
    document.head.appendChild(themeColorMeta);
  }
  themeColorMeta.content = themeColor;

  let appleTitleMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!appleTitleMeta) {
    appleTitleMeta = document.createElement("meta");
    appleTitleMeta.name = "apple-mobile-web-app-title";
    document.head.appendChild(appleTitleMeta);
  }
  appleTitleMeta.content = shortName;

  let appleCapableMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-capable"]');
  if (!appleCapableMeta) {
    appleCapableMeta = document.createElement("meta");
    appleCapableMeta.name = "apple-mobile-web-app-capable";
    appleCapableMeta.content = "yes";
    document.head.appendChild(appleCapableMeta);
  }

  let appleStatusMeta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!appleStatusMeta) {
    appleStatusMeta = document.createElement("meta");
    appleStatusMeta.name = "apple-mobile-web-app-status-bar-style";
    appleStatusMeta.content = "black-translucent";
    document.head.appendChild(appleStatusMeta);
  }

  // Update Apple touch icon with static PNG so iOS adds clean icon without browser badge
  let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!appleIcon) {
    appleIcon = document.createElement("link");
    appleIcon.rel = "apple-touch-icon";
    document.head.appendChild(appleIcon);
  }
  appleIcon.href = role === "admin" ? "/pwa-admin-192.png" : role === "worker" ? "/pwa-worker-192.png" : "/apple-touch-icon.png";

  // Update page title
  document.title = manifestName;
}
