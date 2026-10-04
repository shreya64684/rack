'use client';

import { OCCASIONS } from '@/lib/domain/catalog';
import type { OccasionId } from '@/lib/domain/types';
import { PillRadio } from './PillRadio';

export function OccasionPicker({ value, onChange }: { value: OccasionId; onChange: (o: OccasionId) => void }) {
  return (
    <fieldset className="flex flex-wrap items-center gap-2">
      <legend className="mb-2 w-full text-sm font-semibold text-muted sm:float-left sm:mr-3 sm:mb-0 sm:w-auto">
        Dressing for
      </legend>
      {OCCASIONS.map((o) => (
        <PillRadio key={o.id} name="occasion" checked={value === o.id} onChange={() => onChange(o.id)} className="min-h-[40px] text-sm">
          {o.label}
        </PillRadio>
      ))}
    </fieldset>
  );
}
