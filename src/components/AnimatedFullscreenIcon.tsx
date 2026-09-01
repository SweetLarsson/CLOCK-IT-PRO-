import React from "react";
import { motion } from "motion/react";

interface AnimatedFullscreenIconProps {
  isFullscreen?: boolean;
  className?: string;
  isHovered?: boolean;
}

export function AnimatedFullscreenIcon({
  isFullscreen = false,
  className = "h-4 w-4 text-cyan-400",
  isHovered: externalHovered,
}: AnimatedFullscreenIconProps) {
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
      {!isFullscreen ? (
        // Enter Fullscreen Icon (Maximize brackets) that fizzles into Exit Fullscreen Icon over 1.0 second on hover
        <motion.g
          animate={
            hovered
              ? {
                  opacity: [1, 0.2, 0.85, 0.15, 0.9, 0.1, 1],
                  scale: [1, 1.15, 0.92, 1.08, 0.95, 1],
                }
              : { opacity: 1, scale: 1 }
          }
          transition={{
            duration: 1.0,
            ease: "easeInOut",
          }}
        >
          {/* Top Left Bracket */}
          <motion.path
            d={hovered ? "M4 14h6m0 0v6" : "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"}
            animate={
              hovered
                ? {
                    d: [
                      "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
                      "M9 4H4v5m11-5h5v5m0 6v5h-5M4 15v5h5",
                      "M4 14h6m0 0v6m10-6h-6m0 0v6M14 4v6m0 0h6M4 10h6m0 0V4",
                    ],
                  }
                : {}
            }
            transition={{
              duration: 1.0,
              ease: "easeInOut",
            }}
          />
          {/* Fizzle sparkle particles that burst during the 1-second transition */}
          {hovered && (
            <>
              <motion.circle
                cx="6"
                cy="6"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [-2, 2], y: [-2, 2] }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
              <motion.circle
                cx="18"
                cy="6"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [2, -2], y: [-2, 2] }}
                transition={{ duration: 0.5, delay: 0.35 }}
              />
              <motion.circle
                cx="6"
                cy="18"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [-2, 2], y: [2, -2] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
              <motion.circle
                cx="18"
                cy="18"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: [2, -2], y: [2, -2] }}
                transition={{ duration: 0.5, delay: 0.65 }}
              />
            </>
          )}
        </motion.g>
      ) : (
        // Exit Fullscreen Icon (Minimize brackets) that fizzles back smoothly over 1.0 second on hover
        <motion.g
          animate={
            hovered
              ? {
                  opacity: [1, 0.2, 0.85, 0.15, 0.9, 0.1, 1],
                  scale: [1, 0.9, 1.1, 0.95, 1],
                }
              : { opacity: 1, scale: 1 }
          }
          transition={{
            duration: 1.0,
            ease: "easeInOut",
          }}
        >
          <path d="M4 14h6m0 0v6m10-6h-6m0 0v6M14 4v6m0 0h6M4 10h6m0 0V4" />
          {hovered && (
            <>
              <motion.circle
                cx="10"
                cy="10"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
              />
              <motion.circle
                cx="14"
                cy="14"
                r="1"
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
                transition={{ duration: 0.5, delay: 0.5 }}
              />
            </>
          )}
        </motion.g>
      )}
    </svg>
  );
}

export default AnimatedFullscreenIcon;
