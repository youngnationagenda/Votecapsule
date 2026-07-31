# @vote-capsule/design-tokens

**Vote Capsule™ Design Tokens** — The single source of truth for all visual design values across the entire platform.

## Overview

This package provides the canonical design tokens for colors, spacing, typography, breakpoints, shadows, border radii, and z-index values used across all Vote Capsule™ applications.

Never use raw hex values or hardcoded sizes in components. Always import from this package.

## Installation

```bash
pnpm add @vote-capsule/design-tokens
```

## Usage

```typescript
import { colors, spacing, typography, breakpoints } from '@vote-capsule/design-tokens';

// Use primary brand color
const navBackground = colors.brand.primary; // '#0B3C6D'

// Use spacing
const padding = spacing[4]; // '16px'

// Use typography
const fontSize = typography.fontSize.base; // '1rem'
```

## Token Categories

| Category | Description |
|----------|-------------|
| `colors` | Brand, semantic, neutral, capsule status, trust, portal identity |
| `spacing` | 4px-baseline spacing scale |
| `typography` | Font families, sizes, weights, line heights |
| `breakpoints` | Responsive breakpoints (sm, md, lg, xl, 2xl) |
| `shadows` | Box shadow scale |
| `borderRadius` | Border radius scale |
| `zIndex` | Layering system |

## Design Principles

- **Political neutrality**: Party colors are NEVER part of the platform theme
- **Trust language**: Never use "blockchain" — use "integrity verified" or "trust verified"  
- **Accessibility**: All color combinations meet WCAG 2.1 AA contrast requirements
- **Consistency**: All applications must use these tokens without deviation

## Owned By

Sonie (Platform Foundation Workstream)
