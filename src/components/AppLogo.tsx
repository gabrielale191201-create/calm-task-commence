import React from 'react';

interface AppLogoProps {
  size?: number;
  variant?: 'default' | 'white';
}

export const AppLogo: React.FC<AppLogoProps> = ({ size = 32, variant = 'default' }) => {
  const bgColor = variant === 'white' ? '#ffffff' : '#4aba82';
  const fgColor = variant === 'white' ? '#4aba82' : '#ffffff';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Focus On"
    >
      <rect x="0" y="0" width="100" height="100" rx="22" fill={bgColor} />
      <g transform="translate(50, 52)">
        <circle cx="0" cy="0" r="32" fill="none" stroke={fgColor} strokeWidth="2" opacity="0.3" />
        <path d="M 0 -18 L 0 2" fill="none" stroke={fgColor} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M -13 -7 A 16 16 0 1 0 13 -7" fill="none" stroke={fgColor} strokeWidth="4.5" strokeLinecap="round" />
      </g>
    </svg>
  );
};
