import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRect: DOMRect | null;
  setTriggerRect: React.Dispatch<React.SetStateAction<DOMRect | null>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenu() {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error('DropdownMenu components must be used within a DropdownMenu');
  }
  return context;
}

export interface DropdownMenuProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function DropdownMenu({
  open: controlledOpen,
  onOpenChange,
  children,
}: DropdownMenuProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
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
    <DropdownMenuContext.Provider value={contextValue}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

export interface DropdownMenuTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const DropdownMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuTriggerProps
>(({ asChild, children, ...props }, ref) => {
  const { open, setOpen, setTriggerRect, triggerRef } = useDropdownMenu();

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
      'aria-haspopup': 'menu',
      'aria-expanded': open,
    });
  }

  return (
    <button
      {...props}
      ref={setRefs}
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={handleClick}
    >
      {children}
    </button>
  );
});
DropdownMenuTrigger.displayName = 'DropdownMenuTrigger';

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

export const DropdownMenuContent = React.forwardRef<
  HTMLDivElement,
  DropdownMenuContentProps
>(({ className, align = 'end', sideOffset = 4, children, style, ...props }, ref) => {
  const { open, setOpen, triggerRect, triggerRef } = useDropdownMenu();
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  // Position calculation
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  React.useEffect(() => {
    if (!open || !triggerRect) return;

    const updateCoords = () => {
      const contentEl = contentRef.current;
      const contentWidth = contentEl ? contentEl.offsetWidth : 180;
      let left = triggerRect.left;

      if (align === 'end') {
        left = triggerRect.right - contentWidth;
      } else if (align === 'center') {
        left = triggerRect.left + (triggerRect.width - contentWidth) / 2;
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
      if (e.key === 'Escape') {
        setOpen(false);
      }
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
      role="menu"
      tabIndex={-1}
      style={{
        position: 'fixed',
        top: coords ? `${coords.top}px` : undefined,
        left: coords ? `${coords.left}px` : undefined,
        visibility: coords ? 'visible' : 'hidden',
        animation: 'fp-fade-in 120ms ease-out',
        ...style,
      }}
      className={cn(
        'z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-xl backdrop-blur-xl',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
DropdownMenuContent.displayName = 'DropdownMenuContent';

export interface DropdownMenuItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  destructive?: boolean;
}

export const DropdownMenuItem = React.forwardRef<
  HTMLButtonElement,
  DropdownMenuItemProps
>(({ className, destructive, onClick, disabled, children, ...props }, ref) => {
  const { setOpen } = useDropdownMenu();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (!e.defaultPrevented) {
      setOpen(false);
    }
  };

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg px-2.5 py-1.5 text-sm text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        destructive &&
          'text-destructive hover:bg-destructive/10 hover:text-destructive focus:bg-destructive/10 focus:text-destructive',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
});
DropdownMenuItem.displayName = 'DropdownMenuItem';

export function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="separator"
      className={cn('-mx-1 my-1 h-px bg-border/60', className)}
      {...props}
    />
  );
}
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('px-2.5 py-1.5 text-xs font-semibold text-muted-foreground', className)}
      {...props}
    />
  );
}
DropdownMenuLabel.displayName = 'DropdownMenuLabel';

export function DropdownMenuGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full', className)} {...props} />;
}
DropdownMenuGroup.displayName = 'DropdownMenuGroup';

export function DropdownMenuShortcut({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}
DropdownMenuShortcut.displayName = 'DropdownMenuShortcut';
