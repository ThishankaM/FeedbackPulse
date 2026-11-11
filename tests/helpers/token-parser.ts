import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

export interface CssVariablesMap {
  [key: string]: string;
}

export interface ParsedStylesheets {
  indexCss: string;
  dashboardCss?: string;
  feedbackDrawerCss?: string;
  rootTokens: CssVariablesMap;
  darkTokens: CssVariablesMap;
}

export function loadAndParseStylesheets(): ParsedStylesheets {
  const indexCssPath = path.resolve(process.cwd(), 'apps/web/src/index.css');
  const dashboardCssPath = path.resolve(process.cwd(), 'apps/web/src/components/dashboard/dashboard.css');
  const feedbackDrawerCssPath = path.resolve(process.cwd(), 'apps/web/src/components/feedback/feedback-drawer.css');

  const indexCss = fs.readFileSync(indexCssPath, 'utf8');
  const dashboardCss = fs.existsSync(dashboardCssPath) ? fs.readFileSync(dashboardCssPath, 'utf8') : undefined;
  const feedbackDrawerCss = fs.existsSync(feedbackDrawerCssPath) ? fs.readFileSync(feedbackDrawerCssPath, 'utf8') : undefined;

  const rootTokens = extractVariables(indexCss, ':root');
  const darkTokens = extractVariables(indexCss, '.dark');

  return {
    indexCss,
    dashboardCss,
    feedbackDrawerCss,
    rootTokens,
    darkTokens,
  };
}

function extractVariables(css: string, selector: string): CssVariablesMap {
  const map: CssVariablesMap = {};
  // Match the selector block
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRegex = new RegExp(`${escaped}\\s*\\{([^}]+)\\}`, 'g');
  let match;
  while ((match = blockRegex.exec(css)) !== null) {
    const block = match[1];
    const varRegex = /(--[\w-]+)\s*:\s*([^;]+);/g;
    let varMatch;
    while ((varMatch = varRegex.exec(block)) !== null) {
      map[varMatch[1].trim()] = varMatch[2].trim();
    }
  }
  return map;
}

export function assertTokenExists(tokens: CssVariablesMap, tokenName: string, expectedValue?: string) {
  assert.ok(tokenName in tokens, `Expected token "${tokenName}" to exist in tokens map`);
  if (expectedValue !== undefined) {
    assert.equal(
      tokens[tokenName].toLowerCase(),
      expectedValue.toLowerCase(),
      `Expected token "${tokenName}" to be "${expectedValue}", got "${tokens[tokenName]}"`
    );
  }
}

export function assertGlassUtility(css: string, utilityName: string) {
  const pattern = new RegExp(`@utility\\s+${utilityName}\\b[^{]*\\{([^}]+)\\}`, 'i');
  assert.ok(pattern.test(css), `Expected @utility ${utilityName} in stylesheet`);
  const match = css.match(pattern);
  assert.ok(match, `Could not extract @utility ${utilityName}`);
  const body = match[1];
  assert.ok(/backdrop-filter:\s*blur/i.test(body), `${utilityName} must include backdrop-filter: blur`);
}

export function assertMediaQuery(css: string, query: string) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`@media\\s*\\([^)]*${escaped}[^)]*\\)`, 'i');
  assert.ok(pattern.test(css), `Expected media query containing "${query}" in stylesheet`);
}
