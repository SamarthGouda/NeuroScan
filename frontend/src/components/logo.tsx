import React from "react";
import { Link } from "wouter";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "full" | "icon";
  href?: string;
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
}

export function Logo({
  size = "md",
  variant = "full",
  href,
  className = "",
  showBadge = false,
  badgeText = "v3.0 CLINICAL",
}: LogoProps) {
  // Height sizing
  const heightClasses = {
    sm: "h-7",
    md: "h-9 sm:h-10",
    lg: "h-11 sm:h-12",
    xl: "h-14 sm:h-16",
  }[size];

  const iconSizes = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-11 w-11",
    xl: "h-14 w-14",
  }[size];

  const content = (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {variant === "icon" ? (
        <div className={`relative ${iconSizes} flex items-center justify-center shrink-0`}>
          <img
            src="/logo-icon.png"
            alt="NeuroScan Mark"
            className="w-full h-full object-contain filter drop-shadow-sm"
          />
        </div>
      ) : (
        <div className={`relative flex items-center shrink-0`}>
          {/* Light mode logo */}
          <img
            src="/logo-transparent.png"
            alt="NeuroScan AI"
            className={`${heightClasses} w-auto object-contain dark:hidden filter drop-shadow-sm`}
          />
          {/* Dark mode logo */}
          <img
            src="/logo-dark.png"
            alt="NeuroScan AI"
            className={`${heightClasses} w-auto object-contain hidden dark:block filter drop-shadow-sm`}
          />
        </div>
      )}

      {showBadge && (
        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
          {badgeText}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
