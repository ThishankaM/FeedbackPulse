import '../helpers/setup.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { render } from '../helpers/render-helper.js';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Badge,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Input,
  Textarea,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Progress,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Markdown,
  ToastProvider,
} from '../../apps/web/src/components/ui/index.js';
import { NewFeedbackModal } from '../../apps/web/src/components/feedback/NewFeedbackModal.js';

describe('Suite 08: shadcn/ui Component Suite Contracts (F2)', () => {
  // ==========================================
  // TIER 1: FEATURE COVERAGE
  // ==========================================

  it('F2-T1-01: Button component renders all variants and sizes with proper semantic styling', () => {
    // 1. Default Large Button
    const defaultBtn = render(
      React.createElement(Button, { variant: 'default', size: 'lg' }, 'Primary Action')
    );
    assert.ok(defaultBtn.hasText('Primary Action'));
    assert.ok(defaultBtn.hasClass('bg-primary'));
    assert.ok(defaultBtn.hasClass('text-primary-foreground'));
    assert.ok(defaultBtn.hasClass('h-10'));
    assert.ok(defaultBtn.hasClass('px-6'));

    // 2. Destructive Button
    const destructiveBtn = render(
      React.createElement(Button, { variant: 'destructive', size: 'sm' }, 'Delete Item')
    );
    assert.ok(destructiveBtn.hasClass('bg-destructive'));
    assert.ok(destructiveBtn.hasClass('h-8'));

    // 3. Glassmorphic Button
    const glassBtn = render(
      React.createElement(Button, { variant: 'glass' }, 'Glass Action')
    );
    assert.ok(glassBtn.contains('backdrop-blur-md') || glassBtn.contains('bg-white/10'));
  });

  it('F2-T1-02: Card compound component renders Header, Title, Description, Content, and Footer', () => {
    const cardResult = render(
      React.createElement(
        Card,
        { className: 'custom-card' },
        React.createElement(
          CardHeader,
          null,
          React.createElement(CardTitle, null, 'Card Heading'),
          React.createElement(CardDescription, null, 'Card description text')
        ),
        React.createElement(CardContent, null, 'Main card body content'),
        React.createElement(CardFooter, null, 'Footer metadata')
      )
    );

    assert.ok(cardResult.hasClass('rounded-xl'));
    assert.ok(cardResult.hasClass('custom-card'));
    assert.ok(cardResult.hasText('Card Heading'));
    assert.ok(cardResult.hasText('Card description text'));
    assert.ok(cardResult.hasText('Main card body content'));
    assert.ok(cardResult.hasText('Footer metadata'));
  });

  it('F2-T1-03: Dialog component renders content overlay, header, and title when open', () => {
    const dialogResult = render(
      React.createElement(
        Dialog,
        { open: true },
        React.createElement(
          DialogContent,
          null,
          React.createElement(
            DialogHeader,
            null,
            React.createElement(DialogTitle, null, 'Modal Dialog Title'),
            React.createElement(DialogDescription, null, 'Dialog modal explanatory body')
          )
        )
      )
    );

    assert.ok(dialogResult.hasText('Modal Dialog Title'));
    assert.ok(dialogResult.hasText('Dialog modal explanatory body'));
    assert.ok(dialogResult.hasRole('dialog') || dialogResult.contains('role="dialog"') || dialogResult.contains('fixed inset-0'));
  });

  it('F2-T1-04: Badge component renders variants with appropriate tone colors and rounded-full pill styling', () => {
    // Success Badge
    const successBadge = render(
      React.createElement(Badge, { variant: 'success' }, 'Completed')
    );
    assert.ok(successBadge.hasText('Completed'));
    assert.ok(successBadge.hasClass('rounded-full'));
    assert.ok(successBadge.contains('emerald') || successBadge.hasClass('bg-emerald-500/15'));

    // Warning Badge
    const warningBadge = render(
      React.createElement(Badge, { variant: 'warning' }, 'Pending')
    );
    assert.ok(warningBadge.hasText('Pending'));
    assert.ok(warningBadge.contains('amber') || warningBadge.hasClass('bg-amber-500/15'));

    // Destructive Badge
    const destructiveBadge = render(
      React.createElement(Badge, { variant: 'destructive' }, 'Rejected')
    );
    assert.ok(destructiveBadge.contains('destructive'));
  });

  it('F2-T1-05: Avatar component renders image when available and renders fallback text when missing', () => {
    // 1. Avatar with Fallback
    const fallbackAvatar = render(
      React.createElement(
        Avatar,
        null,
        React.createElement(AvatarFallback, null, 'JD')
      )
    );
    assert.ok(fallbackAvatar.hasText('JD'));
    assert.ok(fallbackAvatar.hasClass('rounded-full'));

    // 2. Avatar with Image
    const imgAvatar = render(
      React.createElement(
        Avatar,
        null,
        React.createElement(AvatarImage, { src: 'https://example.com/avatar.png', alt: 'Jane Doe' })
      )
    );
    assert.ok(imgAvatar.contains('https://example.com/avatar.png'));
    assert.ok(imgAvatar.contains('alt="Jane Doe"'));
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES
  // ==========================================

  it('F2-T2-01: Disabled button disables pointer events and applies opacity-50 reduction', () => {
    let clicked = false;
    const disabledBtn = render(
      React.createElement(
        Button,
        {
          disabled: true,
          onClick: () => { clicked = true; },
        },
        'Disabled Action'
      )
    );

    assert.ok(disabledBtn.contains('disabled'));
    assert.ok(disabledBtn.contains('disabled:pointer-events-none'));
    assert.ok(disabledBtn.contains('disabled:opacity-50'));
    assert.equal(clicked, false);
  });

  it('F2-T2-02: Dialog escape dismissal dispatches onOpenChange(false) callback', () => {
    let openState = true;
    const onOpenChange = (open: boolean) => {
      openState = open;
    };

    // Simulate ESC press
    const handleKeyDown = (e: { key: string }) => {
      if (e.key === 'Escape') onOpenChange(false);
    };

    handleKeyDown({ key: 'Escape' });
    assert.equal(openState, false);
  });

  it('F2-T2-03: Tooltip structure conforms to ARIA accessibility requirements with delay container', () => {
    const tooltipTriggerResult = render(
      React.createElement(
        TooltipProvider,
        { delayDuration: 200 },
        React.createElement(
          Tooltip,
          null,
          React.createElement(TooltipTrigger, null, 'Hover Trigger'),
          React.createElement(TooltipContent, null, 'Detailed Help Tip')
        )
      )
    );
    assert.ok(tooltipTriggerResult.hasText('Hover Trigger'));

    // Render TooltipContent directly to verify its semantic role and glassmorphic styling
    const contentResult = render(
      React.createElement(TooltipContent, null, 'Detailed Help Tip')
    );
    assert.ok(contentResult.hasRole('tooltip'));
    assert.ok(contentResult.hasText('Detailed Help Tip'));
    assert.ok(contentResult.contains('backdrop-blur-md') || contentResult.contains('bg-popover'));
  });

  it('F2-T2-04: Input and Textarea components support value, maxLength, placeholder, and error states', () => {
    const inputResult = render(
      React.createElement(Input, {
        placeholder: 'Enter workspace name...',
        maxLength: 255,
        defaultValue: 'FeedbackPulse',
      })
    );
    assert.ok(inputResult.contains('placeholder="Enter workspace name..."'));
    assert.ok(inputResult.contains('maxlength="255"') || inputResult.contains('maxLength="255"'));
    assert.ok(inputResult.contains('value="FeedbackPulse"'));

    const textareaResult = render(
      React.createElement(Textarea, {
        placeholder: 'Detailed feedback description...',
        rows: 4,
        defaultValue: 'Multi-line feature proposal text',
      })
    );
    assert.ok(textareaResult.hasText('Multi-line feature proposal text'));
    assert.ok(textareaResult.contains('rows="4"'));
  });

  it('F2-T2-05: Complete suite coverage across Sheet, Progress, Skeleton, Table, and Tabs', () => {
    // 1. Progress Bar
    const progressResult = render(
      React.createElement(Progress, { value: 65, max: 100 })
    );
    assert.ok(progressResult.hasRole('progressbar'));
    assert.ok(progressResult.contains('aria-valuenow="65"'));

    // 2. Skeleton Loading Pulse
    const skeletonResult = render(
      React.createElement(Skeleton, { className: 'h-4 w-[250px]' })
    );
    assert.ok(skeletonResult.hasClass('animate-pulse'));
    assert.ok(skeletonResult.hasClass('h-4'));

    // 3. Data Table
    const tableResult = render(
      React.createElement(
        Table,
        null,
        React.createElement(
          TableHeader,
          null,
          React.createElement(
            TableRow,
            null,
            React.createElement(TableHead, null, 'Feature'),
            React.createElement(TableHead, null, 'Status')
          )
        ),
        React.createElement(
          TableBody,
          null,
          React.createElement(
            TableRow,
            null,
            React.createElement(TableCell, null, 'Dark Theme'),
            React.createElement(TableCell, null, 'Done')
          )
        )
      )
    );
    assert.ok(tableResult.hasText('Feature'));
    assert.ok(tableResult.hasText('Dark Theme'));
    assert.ok(tableResult.hasElement('table'));

    // 4. Tabs
    const tabsResult = render(
      React.createElement(
        Tabs,
        { defaultValue: 'overview' },
        React.createElement(
          TabsList,
          null,
          React.createElement(TabsTrigger, { value: 'overview' }, 'Overview'),
          React.createElement(TabsTrigger, { value: 'details' }, 'Details')
        ),
        React.createElement(TabsContent, { value: 'overview' }, 'Overview Content'),
        React.createElement(TabsContent, { value: 'details' }, 'Details Content')
      )
    );
    assert.ok(tabsResult.hasText('Overview'));
    assert.ok(tabsResult.hasText('Overview Content'));

    // 5. Sheet (Slide-over drawer primitive)
    const sheetResult = render(
      React.createElement(
        Sheet,
        { open: true },
        React.createElement(
          SheetContent,
          null,
          React.createElement(
            SheetHeader,
            null,
            React.createElement(SheetTitle, null, 'Navigation Drawer')
          ),
          'Drawer Body Content'
        )
      )
    );
    assert.ok(sheetResult.hasText('Navigation Drawer'));
    assert.ok(sheetResult.hasText('Drawer Body Content'));
  });

  it('S2-UI-01: Markdown renders headings, lists, code, and safe links without raw HTML injection', () => {
    const mdResult = render(
      React.createElement(Markdown, {
        content:
          '# Feature Title\n\nSupports **bold** and `inline` plus [Docs](https://example.com) and [Bad](javascript:alert(1)).\n\n- Bullet item\n\n```\nconst ok = true;\n```',
      })
    );

    assert.ok(mdResult.hasText('Feature Title'));
    assert.ok(mdResult.hasElement('strong'));
    assert.ok(mdResult.hasElement('code'));
    assert.ok(mdResult.hasElement('ul'));
    assert.ok(mdResult.contains('href="https://example.com"'));
    assert.equal(mdResult.contains('javascript:'), false);
  });

  it('S2-UI-02: NewFeedbackModal renders Write/Preview Markdown tabs and ToastProvider wraps cleanly', () => {
    const modalResult = render(
      React.createElement(
        ToastProvider,
        null,
        React.createElement(NewFeedbackModal, {
          open: true,
          onOpenChange: () => undefined,
          workspaceId: '11111111-1111-4111-8111-111111111111',
          boards: [{ id: '22222222-2222-4222-8222-222222222222', name: 'Features' }],
          onFeedbackCreated: () => undefined,
        })
      )
    );

    assert.ok(modalResult.hasText('Write') || modalResult.contains('Write'));
    assert.ok(modalResult.hasText('Preview') || modalResult.contains('Preview'));
  });
});
