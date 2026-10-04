import type { ReactNode } from 'react';

interface PillRadioProps {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: ReactNode;
  className?: string;
}

/** A native radio dressed as a pill: arrow keys, labels and screen readers work for free. */
export function PillRadio({ name, checked, onChange, children, className = '' }: PillRadioProps) {
  return (
    <label className="relative">
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className="peer absolute inset-0 cursor-pointer opacity-0"
      />
      <span className={`pill ${className}`}>{children}</span>
    </label>
  );
}
