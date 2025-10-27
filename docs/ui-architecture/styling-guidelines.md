# Styling Guidelines

## Global Theme Variables

```css
/* src/styles/themes/global-theme.css */
:root {
  /* Primary Brand Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;

  /* Typography */
  --font-sans: 'Inter', sans-serif;
  --font-arabic: 'Noto Sans Arabic', sans-serif;

  /* Spacing */
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;

  /* Component Heights */
  --button-height-md: 2.5rem;
  --input-height-md: 2.5rem;
}

/* Dark Mode */
[data-theme="dark"] {
  --color-primary-500: #60a5fa;
  --color-neutral-900: #f4f4f5;
}

/* RTL Support */
[dir="rtl"] {
  --font-primary: var(--font-arabic);
}
```

**Key Styling Features:**
- **CSS Custom Properties**: Runtime theme switching
- **Bilingual Typography**: Arabic and English font optimization
- **RTL/LTR Support**: Automatic layout adaptation
- **Dark Mode Ready**: Complete theme implementation
- **Accessibility**: WCAG 2.1 AA compliance
