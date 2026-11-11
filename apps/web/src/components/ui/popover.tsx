import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface PopoverContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRect: DOMRect | null;
  setTriggerRect: React.Dispatch<React.SetStateAction<DOMRect | null>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopover() {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error('Popover components must be used within a Popover');
  }
  return context;
}

export interface PopoverProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Popover({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  children,
}: PopoverProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (action) => {
      const nextOpen = typeof action === 'function' ? action(open) : action;
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, open, onOpenChange]
  );

  const contextValue = React.useMemo(
    () => ({ open, setOpen, triggerRect, setTriggerRect, triggerRef }),
    [open, setOpen, triggerRect, setTriggerRect]
  );

  return (
    <PopoverContext.Provider value={contextValue}>
      {children}
    </PopoverContext.Provider>
  );
}

export interface PopoverTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<
  HTMLButtonElement,
  PopoverTriggerProps
>(({ asChild, children, ...props }, ref) => {
  const { open, setOpen, setTriggerRect, triggerRef } = usePopover();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e);
    if (triggerRef.current) {
      setTriggerRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen((prev) => !prev);
  };

  const setRefs = (node: HTMLButtonElement | null) => {
    (triggerRef as React.MutableRefObject<HTMLButtonElement | null>).current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) (ref as React.MutableRefObject<HTMLButtonElement | null>).current = node;
  };

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      ref: setRefs,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        (childProps.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        handleClick(e);
      },
      'aria-haspopup': 'dialog',
      'aria-expanded': open,
    });
  }

  return (
    <button
      {...props}
      ref={setRefs}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});
PopoverTrigger.displayName = 'PopoverTrigger';

export interface PopoverContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const PopoverContent = React.forwardRef<
  HTMLDivElement,
  PopoverContentProps
>(({ className, align = 'center', sideOffset = 4, children, style, ...props }, ref) => {
  const { open, setOpen, triggerRect, triggerRef } = usePopover();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!open || !triggerRect) return;

    const updateCoords = () => {
      const contentEl = contentRef.current;
      const contentWidth = contentEl ? contentEl.offsetWidth : 288;
      let left = triggerRect.left;

      if (align === 'center') {
        left = triggerRect.left + (triggerRect.width - contentWidth) / 2;
      } else if (align === 'end') {
        left = triggerRect.right - contentWidth;
      }

      // Constrain within viewport
      const padding = 8;
      left = Math.max(padding, Math.min(left, window.innerWidth - contentWidth - padding));
      const top = triggerRect.bottom + sideOffset;

      setCoords({ top, left });
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, triggerRect, align, sideOffset]);

  // Outside click & ESC listener
  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: PointerEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, setOpen, triggerRef]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={(node) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      role="dialog"
      style={{
        position: 'fixed',
        top: coords ? `${coords.top}px` : undefined,
        left: coords ? `${coords.left}px` : undefined,
        visibility: coords ? 'visible' : 'hidden',
        animation: 'fp-fade-in 120ms ease-out',
        ...style,
      }}
      className={cn(
        'z-50 w-72 rounded-xl border border-border/80 bg-popover/90 p-4 text-popover-foreground shadow-xl backdrop-blur-xl outline-none',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
PopoverContent.displayName = 'PopoverContent';
