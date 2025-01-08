import * as React from 'react'; // v18.0.0
import * as TabsPrimitive from '@radix-ui/react-tabs'; // v1.0.0
import { cn } from 'class-variance-authority'; // v0.7.0
import { useTheme } from '../../hooks/useTheme';

// Root component props with enhanced typing
interface TabsRootProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  dir?: 'ltr' | 'rtl';
  activationMode?: 'automatic' | 'manual';
}

// List component props
interface TabsListProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  className?: string;
  loop?: boolean;
  responsive?: boolean;
}

// Trigger component props
interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger> {
  value: string;
  disabled?: boolean;
  className?: string;
  asChild?: boolean;
  focusVisible?: boolean;
}

// Content component props
interface TabsContentProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content> {
  value: string;
  forceMount?: boolean;
  className?: string;
  lazyLoad?: boolean;
  preserveState?: boolean;
}

// Root component with theme integration
const Root = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Root>,
  TabsRootProps
>(({ className, ...props }, ref) => {
  const { isDark } = useTheme();

  return (
    <TabsPrimitive.Root
      ref={ref}
      className={cn(
        'w-full',
        isDark ? 'dark' : '',
        className
      )}
      {...props}
    />
  );
});

Root.displayName = 'Tabs.Root';

// List component with responsive layout
const List = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  TabsListProps
>(({ className, responsive = true, ...props }, ref) => {
  const { isDark } = useTheme();

  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-lg bg-muted p-1',
        'border border-input shadow-sm',
        responsive && 'flex-wrap md:flex-nowrap',
        isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className
      )}
      {...props}
    />
  );
});

List.displayName = 'Tabs.List';

// Trigger component with animations and focus management
const Trigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  TabsTriggerProps
>(({ className, ...props }, ref) => {
  const { isDark } = useTheme();

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap px-3 py-1.5',
        'text-sm font-medium ring-offset-background transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
        isDark ? [
          'text-gray-400 hover:text-gray-300',
          'data-[state=active]:bg-gray-700 data-[state=active]:text-white'
        ] : [
          'text-gray-600 hover:text-gray-900',
          'data-[state=active]:bg-white data-[state=active]:text-gray-900'
        ],
        className
      )}
      {...props}
    />
  );
});

Trigger.displayName = 'Tabs.Trigger';

// Content component with transitions and lazy loading
const Content = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  TabsContentProps
>(({ className, lazyLoad = true, preserveState = true, ...props }, ref) => {
  const { isDark } = useTheme();

  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'mt-2 ring-offset-background',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'data-[state=inactive]:animate-out data-[state=active]:animate-in',
        isDark ? 'text-gray-300' : 'text-gray-900',
        className
      )}
      {...props}
    />
  );
});

Content.displayName = 'Tabs.Content';

// Export compound component
export const Tabs = {
  Root,
  List,
  Trigger,
  Content,
};

// Default export for convenient importing
export default Tabs;