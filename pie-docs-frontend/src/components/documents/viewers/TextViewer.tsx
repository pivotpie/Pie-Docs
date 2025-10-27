import React, { useState, useEffect, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { ZoomState, LoadingState } from '@/types/domain/DocumentViewer';

interface TextViewerProps {
  document: {
    id: string;
    name: string;
    downloadUrl: string;
    previewUrl?: string;
  };
  zoom: ZoomState;
  onPageChange: (updates: Record<string, unknown>) => void;
  onLoadingChange: (loading: LoadingState) => void;
}

export const TextViewer: React.FC<TextViewerProps> = ({
  document,
  zoom,
  onPageChange,
  onLoadingChange,
}) => {
  const [content, setContent] = useState<string>('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [language, setLanguage] = useState<string>('text');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  // Detect language from file extension
  const detectLanguage = useCallback((filename: string): string => {
    const extension = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      php: 'php',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      html: 'html',
      css: 'css',
      scss: 'scss',
      sass: 'sass',
      less: 'less',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      sql: 'sql',
      sh: 'bash',
      bash: 'bash',
      md: 'markdown',
      dockerfile: 'dockerfile',
      go: 'go',
      rs: 'rust',
      kt: 'kotlin',
      swift: 'swift',
      r: 'r',
      scala: 'scala',
      clj: 'clojure',
      hs: 'haskell',
      lua: 'lua',
      vim: 'vim',
      ini: 'ini',
      conf: 'ini',
      gitignore: 'gitignore',
    };

    return languageMap[extension || ''] || 'text';
  }, []);

  // Load document content
  useEffect(() => {
    const loadContent = async () => {
      onLoadingChange({
        isLoading: true,
        progress: 0,
        message: 'Loading text document...',
      });

      try {
        const response = await fetch(document.downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to load document: ${response.statusText}`);
        }

        const text = await response.text();
        setContent(text);
        setLoadError(null);

        // Detect language
        const detectedLanguage = detectLanguage(document.name);
        setLanguage(detectedLanguage);

        // Set total pages to 1 for text documents
        onPageChange(prev => ({ ...prev, totalPages: 1 }));
        onLoadingChange({
          isLoading: false,
          progress: 100,
          message: 'Text document loaded successfully',
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load text document';
        setLoadError(errorMessage);
        onLoadingChange({
          isLoading: false,
          message: errorMessage,
        });
        onPageChange(prev => ({ ...prev, error: errorMessage }));
      }
    };

    loadContent();
  }, [document, detectLanguage, onPageChange, onLoadingChange]);

  // Update font size based on zoom
  useEffect(() => {
    const baseFontSize = 14;
    const newFontSize = Math.max(8, Math.min(48, (baseFontSize * zoom.level) / 100));
    setFontSize(newFontSize);
  }, [zoom.level]);

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      const delta = event.deltaY;
      const zoomChange = delta > 0 ? -10 : 10;
      const newZoom = Math.max(50, Math.min(300, zoom.level + zoomChange));

      onPageChange(prev => ({
        ...prev,
        zoom: { level: newZoom, mode: 'custom' },
      }));
    }
  }, [zoom.level, onPageChange]);

  const renderContent = () => {
    if (loadError) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Text Load Error</h3>
            <p className="text-gray-600 mb-4">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    if (!content) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Loading content...</span>
        </div>
      );
    }

    // For syntax highlighting
    if (language !== 'text' && language !== 'plain') {
      return (
        <div className="h-full overflow-auto" onWheel={handleWheel}>
          <SyntaxHighlighter
            language={language}
            style={isDarkMode ? oneDark : oneLight}
            showLineNumbers={true}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: isDarkMode ? '#6b7280' : '#9ca3af',
              fontSize: `${fontSize}px`,
            }}
            customStyle={{
              margin: 0,
              padding: '1rem',
              fontSize: `${fontSize}px`,
              lineHeight: '1.5',
              fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
              backgroundColor: isDarkMode ? '#1f2937' : '#f9fafb',
            }}
            codeTagProps={{
              style: {
                fontSize: `${fontSize}px`,
                fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
              }
            }}
          >
            {content}
          </SyntaxHighlighter>
        </div>
      );
    }

    // For plain text
    return (
      <div className="h-full overflow-auto p-6" onWheel={handleWheel}>
        <pre
          className={`whitespace-pre-wrap font-mono leading-relaxed ${
            isDarkMode
              ? 'bg-gray-800 text-gray-100'
              : 'bg-white text-gray-900'
          }`}
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: '1.6',
            fontFamily: '"Fira Code", "Consolas", "Monaco", "Courier New", monospace',
          }}
        >
          {content}
        </pre>
      </div>
    );
  };

  return (
    <div className={`flex-1 relative ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {/* Toolbar */}
      <div className={`flex items-center justify-between p-3 border-b ${
        isDarkMode
          ? 'bg-gray-700 border-gray-600 text-gray-100'
          : 'bg-white border-gray-200 text-gray-900'
      }`}>
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium">Language:</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={`px-3 py-1 rounded border text-sm ${
              isDarkMode
                ? 'bg-gray-600 border-gray-500 text-gray-100'
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="text">Plain Text</option>
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="jsx">JSX</option>
            <option value="tsx">TSX</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
            <option value="xml">XML</option>
            <option value="yaml">YAML</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
            <option value="markdown">Markdown</option>
            <option value="go">Go</option>
            <option value="rust">Rust</option>
            <option value="php">PHP</option>
            <option value="ruby">Ruby</option>
          </select>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              isDarkMode
                ? 'bg-gray-600 hover:bg-gray-500 text-gray-100'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            {isDarkMode ? '☀️ Light' : '🌙 Dark'}
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-sm">Font:</span>
            <span className="text-sm font-mono">{fontSize}px</span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-sm">Lines:</span>
            <span className="text-sm font-mono">
              {content.split('\n').length.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <span className="text-sm">Characters:</span>
            <span className="text-sm font-mono">
              {content.length.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Instructions */}
      <div className={`absolute bottom-4 right-4 px-3 py-1 rounded text-sm ${
        isDarkMode
          ? 'bg-gray-700 text-gray-200'
          : 'bg-black bg-opacity-75 text-white'
      }`}>
        Ctrl+Scroll to zoom • Font size: {fontSize}px
      </div>
    </div>
  );
};

export default TextViewer;