import './helpers/portal-patch.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import React from 'react';

// Helpers
import { render } from './helpers/render-helper.ts';

// UI components
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '../apps/web/src/components/ui/avatar.tsx';
import { Badge, badgeVariants } from '../apps/web/src/components/ui/badge.tsx';
import { Button, buttonVariants } from '../apps/web/src/components/ui/button.tsx';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../apps/web/src/components/ui/card.tsx';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../apps/web/src/components/ui/dialog.tsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuShortcut,
} from '../apps/web/src/components/ui/dropdown-menu.tsx';
import { Input } from '../apps/web/src/components/ui/input.tsx';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../apps/web/src/components/ui/popover.tsx';
import { Progress } from '../apps/web/src/components/ui/progress.tsx';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '../apps/web/src/components/ui/select.tsx';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
  sheetVariants,
} from '../apps/web/src/components/ui/sheet.tsx';
import { Skeleton } from '../apps/web/src/components/ui/skeleton.tsx';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from '../apps/web/src/components/ui/table.tsx';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '../apps/web/src/components/ui/tabs.tsx';
import { Textarea } from '../apps/web/src/components/ui/textarea.tsx';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../apps/web/src/components/ui/tooltip.tsx';

// ============================================================================
// SUITE 1: Dual-API Compatibility Verification
// ============================================================================
test('Suite 1: Dual-API Compatibility Verification', async (t) => {
  await t.test('1.1 Dialog direct-mode (as called in NewFeedbackModal.tsx & App.tsx)', () => {
    let closed = false;
    const { html: markupOpen } = render(
      React.createElement(
        Dialog,
        {
          open: true,
          onOpenChange: (val: boolean) => {
            if (!val) closed = true;
          },
        },
        React.createElement(
          DialogHeader,
          null,
          React.createElement(DialogTitle, null, 'Direct Title'),
          React.createElement(DialogDescription, null, 'Direct Description')
        ),
        React.createElement('div', { id: 'modal-body' }, 'Direct content body')
      )
    );

    assert.ok(markupOpen.includes('Direct Title'), 'Direct modal must render DialogTitle');
    assert.ok(markupOpen.includes('Direct Description'), 'Direct modal must render DialogDescription');
    assert.ok(markupOpen.includes('Direct content body'), 'Direct modal must render children');
    assert.ok(markupOpen.includes('aria-label="Close dialog"'), 'Direct modal must render automatic close button');
    assert.ok(markupOpen.includes('fixed inset-0 z-50 flex items-center justify-center'), 'Direct modal must have fixed backdrop centering container');

    // When open=false, direct mode must render null
    const { html: markupClosed } = render(
      React.createElement(
        Dialog,
        { open: false },
        React.createElement('div', null, 'Hidden content')
      )
    );
    assert.equal(markupClosed, '', 'Closed direct modal must render nothing');
  });

  await t.test('1.2 Dialog compound-mode (DialogTrigger + DialogContent)', () => {
    const { html: markupCompound } = render(
      React.createElement(
        Dialog,
        { open: true },
        React.createElement(
          DialogTrigger,
          { asChild: true },
          React.createElement('button', null, 'Open Dialog')
        ),
        React.createElement(
          DialogContent,
          null,
          React.createElement(DialogHeader, null, React.createElement(DialogTitle, null, 'Compound Title')),
          React.createElement(DialogClose, null, 'Cancel')
        )
      )
    );

    assert.ok(markupCompound.includes('Open Dialog'), 'Compound Dialog must render DialogTrigger');
    assert.ok(markupCompound.includes('Compound Title'), 'Compound Dialog must render DialogContent portaled');
    assert.ok(markupCompound.includes('Cancel'), 'Compound Dialog must render DialogClose button');
  });

  await t.test('1.3 Avatar direct-mode props (as called in FeedbackCard.tsx)', () => {
    // With valid src
    const { html: markupWithSrc } = render(
      React.createElement(Avatar, {
        src: 'https://example.com/avatar.jpg',
        alt: 'Alice Smith',
        fallback: 'Alice Smith',
        size: 'sm',
      })
    );
    assert.ok(markupWithSrc.includes('<img'), 'Avatar direct mode with src must render <img> tag');
    assert.ok(markupWithSrc.includes('src="https://example.com/avatar.jpg"'), 'Avatar <img> must contain src attribute');
    assert.ok(markupWithSrc.includes('alt="Alice Smith"'), 'Avatar <img> must contain alt attribute');
    assert.ok(markupWithSrc.includes('h-7 w-7 text-xs'), 'Avatar size="sm" must have size classes h-7 w-7 text-xs');

    // Without src (fallback slice)
    const { html: markupFallback } = render(
      React.createElement(Avatar, {
        src: null,
        fallback: 'Bob Johnson',
        size: 'lg',
      })
    );
    assert.ok(!markupFallback.includes('<img'), 'Avatar without src must not render <img> tag');
    assert.ok(markupFallback.includes('BO'), 'Avatar without src must render fallback initials ("Bob Johnson" -> "BO")');
    assert.ok(markupFallback.includes('h-11 w-11 text-base'), 'Avatar size="lg" must have size classes h-11 w-11 text-base');
  });

  await t.test('1.4 Avatar compound-mode (AvatarImage + AvatarFallback)', () => {
    const { html: markupCompound } = render(
      React.createElement(
        Avatar,
        { size: 'md' },
        React.createElement(AvatarImage, { src: 'https://example.com/charlie.png', alt: 'Charlie' }),
        React.createElement(AvatarFallback, null, 'CH')
      )
    );
    assert.ok(markupCompound.includes('<img'), 'Avatar compound mode must render AvatarImage');
    assert.ok(markupCompound.includes('CH'), 'Avatar compound mode initially renders AvatarFallback (before onLoad fires)');
  });
});

// ============================================================================
// SUITE 2: Headless Portal and Dismissal Behavior
// ============================================================================
test('Suite 2: Headless Portal and Dismissal Behavior', async (t) => {
  await t.test('2.1 Portaling verification to document.body', () => {
    // DialogContent uses createPortal(..., document.body)
    const { html: dialogMarkup } = render(
      React.createElement(
        Dialog,
        { open: true },
        React.createElement(DialogContent, null, 'Dialog Portaled')
      )
    );
    assert.ok(dialogMarkup.includes('Dialog Portaled'), 'DialogContent must render via portal');

    // DropdownMenuContent uses createPortal(..., document.body)
    const { html: dropdownMarkup } = render(
      React.createElement(
        DropdownMenu,
        { open: true },
        React.createElement(
          DropdownMenuContent,
          null,
          React.createElement(DropdownMenuItem, null, 'Item 1')
        )
      )
    );
    assert.ok(dropdownMarkup.includes('Item 1'), 'DropdownMenuContent must render via portal');

    // PopoverContent uses createPortal(..., document.body)
    const { html: popoverMarkup } = render(
      React.createElement(
        Popover,
        { open: true },
        React.createElement(PopoverContent, null, 'Popover Info')
      )
    );
    assert.ok(popoverMarkup.includes('Popover Info'), 'PopoverContent must render via portal');

    // SheetContent uses createPortal(..., document.body)
    const { html: sheetMarkup } = render(
      React.createElement(
        Sheet,
        { open: true },
        React.createElement(SheetContent, { side: 'right' }, 'Sheet Drawer Content')
      )
    );
    assert.ok(sheetMarkup.includes('Sheet Drawer Content'), 'SheetContent must render via portal');

    // Tooltip uses createPortal(..., document.body)
    const { html: tooltipMarkup } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          React.createElement(TooltipTrigger, null, React.createElement('button', null, 'Hover')),
          React.createElement(TooltipContent, null, 'Tooltip text')
        )
      )
    );
    assert.ok(tooltipMarkup.includes('Hover'), 'Tooltip must render trigger');
  });

  await t.test('2.2 Event listener attachment and cleanup contract in source code', () => {
    const dialogSrc = fs.readFileSync('apps/web/src/components/ui/dialog.tsx', 'utf-8');
    const dropdownSrc = fs.readFileSync('apps/web/src/components/ui/dropdown-menu.tsx', 'utf-8');
    const popoverSrc = fs.readFileSync('apps/web/src/components/ui/popover.tsx', 'utf-8');
    const sheetSrc = fs.readFileSync('apps/web/src/components/ui/sheet.tsx', 'utf-8');
    const tooltipSrc = fs.readFileSync('apps/web/src/components/ui/tooltip.tsx', 'utf-8');

    // Dialog listeners
    assert.ok(dialogSrc.includes("window.addEventListener('keydown', handleKeyDown)"), 'Dialog must attach keydown listener for Esc');
    assert.ok(dialogSrc.includes("window.removeEventListener('keydown', handleKeyDown)"), 'Dialog must remove keydown listener in cleanup');
    assert.ok(dialogSrc.includes("document.body.style.overflow = 'hidden'"), 'Dialog must lock body overflow when open');
    assert.ok(dialogSrc.includes("document.body.style.overflow = 'unset'"), 'Dialog must reset body overflow when closed/unmounted');

    // DropdownMenu listeners
    assert.ok(dropdownSrc.includes("document.addEventListener('pointerdown', handlePointerDown)"), 'DropdownMenu must attach pointerdown listener for outside click');
    assert.ok(dropdownSrc.includes("document.removeEventListener('pointerdown', handlePointerDown)"), 'DropdownMenu must remove pointerdown listener in cleanup');
    assert.ok(dropdownSrc.includes("document.addEventListener('keydown', handleKeyDown)"), 'DropdownMenu must attach keydown listener for Esc');
    assert.ok(dropdownSrc.includes("document.removeEventListener('keydown', handleKeyDown)"), 'DropdownMenu must remove keydown listener in cleanup');

    // Popover listeners
    assert.ok(popoverSrc.includes("document.addEventListener('pointerdown', handlePointerDown)"), 'Popover must attach pointerdown listener');
    assert.ok(popoverSrc.includes("document.removeEventListener('pointerdown', handlePointerDown)"), 'Popover must remove pointerdown listener in cleanup');
    assert.ok(popoverSrc.includes("document.addEventListener('keydown', handleKeyDown)"), 'Popover must attach keydown listener for Esc');
    assert.ok(popoverSrc.includes("document.removeEventListener('keydown', handleKeyDown)"), 'Popover must remove keydown listener in cleanup');

    // Sheet listeners
    assert.ok(sheetSrc.includes("window.addEventListener('keydown', handleKeyDown)"), 'Sheet must attach keydown listener for Esc');
    assert.ok(sheetSrc.includes("window.removeEventListener('keydown', handleKeyDown)"), 'Sheet must remove keydown listener in cleanup');
    assert.ok(sheetSrc.includes("document.body.style.overflow = 'hidden'"), 'Sheet must lock body overflow');
    assert.ok(sheetSrc.includes("document.body.style.overflow = 'unset'"), 'Sheet must reset body overflow in cleanup');

    // Tooltip timers
    assert.ok(tooltipSrc.includes('clearTimeout(enterTimer.current)'), 'Tooltip must clear enterTimer on unmount');
    assert.ok(tooltipSrc.includes('clearTimeout(leaveTimer.current)'), 'Tooltip must clear leaveTimer on unmount');
  });
});

// ============================================================================
// SUITE 3: Zero Dependencies on @radix-ui/* Packages
// ============================================================================
test('Suite 3: Zero Dependencies on @radix-ui/* Packages', async (t) => {
  await t.test('3.1 apps/web/package.json contains 0 @radix-ui packages', () => {
    const webPkg = JSON.parse(fs.readFileSync('apps/web/package.json', 'utf-8'));
    const allDeps = {
      ...webPkg.dependencies,
      ...webPkg.devDependencies,
      ...webPkg.peerDependencies,
    };
    const radixKeys = Object.keys(allDeps).filter((k) => k.startsWith('@radix-ui/'));
    assert.equal(radixKeys.length, 0, `apps/web/package.json must have 0 @radix-ui packages, found: ${radixKeys.join(', ')}`);
  });

  await t.test('3.2 Root package.json contains 0 @radix-ui packages', () => {
    const rootPkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const allDeps = {
      ...rootPkg.dependencies,
      ...rootPkg.devDependencies,
    };
    const radixKeys = Object.keys(allDeps).filter((k) => k.startsWith('@radix-ui/'));
    assert.equal(radixKeys.length, 0, `Root package.json must have 0 @radix-ui packages, found: ${radixKeys.join(', ')}`);
  });

  await t.test('3.3 UI component files contain 0 @radix-ui imports', () => {
    const uiDir = path.resolve('apps/web/src/components/ui');
    const files = fs.readdirSync(uiDir).filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));
    assert.equal(files.length, 17, 'Must have 16 components + index.ts');

    for (const f of files) {
      const content = fs.readFileSync(path.join(uiDir, f), 'utf-8');
      assert.ok(!content.includes('@radix-ui'), `${f} must not import from @radix-ui`);
    }
  });
});

// ============================================================================
// SUITE 4: Build and Lint Validation (EMPIRICAL ORACLE)
// ============================================================================
test('Suite 4: Build and Lint Validation (Oracle)', async (t) => {
  await t.test('4.1 Linter check: npm run lint -w @feedbackpulse/web', () => {
    try {
      const output = execSync('npm run lint -w @feedbackpulse/web', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      assert.ok(output.includes('0 errors'), 'Linter must complete with 0 errors');
    } catch (err: any) {
      assert.fail(`Linter failed unexpectedly: ${err.message}`);
    }
  });

  await t.test('4.2 Build check: npm run build -w @feedbackpulse/web EMPIRICAL STATUS', () => {
    let buildPassed = false;
    let buildErrorOutput = '';
    let exitCode = 0;

    try {
      execSync('npm run build -w @feedbackpulse/web', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      buildPassed = true;
    } catch (err: any) {
      exitCode = err.status || 1;
      buildErrorOutput = (err.stdout || '') + '\n' + (err.stderr || '');
    }

    console.log(`[EMPIRICAL TEST 4.2] npm run build exit code: ${exitCode}`);
    if (!buildPassed) {
      console.log(`[EMPIRICAL TEST 4.2] Errors detected in build:\n${buildErrorOutput.slice(0, 500)}...`);
    }

    assert.equal(
      buildPassed,
      true,
      'Empirical Oracle: npm run build -w @feedbackpulse/web must succeed with exit code 0'
    );
    assert.equal(exitCode, 0, 'Build exit code must be 0');
  });

  await t.test('4.3 Isolated UI components TypeScript check', () => {
    const uiDir = path.resolve('apps/web/src/components/ui');
    const files = fs
      .readdirSync(uiDir)
      .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
      .map((f) => `apps/web/src/components/ui/${f}`)
      .join(' ');

    let isolatedTscPassed = false;
    try {
      execSync(
        `npx --prefix apps/web tsc --noEmit --jsx react-jsx --skipLibCheck --target es2023 --module esnext --moduleResolution bundler ${files}`,
        {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      isolatedTscPassed = true;
    } catch (err: any) {
      isolatedTscPassed = false;
    }

    assert.equal(isolatedTscPassed, true, 'All 16 UI components in isolation have ZERO TypeScript errors');
  });
});

// ============================================================================
// SUITE 5: Adversarial Edge Cases & Failure Modes (Critic Challenges)
// ============================================================================
test('Suite 5: Adversarial Edge Cases & Failure Modes (Critic Challenges)', async (t) => {
  await t.test('5.1 REMEDIATED: Trigger onClick prop ordering and toggle preservation in DropdownMenuTrigger', () => {
    let customClicked = false;

    const element = React.createElement(
      DropdownMenu,
      null,
      React.createElement(
        DropdownMenuTrigger,
        {
          onClick: () => {
            customClicked = true;
          },
        },
        'Trigger Button'
      )
    );

    const { html: rendered } = render(element);
    assert.ok(rendered.includes('Trigger Button'), 'Rendered trigger button');

    // Inspect the component JSX in dropdown-menu.tsx:
    const dropdownSrc = fs.readFileSync('apps/web/src/components/ui/dropdown-menu.tsx', 'utf-8');
    const hasPropsAfterOnClick = /onClick=\{handleClick\}\s*\{...props\}/.test(dropdownSrc);
    assert.equal(
      hasPropsAfterOnClick,
      false,
      'REMEDIATED: DropdownMenuTrigger places {...props} before onClick={handleClick}, preserving both custom onClick and toggle'
    );
  });

  await t.test('5.2 REMEDIATED: Tooltip supports raw text TooltipTrigger without dropping wrapper', () => {
    const { html: markup } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          React.createElement(TooltipTrigger, null, 'Plain text trigger'),
          React.createElement(TooltipContent, null, 'Help text')
        )
      )
    );

    assert.ok(
      markup.includes('relative inline-flex') && markup.includes('Plain text trigger'),
      'REMEDIATED: Tooltip wraps raw text trigger in span preserving wrapper and tooltip functionality'
    );
  });

  await t.test('5.3 Progress boundary edge cases: negative, overflow, and zero max', () => {
    // Negative value clamps to 0%
    const { html: markupNegative } = render(
      React.createElement(Progress, { value: -25, max: 100 })
    );
    assert.ok(markupNegative.includes('translateX(-100%)'), 'Negative progress must clamp to 0% (translateX(-100%))');
    assert.ok(markupNegative.includes('aria-valuenow="0"'), 'aria-valuenow must clamp to 0');

    // Overflow value clamps to 100%
    const { html: markupOverflow } = render(
      React.createElement(Progress, { value: 150, max: 100 })
    );
    assert.ok(markupOverflow.includes('translateX(-0%)'), 'Overflow progress must clamp to 100% (translateX(-0%))');
    assert.ok(markupOverflow.includes('aria-valuenow="100"'), 'aria-valuenow must clamp to 100');

    // max <= 0 defaults to 100
    const { html: markupZeroMax } = render(
      React.createElement(Progress, { value: 50, max: 0 })
    );
    assert.ok(markupZeroMax.includes('aria-valuemax="100"'), 'max <= 0 must default to 100');
    assert.ok(markupZeroMax.includes('translateX(-50%)'), '50/100 must be 50%');
  });

  await t.test('5.4 Component Variants Completeness: Button & Badge', () => {
    // Button variants
    const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'glass'] as const;
    for (const v of variants) {
      const cls = buttonVariants({ variant: v });
      assert.ok(cls.length > 0, `Button variant ${v} must generate classes`);
      if (v === 'glass') {
        assert.ok(cls.includes('backdrop-blur-md'), 'Button glass variant must contain backdrop-blur-md');
      }
    }

    // Badge variants
    const badgeV = ['default', 'secondary', 'destructive', 'outline', 'success', 'warning', 'info', 'purple'] as const;
    for (const v of badgeV) {
      const cls = badgeVariants({ variant: v });
      assert.ok(cls.length > 0, `Badge variant ${v} must generate classes`);
    }
  });

  await t.test('5.5 Table, Tabs, Input, Textarea, Card, Skeleton rendering check', () => {
    // Table
    const { html: tableHtml } = render(
      React.createElement(
        Table,
        null,
        React.createElement(TableHeader, null, React.createElement(TableRow, null, React.createElement(TableHead, null, 'Col'))),
        React.createElement(TableBody, null, React.createElement(TableRow, null, React.createElement(TableCell, null, 'Val'))),
        React.createElement(TableFooter, null, React.createElement(TableRow, null, React.createElement(TableCell, null, 'Foot'))),
        React.createElement(TableCaption, null, 'Caption')
      )
    );
    assert.ok(tableHtml.includes('Col') && tableHtml.includes('Val') && tableHtml.includes('Caption'), 'Table primitives render correctly');

    // Tabs
    const { html: tabsHtml } = render(
      React.createElement(
        Tabs,
        { defaultValue: 'tab1' },
        React.createElement(
          TabsList,
          null,
          React.createElement(TabsTrigger, { value: 'tab1' }, 'Tab 1'),
          React.createElement(TabsTrigger, { value: 'tab2' }, 'Tab 2')
        ),
        React.createElement(TabsContent, { value: 'tab1' }, 'Content 1'),
        React.createElement(TabsContent, { value: 'tab2' }, 'Content 2')
      )
    );
    assert.ok(tabsHtml.includes('Content 1'), 'Active tab content renders');
    assert.ok(!tabsHtml.includes('Content 2'), 'Inactive tab content does not render');

    // Input & Textarea
    const { html: inputHtml } = render(React.createElement(Input, { placeholder: 'Type here' }));
    assert.ok(inputHtml.includes('placeholder="Type here"'), 'Input renders placeholder');

    const { html: textareaHtml } = render(React.createElement(Textarea, { placeholder: 'Write notes' }));
    assert.ok(textareaHtml.includes('placeholder="Write notes"'), 'Textarea renders placeholder');

    // Card & Skeleton
    const { html: cardHtml } = render(
      React.createElement(
        Card,
        null,
        React.createElement(CardHeader, null, React.createElement(CardTitle, null, 'Title'), React.createElement(CardDescription, null, 'Desc')),
        React.createElement(CardContent, null, React.createElement(Skeleton, { className: 'h-4 w-20' })),
        React.createElement(CardFooter, null, 'Footer')
      )
    );
    assert.ok(cardHtml.includes('animate-pulse'), 'Skeleton inside Card renders with animate-pulse');
  });

  await t.test('5.6 REMEDIATED: SelectValue unmounted option label resolution when closed', () => {
    const { html: selectHtml } = render(
      React.createElement(
        Select,
        { value: 'bug' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Select type' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'bug' }, 'Bug Report'),
          React.createElement(SelectItem, { value: 'feat' }, 'Feature Request')
        )
      )
    );
    assert.ok(
      selectHtml.includes('Bug Report'),
      'SelectValue must render human-readable option label ("Bug Report") rather than raw value ("bug") when closed'
    );
  });

  await t.test('5.7 REMEDIATED: Avatar compound loading overlay layout', () => {
    const { html: avatarHtml } = render(
      React.createElement(
        Avatar,
        null,
        React.createElement(AvatarImage, { src: 'https://example.com/photo.jpg', alt: 'Test' }),
        React.createElement(AvatarFallback, null, 'TT')
      )
    );
    assert.ok(avatarHtml.includes('absolute inset-0'), 'AvatarFallback and AvatarImage must use absolute inset-0 overlay layout');
  });
});
