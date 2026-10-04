// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect, type ReactNode } from 'react';
import { localToday, useWardrobe, WardrobeProvider } from '@/lib/state/WardrobeProvider';
import { IndexedDbRepository } from '@/lib/storage/indexeddb';
import { TodayView } from '@/components/views/TodayView';
import { SavedView } from '@/components/views/SavedView';
import { DiaryView } from '@/components/views/DiaryView';
import { MissingView } from '@/components/views/MissingView';
import type { WardrobeRepository } from '@/lib/storage';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

let n = 0;
let repo: WardrobeRepository;

beforeEach(() => {
  repo = new IndexedDbRepository(`rack-ui-${++n}`);
  URL.createObjectURL = () => 'blob:test';
  URL.revokeObjectURL = () => undefined;
  localStorage.clear();
});

function AppShellBodyProbe() {
  return <p>{useWardrobe().status}</p>;
}

afterEach(cleanup);

const withRepo = (ui: ReactNode) => render(<WardrobeProvider repository={repo}>{ui}</WardrobeProvider>);

describe('main flow', () => {
  it('AC-4 → AC-5 → AC-14 → AC-15: load samples, see a look, save it, wear it', async () => {
    const user = userEvent.setup();
    const today = withRepo(<TodayView />);

    // Empty closet invites the sample wardrobe.
    await user.click(await screen.findByRole('button', { name: 'Load sample wardrobe' }));
    const hero = await screen.findByRole('heading', { level: 1, name: 'Look 01' }, { timeout: 5000 });
    expect(hero).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Why it works' })).toBeInTheDocument();

    // Occasions are radios; switching to Wedding guest still yields a look.
    await user.click(screen.getByRole('radio', { name: 'Wedding guest' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'Look 01' })).toBeInTheDocument();

    // Save (AC-14).
    const save = screen.getByRole('button', { name: 'Save look' });
    await user.click(save);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Saved' })).toHaveAttribute('aria-pressed', 'true'));
    expect(await repo.listFavorites()).toHaveLength(1);

    // Wear (AC-15) — the look leaves the list, and the diary has today's entry.
    await user.click(screen.getByRole('button', { name: 'Wore this today' }));
    await screen.findByText(/Logged in your diary/);
    const [entry] = await repo.listWearLog();
    expect(entry.occasion).toBe('wedding');
    today.unmount();

    withRepo(<DiaryView />);
    const diary = await screen.findByRole('list');
    expect(within(diary).getByText('Wedding guest')).toBeInTheDocument();
  });

  it('two overlapping Save toggles store the look once', async () => {
    const top = await repo.addItem({ kind: 'top', category: 'shirt', name: 'Navy oxford shirt', color: '#1f2a44', pattern: 'solid', formality: 3 }, new Blob());
    const bottom = await repo.addItem({ kind: 'bottom', category: 'chinos', name: 'Camel chinos', color: '#b7895a', pattern: 'solid', formality: 3 }, new Blob());
    const held: { api?: ReturnType<typeof useWardrobe> } = {};
    function Grab() {
      const api = useWardrobe();
      useEffect(() => {
        held.api = api;
      });
      return <p>{api.status}</p>;
    }
    withRepo(<Grab />);
    await screen.findByText('ready');
    const { toggleFavorite } = held.api!;
    await Promise.all([toggleFavorite(top.id, bottom.id), toggleFavorite(top.id, bottom.id)]);
    expect(await repo.listFavorites()).toHaveLength(1);
    await waitFor(() => expect(held.api!.favorites).toHaveLength(1));
  });

  it('EC-3: a storage failure on open shows a recoverable message instead of spinning', async () => {
    const broken = { ...repo, listItems: () => Promise.reject(new Error('disk')) } as unknown as WardrobeRepository;
    render(
      <WardrobeProvider repository={broken}>
        <AppShellBodyProbe />
      </WardrobeProvider>,
    );
    expect(await screen.findByText('error')).toBeInTheDocument();
  });

  it('AC-14: the Saved page lists favourites and removes them', async () => {
    const user = userEvent.setup();
    const top = await repo.addItem({ kind: 'top', category: 'shirt', name: 'Navy oxford shirt', color: '#1f2a44', pattern: 'solid', formality: 3 }, new Blob());
    const bottom = await repo.addItem({ kind: 'bottom', category: 'chinos', name: 'Camel chinos', color: '#b7895a', pattern: 'solid', formality: 3 }, new Blob());
    await repo.addFavorite(top.id, bottom.id);

    withRepo(<SavedView />);
    expect(await screen.findByText('Navy oxford shirt')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Remove Navy oxford shirt/ }));
    expect(await screen.findByText(/Looks you save appear here/)).toBeInTheDocument();
  });

  it('EC-7: a closet with only tops explains what is missing and the gap finder suggests a bottom', async () => {
    await repo.addItem({ kind: 'top', category: 'tee', name: 'White tee', color: '#f7f7f5', pattern: 'solid', formality: 1 }, new Blob());
    const view = withRepo(<TodayView />);
    expect(await screen.findByText('Add a bottom to start building looks.')).toBeInTheDocument();
    view.unmount();

    withRepo(<MissingView />);
    expect(await screen.findByText('If you buy one thing, make it')).toBeInTheDocument();
    expect(within(screen.getByText(/It would add/)).getByText('1 new outfit')).toBeInTheDocument();
  });

  it('AC-16: fetches the forecast once, then serves it from the cache', async () => {
    const body = {
      daily: { time: [localToday()], temperature_2m_max: [31], temperature_2m_min: [22], precipitation_probability_max: [10], weather_code: [0] },
    };
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await repo.saveSettings({ location: { name: 'Pune, Maharashtra, India', latitude: 18.52, longitude: 73.86 } });
    await repo.addItem({ kind: 'top', category: 'sweater', name: 'Rust sweater', color: '#a4502e', pattern: 'solid', formality: 2 }, new Blob());
    await repo.addItem({ kind: 'bottom', category: 'jeans', name: 'Blue jeans', color: '#4a6b93', pattern: 'solid', formality: 2 }, new Blob());

    const first = withRepo(<TodayView />);
    expect(await screen.findByText(/31° high, 22° low/)).toBeInTheDocument();
    expect(await screen.findByText(/Warm for a rust sweater today \(31°\)/)).toBeInTheDocument();
    await waitFor(() => expect(localStorage.getItem('rack:forecast')).toContain('18.52'));
    first.unmount();

    withRepo(<TodayView />);
    expect(await screen.findByText(/31° high/)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('AC-16: weather failure still shows looks, with a notice', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 500 })));
    await repo.saveSettings({ location: { name: 'Pune', latitude: 18.52, longitude: 73.86 } });
    await repo.addItem({ kind: 'top', category: 'shirt', name: 'Navy oxford shirt', color: '#1f2a44', pattern: 'solid', formality: 3 }, new Blob());
    await repo.addItem({ kind: 'bottom', category: 'chinos', name: 'Camel chinos', color: '#b7895a', pattern: 'solid', formality: 3 }, new Blob());

    withRepo(<TodayView />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Look 01' })).toBeInTheDocument();
    expect(await screen.findByText(/Looks below ignore the weather/)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
