/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Centered platform asset registry for images, fonts, and media files.
 * Provides a great architectural schematic by avoiding random, scattered hardcoded URLs.
 */

export const IMAGES = {
  // Default User & Admin avatar as clean, dedicated vector icon SVG assets
  defaultAdminAvatar: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMTcxNzE3Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSI0MiIgcj0iMTgiIGZpbGw9IiM2MzY2RjEiLz48cGF0aCBkPSJNMjIgODAgQyAyMiA2MiwgNzggNjIsIDc4IDgwIiBmaWxsPSIjNjM2NkYxIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzI2MjYyNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
  defaultWorkerAvatar: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgcng9IjIwIiBmaWxsPSIjMTcxNzE3Ii8+PGNpcmNsZSBjeD0iNTAiIGN5PSI0MiIgcj0iMTgiIGZpbGw9IiMwNkI2RDQiLz48cGF0aCBkPSJNMjIgODAgQyAyMiA2MiwgNzggNjIsIDc4IDgwIiBmaWxsPSIjMDZCNkRDIi8+PGNpcmNsZSBjeD0iNTAiIGN5PSI1MCIgcj0iNDQiIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzI2MjYyNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+",
};

export const FONTS = {
  // Brand font style properties and loading schemes
  primaryFamily: "Montserrat",
  fallbackFamily: "sans-serif",
  googleFontsStylesheet: "https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap",
};

export const VIDEOS = {
  // Interactive platform walkthroughs or training resources
  productTour: "https://www.w3schools.com/html/mov_bbb.mp4", // Centralized platform placeholder tutorial video
};

export const LANGUAGES = [
  { code: "en", name: "English (US)", locale: "en-US", flag: "🇺🇸" },
  { code: "fr", name: "Français", locale: "fr-FR", flag: "🇫🇷" },
  { code: "es", name: "Español", locale: "es-ES", flag: "🇪🇸" }
];

export const LIBRARIES = {
  visualization: "D3.js",
  charts: "Recharts",
  animation: "Motion (motion/react)",
  styling: "Tailwind CSS",
  routing: "Vite SPA routing / Express API Proxy"
};

export const PACKAGES = [
  { name: "@google/genai", type: "Core AI", description: "Google GenAI TypeScript SDK integration" },
  { name: "react", type: "Frontend Library", description: "Reactive view and interface layer elements" },
  { name: "express", type: "Backend Server", description: "Multi-tenant API and router proxy framework" },
  { name: "lucide-react", type: "Design System", description: "Centralized clean vector display icon sets" },
  { name: "motion", type: "Animate Engine", description: "Fluid route, modal, and drawer transitions" },
  { name: "qrcode", type: "Credential Tool", description: "Network-synchronized QR-code generator engine" }
];
