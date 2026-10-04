'use client';

import Link from 'next/link';
import { occasionById } from '@/lib/domain/catalog';
import type { WearEntry } from '@/lib/domain/types';
import { useWardrobe } from '@/lib/state/WardrobeProvider';
import { LookStack } from '../LookStack';

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const weekdayFmt = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });
const asDate = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

function groupByMonth(entries: WearEntry[]): [string, WearEntry[]][] {
  const groups = new Map<string, WearEntry[]>();
  for (const e of entries) {
    const key = e.date.slice(0, 7);
    const group = groups.get(key);
    if (group) group.push(e);
    else groups.set(key, [e]);
  }
  return [...groups.entries()];
}

export function DiaryView() {
  const { wearLog, itemById, deleteWear } = useWardrobe();

  return (
    <div className="pt-4">
      <h1 className="display page-title">Diary</h1>
      <p className="mt-3 max-w-[52ch] text-muted">
        What you wore and when. Rack skips any exact look from the last two weeks, and goes easy on pieces you wore in
        the last two days.
      </p>
      {wearLog.length === 0 ? (
        <div className="py-8">
          <p className="text-lg">Nothing logged yet. Press “Wore this today” on a look to start your diary.</p>
          <Link href="/" className="btn btn-solid mt-6">
            Pick today&apos;s look
          </Link>
        </div>
      ) : (
        groupByMonth(wearLog).map(([month, entries]) => (
          <section key={month} aria-labelledby={`m-${month}`} className="mt-10">
            <h2 id={`m-${month}`} className="wide border-b-2 border-ink pb-2 text-2xl font-bold">
              {monthFmt.format(asDate(`${month}-01`))}
            </h2>
            <ol>
              {entries.map((entry) => {
                const top = entry.topId ? itemById.get(entry.topId) : null;
                const bottom = entry.bottomId ? itemById.get(entry.bottomId) : null;
                const d = asDate(entry.date);
                return (
                  <li key={entry.id} className="grid grid-cols-[4.5rem_4rem_1fr] items-center gap-4 border-b border-thread py-4 sm:grid-cols-[6rem_4rem_1fr_auto]">
                    <p>
                      <span className="display block text-5xl">{String(d.getUTCDate()).padStart(2, '0')}</span>
                      <span className="text-sm text-muted">{weekdayFmt.format(d)}</span>
                    </p>
                    <LookStack top={top} bottom={bottom} size="thumb" />
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug">{top?.name ?? 'Top (item removed)'}</p>
                      <p className="leading-snug">{bottom?.name ?? 'Bottom (item removed)'}</p>
                      <p className="mt-1 text-sm text-muted">{occasionById(entry.occasion).label}</p>
                    </div>
                    <button
                      type="button"
                      className="link-btn col-start-3 justify-self-start text-sm sm:col-start-auto"
                      aria-label={`Delete diary entry for ${entry.date}`}
                      onClick={() => deleteWear(entry.id)}
                    >
                      Delete
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  );
}
