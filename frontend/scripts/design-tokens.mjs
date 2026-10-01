#!/usr/bin/env node
/**
 * Design-token single source of truth.
 *
 * `frontend/src/app/globals.css` (`:root` = light, `.dark` = dark) is the source
 * of truth for every runtime token value. This script derives the two design
 * exports from it so they can never drift:
 *
 *   frontend/design-tokens.json        — DTCG-style tokens with light/dark modes
 *   frontend/amana-figma-variables.json — Figma variables export (light/dark modes)
 *
 * Usage:
 *   node scripts/design-tokens.mjs           # alias for --check
 *   node scripts/design-tokens.mjs --check   # fail if the exports are stale
 *   node scripts/design-tokens.mjs --write   # regenerate the exports
 *
 * Only the generated parts are touched: `themes` + `colors` in design-tokens.json
 * and `amana-colors` in the Figma export. Hand-authored sections (spacing,
 * typography, radii, shadows) and every `$description` are preserved verbatim.
 *
 * Dependency-free (node:fs / node:path only).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND = path.resolve(HERE, '..');
const CSS_PATH = path.join(FRONTEND, 'src', 'app', 'globals.css');
const TOKENS_PATH = path.join(FRONTEND, 'design-tokens.json');
const FIGMA_PATH = path.join(FRONTEND, 'amana-figma-variables.json');

const TOKENS_DESCRIPTION =
  'Canonical design tokens for the Amana frontend. Every value in `themes` is the ' +
  'exact value of the matching custom property in `src/app/globals.css` (`:root` = ' +
  'light, `.dark` = dark); `colors` restates each token with both modes. ' +
  'Regenerate with `node scripts/design-tokens.mjs --write` — CI runs `--check` and ' +
  'fails if this file and globals.css disagree.';
const FIGMA_DESCRIPTION =
  'Figma variables export — one mode per theme, matching frontend/design-tokens.json ' +
  'and the custom properties in src/app/globals.css. Regenerate with ' +
  '`node scripts/design-tokens.mjs --write`; CI runs `--check` and fails if this file ' +
  'is stale.';

// ── globals.css parsing ────────────────────────────────────────────────────────

function blockAfter(css, selector) {
  const at = css.indexOf(`${selector} {`);
  if (at === -1) throw new Error(`selector \`${selector}\` not found in globals.css`);
  let depth = 0;
  for (let i = css.indexOf('{', at); i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(css.indexOf('{', at) + 1, i);
    }
  }
  throw new Error(`unterminated block for \`${selector}\``);
}

function parseDeclarations(block) {
  const out = [];
  let group = null;
  for (const rawLine of block.split('\n')) {
    const line = rawLine.trim();
    const comment = /^\/\*\s*(.+?)\s*\*\/$/.exec(line);
    if (comment) {
      group = comment[1].replace(/[─\-]+/g, ' ').replace(/\s+/g, ' ').trim();
      continue;
    }
    const decl = /^(--[a-z0-9-]+):\s*(.+?);$/.exec(line);
    if (decl) out.push({ name: decl[1], value: decl[2], group: group ?? 'misc' });
  }
  return out;
}

function parseCss() {
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const light = parseDeclarations(blockAfter(css, ':root'));
  const dark = parseDeclarations(blockAfter(css, '.dark'));
  if (light.length === 0) throw new Error('no custom properties found in :root');
  const darkNames = new Set(dark.map((d) => d.name));
  for (const { name } of light) {
    if (!darkNames.has(name)) throw new Error(`token \`${name}\` is defined for light but not dark`);
  }
  if (dark.length !== light.length) {
    throw new Error(`light has ${light.length} tokens but dark has ${dark.length}`);
  }
  const themeBlock = blockAfter(css, '@theme inline');
  const wired = new Set(
    [...themeBlock.matchAll(/^\s*(--color-[a-z0-9-]+):\s*var\((--[a-z0-9-]+)\);$/gm)].map((m) => m[2]),
  );
  return { light, dark, wired };
}

// ── generation ─────────────────────────────────────────────────────────────────

// Shadows and scrollbar internals are not colours and are not exposed through
// the `@theme inline` colour namespace.
const needsThemeColor = (name) => !name.startsWith('--shadow-') && !name.startsWith('--scrollbar-');

// `var(--surface-2)` → `surface-2` (token reference text, without the `--`).
function aliasTarget(value) {
  const m = /^var\(--([a-z0-9-]+)\)$/.exec(value);
  return m ? m[1] : null;
}

function modeValue(lightValue, darkValue) {
  const lightAlias = aliasTarget(lightValue);
  const darkAlias = aliasTarget(darkValue);
  // An alias that resolves to the same token in both modes stays a token
  // reference (DTCG `{group.token}`) instead of being frozen to a literal.
  if (lightAlias && lightAlias === darkAlias) {
    return { light: `{${lightAlias}}`, dark: `{${darkAlias}}` };
  }
  return { light: lightValue, dark: darkValue };
}

// Roles of the runtime tokens, used for tokens that have no `$description` yet.
// Once a description exists in design-tokens.json, that one is preserved.
const SEED_DESCRIPTIONS = {
  'surface-0': 'Page canvas — deepest background',
  'surface-1': 'Card / panel surface',
  'surface-2': 'Elevated surface — active rows, modals, dropdowns',
  'surface-3': 'Overlay / modal scrim',
  gold: 'Primary CTA, locked funds, highlights',
  'gold-hover': 'Gold hover state',
  'gold-muted': 'Gold tinted backgrounds',
  emerald: 'Success, verified, delivered',
  'emerald-muted': 'Emerald tinted backgrounds',
  'text-primary': 'Headings, strong emphasis',
  'text-secondary': 'Body text, descriptions',
  'text-muted': 'Metadata, labels, placeholders',
  'text-inverse': 'Text on primary/CTA backgrounds',
  'status-success': 'Delivered, released, completed',
  'status-warning': 'In transit, pending action',
  'status-danger': 'Disputed, errors, rejected',
  'status-info': 'Informational, tips',
  'status-locked': 'Funds locked in escrow',
  'status-draft': 'Draft, inactive',
  'border-subtle': 'Hairline separators',
  'border-default': 'Default card/input borders',
  'border-raised': 'Raised surfaces and controls',
  'border-hover': 'Hover state borders',
  'border-focus': 'Focused input borders',
  'shadow-elev-1': 'Elevation 1 — resting cards',
  'shadow-elev-2': 'Elevation 2 — hovered cards',
  'shadow-elev-3': 'Elevation 3 — modals and popovers',
  'bg-input': 'Input field backgrounds',
  'skeleton-base': 'Skeleton placeholder fill',
  'skeleton-sheen': 'Skeleton shimmer sheen',
  'scrollbar-track': 'Scrollbar track',
  'scrollbar-thumb': 'Scrollbar thumb',
  'scrollbar-thumb-hover': 'Scrollbar thumb, hovered',
  'bg-primary': 'Alias of surface-0 (legacy name kept for existing utilities)',
  'bg-card': 'Alias of surface-1 (legacy name kept for existing utilities)',
  'bg-elevated': 'Alias of surface-2 (legacy name kept for existing utilities)',
  'bg-overlay': 'Alias of surface-3 (legacy name kept for existing utilities)',
};

function buildTokens(existing, css) {
  const darkByName = new Map(css.dark.map((d) => [d.name, d.value]));
  const previous = existing.colors ?? {};
  const colors = {};
  for (const { name, value } of css.light) {
    const key = name.replace(/^--/, '');
    const entry = {
      $type: name.startsWith('--shadow-') ? 'shadow' : 'color',
      $value: modeValue(value, darkByName.get(name)),
      $css: name,
      $description: previous[key]?.$description ?? SEED_DESCRIPTIONS[key] ?? `${name} (see src/app/globals.css)`,
    };
    colors[key] = entry;
  }
  const themes = { light: {}, dark: {} };
  for (const { name, value } of css.light) themes.light[name] = value;
  for (const { name, value } of css.dark) themes.dark[name] = value;

  const next = {
    $schema: 'https://design-tokens.org/format/2024',
    $description: TOKENS_DESCRIPTION,
    themes,
    colors,
  };
  // Preserve every hand-authored section and its key order.
  for (const [key, val] of Object.entries(existing)) {
    if (key === '$schema' || key === '$description' || key === 'themes' || key === 'colors') continue;
    next[key] = val;
  }
  return next;
}

function buildFigma(existing, tokens) {
  const colors = {};
  for (const [name, token] of Object.entries(tokens.colors)) {
    colors[name] = {
      $type: token.$type,
      $value: token.$value,
      ...(token.$description ? { $description: token.$description } : {}),
    };
  }
  const next = {};
  for (const [key, val] of Object.entries(existing)) {
    if (key === 'amana-colors') continue;
    next[key] = val;
  }
  return { $description: FIGMA_DESCRIPTION, 'amana-colors': colors, ...next };
}

const serialize = (obj) => `${JSON.stringify(obj, null, 2)}\n`;

function firstDiff(a, b, trail = '') {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
    return `${trail || '(root)'}: on disk ${JSON.stringify(a)} vs generated ${JSON.stringify(b)}`;
  }
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const diff = firstDiff(a[key], b[key], trail ? `${trail}.${key}` : key);
    if (diff) return diff;
  }
  return null;
}

// ── main ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const mode = args.includes('--write') ? 'write' : 'check';
const css = parseCss();

for (const { name } of css.light) {
  if (needsThemeColor(name) && !css.wired.has(name)) {
    console.error(`design-tokens: \`${name}\` is missing its \`--color-${name.slice(2)}: var(${name})\` mapping in the @theme inline block.`);
    process.exit(1);
  }
}

const tokens = buildTokens(JSON.parse(fs.readFileSync(TOKENS_PATH, 'utf8')), css);
const figma = buildFigma(JSON.parse(fs.readFileSync(FIGMA_PATH, 'utf8')), tokens);

const targets = [
  [TOKENS_PATH, serialize(tokens)],
  [FIGMA_PATH, serialize(figma)],
];

if (mode === 'write') {
  for (const [file, text] of targets) fs.writeFileSync(file, text);
  console.log(`design-tokens: wrote ${targets.length} files (${css.light.length} tokens, ${css.wired.size} @theme mappings)`);
} else {
  let stale = 0;
  for (const [file, text] of targets) {
    const disk = fs.readFileSync(file, 'utf8');
    if (disk === text) continue;
    stale++;
    const diff = firstDiff(JSON.parse(disk), JSON.parse(text));
    console.error(`${path.relative(FRONTEND, file)} is out of sync with globals.css`);
    if (diff) console.error(`  first difference — ${diff}`);
    console.error(`  run: node scripts/design-tokens.mjs --write`);
  }
  if (stale) process.exit(1);
  console.log(`design-tokens: OK (${css.light.length} tokens, ${css.wired.size} @theme mappings)`);
}
