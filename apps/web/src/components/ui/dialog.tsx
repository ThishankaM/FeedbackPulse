import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('Dialog compound components must be used within a Dialog');
  }
  return context;
}

export interface DialogProps {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange: controlledOnOpenChange,
  children,
}: DialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const onOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      controlledOnOpenChange?.(nextOpen);
    },
    [isControlled, controlledOnOpenChange]
  );

  // Check if any direct child is DialogContent or DialogTrigger (compound usage)
  const isCompound = React.useMemo(() => {
    return React.Children.toArray(children).some(
      (child) =>
        React.isValidElement(child) &&
        ((child.type as { displayName?: string })?.displayName === 'DialogContent' ||
          (child.type as { displayName?: string })?.displayName === 'DialogTrigger' ||
          child.type === DialogContent ||
          child.type === DialogTrigger)
    );
  }, [children]);

  // Handle ESC and body scroll lock for legacy direct modal mode
  React.useEffect(() => {
    if (isCompound) return; // Compound mode handles this in DialogContent
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
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
  }, [open, onOpenChange, isCompound]);

  const contextValue = React.useMemo(
    () => ({ open, onOpenChange }),
    [open, onOpenChange]
  );

  if (isCompound) {
    return (
      <DialogContext.Provider value={contextValue}>
        {children}
      </DialogContext.Provider>
    );
  }

  // Legacy direct mode (App.tsx, NewFeedbackModal.tsx, ChangelogView.tsx, RoadmapView.tsx)
  if (!open) return null;

  const directContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {/* Dialog container */}
      <div className="relative z-50 w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl transition-all">
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-5 w-5" />
        </button>
        <DialogContext.Provider value={contextValue}>
          {children}
        </DialogContext.Provider>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(directContent, document.body)
    : directContent;
}

export function DialogTrigger({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialogContext();

  if (asChild && React.isValidElement(children)) {
    const childProps = children.props as Record<string, unknown>;
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      ...props,
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        props.onClick?.(e);
        (childProps.onClick as ((e: React.MouseEvent<HTMLButtonElement>) => void) | undefined)?.(e);
        onOpenChange(true);
      },
    });
  }

  return (
    <button
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
DialogTrigger.displayName = 'DialogTrigger';

export interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
}

export const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const { open, onOpenChange } = useDialogContext();

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

    const modal = (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          onClick={() => {
            onOpenChange(false);
            onClose?.();
          }}
        />
        {/* Modal Container */}
        <div
          ref={ref}
          className={cn(
            'relative z-50 w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 p-6 shadow-2xl backdrop-blur-xl transition-all',
            className
          )}
          {...props}
        >
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onClose?.();
            }}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
          {children}
        </div>
      </div>
    );

    return typeof document !== 'undefined'
      ? createPortal(modal, document.body)
      : modal;
  }
);
DialogContent.displayName = 'DialogContent';

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left mb-5', className)}
      {...props}
    />
  );
}
DialogHeader.displayName = 'DialogHeader';

export function DialogTitle({
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
DialogTitle.displayName = 'DialogTitle';

export function DialogDescription({
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
DialogDescription.displayName = 'DialogDescription';

export function DialogFooter({
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
DialogFooter.displayName = 'DialogFooter';

export function DialogClose({
  asChild,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { onOpenChange } = useDialogContext();

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
DialogClose.displayName = 'DialogClose';
