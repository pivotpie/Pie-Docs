# Project Structure

Based on the chosen Vite + React + TypeScript stack and your EDMS requirements, here's the optimized project structure for mockup development with backend readiness:

```
pie-docs-frontend/
├── public/
│   ├── icons/                     # PWA icons and favicons
│   ├── mockups/                   # Static mockup assets
│   └── manifest.json              # PWA manifest
├── src/
│   ├── components/                # Reusable UI components
│   │   ├── common/               # Shared components (Button, Modal, etc.)
│   │   ├── layout/               # Layout components (Sidebar, Header, etc.)
│   │   ├── forms/                # Form-specific components
│   │   ├── documents/            # Document-related components
│   │   ├── search/               # Search and AI chat components
│   │   ├── workflows/            # Workflow and task components
│   │   ├── physical/             # Physical document tracking components
│   │   └── analytics/            # Analytics and reporting components
│   ├── pages/                    # Page-level components (route components)
│   │   ├── auth/                 # Authentication pages
│   │   ├── dashboard/            # Dashboard pages
│   │   ├── documents/            # Document management pages
│   │   ├── search/               # Search and AI pages
│   │   ├── tasks/                # Task and workflow pages
│   │   ├── physical/             # Physical document pages
│   │   ├── analytics/            # Analytics pages
│   │   └── admin/                # Administrative pages
│   ├── services/                 # API services and data layer
│   │   ├── api/                  # API client configuration
│   │   ├── mock/                 # Mock data and services (for development)
│   │   ├── types/                # TypeScript type definitions
│   │   └── utils/                # Service utilities
│   ├── store/                    # Redux store configuration
│   │   ├── slices/               # Redux slices for different features
│   │   ├── middleware/           # Custom middleware
│   │   └── index.ts              # Store configuration
│   ├── hooks/                    # Custom React hooks
│   │   ├── api/                  # API-related hooks
│   │   ├── ui/                   # UI-related hooks
│   │   └── auth/                 # Authentication hooks
│   ├── utils/                    # Utility functions
│   │   ├── constants/            # Application constants
│   │   ├── helpers/              # Helper functions
│   │   ├── validation/           # Form validation schemas
│   │   └── i18n/                 # Internationalization utilities
│   ├── assets/                   # Static assets
│   │   ├── images/               # Images and graphics
│   │   ├── icons/                # SVG icons
│   │   └── fonts/                # Custom fonts (Arabic, etc.)
│   ├── styles/                   # Global styles and Tailwind config
│   │   ├── globals.css           # Global CSS and Tailwind imports
│   │   ├── components.css        # Component-specific styles
│   │   └── themes/               # Theme configurations
│   ├── locales/                  # Translation files
│   │   ├── en/                   # English translations
│   │   └── ar/                   # Arabic translations
│   ├── App.tsx                   # Main App component
│   ├── main.tsx                  # Application entry point
│   └── vite-env.d.ts            # Vite environment types
├── tests/                        # Test files
│   ├── components/               # Component tests
│   ├── pages/                    # Page tests
│   ├── services/                 # Service tests
│   └── utils/                    # Utility tests
├── docs/                         # Documentation
├── .env.example                  # Environment variables template
├── .env.local                    # Local environment variables
├── tailwind.config.js            # Tailwind CSS configuration
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
└── README.md                    # Project documentation
```
