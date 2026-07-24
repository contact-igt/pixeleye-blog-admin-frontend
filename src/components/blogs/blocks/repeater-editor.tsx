'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

let keyCounter = 0;
function nextKey() { keyCounter += 1; return `repeater-${keyCounter}`; }

export function RepeaterEditor<T>({ items, max, createItem, onChange, addLabel, renderItem }: {
  items: T[];
  max: number;
  createItem: () => T;
  onChange: (items: T[]) => void;
  addLabel: string;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  const [keys, setKeys] = useState(() => items.map(() => nextKey()));

  function move(index: number, offset: number) {
    const target = index + offset;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setKeys((current) => { const nextKeys = [...current]; [nextKeys[index], nextKeys[target]] = [nextKeys[target]!, nextKeys[index]!]; return nextKeys; });
    onChange(next);
  }

  function remove(index: number) {
    setKeys((current) => current.filter((_, itemIndex) => itemIndex !== index));
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  return <div className="space-y-3">
    {items.map((item, index) => <div key={keys[index]} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-slate-500">Item {index + 1}</span><div className="flex gap-1">
        <button type="button" aria-label="Move item up" disabled={index === 0} onClick={() => move(index, -1)} className="rounded p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
        <button type="button" aria-label="Move item down" disabled={index === items.length - 1} onClick={() => move(index, 1)} className="rounded p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
        <button type="button" aria-label="Remove item" onClick={() => remove(index)} className="rounded p-1 text-rose-600"><Trash2 size={14} /></button>
      </div></div>
      {renderItem(item, index)}
    </div>)}
    <Button type="button" variant="outline" size="sm" disabled={items.length >= max} onClick={() => { setKeys((current) => [...current, nextKey()]); onChange([...items, createItem()]); }}><Plus size={14} />{addLabel}</Button>
    <span className="ml-2 text-xs text-slate-400">{items.length}/{max}</span>
  </div>;
}
