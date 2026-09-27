import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = resolve(frontendRoot, 'amana-figma-variables.json');
const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const checkOnly = process.argv.includes('--check');

function isToken(value) {
  return value !== null && typeof value === 'object' && '$value' in value;
}

function getToken(path) {
  const token = path.split('.').reduce((value, key) => value?.[key], source);
  if (!isToken(token)) {
    throw new Error(`Unknown token reference: {${path}}`);
  }
  return token;
}

function formatShadow(value) {
  return `${value.offsetX} ${value.offsetY} ${value.blur} ${value.spread} ${value.color}`;
}

function resolveValue(value, references = []) {
  if (typeof value === 'string') {
    const reference = value.match(/^\{([^{}]+)\}$/);
    if (reference) {
      const [, path] = reference;
      if (references.includes(path)) {
        throw new Error(`Circular token reference: ${[...references, path].join(' -> ')}`);
      }
      return resolveValue(getToken(path).$value, [...references, path]);
    }
    return value;
  }
  if (value !== null && typeof value === 'object' && 'offsetX' in value) {
    return formatShadow(value);
  }
  return value;
}

function validateTree(tree, path = []) {
  for (const [key, value] of Object.entries(tree)) {
    if (isToken(value)) {
      resolveValue(value.$value, [`${[...path, key].join('.')}`]);
    } else if (value !== null && typeof value === 'object') {
      validateTree(value, [...path, key]);
    }
  }
}

function convertTree(tree, typeOverride) {
  if (isToken(tree)) {
    const converted = {
      value: resolveValue(tree.$value),
      type: typeOverride ?? tree.$type,
    };
    if (tree.$description) converted.description = tree.$description;
    return converted;
  }
  return Object.fromEntries(
    Object.entries(tree).map(([key, value]) => [key, convertTree(value, typeOverride)]),
  );
}

function legacyDesignTokens() {
  const typography = source['amana-typography'];
  const effects = source['amana-effects'];
  return {
    amana: {
      colors: convertTree(source['amana-colors'], 'color'),
      themes: convertTree(source['amana-themes']),
      fontFamilies: convertTree(source['amana-font-families'], 'fontFamilies'),
      fontSize: convertTree(typography.fontSize, 'fontSizes'),
      fontWeights: convertTree(typography.fontWeight, 'fontWeights'),
      lineHeight: convertTree(typography.lineHeight, 'lineHeights'),
      letterSpacing: convertTree(typography.letterSpacing, 'letterSpacing'),
      spacing: convertTree(source['amana-spacing'], 'spacing'),
      borderRadius: convertTree(source['amana-radius'], 'borderRadius'),
      borderWidth: convertTree(effects.borderWidth, 'borderWidth'),
      boxShadow: convertTree(source['amana-shadows'], 'boxShadow'),
      opacity: convertTree(effects.opacity, 'opacity'),
      backdropBlur: convertTree(effects.backdropBlur, 'dimension'),
    },
  };
}

function renderTokenVariables(group, prefix) {
  return Object.entries(group).map(([name, token]) => {
    return `  --${prefix}-${name}: ${resolveValue(token.$value)};`;
  });
}

function renderCss() {
  const typography = source['amana-typography'];
  const effects = source['amana-effects'];
  const shared = [
    ...renderTokenVariables(source['amana-spacing'], 'amana-spacing'),
    ...renderTokenVariables(source['amana-radius'], 'amana-radius'),
    ...renderTokenVariables(typography.fontSize, 'amana-font-size'),
    ...renderTokenVariables(typography.fontWeight, 'amana-font-weight'),
    ...renderTokenVariables(typography.lineHeight, 'amana-line-height'),
    ...renderTokenVariables(typography.letterSpacing, 'amana-letter-spacing'),
    ...renderTokenVariables(source['amana-font-families'], 'amana-font-family'),
    ...renderTokenVariables(source['amana-shadows'], 'amana-shadow'),
    ...renderTokenVariables(effects.borderWidth, 'amana-border-width'),
    ...renderTokenVariables(effects.opacity, 'amana-opacity'),
    ...renderTokenVariables(effects.backdropBlur, 'amana-backdrop-blur'),
  ];
  const themeColors = [
    'surface-0', 'surface-1', 'surface-2', 'surface-3',
    'bg-primary', 'bg-card', 'bg-elevated', 'bg-input', 'bg-overlay',
    'gold', 'gold-hover', 'gold-muted', 'emerald', 'emerald-muted', 'teal',
    'text-primary', 'text-secondary', 'text-muted', 'text-inverse',
    'status-success', 'status-warning', 'status-danger', 'status-info', 'status-locked', 'status-draft',
    'border-subtle', 'border-default', 'border-raised', 'border-hover', 'border-focus',
    'skeleton-base', 'skeleton-sheen',
  ];
  const themeAliases = themeColors.map((token) => `  --color-${token}: var(--${token});`);
  themeAliases.push(
    '  --color-background: var(--surface-0);',
    '  --color-foreground: var(--text-primary);',
    '  --font-sans: var(--font-geist-sans);',
    '  --font-mono: var(--font-geist-mono);',
  );

  return [
    '/* Generated from amana-figma-variables.json. Do not edit directly. */',
    ':root {',
    ...renderThemeDeclarations('light'),
    ...shared,
    '}',
    '',
    '.dark {',
    ...renderThemeDeclarations('dark'),
    '}',
    '',
    '@theme inline {',
    ...themeAliases,
    '}',
    '',
  ].join('\n');
}

function renderThemeDeclarations(name) {
  const declarations = Object.entries(source['amana-themes'][name]).map(([key, token]) => {
    return `  --${key}: ${resolveValue(token.$value)};`;
  });
  declarations.push(
    '  --bg-primary: var(--surface-0);',
    '  --bg-card: var(--surface-1);',
    '  --bg-elevated: var(--surface-2);',
    '  --bg-overlay: var(--surface-3);',
  );
  return declarations;
}

function assertThemeParity() {
  const light = Object.keys(source['amana-themes'].light).sort();
  const dark = Object.keys(source['amana-themes'].dark).sort();
  if (JSON.stringify(light) !== JSON.stringify(dark)) {
    throw new Error('Light and dark themes must define the same semantic token keys.');
  }
}

function writeOrCheck(filePath, content) {
  const absolutePath = resolve(frontendRoot, filePath);
  if (checkOnly) {
    let committed;
    try {
      committed = readFileSync(absolutePath, 'utf8');
    } catch {
      throw new Error(`${filePath} is missing. Run pnpm tokens:build.`);
    }
    if (committed !== content) {
      throw new Error(`${filePath} is out of date. Run pnpm tokens:build and commit the result.`);
    }
    return;
  }
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content);
}

validateTree(source);
assertThemeParity();

const outputs = new Map([
  ['design-tokens.json', `${JSON.stringify(legacyDesignTokens(), null, 2)}\n`],
  ['src/app/design-tokens.generated.css', renderCss()],
]);

try {
  for (const [filePath, content] of outputs) writeOrCheck(filePath, content);
  console.log(checkOnly ? 'Design token outputs are up to date.' : 'Generated design token outputs.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}