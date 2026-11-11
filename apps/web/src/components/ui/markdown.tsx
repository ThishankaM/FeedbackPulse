import * as React from 'react';
import { cn } from '../../lib/utils';

export interface MarkdownProps {
  content: string;
  className?: string;
}

const INLINE_PATTERN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function toSafeHttpUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return null;
  }
  try {
    const parsed = new URL(trimmed);
    const scheme =
      parsed.protocol === 'https:'
        ? 'https://'
        : parsed.protocol === 'http:'
          ? 'http://'
          : null;
    if (!scheme || !parsed.host) {
      return null;
    }
    const pathname =
      parsed.pathname === '/' && !trimmed.endsWith('/') && !parsed.search && !parsed.hash
        ? ''
        : parsed.pathname;
    return `${scheme}${parsed.host}${pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(INLINE_PATTERN);
  return parts.map((part, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={key} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={key} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={key}
          className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const safeHref = toSafeHttpUrl(href);
      if (safeHref && (safeHref.startsWith('https://') || safeHref.startsWith('http://'))) {
        return (
          <a
            key={key}
            href={safeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-2 hover:opacity-80"
          >
            {label}
          </a>
        );
      }
      return <React.Fragment key={key}>{label}</React.Fragment>;
    }
    return <React.Fragment key={key}>{part}</React.Fragment>;
  });
}

/**
 * Zero-dependency, XSS-safe Markdown renderer producing React elements without raw HTML injection.
 */
export function Markdown({ content, className }: MarkdownProps) {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith('```')) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push(
        <pre
          key={`code-${index}`}
          className="overflow-x-auto rounded-xl border border-border/70 bg-muted/70 p-3 font-mono text-xs leading-relaxed text-foreground"
        >
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const headingText = headingMatch[2];
      const headingClass =
        level === 1
          ? 'text-base font-bold text-foreground'
          : level === 2
            ? 'text-sm font-bold text-foreground'
            : 'text-xs font-bold uppercase tracking-wide text-foreground';
      blocks.push(
        <div key={`h-${index}`} className={headingClass}>
          {renderInline(headingText, `h-${index}`)}
        </div>
      );
      index += 1;
      continue;
    }

    if (trimmed.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith('> ')) {
        quoteLines.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(
        <blockquote
          key={`q-${index}`}
          className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground"
        >
          {renderInline(quoteLines.join(' '), `q-${index}`)}
        </blockquote>
      );
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${index}`} className="list-disc space-y-1 pl-5">
          {items.map((item, itemIdx) => (
            <li key={`li-${index}-${itemIdx}`}>{renderInline(item, `ul-${index}-${itemIdx}`)}</li>
          ))}
        </ul>
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }
      blocks.push(
        <ol key={`ol-${index}`} className="list-decimal space-y-1 pl-5">
          {items.map((item, itemIdx) => (
            <li key={`oli-${index}-${itemIdx}`}>{renderInline(item, `ol-${index}-${itemIdx}`)}</li>
          ))}
        </ol>
      );
      continue;
    }

    const paraLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith('```') &&
      !lines[index].trim().startsWith('#') &&
      !lines[index].trim().startsWith('> ') &&
      !/^[-*]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim())
    ) {
      paraLines.push(lines[index].trim());
      index += 1;
    }

    blocks.push(
      <p key={`p-${index}`} className="leading-relaxed">
        {renderInline(paraLines.join(' '), `p-${index}`)}
      </p>
    );
  }

  return <div className={cn('space-y-2 text-xs leading-relaxed', className)}>{blocks}</div>;
}
