import type { Note } from '@/lib/engine';

/** The "why it works" swing tag next to the hero look. */
export function HangTag({ notes, title = 'Why it works' }: { notes: Note[]; title?: string }) {
  return (
    <aside className="hangtag w-full max-w-[19rem]" aria-label={title}>
      <h2 className="wide text-lg font-bold">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-[0.95rem] leading-snug">
        {notes.map((n) => (
          <li key={n.text} className="flex gap-2">
            <span aria-hidden="true" className="font-bold">
              {n.tone === 'plus' ? '+' : '–'}
            </span>
            <span>
              <span className="sr-only">{n.tone === 'plus' ? 'Works: ' : 'Watch out: '}</span>
              {n.text}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
