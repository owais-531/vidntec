'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { ChatMessage } from '@vidntec/shared';
import { sendChatMessageAction } from '@/lib/actions/chat';
import { whatsappUrl } from '@/lib/whatsapp';
import { SUPPORT_EMAIL } from '@/lib/site';
import { buttonClasses } from '@/components/ui/button';

const GREETING: ChatMessage = {
  role: 'assistant',
  content: "Hi! I'm the VIDNTEC assistant. Ask me about our products, shipping, or your order.",
};

// Matches the API's own cap (chatRequestSchema.messages.max(10)) — keeping
// only the last 10 turns bounds both the request size and the model's cost.
const MAX_HISTORY = 10;

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path
        d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="12" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Model replies are plain text with light markdown. Render `[label](url)`
// links, bare URLs/emails, and "- " bullets as React nodes (never as HTML).
// Trailing sentence punctuation stays outside a bare link.
const INLINE_RE =
  /(\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s<>]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

function Anchor({ href, children, onDark }: { href: string; children: React.ReactNode; onDark: boolean }) {
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={onDark ? 'font-medium underline' : 'font-medium text-brand-600 underline'}
    >
      {children}
    </a>
  );
}

function inline(text: string, onDark: boolean): React.ReactNode[] {
  return text.split(INLINE_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const md = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (md) {
      const href = /^(https?:\/\/|mailto:)/.test(md[2]!) ? md[2]! : null;
      return href ? (
        <Anchor key={i} href={href} onDark={onDark}>
          {md[1]}
        </Anchor>
      ) : (
        md[1]
      );
    }
    const m = part.match(/^(.*?)([).,;:!?]*)$/);
    const token = m?.[1] ?? part;
    const trail = m?.[2] ?? '';
    const isUrl = /^https?:\/\//.test(token);
    return (
      <span key={i}>
        <Anchor href={isUrl ? token : `mailto:${token}`} onDark={onDark}>
          {token}
        </Anchor>
        {trail}
      </span>
    );
  });
}

function renderMessage(text: string, onDark: boolean): React.ReactNode {
  // Models sometimes inline "1. item 2. item" on one line — split those too.
  const lines = text.replace(/\s+(?=\d+\.\s+\[)/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(
      <ul key={`ul${blocks.length}`} className="my-1 list-disc space-y-1 pl-5">
        {bullets.map((b, i) => (
          <li key={i}>{inline(b, onDark)}</li>
        ))}
      </ul>,
    );
    bullets = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^(?:[-*•]|\d+\.)\s+(.*)$/);
    if (bullet) {
      bullets.push(bullet[1]!);
      continue;
    }
    flush();
    if (line) blocks.push(<p key={`p${blocks.length}`}>{inline(line, onDark)}</p>);
  }
  flush();
  return <div className="space-y-1.5">{blocks}</div>;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending]);

  function send() {
    const content = input.trim();
    if (!content || pending) return;
    const next = [...messages, { role: 'user' as const, content }];
    setMessages(next);
    setInput('');
    setError(false);
    startTransition(async () => {
      const res = await sendChatMessageAction(next.slice(-MAX_HISTORY));
      if (res.ok) {
        setMessages((cur) => [...cur, { role: 'assistant', content: res.data.reply }]);
      } else {
        setError(true);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close chat' : 'Chat with VIDNTEC'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-[84px] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 text-white shadow-pop transition-transform hover:scale-105"
      >
        {open ? (
          <span aria-hidden className="text-2xl leading-none">
            ✕
          </span>
        ) : (
          <ChatIcon />
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="VIDNTEC Assistant chat"
          className="fixed bottom-[164px] right-5 z-40 flex h-[480px] max-h-[70vh] w-[360px] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-card bg-white shadow-pop"
        >
          <div className="border-b border-paper-line bg-brand-500 px-4 py-3 text-white">
            <p className="text-sm font-semibold">VIDNTEC Assistant</p>
            <p className="text-xs text-white/80">Ask about products, shipping, or your order</p>
          </div>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[85%] break-words rounded-card px-3 py-2 text-sm [overflow-wrap:anywhere] ${
                  m.role === 'user' ? 'ml-auto bg-brand-500 text-white' : 'bg-paper-sunken text-ink'
                }`}
              >
                {renderMessage(m.content, m.role === 'user')}
              </div>
            ))}
            {pending ? (
              <div className="max-w-[85%] rounded-card bg-paper-sunken px-3 py-2 text-sm text-ink-muted">
                Typing…
              </div>
            ) : null}
            {error ? (
              <p className="text-xs text-ink-muted">
                Something went wrong. Message us on{' '}
                <a
                  href={whatsappUrl('Hi, I need help')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-600 underline"
                >
                  WhatsApp
                </a>{' '}
                or{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-brand-600 underline">
                  email us
                </a>
                .
              </p>
            ) : null}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-paper-line p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message…"
              maxLength={500}
              disabled={pending}
              aria-label="Message"
              className="h-9 min-w-0 flex-1 rounded-card border border-paper-line px-3 text-base focus:border-brand-400 focus:outline-none sm:text-sm"
            />
            <button
              type="submit"
              disabled={pending || !input.trim()}
              className={`${buttonClasses('primary', 'sm')} shrink-0`}
            >
              Send
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
