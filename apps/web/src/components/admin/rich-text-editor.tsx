'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/cn';

const EMPTY_HTML = '<p></p>';

export function RichTextEditor({
  id,
  value,
  onChange,
  underline = false,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  /** Adds an Underline toolbar button (the API sanitizer allows `<u>`). */
  underline?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        orderedList: false,
        strike: false,
        code: false,
        link: false,
        ...(underline ? {} : { underline: false as const }),
      }),
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === EMPTY_HTML ? '' : html);
    },
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        class: 'min-h-24 px-3 py-2 text-sm text-ink focus:outline-none',
      },
    },
  });

  // `content` above is only read on mount — follow outside changes to `value`
  // (e.g. an AI-drafted Scope). Typing round-trips through onChange, so the
  // HTML already matches and this is a no-op.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== (current === EMPTY_HTML ? '' : current)) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="rounded-card border border-paper-line bg-white focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
      <div className="flex items-center gap-1 border-b border-paper-line px-2 py-1.5">
        <ToolbarButton
          active={editor?.isActive('bold') ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          label="Bold"
        >
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic') ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          label="Italic"
        >
          <em>I</em>
        </ToolbarButton>
        {underline ? (
          <ToolbarButton
            active={editor?.isActive('underline') ?? false}
            onClick={() => editor?.chain().focus().toggleUnderline().run()}
            label="Underline"
          >
            <u>U</u>
          </ToolbarButton>
        ) : null}
        <ToolbarButton
          active={editor?.isActive('bulletList') ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          label="Bulleted list"
        >
          •≡
        </ToolbarButton>
      </div>
      <EditorContent editor={editor as Editor} />
    </div>
  );
}

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-card text-xs font-medium text-ink-soft transition-colors',
        'hover:bg-paper-sunken hover:text-ink',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1',
        active && 'bg-brand-50 text-brand-600 hover:bg-brand-50 hover:text-brand-600',
      )}
    >
      {children}
    </button>
  );
}
