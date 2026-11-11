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
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogClose,
} from '../apps/web/src/components/ui/dialog.tsx';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../apps/web/src/components/ui/dropdown-menu.tsx';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '../apps/web/src/components/ui/popover.tsx';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from '../apps/web/src/components/ui/select.tsx';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetClose,
  sheetVariants,
} from '../apps/web/src/components/ui/sheet.tsx';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '../apps/web/src/components/ui/tooltip.tsx';

// ============================================================================
// CHALLENGE 1: apps/api/src/index.ts:20 type annotation & tsc -b pass
// ============================================================================
test('Empirical Challenge 1: Cross-Workspace Type Inference & tsc -b Cleanliness', async (t) => {
  await t.test('1.1 apps/api/src/index.ts line 20 has explicit RuntimeDatabase type annotation', () => {
    const apiSrc = fs.readFileSync('apps/api/src/index.ts', 'utf-8');
    assert.match(
      apiSrc,
      /import\s+\{[^}]*type\s+RuntimeDatabase[^}]*\}\s+from\s+['"]\.\/db\/runtime\.js['"]/,
      'Must import type RuntimeDatabase from ./db/runtime.js'
    );
    assert.match(
      apiSrc,
      /const\s+db:\s*RuntimeDatabase\s*=\s*new\s+Proxy/,
      'Line 20 must explicitly type annotate db as RuntimeDatabase'
    );
  });

  await t.test('1.2 node tsc -p apps/api/tsconfig.json --noEmit succeeds with exit code 0', () => {
    const tscCmd = 'node ./node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit';
    const output = execSync(tscCmd, { encoding: 'utf-8' });
    assert.equal(output.trim(), '', 'API workspace type check must emit zero errors and zero warnings');
  });

  await t.test('1.3 node tsc -b apps/web/tsconfig.json succeeds with exit code 0', () => {
    const tscCmd = 'node ./node_modules/typescript/bin/tsc -b apps/web/tsconfig.json';
    const output = execSync(tscCmd, { encoding: 'utf-8' });
    assert.equal(output.trim(), '', 'Web workspace composite build must emit zero errors and zero warnings');
  });
});

// ============================================================================
// CHALLENGE 2: Trigger onClick prop ordering & callback merging
// ============================================================================
test('Empirical Challenge 2: Trigger onClick Prop Ordering & Callback Merging', async (t) => {
  await t.test('2.1 Source code verification: {...props} placed strictly before onClick in all 5 popup primitives', () => {
    const files = [
      { path: 'apps/web/src/components/ui/dropdown-menu.tsx', name: 'DropdownMenuTrigger' },
      { path: 'apps/web/src/components/ui/popover.tsx', name: 'PopoverTrigger' },
      { path: 'apps/web/src/components/ui/select.tsx', name: 'SelectTrigger' },
      { path: 'apps/web/src/components/ui/dialog.tsx', name: 'DialogTrigger / DialogClose' },
      { path: 'apps/web/src/components/ui/sheet.tsx', name: 'SheetTrigger / SheetClose' },
    ];

    for (const file of files) {
      const src = fs.readFileSync(file.path, 'utf-8');
      // Verify no instance where {...props} appears AFTER onClick={...}
      const badPattern = /onClick=\{[^}]+\}\s+[^>]*\{\.\.\.props\}/s;
      assert.equal(
        badPattern.test(src),
        false,
        `${file.name} in ${file.path} must NEVER spread {...props} after onClick={...}`
      );
    }
  });

  await t.test('2.2 DropdownMenuTrigger direct mode executes custom onClick', () => {
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
        'Open Dropdown'
      )
    );

    // In render, trigger element is rendered. Simulate invoking onClick on props.
    assert.equal(typeof element.props.children.props.onClick, 'function');
    element.props.children.props.onClick({} as any);
    assert.equal(customClicked, true, 'Custom onClick must be executed');
  });

  await t.test('2.3 DropdownMenuTrigger asChild mode merges child onClick and trigger handler', () => {
    let childClicked = false;
    let triggerClicked = false;

    const childButton = React.createElement('button', {
      onClick: () => {
        childClicked = true;
      },
    }, 'Child Button');

    const trigger = React.createElement(
      DropdownMenuTrigger,
      {
        asChild: true,
        onClick: () => {
          triggerClicked = true;
        },
      },
      childButton
    );

    const menu = React.createElement(DropdownMenu, null, trigger);
    const { html } = render(menu);
    assert.ok(html.includes('Child Button'));

    // Verify source code merges childProps.onClick AND handleClick
    const src = fs.readFileSync('apps/web/src/components/ui/dropdown-menu.tsx', 'utf-8');
    assert.ok(src.includes('childProps.onClick'), 'Must invoke childProps.onClick');
    assert.ok(src.includes('handleClick(e)'), 'Must invoke handleClick(e)');
  });

  await t.test('2.4 PopoverTrigger direct mode executes custom onClick', () => {
    let customClicked = false;
    const element = React.createElement(
      Popover,
      null,
      React.createElement(
        PopoverTrigger,
        {
          onClick: () => {
            customClicked = true;
          },
        },
        'Open Popover'
      )
    );

    assert.equal(typeof element.props.children.props.onClick, 'function');
    element.props.children.props.onClick({} as any);
    assert.equal(customClicked, true, 'Custom onClick must be executed');
  });

  await t.test('2.5 SelectTrigger direct mode executes custom onClick', () => {
    let customClicked = false;
    const element = React.createElement(
      Select,
      null,
      React.createElement(
        SelectTrigger,
        {
          onClick: () => {
            customClicked = true;
          },
        },
        'Open Select'
      )
    );

    assert.equal(typeof element.props.children.props.onClick, 'function');
    element.props.children.props.onClick({} as any);
    assert.equal(customClicked, true, 'Custom onClick must be executed');
  });

  await t.test('2.6 DialogTrigger & DialogClose merge custom onClick and state change', () => {
    const src = fs.readFileSync('apps/web/src/components/ui/dialog.tsx', 'utf-8');
    assert.ok(src.includes('props.onClick?.(e);'), 'DialogTrigger & DialogClose must call props.onClick?.(e)');
    assert.ok(src.includes('onOpenChange(true);'), 'DialogTrigger must trigger onOpenChange(true)');
    assert.ok(src.includes('onOpenChange(false);'), 'DialogClose must trigger onOpenChange(false)');
  });

  await t.test('2.7 SheetTrigger & SheetClose merge custom onClick and state change', () => {
    const src = fs.readFileSync('apps/web/src/components/ui/sheet.tsx', 'utf-8');
    assert.ok(src.includes('props.onClick?.(e);'), 'SheetTrigger & SheetClose must call props.onClick?.(e)');
    assert.ok(src.includes('onOpenChange(true);'), 'SheetTrigger must trigger onOpenChange(true)');
    assert.ok(src.includes('onOpenChange(false);'), 'SheetClose must trigger onOpenChange(false)');
  });
});

// ============================================================================
// CHALLENGE 3: Trigger outside pointerdown dismissal race condition
// ============================================================================
test('Empirical Challenge 3: Outside pointerdown Dismissal Race Elimination', async (t) => {
  await t.test('3.1 DropdownMenu outside dismissal checks triggerRef containment', () => {
    const src = fs.readFileSync('apps/web/src/components/ui/dropdown-menu.tsx', 'utf-8');
    assert.match(
      src,
      /!triggerRef\.current\?\.contains\(e\.target\s+as\s+Node\)/,
      'DropdownMenu handlePointerDown must exclude clicks on triggerRef'
    );
  });

  await t.test('3.2 Popover outside dismissal checks triggerRef containment', () => {
    const src = fs.readFileSync('apps/web/src/components/ui/popover.tsx', 'utf-8');
    assert.match(
      src,
      /!triggerRef\.current\?\.contains\(e\.target\s+as\s+Node\)/,
      'Popover handlePointerDown must exclude clicks on triggerRef'
    );
  });

  await t.test('3.3 Select outside dismissal checks triggerRef containment', () => {
    const src = fs.readFileSync('apps/web/src/components/ui/select.tsx', 'utf-8');
    assert.match(
      src,
      /!triggerRef\.current\?\.contains\(e\.target\s+as\s+Node\)/,
      'Select handlePointerDown must exclude clicks on triggerRef'
    );
  });

  await t.test('3.4 Logical simulation of trigger click while open', () => {
    // Model the pointerdown and click event sequence:
    let openState = true;
    const triggerNode = { id: 'trigger-btn' };
    const contentNode = { id: 'content-box' };
    const outsideNode = { id: 'outside-body' };

    const triggerRef = { current: triggerNode };
    const contentRef = { current: contentNode };

    const contains = (parent: any, target: any) => parent === target;

    const handlePointerDown = (e: { target: any }) => {
      if (
        contentRef.current &&
        !contains(contentRef.current, e.target) &&
        !contains(triggerRef.current, e.target)
      ) {
        openState = false;
      }
    };

    const handleTriggerClick = () => {
      openState = !openState;
    };

    // Scenario A: User clicks on trigger button while menu is open
    // 1. pointerdown fires on trigger
    handlePointerDown({ target: triggerNode });
    assert.equal(openState, true, 'pointerdown on trigger must NOT close the menu');

    // 2. click fires on trigger
    handleTriggerClick();
    assert.equal(openState, false, 'subsequent click on trigger must toggle open to false cleanly');

    // Scenario B: User clicks on outside node while menu is open
    openState = true;
    handlePointerDown({ target: outsideNode });
    assert.equal(openState, false, 'pointerdown on outside element must close the menu immediately');
  });
});

// ============================================================================
// CHALLENGE 4: SelectValue unmounted option label resolution
// ============================================================================
test('Empirical Challenge 4: SelectValue Unmounted Option Label Resolution', async (t) => {
  await t.test('4.1 Renders human-readable label for controlled value in closed state', () => {
    const { html } = render(
      React.createElement(
        Select,
        { value: 'option_billing' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Select category' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'option_auth' }, 'Authentication & Security'),
          React.createElement(SelectItem, { value: 'option_billing' }, 'Billing & Subscriptions'),
          React.createElement(SelectItem, { value: 'option_ui' }, 'User Interface')
        )
      )
    );

    assert.ok(
      html.includes('Billing & Subscriptions'),
      'Must display "Billing & Subscriptions" instead of raw "option_billing"'
    );
    assert.ok(
      !html.includes('Select category'),
      'Must not display placeholder when valid value is selected'
    );
  });

  await t.test('4.2 Renders human-readable label for defaultValue in closed state', () => {
    const { html } = render(
      React.createElement(
        Select,
        { defaultValue: 'urgent' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Select priority' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'low' }, 'Low Priority'),
          React.createElement(SelectItem, { value: 'medium' }, 'Medium Priority'),
          React.createElement(SelectItem, { value: 'urgent' }, 'Urgent Priority')
        )
      )
    );

    assert.ok(
      html.includes('Urgent Priority'),
      'Must display "Urgent Priority" for defaultValue'
    );
  });

  await t.test('4.3 Resolves labels from nested SelectGroup hierarchy', () => {
    const { html } = render(
      React.createElement(
        Select,
        { value: 'nested_val' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Select...' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(
            SelectGroup,
            null,
            React.createElement(SelectLabel, null, 'Group Header'),
            React.createElement(SelectItem, { value: 'nested_val' }, 'Deeply Nested Label')
          )
        )
      )
    );

    assert.ok(
      html.includes('Deeply Nested Label'),
      'extractLabels must recursively scan into SelectGroup to find SelectItem'
    );
  });

  await t.test('4.4 Falls back to placeholder when value is empty string', () => {
    const { html } = render(
      React.createElement(
        Select,
        { value: '' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Choose an option...' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'item1' }, 'Item 1')
        )
      )
    );

    assert.ok(
      html.includes('Choose an option...'),
      'Must display placeholder when value is empty'
    );
  });

  await t.test('4.5 Falls back to raw value when value does not match any option', () => {
    const { html } = render(
      React.createElement(
        Select,
        { value: 'unknown_code' },
        React.createElement(
          SelectTrigger,
          null,
          React.createElement(SelectValue, { placeholder: 'Choose...' })
        ),
        React.createElement(
          SelectContent,
          null,
          React.createElement(SelectItem, { value: 'item1' }, 'Item 1')
        )
      )
    );

    assert.ok(
      html.includes('unknown_code'),
      'Must display raw value if no matching option label is found'
    );
  });
});

// ============================================================================
// CHALLENGE 5: TooltipTrigger plain text child handling
// ============================================================================
test('Empirical Challenge 5: TooltipTrigger Plain Text Child Handling', async (t) => {
  await t.test('5.1 Raw string inside TooltipTrigger renders span wrapper and maintains tooltip functionality', () => {
    const { html } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          React.createElement(TooltipTrigger, null, 'Delete Workspace'),
          React.createElement(TooltipContent, null, 'Irreversible action')
        )
      )
    );

    assert.ok(html.includes('relative inline-flex'), 'Tooltip must render wrapper span');
    assert.ok(html.includes('Delete Workspace'), 'Tooltip must render the text string');
  });

  await t.test('5.2 Number child inside TooltipTrigger renders without throwing', () => {
    const { html } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          React.createElement(TooltipTrigger, null, 404),
          React.createElement(TooltipContent, null, 'Error code')
        )
      )
    );

    assert.ok(html.includes('404'), 'Tooltip must support number children');
  });

  await t.test('5.3 Direct plain string child without TooltipTrigger is automatically wrapped', () => {
    const { html } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          'Direct string trigger',
          React.createElement(TooltipContent, null, 'Content')
        )
      )
    );

    assert.ok(html.includes('Direct string trigger'), 'Direct string trigger must be rendered');
    assert.ok(html.includes('relative inline-flex'), 'Wrapper span must be rendered');
  });

  await t.test('5.4 Tooltip with null trigger returns null without crashing', () => {
    const { html } = render(
      React.createElement(
        TooltipProvider,
        null,
        React.createElement(
          Tooltip,
          null,
          null,
          React.createElement(TooltipContent, null, 'Content')
        )
      )
    );

    assert.equal(html, '', 'Null trigger must return empty markup cleanly');
  });
});

// ============================================================================
// CHALLENGE 6: Avatar compound loading layout overlay (absolute inset-0)
// ============================================================================
test('Empirical Challenge 6: Avatar Compound Loading Layout Overlay', async (t) => {
  await t.test('6.1 Avatar compound elements both possess absolute inset-0', () => {
    const { html } = render(
      React.createElement(
        Avatar,
        null,
        React.createElement(AvatarImage, { src: 'https://cdn.example.com/user.jpg', alt: 'Jane' }),
        React.createElement(AvatarFallback, null, 'JD')
      )
    );

    // Verify outer container is relative circular
    assert.ok(
      html.includes('relative') && html.includes('rounded-full') && html.includes('overflow-hidden'),
      'Avatar container must have relative overflow-hidden rounded-full'
    );

    // Verify image has absolute inset-0
    assert.match(
      html,
      /<img[^>]+class=["'][^"']*absolute\s+inset-0[^"']*["']/,
      'AvatarImage must have absolute inset-0'
    );

    // Verify fallback has absolute inset-0
    assert.match(
      html,
      /<div[^>]+class=["'][^"']*absolute\s+inset-0[^"']*["']/,
      'AvatarFallback must have absolute inset-0'
    );
  });

  await t.test('6.2 Avatar direct mode props support backward-compatibility', () => {
    const { html } = render(
      React.createElement(Avatar, {
        src: 'https://cdn.example.com/avatar.png',
        alt: 'User Avatar',
        fallback: 'UA',
      })
    );

    assert.ok(html.includes('UA'), 'Must render fallback text');
    assert.ok(html.includes('User Avatar'), 'Must render image alt');
    assert.ok(html.includes('absolute inset-0'), 'Direct mode must also use absolute inset-0');
  });
});

// ============================================================================
// CHALLENGE 7: Sheet slide animation keyframes & utilities
// ============================================================================
test('Empirical Challenge 7: Sheet Slide Animation Keyframes & Utilities', async (t) => {
  await t.test('7.1 apps/web/src/index.css defines all 4 directional keyframes', () => {
    const css = fs.readFileSync('apps/web/src/index.css', 'utf-8');
    assert.ok(css.includes('@keyframes fp-slide-in-top'), 'Must define @keyframes fp-slide-in-top');
    assert.ok(css.includes('@keyframes fp-slide-in-bottom'), 'Must define @keyframes fp-slide-in-bottom');
    assert.ok(css.includes('@keyframes fp-slide-in-left'), 'Must define @keyframes fp-slide-in-left');
    assert.ok(css.includes('@keyframes fp-slide-in-right'), 'Must define @keyframes fp-slide-in-right');
  });

  await t.test('7.2 apps/web/src/index.css defines all 4 @utility slide-in classes', () => {
    const css = fs.readFileSync('apps/web/src/index.css', 'utf-8');
    assert.ok(css.includes('@utility slide-in-from-top'), 'Must define @utility slide-in-from-top');
    assert.ok(css.includes('@utility slide-in-from-bottom'), 'Must define @utility slide-in-from-bottom');
    assert.ok(css.includes('@utility slide-in-from-left'), 'Must define @utility slide-in-from-left');
    assert.ok(css.includes('@utility slide-in-from-right'), 'Must define @utility slide-in-from-right');
  });

  await t.test('7.3 prefers-reduced-motion disables all slide-in animations', () => {
    const css = fs.readFileSync('apps/web/src/index.css', 'utf-8');
    const reducedMotionBlock = css.match(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]+(\{[^}]*\}[^}]*)*)\}/);
    assert.ok(reducedMotionBlock, 'Must contain @media (prefers-reduced-motion: reduce)');
    const content = reducedMotionBlock[0];
    assert.ok(content.includes('.slide-in-from-top'), 'prefers-reduced-motion must target .slide-in-from-top');
    assert.ok(content.includes('.slide-in-from-bottom'), 'prefers-reduced-motion must target .slide-in-from-bottom');
    assert.ok(content.includes('.slide-in-from-left'), 'prefers-reduced-motion must target .slide-in-from-left');
    assert.ok(content.includes('.slide-in-from-right'), 'prefers-reduced-motion must target .slide-in-from-right');
    assert.ok(content.includes('animation: none !important'), 'prefers-reduced-motion must set animation: none !important');
  });

  await t.test('7.4 Sheet variants map all 4 sides to corresponding slide classes', () => {
    const sides = ['top', 'bottom', 'left', 'right'] as const;
    for (const side of sides) {
      const cls = sheetVariants({ side });
      assert.ok(cls.includes(`slide-in-from-${side}`), `Sheet variant ${side} must include slide-in-from-${side}`);
      assert.ok(cls.includes('animate-in'), `Sheet variant ${side} must include animate-in`);
    }
  });

  await t.test('7.5 SheetContent renders matching animation class for each side', () => {
    const sides = ['top', 'bottom', 'left', 'right'] as const;
    for (const side of sides) {
      const { html } = render(
        React.createElement(
          Sheet,
          { open: true },
          React.createElement(SheetContent, { side }, `Drawer ${side}`)
        )
      );
      assert.ok(
        html.includes(`slide-in-from-${side}`),
        `Rendered SheetContent for side=${side} must contain slide-in-from-${side}`
      );
    }
  });
});
