# REVX IDE & PROMPTOOL Design System

---

## 1. Design Tokens & Color Palette

Extracted directly from the REVX IDE navigation interface:

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ [ R ]  REVX [IDE]   │   < > REVX EDITOR   │   </> PROMPTOOL [2ND PAGE]   │   [ + New ]   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

### Color Palette Specification

| UI Element in Interface | Token Name | Hex | RGB / HSL | Semantic Role & Hierarchy | Optical Glow / Border Spec |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Brand Badge `[R]` & `X`** | `color-brand-magenta` | `#E6007A` | `rgb(230, 0, 122)`<br>`hsl(328, 100%, 45%)` | Primary brand anchor, execution trigger, Polkadot/RevX primary | `box-shadow: 0 0 14px rgba(230,0,122,0.45);`<br>`border: 1px solid #FF3399` |
| **`REV` Text & `</>` Icon & `+ New`** | `color-accent-acid` | `#E8FF47` | `rgb(232, 255, 71)`<br>`hsl(69, 100%, 65%)` | High-visibility primary accent, action prompts, code operator glyphs | `box-shadow: 0 0 12px rgba(232,255,71,0.30);`<br>`border: 1px solid #E8FF47` |
| **`PROMPTOOL` Title & `2ND PAGE`** | `color-accent-cyan` | `#39D4C8` | `rgb(57, 212, 200)`<br>`hsl(175, 64%, 53%)` | Secondary active toolstate, prompt compiler accents, tags | `background: rgba(57,212,200,0.12);`<br>`border: 1px solid rgba(57,212,200,0.35)` |
| **`IDE` Badge Background** | `color-surface-pill` | `#1F2533` | `rgb(31, 37, 51)`<br>`hsl(222, 24%, 16%)` | Metadata badge container, subtle version tag | `border: 1px solid #283042;` |
| **`IDE` Badge & Inactive Text** | `color-text-muted` | `#808EA8` | `rgb(128, 142, 168)`<br>`hsl(219, 19%, 58%)` | De-emphasized labels, inactive tab headings, secondary metadata | Contrast ratio: 5.6:1 against `#07080E` (WCAG AA compliant) |
| **Tab Frame Container** | `color-surface-card` | `#121622` | `rgb(18, 22, 34)`<br>`hsl(225, 31%, 10%)` | Segmented control container, grouped tool navigation | `border: 1px solid #222A3C;`<br>`border-radius: 8px` |
| **Active Tab Outer Stroke** | `color-border-active` | `#313C54` | `rgb(49, 60, 84)`<br>`hsl(221, 26%, 26%)` | High-contrast structural focus boundary for active mode | Outer frame wrapper: 1px solid `#313C54` |
| **Canvas & Shell Base** | `color-bg-obsidian` | `#07080E` | `rgb(7, 8, 14)`<br>`hsl(231, 33%, 4%)` | Root IDE canvas, gutter backdrop, terminal background | Radial gradient: `from #0F1119 to #07080E` |

---

## 2. Typography Hierarchy

- **Display & Headings**: `Orbitron` (Cyberpunk geometric sans-serif for brand logos, modal titles, and action badges).
- **Subheadings & Labels**: `Rajdhani` (High legibility condensed sans-serif for navigation, section headings, and tab bars).
- **Monospace Code & Prompt Body**: `JetBrains Mono` (Ligature-enabled coding font for prompts, variable templates, tokens, and outputs).

---

## 3. CSS Custom Properties

```css
:root {
  /* Brand Accents */
  --revx-magenta: #e6007a;
  --revx-magenta-glow: rgba(230, 0, 122, 0.40);
  --revx-acid: #e8ff47;
  --revx-acid-dim: #2a310d;
  --revx-acid-glow: rgba(232, 255, 71, 0.35);
  --revx-cyan: #39d4c8;
  --revx-cyan-dim: #0d282c;
  --revx-cyan-glow: rgba(57, 212, 200, 0.35);

  /* Surfaces & Containers */
  --surface-canvas: #07080e;
  --surface-panel: #0f1119;
  --surface-card: #121622;
  --surface-active: #1f2533;
  --surface-hover: #283042;

  /* Borders & Dividers */
  --border-subtle: #1a202c;
  --border-default: #222a3c;
  --border-active: #313c54;
  --border-highlight: #414f6e;

  /* Typography */
  --text-primary: #dfe6f0;
  --text-secondary: #808ea8;
  --text-disabled: #54607a;

  /* Typography Stacks */
  --font-display: 'Orbitron', -apple-system, sans-serif;
  --font-subheading: 'Rajdhani', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

---

## 4. Tailwind CSS Configuration Extension

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: '#07080e',
        surface: {
          DEFAULT: '#0f1119',
          card: '#121622',
          active: '#1f2533',
          hover: '#283042'
        },
        border: {
          subtle: '#1a202c',
          DEFAULT: '#222a3c',
          active: '#313c54',
          highlight: '#414f6e'
        },
        revx: {
          magenta: '#e6007a',
          acid: '#e8ff47',
          cyan: '#39d4c8',
          green: '#5dffb0',
          amber: '#ffb84d'
        },
        ide: {
          text: '#dfe6f0',
          muted: '#808ea8',
          dim: '#54607a'
        }
      },
      fontFamily: {
        orbitron: ['"Orbitron"', 'sans-serif'],
        rajdhani: ['"Rajdhani"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        'glow-magenta': '0 0 14px rgba(230, 0, 122, 0.40)',
        'glow-acid': '0 0 14px rgba(232, 255, 71, 0.35)',
        'glow-cyan': '0 0 14px rgba(57, 212, 200, 0.35)'
      }
    }
  }
} satisfies Config
```
