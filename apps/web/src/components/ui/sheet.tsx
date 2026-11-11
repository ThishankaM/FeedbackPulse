import * as React from 'react';
import { createPortal } from 'react-dom';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SheetContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheet() {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error('Sheet compound components must be used within a Sheet');
  }
  return context;
}

export interface SheetProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Sheet({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange: controlledOnOpenChange,
  children,
}: SheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setInternalOpen(nextOpen);
      }
      controlledOnOpenChange?.(nextOpen);
    },
    [isControlled, controlledOnOpenChange]
  );

  const contextValue = React.useMemo(
    () => ({ open, onOpenChange }),
    [open, onOpenChange]
  );

  return (
    <SheetContext.Provider value={contextValue}>
      {children}
    </SheetContext.Provider>
  );
}

export interface SheetTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

export const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ asChild, children, ...props }, ref) => {
    const { onOpenChange } = useSheet();

    if (asChild && React.isValidElement(children)) {
      const childProps = children.props as Record<string, unknown>;
      return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        ...props,
        ref,
        onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
          props.onClick?.(e);
          (childProps.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
          onOpenChange(true);
        },
      });
    }

    return (
      <button
        ref={ref}
        type="button"
        {...props}
        onClick={(e) => {
          props.onClick?.(e);
          onOpenChange(true);
        }}
      >
        {children}
      </button>
    );
  }
);
SheetTrigger.displayName = 'SheetTrigger';

export const sheetVariants = cva(
  'fixed z-50 gap-4 bg-card/95 p-6 shadow-2xl backdrop-blur-xl border-border/80 transition-transform duration-300 ease-in-out',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b animate-in slide-in-from-top',
        bottom: 'inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-md animate-in slide-in-from-left',
        right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-md md:max-w-xl animate-in slide-in-from-right',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

export interface SheetContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sheetVariants> {
  onClose?: () => void;
}

export const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ side = 'right', className, children, onClose, ...props }, ref) => {
    const { open, onOpenChange } = useSheet();

    React.useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onOpenChange(false);
          onClose?.();
        }
      };
      if (open) {
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleKeyDown);
      } else {
        document.body.style.overflow = 'unset';
      }
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [open, onOpenChange, onClose]);

    if (!open) return null;

    const sheetElement = (
      <div className="fixed inset-0 z-50 flex">
        {/* Backdrop overlay */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => {
            onOpenChange(false);
            onClose?.();
          }}
        />
        {/* Sheet panel */}
        <div
          ref={ref}
          className={cn(sheetVariants({ side }), className)}
          {...props}
        >
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onClose?.();
            }}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            aria-label="Close sheet"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    );

    return typeof document !== 'undefined'
      ? createPortal(sheetElement, document.body)
      : sheetElement;
  }
);
SheetContent.displayName = 'SheetContent';

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-2 text-left mb-5', className)}
      {...props}
    />
  );
}
SheetHeader.displayName = 'SheetHeader';

export function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn('text-lg font-bold leading-none tracking-tight text-foreground', className)}
      {...props}
    />
  );
}
SheetTitle.displayName = 'SheetTitle';

export function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-muted-foreground mt-1', className)}
      {...props}
    />
  );
}
SheetDescription.displayName = 'SheetDescription';

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6', className)}
      {...props}
    />
  );
}
SheetFooter.displayName = 'SheetFooter';

export function SheetClose({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useSheet();

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        (childProps.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        onOpenChange(false);
      },
    });
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e);
        onOpenChange(false);
      }}
    >
      {children}
    </button>
  );
}
SheetClose.displayName = 'SheetClose';
