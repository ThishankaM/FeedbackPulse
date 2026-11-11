import * as React from 'react';
import { cn } from '../../lib/utils';

interface AvatarContextValue {
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  imageError: boolean;
  setImageError: (error: boolean) => void;
}

const AvatarContext = React.createContext<AvatarContextValue | null>(null);

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = 'Avatar',
      fallback = 'U',
      size = 'md',
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [imageLoaded, setImageLoaded] = React.useState(false);
    const [imageError, setImageError] = React.useState(false);

    const contextValue = React.useMemo(
      () => ({
        imageLoaded,
        setImageLoaded,
        imageError,
        setImageError,
      }),
      [imageLoaded, imageError]
    );

    // If compound children are provided, render them within AvatarContext
    if (children) {
      return (
        <AvatarContext.Provider value={contextValue}>
          <div
            ref={ref}
            className={cn(
              'relative flex shrink-0 overflow-hidden rounded-full font-semibold border border-border/40 bg-muted select-none',
              sizeClasses[size],
              className
            )}
            {...props}
          >
            {children}
          </div>
        </AvatarContext.Provider>
      );
    }

    // Direct prop usage (zero regression for existing callers)
    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full font-semibold border border-border/40 bg-muted select-none',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-primary font-medium">
            {fallback.slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt = 'Avatar', onLoad, onError, ...props }, ref) => {
    const context = React.useContext(AvatarContext);

    if (context?.imageError || !src) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={(e) => {
          context?.setImageLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          context?.setImageError(true);
          onError?.(e);
        }}
        className={cn('absolute inset-0 aspect-square h-full w-full object-cover', className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  AvatarFallbackProps
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(AvatarContext);

  if (context && context.imageLoaded && !context.imageError) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        'absolute inset-0 flex h-full w-full items-center justify-center bg-muted text-muted-foreground font-medium',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
AvatarFallback.displayName = 'AvatarFallback';
