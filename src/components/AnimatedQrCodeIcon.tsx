import React from "react";
import { motion } from "motion/react";

interface AnimatedQrCodeIconProps {
  className?: string;
  isHovered?: boolean;
}

export function AnimatedQrCodeIcon({
  className = "h-4 w-4 text-cyan-400",
  isHovered: externalHovered,
}: AnimatedQrCodeIconProps) {
  const [internalHovered, setInternalHovered] = React.useState(false);
  const hovered = externalHovered !== undefined ? externalHovered : internalHovered;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`overflow-visible transition-colors ${className}`}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
    >
      {/* QR Code Elements that disappear in a fade effect on hover */}
      <motion.g
        animate={
          hovered
            ? {
                opacity: [1, 0.1, 0.1, 1],
              }
            : { opacity: 1 }
        }
        transition={{
          duration: 1.2,
          times: [0, 0.25, 0.75, 1],
          ease: "easeInOut",
        }}
      >
        {/* Top-Left Finder Box */}
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="5" y="5" width="2" height="2" fill="currentColor" />

        {/* Top-Right Finder Box */}
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="17" y="5" width="2" height="2" fill="currentColor" />

        {/* Bottom-Left Finder Box */}
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="5" y="17" width="2" height="2" fill="currentColor" />

        {/* Inner Data Pattern Modules */}
        <path d="M15 15h2v2h-2z" fill="currentColor" />
        <path d="M19 15h2v2h-2z" fill="currentColor" />
        <path d="M15 19h2v2h-2z" fill="currentColor" />
        <path d="M19 19h2v2h-2z" fill="currentColor" />
        <path d="M11 5h2v4h-2z" fill="currentColor" />
        <path d="M5 11h4v2H5z" fill="currentColor" />
        <path d="M11 15h2v4h-2z" fill="currentColor" />
        <path d="M15 11h4v2h-4z" fill="currentColor" />
      </motion.g>

      {/* Laser Scan Line that screens from top to bottom */}
      <motion.line
        x1="2"
        y1="3"
        x2="22"
        y2="3"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ y: 0, opacity: 0 }}
        animate={
          hovered
            ? {
                y: [0, 18],
                opacity: [0, 1, 1, 0],
              }
            : { y: 0, opacity: 0 }
        }
        transition={{
          duration: 1.2,
          ease: "easeInOut",
        }}
      />

      {/* Laser Scan Glow Effect */}
      <motion.line
        x1="4"
        y1="3"
        x2="20"
        y2="3"
        stroke="currentColor"
        strokeWidth="5"
        strokeOpacity="0.4"
        strokeLinecap="round"
        initial={{ y: 0, opacity: 0 }}
        animate={
          hovered
            ? {
                y: [0, 18],
                opacity: [0, 0.6, 0.6, 0],
              }
            : { y: 0, opacity: 0 }
        }
        transition={{
          duration: 1.2,
          ease: "easeInOut",
        }}
      />
    </svg>
  );
}

export default AnimatedQrCodeIcon;
