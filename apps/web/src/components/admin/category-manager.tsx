'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { CATEGORY_DEFAULT_COLOR, CATEGORY_TILE_COLORS, type AdminCategory } from '@vidntec/shared';
import {
  createCategoryAction,
  deleteCategoryAction,
  reorderCategoriesAction,
  updateCategoryAction,
} from '@/lib/actions/categories';
import { Card, CardBody } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { toast } from '@/components/ui/toast';

/** Header + every row share ONE grid so the columns line up. */
const GRID_COLS = '1.25rem minmax(7rem,1fr) 3.5rem 2.75rem 3.5rem max-content';

function ColorSwatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {CATEGORY_TILE_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`Use ${c}`}
          onClick={() => onChange(c)}
          className={`h-6 w-6 rounded-full border ${
            value === c ? 'border-ink ring-2 ring-brand-200' : 'border-paper-line'
          }`}
          style={{ backgroundColor: c }}
        />
      ))}
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-8 cursor-pointer rounded border border-paper-line bg-white p-0.5"
      />
    </div>
  );
}

function CategoryRow({
  category,
  first,
  last,
  disabled,
  onMove,
}: {
  category: AdminCategory;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onMove: (dir: -1 | 1) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(category.name);
  const [emoji, setEmoji] = useState(category.emoji ?? '');
  const [color, setColor] = useState(category.color);

  const dirty =
    name.trim() !== category.name ||
    emoji.trim() !== (category.emoji ?? '') ||
    color !== category.color;

  const busy = pending || disabled;
  const dim = busy ? 'opacity-60' : '';

  const save = () => {
    if (!name.trim()) return toast('Name is required', 'error');
    start(async () => {
      const res = await updateCategoryAction(category.id, {
        name: name.trim(),
        emoji: emoji.trim() || null,
        color,
      });
      if (res.ok) {
        toast('Category saved');
        router.refresh();
      } else toast(res.error, 'error');
    });
  };

  // `display: contents` — the wrapper vanishes and its children become grid items.
  return (
    <div style={{ display: 'contents' }}>
      <div className={`flex flex-col items-center ${dim}`}>
        <button
          type="button"
          aria-label="Move up"
          disabled={first || busy}
          onClick={() => onMove(-1)}
          className="leading-none text-ink-muted hover:text-ink disabled:opacity-25"
        >
          ▲
        </button>
        <button
          type="button"
          aria-label="Move down"
          disabled={last || busy}
          onClick={() => onMove(1)}
          className="leading-none text-ink-muted hover:text-ink disabled:opacity-25"
        >
          ▼
        </button>
      </div>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={dim}
      />
      <Input
        value={emoji}
        maxLength={4}
        placeholder="🏷️"
        onChange={(e) => setEmoji(e.target.value)}
        className={`px-1 text-center ${dim}`}
      />
      <span
        className={`flex h-9 items-center justify-center rounded-card text-xs font-semibold text-ink ${dim}`}
        style={{ backgroundColor: color }}
        title={color}
      >
        {emoji || 'Aa'}
      </span>
      <span
        className={`text-center text-sm text-ink-soft ${dim}`}
        title="Assigned products"
      >
        {category.productCount}
      </span>
      <div className={`flex items-center justify-end gap-1 ${dim}`}>
        <Button size="sm" onClick={save} disabled={busy || !dirty}>
          Save
        </Button>
        <ConfirmButton
          message={`Delete “${category.name}”?`}
          confirmLabel="Delete"
          successMessage="Category deleted"
          action={async () => {
            const res = await deleteCategoryAction(category.id);
            if (res.ok) router.refresh();
            return res;
          }}
        >
          ✕
        </ConfirmButton>
      </div>
      <div className="col-span-full -mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 pl-[1.25rem]">
        <ColorSwatches value={color} onChange={setColor} />
        {category.productCount > 0 ? (
          <span className="text-[11px] text-ink-faint">
            Deleting moves {category.productCount} product
            {category.productCount === 1 ? '' : 's'} to “no category”.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function AddCategory() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_DEFAULT_COLOR);

  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        + Add category
      </Button>
    );
  }

  const reset = () => {
    setOpen(false);
    setName('');
    setEmoji('');
    setColor(CATEGORY_DEFAULT_COLOR);
  };

  const add = () => {
    if (!name.trim()) return toast('Name is required', 'error');
    start(async () => {
      const res = await createCategoryAction({
        name: name.trim(),
        emoji: emoji.trim() || null,
        color,
      });
      if (res.ok) {
        toast('Category added');
        reset();
        router.refresh();
      } else toast(res.error, 'error');
    });
  };

  return (
    <div className="space-y-2 rounded-card bg-paper-sunken p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-48"
        />
        <Input
          placeholder="🏷️"
          value={emoji}
          maxLength={4}
          onChange={(e) => setEmoji(e.target.value)}
          className="w-16 text-center"
        />
        <ColorSwatches value={color} onChange={setColor} />
      </div>
      <div className="flex gap-1">
        <Button size="sm" onClick={add} disabled={pending}>
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const move = (id: string, dir: -1 | 1) => {
    const ids = categories.map((c) => c.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
    start(async () => {
      const res = await reorderCategoriesAction(ids);
      if (res.ok) router.refresh();
      else toast(res.error, 'error');
    });
  };

  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[36rem] items-center gap-x-2 gap-y-2.5"
            style={{ gridTemplateColumns: GRID_COLS }}
          >
            {/* header */}
            <span />
            <span className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
              Name
            </span>
            <span className="text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
              Icon
            </span>
            <span className="text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
              Tile
            </span>
            <span className="text-center text-xs font-medium uppercase tracking-wide text-ink-muted">
              Items
            </span>
            <span />

            {categories.length === 0 ? (
              <p className="col-span-full py-2 text-xs text-ink-muted">
                No categories yet. Add one below.
              </p>
            ) : (
              categories.map((c, i) => (
                <CategoryRow
                  key={c.id}
                  category={c}
                  first={i === 0}
                  last={i === categories.length - 1}
                  disabled={pending}
                  onMove={(dir) => move(c.id, dir)}
                />
              ))
            )}
          </div>
        </div>
        <AddCategory />
        <p className="text-xs text-ink-muted">
          Categories with no live products are hidden from the storefront. Deleting a
          category never deletes its products — they just become uncategorized.
        </p>
      </CardBody>
    </Card>
  );
}
