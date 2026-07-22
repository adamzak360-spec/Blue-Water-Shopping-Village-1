# RELIABLE Design System Documentation

## Overview

The RELIABLE design system is built on the **Reliable Nexus** brand identity, a premium, technology-driven marketplace brand. This document outlines the complete visual and interaction design guidelines for consistent application across all digital and physical touchpoints.

---

## Brand Identity: Reliable Nexus

**RELIABLE** is a next-generation African e-commerce marketplace designed to compete globally. The brand communicates trust, innovation, speed, and reliability through a carefully crafted visual identity.

### Logo
The logo features an abstract, interconnected geometric symbol resembling a stylized 'R', representing connection, technology, and reliability. The wordmark uses a custom, bold, modern sans-serif typeface.

**Logo Variants:**
- Full logo (symbol + wordmark)
- Icon only (symbol)
- Light version (for dark backgrounds)
- Dark version (for light backgrounds)
- Favicon and app icon versions

---

## Color Palette

### Primary Colors
| Color | Hex Code | Usage | Psychology |
| :--- | :--- | :--- | :--- |
| Deep Ocean Blue | `#0A2E5C` | Primary brand color, headings, buttons | Trust, stability, professionalism |
| Tech Silver | `#C0C0C0` | Secondary color, accents, backgrounds | Innovation, modernity, sleekness |
| Electric Teal | `#00C4B4` | Action color, hover states, highlights | Speed, efficiency, technological advancement |

### Semantic Colors
| Color | Hex Code | Usage |
| :--- | :--- | :--- |
| Success Green | `#28A745` | Confirmations, success messages |
| Warning Gold | `#FFC107` | Alerts, cautions, warnings |
| Error Red | `#DC3545` | Errors, deletions, critical actions |

### Neutral Colors
| Color | Hex Code | Usage |
| :--- | :--- | :--- |
| White | `#FFFFFF` | Backgrounds, surfaces, primary text backgrounds |
| Charcoal Gray | `#343A40` | Primary text color |
| Medium Gray | `#6C757D` | Secondary text, descriptions |
| Light Gray | `#E9ECEF` | Borders, dividers, subtle backgrounds |
| Pale Gray | `#F8F9FA` | Surface backgrounds, card backgrounds |

---

## Typography

### Font Stack
- **Headings:** Montserrat (Bold, modern, geometric sans-serif)
- **Body Text:** Lato (Clean, highly legible sans-serif)
- **Buttons:** Montserrat (Consistent with headings)

### Font Weights
- Light: 300
- Regular: 400
- Medium: 500
- Semi-Bold: 600
- Bold: 700
- Black: 900

### Type Scale
| Element | Font Size | Font Weight | Line Height |
| :--- | :--- | :--- | :--- |
| H1 | 2.5rem | 700 | 1.2 |
| H2 | 2rem | 700 | 1.3 |
| H3 | 1.5rem | 700 | 1.4 |
| H4 | 1.25rem | 700 | 1.4 |
| H5 | 1.1rem | 700 | 1.5 |
| H6 | 1rem | 700 | 1.5 |
| Body | 1rem | 400 | 1.6 |
| Small | 0.875rem | 400 | 1.5 |
| Tiny | 0.75rem | 400 | 1.4 |

---

## Spacing System

The spacing system is based on an 8px grid for consistency and harmony.

| Token | Value |
| :--- | :--- |
| xs | 0.25rem (4px) |
| sm | 0.5rem (8px) |
| md | 1rem (16px) |
| lg | 1.5rem (24px) |
| xl | 2rem (32px) |
| 2xl | 4rem (64px) |

---

## Border Radius

| Token | Value | Usage |
| :--- | :--- | :--- |
| sm | 8px | Small elements, inputs |
| md | 12px | Cards, buttons, modals |
| lg | 20px | Large containers, hero sections |
| full | 9999px | Fully rounded elements, badges |

---

## Shadows

| Token | Value | Usage |
| :--- | :--- | :--- |
| sm | 0 2px 8px rgba(0, 0, 0, 0.04) | Subtle elevation |
| md | 0 4px 16px rgba(0, 0, 0, 0.08) | Standard elevation |
| lg | 0 12px 32px rgba(0, 0, 0, 0.12) | High elevation, modals |

---

## Transitions & Animations

| Token | Value | Usage |
| :--- | :--- | :--- |
| fast | 0.2s cubic-bezier(0.4, 0, 0.2, 1) | Quick interactions |
| normal | 0.3s cubic-bezier(0.4, 0, 0.2, 1) | Standard transitions |
| slow | 0.5s cubic-bezier(0.4, 0, 0.2, 1) | Entrance animations |

### Keyframe Animations
- **fadeIn:** Fade in with slight upward movement
- **slideInLeft:** Slide in from left with fade
- **slideInRight:** Slide in from right with fade

---

## UI Components

### Buttons

#### Primary Button
- Background: Deep Ocean Blue (`#0A2E5C`)
- Text: White
- Hover: Darker Blue (`#072142`)
- Padding: 0.75rem 1.5rem
- Border Radius: 12px
- Font Weight: 600

#### Secondary Button
- Background: Tech Silver (`#C0C0C0`)
- Text: Charcoal Gray (`#343A40`)
- Hover: Darker Silver (`#A8A8A8`)
- Padding: 0.75rem 1.5rem
- Border Radius: 12px
- Font Weight: 600

#### Accent Button
- Background: Electric Teal (`#00C4B4`)
- Text: White
- Hover: Darker Teal (`#00A89A`)
- Padding: 0.75rem 1.5rem
- Border Radius: 12px
- Font Weight: 600

#### Button Sizes
- **Small:** 0.5rem 1rem, font-size 0.875rem
- **Standard:** 0.75rem 1.5rem, font-size 1rem
- **Large:** 1rem 2rem, font-size 1.125rem

### Cards

- Background: White
- Border Radius: 12px
- Padding: 1.5rem
- Box Shadow: 0 4px 16px rgba(0, 0, 0, 0.08)
- Hover Effect: Slight elevation increase and upward transform

### Input Fields

- Background: Light Gray (`#F8F9FA`)
- Border: 1px solid Light Gray (`#E9ECEF`)
- Border Radius: 12px
- Padding: 0.75rem 1rem
- Font Size: 1rem
- Focus State: Electric Teal border with subtle shadow

### Badges

- Padding: 0.25rem 0.75rem
- Border Radius: 9999px (fully rounded)
- Font Size: 0.875rem
- Font Weight: 600

**Badge Variants:**
- Primary: Light blue background, Deep Ocean Blue text
- Success: Light green background, Success Green text
- Warning: Light yellow background, Warning Gold text
- Danger: Light red background, Error Red text

### Alerts

- Padding: 1rem
- Border Radius: 12px
- Border Left: 4px solid (color-specific)
- Margin Bottom: 1rem

**Alert Variants:**
- Success: Green border, light green background
- Warning: Gold border, light yellow background
- Danger: Red border, light red background

---

## Design Principles

### 1. Simplicity
Remove unnecessary elements and focus on the core message. Every design decision should serve a purpose.

### 2. Clarity
Ensure all information is easily readable and understandable. Use clear hierarchy and visual distinction.

### 3. Consistency
Apply the same colors, fonts, spacing, and components across all pages to create a unified experience.

### 4. Premium Quality
Every detail should feel intentional and high-end. Avoid clutter and prioritize elegance.

### 5. Accessibility
Ensure sufficient color contrast, readable font sizes, and keyboard navigation support.

### 6. Responsiveness
Design for all screen sizes, from mobile to desktop, ensuring a seamless experience everywhere.

---

## Implementation Guidelines

### CSS Variables
All design tokens are available as CSS variables in `src/index.css`:

```css
:root {
  --color-primary: #0A2E5C;
  --color-accent: #00C4B4;
  --space-md: 1rem;
  --radius-md: 12px;
  --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.08);
  --transition-normal: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Reusable Component Classes
Use the following classes for consistent styling:

- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-accent`
- `.btn-sm`, `.btn-md`, `.btn-lg`
- `.card`, `.card-header`, `.card-body`, `.card-footer`
- `.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-danger`
- `.alert`, `.alert-success`, `.alert-warning`, `.alert-danger`
- `.container`, `.flex`, `.items-center`, `.justify-between`, `.grid`

---

## Logo Usage Guidelines

### Minimum Spacing
Maintain a clear space around the logo equal to 50% of the logo's width.

### Minimum Size
- Digital: 32px minimum width
- Print: 0.5 inches minimum width

### Do's
- Use the logo on clean, uncluttered backgrounds
- Maintain the aspect ratio
- Use provided color variants for different backgrounds
- Ensure sufficient contrast

### Don'ts
- Distort or stretch the logo
- Change the colors without approval
- Place on overly busy backgrounds
- Use outdated logo versions

---

## Version History

| Version | Date | Changes |
| :--- | :--- | :--- |
| 1.0 | 2024 | Initial design system based on Reliable Nexus brand identity |

---

## Contact & Support

For questions about the design system or brand guidelines, please contact the design team or refer to the brand guidelines document.
