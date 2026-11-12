import * as React from 'react';
import { cn } from '../../lib/utils';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabs() {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs compound components must be used within a Tabs component');
  }
  return context;
}

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
  (
    {
      value: controlledValue,
      defaultValue = '',
      onValueChange: controlledOnValueChange,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const isControlled = controlledValue !== undefined;
    const value = isControlled ? controlledValue : internalValue;

    const onValueChange = React.useCallback(
      (nextVal: string) => {
        if (!isControlled) {
          setInternalValue(nextVal);
        }
        controlledOnValueChange?.(nextVal);
      },
      [isControlled, controlledOnValueChange]
    );

    const contextValue = React.useMemo(
      () => ({ value, onValueChange }),
      [value, onValueChange]
    );

    return (
      <TabsContext.Provider value={contextValue}>
        <div ref={ref} className={cn('w-full', className)} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  }
);
Tabs.displayName = 'Tabs';

export interface TabsListProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-xl border border-border/80 bg-card/85 p-1 text-muted-foreground shadow-sm backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  TabsTriggerProps
>(({ className, value: triggerValue, disabled, onClick, ...props }, ref) => {
  const { value, onValueChange } = useTabs();
  const isActive = value === triggerValue;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? 'active' : 'inactive'}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        onValueChange(triggerValue);
      }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'text-foreground/70 hover:bg-accent hover:text-foreground',
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  TabsContentProps
>(({ className, value: contentValue, children, ...props }, ref) => {
  const { value } = useTabs();
  const isActive = value === contentValue;

  if (!isActive) return null;

  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={isActive ? 'active' : 'inactive'}
      tabIndex={0}
      className={cn(
        'mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';
