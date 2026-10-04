'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { nameColor } from '@/lib/color/color';
import { ImageDecodeError, processPhoto } from '@/lib/color/browser';
import { CATEGORIES, categoriesFor, defaultsFor, FORMALITY_LABELS, PATTERNS } from '@/lib/domain/catalog';
import { autoName, cleanName } from '@/lib/domain/naming';
import type { Category, Formality, Item, Kind, Pattern } from '@/lib/domain/types';
import { RepositoryError } from '@/lib/storage';
import { useWardrobe } from '@/lib/state/WardrobeProvider';
import { Photo } from './Photo';
import { PillRadio } from './PillRadio';

interface ItemEditorProps {
  /** Present when editing; absent when adding. */
  item?: Item | null;
  defaultKind?: Kind;
  open: boolean;
  onClose: () => void;
}

interface Draft {
  kind: Kind;
  category: Category;
  pattern: Pattern;
  formality: Formality;
  color: string;
  name: string;
}

const draftFrom = (item: Item | null | undefined, kind: Kind): Draft =>
  item
    ? { kind: item.kind, category: item.category, pattern: item.pattern, formality: item.formality, color: item.color, name: item.name }
    : { kind, ...defaultsFor(kind), pattern: 'solid', color: '#8e9095', name: '' };

export function ItemEditor({ item, defaultKind = 'top', open, onClose }: ItemEditorProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const ids = useId();
  const { addItem, updateItem, deleteItem } = useWardrobe();
  const [draft, setDraft] = useState<Draft>(() => draftFrom(item, defaultKind));
  const [photo, setPhoto] = useState<{ blob: Blob; url: string; detected: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setDraft(draftFrom(item, defaultKind));
      setPhoto(null);
      setError(null);
      setConfirmDelete(false);
      dialog.showModal();
    } else if (!open && dialog.open) dialog.close();
  }, [open, item, defaultKind]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function setKind(kind: Kind) {
    setDraft((d) => ({ ...d, kind, ...defaultsFor(kind) }));
  }

  function setCategory(category: Category) {
    setDraft((d) => ({ ...d, category, formality: item ? d.formality : CATEGORIES[category].defaultFormality }));
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      const { photo: blob, color } = await processPhoto(file);
      setPhoto({ blob, url: URL.createObjectURL(blob), detected: color });
      set('color', color);
    } catch (err) {
      setError(err instanceof ImageDecodeError ? err.message : "This photo couldn't be read.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!item && !photo) {
      setError('Add a photo first.');
      return;
    }
    setBusy(true);
    setError(null);
    const values = { ...draft, name: cleanName(draft.name, draft.color, draft.category) };
    try {
      if (item) await updateItem(item.id, values);
      else await addItem(values, photo!.blob);
      onClose();
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Saving failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!item) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteItem(item.id);
      onClose();
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Deleting failed. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const title = item ? `Edit ${item.name}` : 'Add a piece';
  const placeholder = autoName(draft.color, draft.category);

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${ids}-title`}
      onClose={onClose}
      className="m-auto w-[min(100vw-1rem,52rem)] max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md bg-calico p-0 text-ink"
    >
      <form onSubmit={submit} className="grid gap-6 p-5 sm:p-8 md:grid-cols-[16rem_1fr]">
        <div className="md:col-span-2 flex items-start justify-between gap-4">
          <h2 id={`${ids}-title`} className="display text-4xl">
            {title}
          </h2>
          <button type="button" className="btn btn-line shrink-0" onClick={onClose}>
            Close
          </button>
        </div>

        <div>
          {item ? (
            <Photo item={item} className="aspect-[5/6] w-full" />
          ) : photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview
            <img src={photo.url} alt="Your photo" className="aspect-[5/6] w-full bg-mat object-contain" />
          ) : (
            <div className="grid aspect-[5/3] w-full place-items-center border-2 border-dashed border-seam p-4 text-center text-muted md:aspect-[5/6]">
              Lay the piece flat or hang it against a plain background.
            </div>
          )}
          {!item && (
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="relative">
                <input
                  type="file"
                  accept="image/*"
                  className="peer sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <span className="btn btn-solid cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  {photo ? 'Choose another' : 'Choose photo'}
                </span>
              </label>
              <label className="relative">
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="peer sr-only"
                  onChange={(e) => onFile(e.target.files?.[0])}
                />
                <span className="btn btn-line cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink">
                  Take photo
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="grid content-start gap-5">
          {!item && (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">This is a</legend>
              <div className="flex gap-2">
                {(['top', 'bottom'] as Kind[]).map((k) => (
                  <PillRadio key={k} name="kind" checked={draft.kind === k} onChange={() => setKind(k)} className="px-5 capitalize">
                    {k}
                  </PillRadio>
                ))}
              </div>
            </fieldset>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-cat`} className="label">
                Type
              </label>
              <select
                id={`${ids}-cat`}
                className="field"
                value={draft.category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {categoriesFor(draft.kind).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIES[c].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor={`${ids}-pat`} className="label">
                Pattern
              </label>
              <select
                id={`${ids}-pat`}
                className="field"
                value={draft.pattern}
                onChange={(e) => set('pattern', e.target.value as Pattern)}
              >
                {(Object.keys(PATTERNS) as Pattern[]).map((p) => (
                  <option key={p} value={p}>
                    {PATTERNS[p].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold">How dressy</legend>
            <div className="grid grid-cols-5 overflow-hidden rounded border-2 border-ink">
              {([1, 2, 3, 4, 5] as Formality[]).map((f) => (
                <label key={f} className="relative border-l-2 border-ink first:border-l-0">
                  <input
                    type="radio"
                    name="formality"
                    checked={draft.formality === f}
                    onChange={() => set('formality', f)}
                    className="peer absolute inset-0 opacity-0"
                  />
                  <span className="flex min-h-[52px] items-center justify-center px-1 text-center text-xs font-semibold leading-tight peer-checked:bg-chalk peer-focus-visible:outline-3 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-ink sm:text-sm">
                    {FORMALITY_LABELS[f]}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label htmlFor={`${ids}-color`} className="label">
                Colour
              </label>
              <input
                id={`${ids}-color`}
                type="color"
                value={draft.color}
                onChange={(e) => set('color', e.target.value)}
                className="h-11 w-20 cursor-pointer rounded border-[1.5px] border-seam bg-mat p-1"
              />
            </div>
            <p className="pb-2 text-sm" aria-live="polite">
              <span className="font-semibold">{nameColor(draft.color)}</span>
              {photo && photo.detected === draft.color && <span className="text-muted">, read from your photo</span>}
            </p>
          </div>

          <div>
            <label htmlFor={`${ids}-name`} className="label">
              Name <span className="font-normal text-muted">(optional)</span>
            </label>
            <input
              id={`${ids}-name`}
              className="field"
              maxLength={60}
              value={draft.name}
              placeholder={placeholder}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>

          <p role="alert" aria-live="assertive" className="min-h-[1.5rem] text-sm font-semibold text-alert">
            {error}
          </p>

          <div className="flex flex-wrap gap-2">
            <button className="btn btn-solid" disabled={busy}>
              {busy ? 'Working…' : item ? 'Save changes' : 'Add to closet'}
            </button>
            {item && (
              <button type="button" className="btn btn-line" onClick={remove} disabled={busy}>
                {confirmDelete ? 'Yes, delete it' : 'Delete piece'}
              </button>
            )}
          </div>
          {confirmDelete && (
            <p className="text-sm text-muted">Deleting removes it from saved looks. Diary entries stay.</p>
          )}
        </div>
      </form>
    </dialog>
  );
}
