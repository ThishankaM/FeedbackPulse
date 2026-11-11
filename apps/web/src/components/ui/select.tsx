import * as React from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectContextValue {
  value: string;
  onValueChange: (value: string) => void;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  labels: Record<string, React.ReactNode>;
  registerLabel: (val: string, label: React.ReactNode) => void;
  triggerRect: DOMRect | null;
  setTriggerRect: React.Dispatch<React.SetStateAction<DOMRect | null>>;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

function extractLabels(children: React.ReactNode): Record<string, React.ReactNode> {
  const result: Record<string, React.ReactNode> = {};
  const scan = (node: React.ReactNode) => {
    React.Children.forEach(node, (child) => {
      if (!React.isValidElement(child)) return;
      const props = child.props as Record<string, unknown>;
      if (typeof props.value === 'string' && props.children !== undefined) {
        result[props.value] = props.children as React.ReactNode;
      }
      if (props.children) {
        scan(props.children as React.ReactNode);
      }
    });
  };
  scan(children);
  return result;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);

function useSelect() {
  const context = React.useContext(SelectContext);
  if (!context) {
    throw new Error('Select compound components must be used within a Select');
  }
  return context;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Select({
  value: controlledValue,
  defaultValue = '',
  onValueChange: controlledOnValueChange,
  open: controlledOpen,
  onOpenChange,
  children,
}: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [labels, setLabels] = React.useState<Record<string, React.ReactNode>>({});
  const [triggerRect, setTriggerRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const extractedLabels = React.useMemo(() => extractLabels(children), [children]);
  const allLabels = React.useMemo(
    () => ({ ...extractedLabels, ...labels }),
    [extractedLabels, labels]
  );

  const isControlledValue = controlledValue !== undefined;
  const value = isControlledValue ? controlledValue : internalValue;

  const onValueChange = React.useCallback(
    (nextVal: string) => {
      if (!isControlledValue) {
        setInternalValue(nextVal);
      }
      controlledOnValueChange?.(nextVal);
    },
    [isControlledValue, controlledOnValueChange]
  );

  const isControlledOpen = controlledOpen !== undefined;
  const open = isControlledOpen ? controlledOpen : internalOpen;

  const setOpen = React.useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (action) => {
      const nextOpen = typeof action === 'function' ? action(open) : action;
      if (!isControlledOpen) {
        setInternalOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlledOpen, open, onOpenChange]
  );

  const registerLabel = React.useCallback((val: string, label: React.ReactNode) => {
    setLabels((prev) => {
      if (prev[val] === label) return prev;
      return { ...prev, [val]: label };
    });
  }, []);

  const contextValue = React.useMemo(
    () => ({
      value,
      onValueChange,
      open,
      setOpen,
      labels: allLabels,
      registerLabel,
      triggerRect,
      setTriggerRect,
      triggerRef,
    }),
    [value, onValueChange, open, setOpen, allLabels, registerLabel, triggerRect, setTriggerRect]
  );

  return (
    <SelectContext.Provider value={contextValue}>
      {children}
    </SelectContext.Provider>
  );
}

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const SelectTrigger = React.forwardRef<
  HTMLButtonElement,
  SelectTriggerProps
>(({ className, children, ...props }, ref) => {
  const { open, setOpen, setTriggerRect, triggerRef } = useSelect();

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

  return (
    <button
      {...props}
      ref={setRefs}
      type="button"
      role="combobox"
      aria-expanded={open}
      onClick={handleClick}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-input bg-background/50 px-3 py-2 text-sm shadow-xs backdrop-blur-xs placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer dark:bg-input/20',
        className
      )}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50 ml-2 shrink-0 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
    </button>
  );
});
SelectTrigger.displayName = 'SelectTrigger';

export interface SelectValueProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  placeholder?: string;
}

export function SelectValue({
  placeholder = 'Select an option...',
  className,
  children,
  ...props
}: SelectValueProps) {
  const { value, labels } = useSelect();
  const display = labels[value] || children || (value ? value : placeholder);

  return (
    <span
      className={cn('block truncate', !value && 'text-muted-foreground', className)}
      {...props}
    >
      {display}
    </span>
  );
}
SelectValue.displayName = 'SelectValue';

export interface SelectContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
}

export const SelectContent = React.forwardRef<
  HTMLDivElement,
  SelectContentProps
>(({ className, sideOffset = 4, children, style, ...props }, ref) => {
  const { open, setOpen, triggerRect, triggerRef } = useSelect();
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number; minWidth: number } | null>(null);

  React.useEffect(() => {
    if (!open || !triggerRect) return;

    const updateCoords = () => {
      const minWidth = triggerRect.width;
      const left = Math.max(8, Math.min(triggerRect.left, window.innerWidth - minWidth - 8));
      const top = triggerRect.bottom + sideOffset;
      setCoords({ top, left, minWidth });
    };

    updateCoords();
    window.addEventListener('resize', updateCoords);
    window.addEventListener('scroll', updateCoords, true);
    return () => {
      window.removeEventListener('resize', updateCoords);
      window.removeEventListener('scroll', updateCoords, true);
    };
  }, [open, triggerRect, sideOffset]);

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

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={(node) => {
        contentRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      role="listbox"
      hidden={!open}
      aria-hidden={!open}
      style={{
        position: 'fixed',
        top: coords ? `${coords.top}px` : undefined,
        left: coords ? `${coords.left}px` : undefined,
        minWidth: coords ? `${coords.minWidth}px` : undefined,
        visibility: open && coords ? 'visible' : 'hidden',
        display: open ? undefined : 'none',
        animation: open ? 'fp-fade-in 120ms ease-out' : undefined,
        ...style,
      }}
      className={cn(
        'z-50 max-h-96 min-w-[8rem] overflow-auto rounded-xl border border-border/80 bg-popover/90 p-1 text-popover-foreground shadow-xl backdrop-blur-xl',
        !open && 'pointer-events-none hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>,
    document.body
  );
});
SelectContent.displayName = 'SelectContent';

export interface SelectItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const SelectItem = React.forwardRef<
  HTMLButtonElement,
  SelectItemProps
>(({ className, value: itemValue, children, disabled, onClick, ...props }, ref) => {
  const { value, onValueChange, setOpen, registerLabel } = useSelect();
  const isSelected = value === itemValue;

  React.useEffect(() => {
    registerLabel(itemValue, children);
  }, [itemValue, children, registerLabel]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    onValueChange(itemValue);
    setOpen(false);
  };

  return (
    <button
      ref={ref}
      type="button"
      role="option"
      aria-selected={isSelected}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center rounded-lg py-1.5 pl-8 pr-2 text-sm text-left outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50',
        isSelected && 'font-medium text-foreground',
        className
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected && <Check className="h-4 w-4 text-primary" />}
      </span>
      <span className="truncate">{children}</span>
    </button>
  );
});
SelectItem.displayName = 'SelectItem';

export function SelectGroup({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('w-full', className)} {...props} />;
}
SelectGroup.displayName = 'SelectGroup';

export function SelectLabel({
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
SelectLabel.displayName = 'SelectLabel';

export function SelectSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('-mx-1 my-1 h-px bg-border/60', className)}
      {...props}
    />
  );
}
SelectSeparator.displayName = 'SelectSeparator';
