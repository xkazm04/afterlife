'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/controls/Button';
import { UntrustedText } from '@/components/inspector/UntrustedText';
import type { ChatView } from '../../model/view';
import { ActionCard } from './ActionCard';
import styles from './chat.module.css';

/**
 * "Ask Afterlife": a drawer on the right of the pane, the same in every variant. Your turns as typed; the model's as
 * untrusted text (never HTML), each with the catalogue action it proposed as a card that opens the same preview ->
 * confirm as Run it. A reply takes 10-40 s, so the thinking state counts the seconds.
 */
export function ChatDrawer({ chat }: { chat: ChatView }) {
  const [text, setText] = useState('');
  const field = useId();
  if (!chat.open) return null;
  return (
    <aside className={styles.drawer} aria-label="Ask Afterlife">
      <header className={styles.head}>
        <h2 className={styles.h}>Ask Afterlife</h2>
        <Button variant="ghost" size="mini" onClick={chat.toggle} aria-label="Close Ask Afterlife">
          ✕
        </Button>
      </header>
      <ol className={styles.turns} aria-label="The conversation">
        {chat.turns.map((t, i) => (
          <li key={i} className={styles.turn} data-role={t.role}>
            {t.role === 'you' ? <p className={styles.you}>{t.text}</p> : <UntrustedText source="Afterlife’s model">{t.text}</UntrustedText>}
            {t.action ? <ActionCard action={t.action} onReview={chat.propose} /> : null}
          </li>
        ))}
        {chat.thinking ? (
          <li className={styles.thinking} role="status">
            thinking… {chat.elapsedS} s
          </li>
        ) : null}
      </ol>
      {chat.error ? (
        <p className={styles.error} role="alert">
          {chat.error}
        </p>
      ) : null}
      <form
        className={styles.composer}
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() || chat.thinking) return;
          chat.ask(text);
          setText('');
        }}
      >
        <label htmlFor={field} className={styles.sr}>
          Ask Afterlife
        </label>
        <textarea
          id={field}
          className={styles.input}
          value={text}
          rows={2}
          placeholder="Ask, or say “do it for me”"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" variant="accent" disabled={!text.trim() || chat.thinking}>
          Send
        </Button>
      </form>
    </aside>
  );
}
