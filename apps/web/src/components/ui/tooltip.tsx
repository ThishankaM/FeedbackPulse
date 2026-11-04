import * as React from 'react';
import { cn } from '../../lib/utils';

interface TooltipProviderProps {
  children: React.ReactNode;
  delayDuration?: number;
}

const TooltipContext = React.createContext<number>(150);

export function TooltipProvider({ children, delayDuration = 150 }: TooltipProviderProps) {
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

export interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right';
}

export function TooltipContent({
  className,
  side: _side,
  children,
  ...props
}: TooltipContentProps) {
  return (
    <div
      role="tooltip"
      data-state="open"
      className={cn(
        'fixed z-50 pointer-events-none rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-100 shadow-lg',
        className
      )}
      style={{ animation: 'fp-fade-in 120ms ease-out', ...props.style }}
      {...props}
    >
      {children}
    </div>
  );
}

interface TooltipProps {
  children: React.ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  const delayDuration = React.useContext(TooltipContext);
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{
    left: number;
    top: number;
    transform: string;
  } | null>(null);
  const wrapperRef = React.useRef<HTMLSpanElement>(null);
  const enterTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const leaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = React.useId();

  const childrenArray = React.Children.toArray(children);
  const first = childrenArray[0];
  const second = childrenArray[1];

  const triggerElement = React.isValidElement(first)
    ? (first.type as unknown) === TooltipTrigger
      ? ((first.props as Record<string, unknown>).children as React.ReactNode)
      : first
    : null;

  const contentElement = React.isValidElement(second)
    ? (second as React.ReactElement<TooltipContentProps>)
    : null;
  const side = contentElement?.props.side === 'top' ? 'top' : 'right';
  const contentClassName = contentElement?.props.className;
  const contentChildren = contentElement?.props.children;

  const show = () => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    enterTimer.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const hide = () => {
    if (enterTimer.current) {
      clearTimeout(enterTimer.current);
      enterTimer.current = null;
    }
    leaveTimer.current = setTimeout(() => setOpen(false), 80);
  };

  React.useEffect(() => {
    return () => {
      if (enterTimer.current) clearTimeout(enterTimer.current);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, []);

  React.useEffect(() => {
    if (!open || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    setPosition(
      side === 'right'
        ? { left: rect.right + 8, top: rect.top + rect.height / 2, transform: 'translateY(-50%)' }
        : { left: rect.left + rect.width / 2, top: rect.top - 8, transform: 'translate(-50%, -100%)' }
    );
  }, [open, side]);

  if (!React.isValidElement(triggerElement)) {
    return <>{triggerElement}</>;
  }

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
      'aria-describedby': open ? tooltipId : undefined,
    }
  );

  return (
    <span ref={wrapperRef} className="relative inline-flex w-full">
      {triggerWithHandlers}
      {open && position && (
        <TooltipContent side={side} className={contentClassName} id={tooltipId} style={position}>
          {contentChildren}
        </TooltipContent>
      )}
    </span>
  );
}
