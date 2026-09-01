import React from "react";
import { motion } from "motion/react";

interface AnimatedBellIconProps {
  className?: string;
  isHovered?: boolean;
}

export function AnimatedBellIcon({
  className = "h-4 w-4 text-cyan-400",
  isHovered: externalHovered,
}: AnimatedBellIconProps) {
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
      {/* Bell Body - Swings left to right, then stops at center */}
      <motion.g
        style={{ transformOrigin: "12px 3px" }}
        animate={
          hovered
            ? {
                rotate: [0, -24, 20, -14, 9, -4, 1.5, 0],
              }
            : { rotate: 0 }
        }
        transition={{
          duration: 1.1,
          ease: "easeOut",
        }}
      >
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      </motion.g>

      {/* Bell Clapper - Subtle counter-motion at bottom */}
      <motion.path
        d="M10.3 21a1.94 1.94 0 0 0 3.4 0"
        style={{ transformOrigin: "12px 19px" }}
        animate={
          hovered
            ? {
                x: [0, 2.5, -2, 1.2, -0.6, 0],
              }
            : { x: 0 }
        }
        transition={{
          duration: 1.1,
          ease: "easeOut",
        }}
      />
    </svg>
  );
}

export default AnimatedBellIcon;
