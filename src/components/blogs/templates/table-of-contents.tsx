import type { TipTapDocument, TipTapNode } from '@/types/blog';

export interface TableOfContentsItem { id: string; text: string; level: 2 | 3 | 4 }

function nodeText(node: TipTapNode): string {
  return `${node.text ?? ''}${node.content?.map(nodeText).join('') ?? ''}`;
}

function slugifyHeading(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'section';
}

export function buildTableOfContents(content?: TipTapDocument | null): TableOfContentsItem[] {
  const counts = new Map<string, number>();
  const result: TableOfContentsItem[] = [];
  const visit = (node: TipTapNode) => {
    if (node.type === 'heading' && [2, 3, 4].includes(Number(node.attrs?.level))) {
      const text = nodeText(node).trim();
      if (text) {
        const base = slugifyHeading(text);
        const count = (counts.get(base) ?? 0) + 1;
        counts.set(base, count);
        result.push({ id: count === 1 ? base : `${base}-${count}`, text, level: Number(node.attrs?.level) as 2 | 3 | 4 });
      }
    }
    node.content?.forEach(visit);
  };
  content?.content?.forEach(visit);
  return result;
}

export function addTableOfContentsIds(html: string, items: TableOfContentsItem[]): string {
  let index = 0;
  return html.replace(/<h([234])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level: string, attrs: string, body: string) => {
    if (!body.replace(/<[^>]+>/g, '').trim()) return match;
    const item = items[index++];
    if (!item || Number(level) !== item.level) return match;
    const withoutId = attrs.replace(/\s+id=(['"]).*?\1/gi, '');
    return `<h${level}${withoutId} id="${item.id}">${body}</h${level}>`;
  });
}

export function TableOfContents({ items, activeId = '', heading = 'On this page', hideHeading = false, ariaLabel = 'Table of contents' }: { items: TableOfContentsItem[]; activeId?: string; heading?: string; hideHeading?: boolean; ariaLabel?: string }) {
  function scrollTo(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${id}`);
  }
  return (
    <nav aria-label={ariaLabel}>
      {!hideHeading ? <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0875c9]">{heading}</p> : null}
      {items.length ? (
        <ol className="mt-3 space-y-0.5 text-sm">
          {items.map((item) => (
            <li key={item.id} style={{ paddingLeft: `${(item.level - 2) * 12}px` }}>
              <a aria-current={activeId === item.id ? 'location' : undefined} className={`focus-ring block border-l-[3px] px-3 py-2.5 text-xs font-bold transition motion-reduce:transition-none ${activeId === item.id ? 'border-[#1686d9] bg-white text-[#0875c9]' : 'border-[#1686d9] bg-blue-100/55 text-slate-600 hover:bg-white/70 hover:text-[#0875c9]'}`} href={`#${item.id}`} onClick={(event) => scrollTo(event, item.id)}>{item.text}</a>
            </li>
          ))}
        </ol>
      ) : <p className="mt-3 text-xs leading-5 text-slate-400">Add H2, H3 or H4 headings to generate navigation.</p>}
    </nav>
  );
}
