'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { listBlogCategories } from '@/services/blog.service';
import type { BlogCategory } from '@/types/blog';

/**
 * Category field: pick a category already used by other blogs, or just type a new one.
 * The value is always plain text (typing never requires picking from the list).
 */
export function CategoryCombobox({ value, onChange, error, label = 'Category', maxLength = 100 }: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  label?: string;
  maxLength?: number;
}) {
  const listId = useId();
  const inputId = useId();
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    listBlogCategories()
      .then((items) => {
        // Only trust a well-formed list; anything else just means "no suggestions".
        const valid = Array.isArray(items) ? items.filter((item) => item && typeof item.name === 'string' && item.name.trim()) : [];
        if (active) setCategories(valid);
      })
      .catch(() => { /* suggestions are optional: typing a category still works without them */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const typed = value.trim();
  const query = typed.toLowerCase();
  const matches = useMemo(
    () => categories.filter((category) => !query || category.name.toLowerCase().includes(query)),
    [categories, query]
  );
  const exact = categories.some((category) => category.name.toLowerCase() === query);
  const canCreate = typed.length > 0 && !exact;
  // Row order: matching existing categories first, then the "create" row.
  const rowCount = matches.length + (canCreate ? 1 : 0);

  const choose = (name: string) => {
    onChange(name);
    setOpen(false);
    setActiveIndex(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') { setOpen(false); return; }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (rowCount === 0 ? -1 : (index + 1) % rowCount));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((index) => (rowCount === 0 ? -1 : (index <= 0 ? rowCount - 1 : index - 1)));
    } else if (event.key === 'Enter' && open && activeIndex >= 0) {
      event.preventDefault();
      if (activeIndex < matches.length) choose(matches[activeIndex]!.name);
      else choose(typed);
    }
  };

  const showList = open && rowCount > 0;

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        id={inputId}
        label={label}
        value={value}
        maxLength={maxLength}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off"
        placeholder="Select an existing category or type a new one"
        helperText={categories.length > 0 ? 'Pick an existing category or type a new one.' : 'Type a category name.'}
        error={error}
        rightIcon={<ChevronDown size={16} className="text-slate-400" aria-hidden="true" />}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onChange={(event) => { onChange(event.target.value); setOpen(true); setActiveIndex(-1); }}
      />
      {showList ? (
        <ul id={listId} role="listbox" aria-label={`${label} suggestions`} className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
          {matches.map((category, index) => (
            <li
              key={category.name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={category.name === value}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(category.name)}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${index === activeIndex ? 'bg-sky-50 text-sky-900' : 'text-slate-800 hover:bg-slate-50'}`}
            >
              <span className="min-w-0 break-words font-semibold">{category.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{category.count} {category.count === 1 ? 'blog' : 'blogs'}</span>
            </li>
          ))}
          {canCreate ? (
            <li
              id={`${listId}-${matches.length}`}
              role="option"
              aria-selected={false}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(typed)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${activeIndex === matches.length ? 'bg-sky-50 text-sky-900' : 'text-sky-700 hover:bg-slate-50'}`}
            >
              <Plus size={14} aria-hidden="true" />
              <span className="min-w-0 break-words">Create new category &ldquo;{typed}&rdquo;</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
