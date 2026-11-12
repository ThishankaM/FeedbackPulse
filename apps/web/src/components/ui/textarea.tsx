import * as React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autosize?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, autosize = false, onInput, ...props }, ref) => {
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);

    const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
      // Cast to accommodate React 19 FormEventHandler vs InputEventHandler typings
      (onInput as React.FormEventHandler<HTMLTextAreaElement> | undefined)?.(e);
      if (autosize && innerRef.current) {
        innerRef.current.style.height = 'auto';
        innerRef.current.style.height = `${innerRef.current.scrollHeight}px`;
      }
    };

    return (
      <textarea
        ref={(node) => {
          innerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
        }}
        onInput={handleInput}
        className={cn(
          'flex min-h-[96px] w-full rounded-xl border border-input bg-card/90 p-3.5 text-sm leading-relaxed text-foreground shadow-xs backdrop-blur-xs transition-colors placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/40',
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
