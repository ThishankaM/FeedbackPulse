import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

const TooltipContext = React.createContext<number>(150);

export function TooltipProvider({
  children,
  delayDuration = 150,
}: TooltipProviderProps) {
  return (
    <TooltipContext.Provider value={delayDuration}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactNode;
}) {
  // `asChild` is accepted for shadcn API compatibility; Tooltip clones the real child.
  void asChild;
  return <>{children}</>;
}
TooltipTrigger.displayName = 'TooltipTrigger';

export interface TooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  TooltipContentProps
>(({ className, side: _side, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="tooltip"
      data-state="open"
      className={cn(
        'fixed z-50 pointer-events-none rounded-lg border border-border/80 bg-popover/90 px-2.5 py-1.5 text-xs font-medium text-popover-foreground shadow-md backdrop-blur-md',
        className
      )}
      style={{ animation: 'fp-fade-in 120ms ease-out', ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = 'TooltipContent';

interface TooltipProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export function Tooltip({ children, disabled = false }: TooltipProps) {
  const delayDuration = React.useContext(TooltipContext);
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{
    left: number;
    top: number;
    transform: string;
  } | null>(null);
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const disabledRef = React.useRef(disabled);
  const enterTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const childrenArray = React.Children.toArray(children);
  const first = childrenArray[0];
  const second = childrenArray[1];

  let rawTrigger: React.ReactNode = first;
  if (
    React.isValidElement(first) &&
    ((first.type as unknown) === TooltipTrigger ||
      (first.type as { displayName?: string })?.displayName === 'TooltipTrigger')
  ) {
    rawTrigger = (first.props as Record<string, unknown>).children as React.ReactNode;
  }

  const triggerElement: React.ReactElement | null =
    rawTrigger == null
      ? null
      : React.isValidElement(rawTrigger)
        ? rawTrigger
        : <span>{rawTrigger}</span>;

  const contentElement = React.isValidElement(second)
    ? (second as React.ReactElement<TooltipContentProps>)
    : null;
  const side = contentElement?.props.side || 'top';
  const contentClassName = contentElement?.props.className;
  const contentChildren = contentElement?.props.children;

  const show = () => {
    if (disabledRef.current) return;
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    enterTimer.current = setTimeout(() => {
      if (!disabledRef.current) {
        setOpen(true);
      }
    }, delayDuration);
  };

  const hide = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    leaveTimer.current = setTimeout(() => setOpen(false), 80);
  };

  React.useEffect(() => {
    disabledRef.current = disabled;
    if (disabled && enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
  }, [disabled]);

  React.useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  const updatePosition = React.useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    switch (side) {
      case 'right':
        setPosition({
          left: rect.right + 8,
          top: rect.top + rect.height / 2,
          transform: 'translateY(-50%)',
        });
        break;
      case 'left':
        setPosition({
          left: rect.left - 8,
          top: rect.top + rect.height / 2,
          transform: 'translate(-100%, -50%)',
        });
        break;
      case 'bottom':
        setPosition({
          left: rect.left + rect.width / 2,
          top: rect.bottom + 8,
          transform: 'translateX(-50%)',
        });
        break;
      case 'top':
      default:
        setPosition({
          left: rect.left + rect.width / 2,
          top: rect.top - 8,
          transform: 'translate(-50%, -100%)',
        });
        break;
    }
  }, [side]);

  React.useEffect(() => {
    if (!open) return;
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open, updatePosition]);

  if (!triggerElement) {
    return null;
  }

  const isOpen = open && !disabled;

  const triggerProps = triggerElement.props as Record<string, unknown>;
  const triggerWithHandlers = React.cloneElement(
    triggerElement as React.ReactElement<Record<string, unknown>>,
    {
      onPointerEnter: (event: React.PointerEvent) => {
        (triggerProps.onPointerEnter as ((e: React.PointerEvent) => void) | undefined)?.(event);
        show();
      },
      onPointerLeave: (event: React.PointerEvent) => {
        (triggerProps.onPointerLeave as ((e: React.PointerEvent) => void) | undefined)?.(event);
        hide();
      },
      onFocus: (event: React.FocusEvent) => {
        (triggerProps.onFocus as ((e: React.FocusEvent) => void) | undefined)?.(event);
        show();
      },
      onBlur: (event: React.FocusEvent) => {
        (triggerProps.onBlur as ((e: React.FocusEvent) => void) | undefined)?.(event);
        hide();
      },
      'aria-describedby': isOpen ? tooltipId : undefined,
    }
  );

  const tooltipPortal =
    isOpen && position && typeof document !== 'undefined'
      ? createPortal(
          <TooltipContent
            side={side}
            className={contentClassName}
            id={tooltipId}
            style={position}
          >
            {contentChildren}
          </TooltipContent>,
          document.body
        )
      : null;

  return (
    <span ref={wrapperRef} className="relative inline-flex w-full">
      {triggerWithHandlers}
      {tooltipPortal}
    </span>
  );
}
