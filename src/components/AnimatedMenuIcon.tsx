import React from "react";
import { motion } from "motion/react";

interface AnimatedMenuIconProps {
  className?: string;
  isHovered?: boolean;
}

export function AnimatedMenuIcon({
  className = "h-4 w-4 text-cyan-400",
  isHovered: externalHovered,
}: AnimatedMenuIconProps) {
  const [internalHovered, setInternalHovered] = React.useState(false);
  const hovered = externalHovered !== undefined ? externalHovered : internalHovered;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`overflow-visible transition-colors ${className}`}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
    >
      {/* 1. Top Dash (Draws first, full width: 16px) */}
      <motion.line
        x1="4"
        y1="6"
        x2="20"
        y2="6"
        initial={{ pathLength: 1, opacity: 1 }}
        animate={hovered ? { pathLength: [0, 1], opacity: [0.4, 1] } : { pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeInOut", delay: 0 }}
      />
      {/* 2. Middle Dash (Draws second, shorter width: 9px) */}
      <motion.line
        x1="4"
        y1="12"
        x2="13"
        y2="12"
        initial={{ pathLength: 1, opacity: 1 }}
        animate={hovered ? { pathLength: [0, 1], opacity: [0.4, 1] } : { pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeInOut", delay: 0.09 }}
      />
      {/* 3. Bottom Dash (Draws third, medium width: 13px) */}
      <motion.line
        x1="4"
        y1="18"
        x2="17"
        y2="18"
        initial={{ pathLength: 1, opacity: 1 }}
        animate={hovered ? { pathLength: [0, 1], opacity: [0.4, 1] } : { pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeInOut", delay: 0.18 }}
      />
    </svg>
  );
}

export default AnimatedMenuIcon;
