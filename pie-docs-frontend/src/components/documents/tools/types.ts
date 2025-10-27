/**
 * Shared types for document tool components
 */

export interface DocumentToolProps {
  /** The document being viewed/edited */
  document: any; // Using 'any' to support the mock document structure
  /** Callback when tool is closed */
  onClose?: () => void;
  /** Optional className for styling */
  className?: string;
}

export interface ToolPageLayoutProps {
  /** Tool title */
  title: string;
  /** Tool icon (emoji) */
  icon?: string;
  /** Tool content */
  children: React.ReactNode;
  /** Callback when back button is clicked */
  onBack: () => void;
  /** Optional className */
  className?: string;
}
