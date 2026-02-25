import type { ComponentType, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

// Chest - two pectoral curves
export function ChestIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4 10c0-3 3.5-5 8-5s8 2 8 5c0 2-2 4-4 5l-1 .5c-1 .5-2 .5-3 .5s-2 0-3-.5L8 15c-2-1-4-3-4-5z" opacity="0.85" />
      <line x1="12" y1="5" x2="12" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="none" />
    </svg>
  );
}

// Back - torso V-shape
export function BackIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6 4h2l1 6v8H7V10L6 4zm10 0h2l-1 6v8h-2V10l1-6z" opacity="0.6" />
      <path d="M8 4c1.5-.5 2.5-.5 4-.5s2.5 0 4 .5l-1 8h-6L8 4z" opacity="0.85" />
      <line x1="12" y1="3.5" x2="12" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.3" fill="none" />
    </svg>
  );
}

// Shoulders - boulder shoulder caps
export function ShouldersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <ellipse cx="6" cy="10" rx="4" ry="5" opacity="0.85" />
      <ellipse cx="18" cy="10" rx="4" ry="5" opacity="0.85" />
      <rect x="9" y="7" width="6" height="8" rx="1" opacity="0.4" />
    </svg>
  );
}

// Biceps - flexed arm
export function BicepsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 20V14c0-1 .5-2 1-3l2-3c.5-1 1.5-2 3-2h1c1 0 2 1 2.5 2l.5 1c.5 1.5 0 3-1 4l-2 2c-.5.5-1 2-1 3v2H7z" opacity="0.7" />
      <ellipse cx="14" cy="8" rx="3" ry="2.5" opacity="0.9" />
    </svg>
  );
}

// Triceps - back of arm
export function TricepsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 3h8v3c0 2-.5 4-1 6-.5 1.5-1 3-1 5v4H10v-4c0-2-.5-3.5-1-5-.5-2-1-4-1-6V3z" opacity="0.85" />
      <rect x="10" y="8" width="4" height="5" rx="2" opacity="0.5" />
    </svg>
  );
}

// Quads - front thigh
export function QuadsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 2h4v0c0 3-.5 8-1 12-.5 3-.5 5 0 8H7c-.5-3-1-5-1-8 0-4 .5-9 1-12z" opacity="0.85" />
      <path d="M13 2h4c.5 3 1 8 1 12 0 3-.5 5-1 8h-3c.5-3 .5-5 0-8-.5-4-1-9-1-12z" opacity="0.85" />
    </svg>
  );
}

// Hamstrings - back thigh
export function HamstringsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 2h4c0 3-.3 8-.8 12-.3 3-.2 5 .3 8H7c-.3-3-.5-5-.5-8 0-4 .2-9 .5-12z" opacity="0.7" />
      <path d="M13 2h4c.3 3 .5 8 .5 12 0 3-.2 5-.5 8h-3.5c.5-3 .6-5 .3-8-.5-4-.8-9-.8-12z" opacity="0.7" />
      <ellipse cx="9" cy="9" rx="1.5" ry="3" opacity="0.3" />
      <ellipse cx="15" cy="9" rx="1.5" ry="3" opacity="0.3" />
    </svg>
  );
}

// Glutes - round shape
export function GlutesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <ellipse cx="8.5" cy="12" rx="5.5" ry="6" opacity="0.85" />
      <ellipse cx="15.5" cy="12" rx="5.5" ry="6" opacity="0.85" />
    </svg>
  );
}

// Calves - diamond calf shape
export function CalvesIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 2c-.5 2-1.5 4-1.5 7 0 2 .5 3.5 1 5 .3 1 .5 3 .5 5v3h2v-3c0-2 .2-4 .5-5 .5-1.5 1-3 1-5 0-3-1-5-1.5-7H8z" opacity="0.85" />
      <path d="M14 2c-.5 2-1.5 4-1.5 7 0 2 .5 3.5 1 5 .3 1 .5 3 .5 5v3h2v-3c0-2 .2-4 .5-5 .5-1.5 1-3 1-5 0-3-1-5-1.5-7h-2z" opacity="0.85" />
    </svg>
  );
}

// Abs - six-pack grid (bold, clear)
export function AbsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <rect x="5" y="3" width="5.5" height="4" rx="1" opacity="0.85" />
      <rect x="13.5" y="3" width="5.5" height="4" rx="1" opacity="0.85" />
      <rect x="5" y="9" width="5.5" height="4" rx="1" opacity="0.85" />
      <rect x="13.5" y="9" width="5.5" height="4" rx="1" opacity="0.85" />
      <rect x="5" y="15" width="5.5" height="4" rx="1" opacity="0.7" />
      <rect x="13.5" y="15" width="5.5" height="4" rx="1" opacity="0.7" />
    </svg>
  );
}

// Forearms - lower arm shape
export function ForearmsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 2c-1 3-2 7-2 11s.5 5.5 1 7l1 2h2l-1-2c-.5-1.5-1-3.5-1-7 0-4 1-8 2-11H8z" opacity="0.85" />
      <path d="M15 2c1 3 2 7 2 11s-.5 5.5-1 7l-1 2h-2l1-2c.5-1.5 1-3.5 1-7 0-4-1-8-2-11h3z" opacity="0.6" />
    </svg>
  );
}

// Traps - diamond/trapezoid shape
export function TrapsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2L4 8l2 6h12l2-6L12 2z" opacity="0.85" />
      <circle cx="12" cy="7" r="2" opacity="0.4" />
    </svg>
  );
}

// Map muscle group IDs to icon components
export const MUSCLE_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  'mg-chest': ChestIcon,
  'mg-back': BackIcon,
  'mg-shoulders': ShouldersIcon,
  'mg-biceps': BicepsIcon,
  'mg-triceps': TricepsIcon,
  'mg-quads': QuadsIcon,
  'mg-hamstrings': HamstringsIcon,
  'mg-glutes': GlutesIcon,
  'mg-calves': CalvesIcon,
  'mg-abs': AbsIcon,
  'mg-forearms': ForearmsIcon,
  'mg-traps': TrapsIcon,
};

export function MuscleIcon({ muscleGroupId, ...props }: IconProps & { muscleGroupId: string }) {
  const Icon = MUSCLE_ICON_MAP[muscleGroupId];
  if (!Icon) return null;
  return <Icon {...props} />;
}
