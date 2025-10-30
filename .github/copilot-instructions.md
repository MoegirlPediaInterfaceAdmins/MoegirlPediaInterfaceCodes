# MoegirlPedia Interface Codes - Copilot Instructions

## Repository Overview

This repository contains interface codes for MoegirlPedia (萌娘百科), a Chinese MediaWiki site. The codebase manages gadgets (小工具), group-level scripts, and global site scripts that are automatically compiled and deployed to the MediaWiki installation.

**Size:** ~135 gadgets, multiple global and group-level scripts
**Languages:** TypeScript, JavaScript, CSS
**Target Platform:** MediaWiki 1.43.3 (targeting ES2020 output)
**Build Tools:** TypeScript, PostCSS, ESLint, Stylelint, npm
**Node Version:** ^18.17 || >=20.1 (currently tested with v20.19.5)

## Critical Build & Installation Instructions

### Installing Dependencies

**IMPORTANT: DON'T USE `npm ci`, USE `npm run ci` INSTEAD**

### Build Commands (In Order of Usage)

1. **Install dependencies** (REQUIRED FIRST):
   ```bash
   npm run ci
   ```
   Time: ~60 seconds

2. **Run linters and tests** (~30-60 seconds):
   ```bash
   npm test
   ```
   This runs: eslint → stylelint → v8r (YAML validator) → emailmapChecker
   - ESLint checks all JavaScript/TypeScript in `src/`
   - Stylelint checks all CSS in `src/**/*.css`
   - v8r validates `definition.yaml` files against schema
   - emailmapChecker validates `.mailmap` entries

3. **Auto-fix linting issues**:
   ```bash
   npm run format
   ```
   Automatically fixes ESLint and Stylelint errors where possible

4. **Build all code** (~20-40 seconds):
   ```bash
   npm run build
   ```
   Runs both `build:js` and `build:css` in parallel:
   - `build:js`: Compiles TypeScript to `dist/_compiled/` using tsconfig.production.json (ES2020 target)
   - `build:css`: Processes CSS with PostCSS, outputs to `dist/`

5. **Build separately** (if needed):
   ```bash
   npm run build:js    # TypeScript compilation only
   npm run build:css   # PostCSS processing only
   ```

6. **Minification** (production):
   ```bash
   npm run minicifation:js    # Note: typo in script name is intentional
   ```
   Uses Terser to minify compiled JavaScript

### Build Order for Making Changes

**ALWAYS follow this sequence:**

1. Install dependencies: `npm run ci`
2. Make your code changes
3. Run linters: `npm test`
4. Fix issues: `npm run format` (or manual fixes)
5. Build: `npm run build`
6. Verify: Check `dist/` directory for output
7. Test again: `npm test`

## Project Layout & Architecture

### Directory Structure

```
├── .github/
│   ├── workflows/          # CI/CD workflows
│   │   ├── postCommit.yaml          # Main CI: runs on every commit, handles auto-imports, validation
│   │   ├── test.yaml                # Manual test workflow
│   │   ├── CodeQL.yaml              # Security scanning (runs on push/PR to master)
│   │   ├── generatePolyfill.yaml    # Weekly polyfill generation (Sun 23:00 UTC)
│   │   ├── auto_fix.yaml            # Manual auto-fix workflow
│   │   └── auto_assign.yaml         # Auto-assign reviewers/assignees
│   └── copilot-instructions.md      # This file
├── scripts/                # Automation scripts (Node.js)
│   ├── browserify/         # Import code from npm packages
│   ├── prefetch/           # Import code from specified pages
│   ├── generateGadgetsDefinition/   # Auto-generate gadget definitions
│   ├── generatePolyfill/            # Generate polyfill files
│   ├── postCommit/         # Git automation and push logic
│   ├── minification/       # Terser-based minification
│   ├── ci/                 # Before/after CI scripts for registry switching
│   └── emailmapChecker/    # Validate .mailmap entries
├── src/
│   ├── gadgets/            # MediaWiki gadgets (小工具)
│   │   └── [gadget-name]/
│   │       ├── definition.yaml      # Gadget configuration
│   │       ├── Gadget-*.js          # JavaScript files (page name format)
│   │       ├── Gadget-*.css         # CSS files
│   │       └── .eslintrc.yaml       # Optional: override linting for imported code
│   ├── global/             # Site-wide scripts
│   │   ├── zh/             # Chinese site scripts
│   │   └── commons/        # Common scripts
│   └── groups/             # User group-specific scripts
│       ├── zh/             # Chinese site groups
│       └── commons/        # Common groups
├── dist/                   # Build output (gitignored)
│   ├── _compiled/          # TypeScript compilation output
│   ├── gadgets/            # Processed gadget files
│   ├── global/             # Processed global scripts
│   └── groups/             # Processed group scripts
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript config for editor
├── tsconfig.production.json # TypeScript config for compilation (ES2020 target)
├── eslint.config.js        # ESLint configuration (flat config format)
├── .stylelintrc.yaml       # Stylelint configuration
├── .postcssrc.yaml         # PostCSS plugins config
├── .browserslistrc         # Browser targets: "defaults, Chrome >= 86"
└── .v8rrc.yaml            # YAML schema validator config
```

### Key Configuration Files

- **tsconfig.production.json**: Compiles to ES2020 (NOT ES3), outputs to `dist/_compiled/`, target is modern browsers
- **eslint.config.js**: Flat config format, separates browser/node environments, includes custom globals (mw, OO, etc.)
- **.postcssrc.yaml**: Configures autoprefixer, selector polyfills, logical properties, discard comments
- **.stylelintrc.yaml**: Based on stylelint-config-standard, ignores vendor prefixes
- **.browserslistrc**: Targets "defaults, Chrome >= 86" for autoprefixer
- **.editorconfig**: 4-space indentation for JS, 2-space for YAML/MD
- **.prettierrc.yaml**: 4-space tabs, double quotes, 200 char line width

### Gadget Structure

Each gadget is a folder in `src/gadgets/[gadget-name]/` containing:

- **definition.yaml** (REQUIRED): Gadget metadata
  - `_sites`: Array of sites (e.g., `["zh"]`)
  - `_section`: Section name (e.g., `"editing"`)
  - `_files`: List of files (e.g., `["Gadget-Force_preview.js"]`)
  - `type`: "general", "styles", etc.
  - `dependencies`: Array of dependencies
  - `rights`: Required user rights
  - Other MediaWiki gadget properties

- **Gadget-[name].js**: JavaScript code (file name matches MediaWiki page name)
- **Gadget-[name].css**: CSS code (file name matches MediaWiki page name)
- **.eslintrc.yaml** (OPTIONAL): Override linting for imported/generated code

### Global & Group Scripts

- **src/global/[site]/**: Site-wide scripts (e.g., `src/global/zh/Moeskin.js`)
- **src/groups/[site]/[group]/**: User group scripts (e.g., `src/groups/zh/sysop/`)
- File names match MediaWiki page names (e.g., `MediaWiki:Common.js` → `Common.js`)

## CI/CD Workflows

### postCommit CI (Main Workflow)

**Triggers:**
- Every commit to tracked paths (src/\*\*, scripts/\*\*, .github/workflows/postCommit.yaml, etc.)
- Pull requests
- Daily at 00:15 UTC (but GitHub Actions cron has delays)
- Manual workflow_dispatch

**Steps:**
1. Skip check (determines if CI should run)
2. Git config setup
3. Auto browserify (import npm packages)
4. Auto prefetch (import from specified pages)
5. Generate gadgets definition
6. Generate conventional commits scopes
7. Generate user rights schema
8. Generate commits history
9. Update .gitattributes for linguist
10. Push changes (if any)
11. Linter test (if changes detected)

**Important:** postCommit CI can make commits and push changes. If you see unexpected commits, they're likely from automated imports.

### Linter Test Workflow

Runs after postCommit if changes detected:
1. ESLint with cache (content strategy)
2. Stylelint with cache (content strategy)
3. v8r (YAML validation)
4. PostCSS test
5. .mailmap checker

### CodeQL Workflow

- Runs on push/PR to master
- Scheduled daily at 23:15 UTC
- Analyzes JavaScript/TypeScript and GitHub Actions
- **Always address CodeQL findings**

### Generate Polyfill Workflow

- Scheduled weekly: Sunday 23:00 UTC
- Can be triggered manually
- Clones polyfill-service repo and generates polyfills

## Common Issues & Workarounds

### 1. npm Installation Failures

**Symptom:** "Exit handler never called!" error
**Cause:** Registry mirror (Tencent) failures or package lock conflicts
**Solution:**
```bash
npm run ci
```

### 2. Build Artifacts in Git

**Issue:** `dist/` directory should never be committed
**Solution:** It's already in `.gitignore`. If it appears in git status:
```bash
git rm -r --cached dist/
```

### 3. MediaWiki Version Compatibility

MoegirlPedia uses MediaWiki 1.43.3, ignore any comments that said MoegirlPedia didn't upgrade

### 4. ESLint Flat Config

**Note:** This repo uses ESLint v9 with flat config format (eslint.config.js)
**Important:** Don't create `.eslintrc.*` in root. Per-directory overrides use `.eslintrc.yaml` in gadget folders

### 5. Chinese Comments & Documentation

**Context:** Primary language is Chinese. Many comments, README sections, and variable names are in Chinese
**Approach:** When modifying code with Chinese comments, preserve them. Use English for new comments if preferred, but Chinese is acceptable

### 6. Timeout on Long-Running Commands

**Build/Test times:**
- `npm run ci`: 60+ seconds
- `npm test`: 30-60 seconds
- `npm run build`: 20-40 seconds
**Solution:** Always set timeout >= 120 seconds for build commands

## Validation Checklist

Before submitting changes:

1. **Install dependencies:** `npm run ci`
2. **Lint check:** `npm test` (must pass with 0 errors/warnings)
3. **Auto-fix:** `npm run format` (if linting fails)
4. **Build:** `npm run build` (must complete without errors)
5. **Verify output:** Check `dist/` contains expected files
6. **Check git status:** Ensure no unintended files (dist/, node_modules/) are staged
7. **Re-run tests:** `npm test` (final verification)

## Important Notes

1. **ALWAYS use `npm run ci` for dependencies installing** - `npm ci` can be broken.
2. **NEVER commit `dist/` or `node_modules/`** - they're gitignored
3. **DO NOT modify files in `dist/`** - they're generated, edit source in `src/`
4. **Trust these instructions** - only search/explore if information is incomplete or incorrect
5. **File naming convention:** Gadget files must match MediaWiki page names (e.g., `Gadget-[name].js`)
6. **definition.yaml is required** for every gadget in `src/gadgets/[name]/definition.yaml`
7. **The repository uses Conventional Commits** - check `.vscode/settings.json` for allowed scopes
8. **PostCSS runs automatically** on CSS files - don't manually add vendor prefixes
9. **TypeScript compiles to ES2020** - modern JavaScript features are allowed
10. **Browser globals** (mw, OO, $, etc.) are pre-configured in eslint.config.js

## Quick Reference

```bash
# Full development cycle
npm run ci                      # Install deps
npm test                        # Lint & validate
npm run format                  # Auto-fix issues
npm run build                   # Compile all
npm test                        # Final check

# Individual operations
npm run build:js                # TypeScript only
npm run build:css               # CSS only
npm run minicifation:js         # Minify (production)
```

## Additional Context

- **Repository maintained by:** 萌娘百科界面管理员 team
- **Deployment:** Automated via bot to MediaWiki after CI passes
- **MediaWiki integration:** Files map to MediaWiki:Gadget-* pages
- **Multiple sites supported:** Through `_sites` in definition.yaml (primarily "zh" and "commons")
- **Auto-import capabilities:** Scripts can import from npm and remote pages automatically via browserify/prefetch
