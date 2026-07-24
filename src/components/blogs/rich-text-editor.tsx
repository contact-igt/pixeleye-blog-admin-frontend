'use client';

import { useState } from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import type { JSONContent } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, RemoveFormatting, Undo2 } from 'lucide-react';
import type { TipTapDocument } from '@/types/blog';

const emptyDocument: TipTapDocument = { type: 'doc', content: [{ type: 'paragraph' }] };

function ToolButton({ editor, label, active = false, onClick, children }: { editor: Editor; label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} aria-pressed={active} disabled={!editor.isEditable} onClick={onClick} className={`focus-ring grid h-8 w-8 place-items-center rounded-lg transition-colors ${active ? 'bg-sky-600 text-white' : 'text-slate-600 hover:bg-slate-200 hover:text-slate-950'}`}>{children}</button>;
}

export function RichTextEditor({ value = emptyDocument, onChange, error }: { value?: TipTapDocument; onChange: (value: TipTapDocument, html: string) => void; error?: string }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState('https://');
  const [linkError, setLinkError] = useState('');
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false }), Link.configure({ protocols: ['http', 'https'], openOnClick: false }), Placeholder.configure({ placeholder: 'Start writing your article…' })],
    content: value as JSONContent,
    onUpdate: ({ editor: current }) => onChange(current.getJSON() as TipTapDocument, current.getHTML()),
    editorProps: { attributes: { class: 'blog-content min-h-[420px] px-5 py-5 outline-none max-w-none', 'aria-label': 'Blog content editor' } },
  });

  if (!editor) return <div className="min-h-[460px] animate-pulse rounded-xl bg-slate-100" aria-label="Loading editor" />;

  function openLinkEditor() {
    setLinkValue((editor?.getAttributes('link').href as string | undefined) ?? 'https://');
    setLinkError('');
    setLinkOpen(true);
  }

  function applyLink() {
    if (!/^https?:\/\/[^\s]+$/i.test(linkValue)) { setLinkError('Enter a complete HTTP or HTTPS URL.'); return; }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: linkValue }).run();
    setLinkOpen(false);
  }

  return <div>
    <div className={`overflow-hidden rounded-xl border bg-white focus-within:border-sky-400 focus-within:ring-4 focus-within:ring-sky-100 ${error ? 'border-rose-300' : 'border-slate-200'}`}>
      <div role="toolbar" aria-label="Rich text formatting" className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-2">
        <select aria-label="Paragraph style" value={editor.isActive('heading', { level: 2 }) ? '2' : editor.isActive('heading', { level: 3 }) ? '3' : editor.isActive('heading', { level: 4 }) ? '4' : 'p'} onChange={(event) => { const level = event.target.value; if (level === 'p') editor.chain().focus().setParagraph().run(); else editor.chain().focus().setHeading({ level: Number(level) as 2 | 3 | 4 }).run(); }} className="focus-ring mr-1 h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700"><option value="p">Paragraph</option><option value="2">Heading 2</option><option value="3">Heading 3</option><option value="4">Heading 4</option></select>
        <ToolButton editor={editor} label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Blockquote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}><Minus size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Link" active={editor.isActive('link')} onClick={openLinkEditor}><Link2 size={16} aria-hidden="true" /></ToolButton>
        <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden="true" />
        <ToolButton editor={editor} label="Undo" onClick={() => editor.chain().focus().undo().run()}><Undo2 size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Redo" onClick={() => editor.chain().focus().redo().run()}><Redo2 size={16} aria-hidden="true" /></ToolButton>
        <ToolButton editor={editor} label="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}><RemoveFormatting size={16} aria-hidden="true" /></ToolButton>
      </div>
      {linkOpen && <div className="flex flex-wrap items-start gap-2 border-b border-slate-200 bg-sky-50 p-3"><div className="min-w-48 flex-1"><label htmlFor="editor-link-url" className="sr-only">Link URL</label><input id="editor-link-url" autoFocus value={linkValue} onChange={(event) => { setLinkValue(event.target.value); setLinkError(''); }} className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-sky-500" placeholder="https://example.com" />{linkError && <p className="mt-1 text-xs text-rose-600">{linkError}</p>}</div><button type="button" onClick={applyLink} className="h-9 rounded-lg bg-sky-600 px-3 text-xs font-bold text-white hover:bg-sky-700">Apply link</button><button type="button" onClick={() => setLinkOpen(false)} className="h-9 rounded-lg px-3 text-xs font-bold text-slate-600 hover:bg-white">Cancel</button></div>}
      <EditorContent editor={editor} />
    </div>
    {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
  </div>;
}
