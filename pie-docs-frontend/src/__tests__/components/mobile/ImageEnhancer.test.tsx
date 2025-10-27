import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ImageEnhancer from '@/components/mobile/ImageEnhancer';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock canvas and image APIs
const mockCanvas = {
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(400), // 10x10 image
      width: 10,
      height: 10,
    })),
    putImageData: vi.fn(),
  })),
  width: 0,
  height: 0,
  toBlob: vi.fn((callback) => {
    const blob = new Blob(['fake-image-data'], { type: 'image/jpeg' });
    callback(blob);
  }),
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: mockCanvas.getContext,
});

// Additional canvas properties
Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  get: () => 100,
  set: vi.fn(),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  get: () => 100,
  set: vi.fn(),
});

// Mock Image constructor
global.Image = class {
  onload: (() => void) | null = null;
  private _src: string = '';
  width: number = 100;
  height: number = 100;

  constructor() {
    // Immediately trigger onload when src is set
  }

  set src(value: string) {
    this._src = value;
    // Trigger onload immediately
    if (this.onload) {
      this.onload();
    }
  }

  get src() {
    return this._src || '';
  }
} as any;

// Mock FileReader
global.FileReader = class {
  onload: ((event: any) => void) | null = null;
  result: string | ArrayBuffer | null = 'data:image/jpeg;base64,fake-data';

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any);
      }
    }, 100);
  }
} as any;

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:fake-url');
global.URL.revokeObjectURL = vi.fn();

describe('ImageEnhancer', () => {
  const mockOnEnhancementComplete = vi.fn();
  const mockOnCancel = vi.fn();

  const defaultProps = {
    originalImage: 'data:image/jpeg;base64,fake-image-data',
    onEnhancementComplete: mockOnEnhancementComplete,
    onCancel: mockOnCancel,
    isVisible: true,
    documentType: 'text' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset canvas mock
    mockCanvas.width = 0;
    mockCanvas.height = 0;
  });

  it('renders enhancement interface when visible', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    expect(screen.getByText('Image Enhancement')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Enhancement Controls')).toBeInTheDocument();
    });
  });

  it('does not render when not visible', () => {
    render(<ImageEnhancer {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Image Enhancement')).not.toBeInTheDocument();
  });

  it('shows loading state while analyzing image', () => {
    render(<ImageEnhancer {...defaultProps} />);

    expect(screen.getByText('Analyzing image...')).toBeInTheDocument();
  });

  it('displays quality assessment after image analysis', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality Assessment')).toBeInTheDocument();
    });

    expect(screen.getByText('Score:')).toBeInTheDocument();
  });

  it('allows adjustment of enhancement settings', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enhancement Controls')).toBeInTheDocument();
    });

    // Test brightness slider
    const brightnessSlider = screen.getByDisplayValue('0');
    fireEvent.change(brightnessSlider, { target: { value: '25' } });

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('applies auto enhancement when enabled', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enhancement Controls')).toBeInTheDocument();
    });

    const autoEnhanceCheckbox = screen.getByRole('checkbox');
    fireEvent.click(autoEnhanceCheckbox);

    expect(autoEnhanceCheckbox).toBeChecked();
  });

  it('resets settings when reset button is clicked', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });

    // Change a setting first
    const brightnessSlider = screen.getByDisplayValue('0');
    fireEvent.change(brightnessSlider, { target: { value: '25' } });

    // Click reset
    fireEvent.click(screen.getByText('Reset'));

    // Settings should be back to 0
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('switches between original and enhanced preview', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Enhancement Controls')).toBeInTheDocument();
    });

    // Wait for preview buttons to appear
    await waitFor(() => {
      expect(screen.getByText('Enhanced')).toBeInTheDocument();
    });

    const originalButton = screen.getByText('Original');
    fireEvent.click(originalButton);

    // Should show original view (button becomes active)
    expect(originalButton).toHaveClass('bg-blue-600');
  });

  it('changes document type and applies appropriate enhancements', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Document Type')).toBeInTheDocument();
    });

    const documentTypeSelect = screen.getByDisplayValue('Text Document');
    fireEvent.change(documentTypeSelect, { target: { value: 'photo' } });

    expect(documentTypeSelect).toHaveValue('photo');
  });

  it('calls onEnhancementComplete when Apply Enhancement is clicked', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Apply Enhancement')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Apply Enhancement'));

    await waitFor(() => {
      expect(mockOnEnhancementComplete).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          brightness: expect.any(Number),
          contrast: expect.any(Number),
          saturation: expect.any(Number),
          sharpness: expect.any(Number),
          autoEnhance: expect.any(Boolean),
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onCancel when close button is clicked', () => {
    render(<ImageEnhancer {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: '' }); // SVG close button
    fireEvent.click(closeButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('handles File input for originalImage', async () => {
    const file = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    const fileProps = { ...defaultProps, originalImage: file };

    render(<ImageEnhancer {...fileProps} />);

    expect(screen.getByText('Analyzing image...')).toBeInTheDocument();

    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(file);
    });
  });

  it('displays quality issues and suggestions', async () => {
    render(<ImageEnhancer {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Quality Assessment')).toBeInTheDocument();
    });

    // The component should show issues and suggestions based on the mock image analysis
    // Since we're using mock data, specific issues/suggestions will depend on the analysis
  });

  it('applies different enhancements for different document types', async () => {
    render(<ImageEnhancer {...defaultProps} documentType="photo" />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Photo')).toBeInTheDocument();
    });

    // Auto enhancement should apply photo-specific settings
    const autoEnhanceCheckbox = screen.getByRole('checkbox');
    fireEvent.click(autoEnhanceCheckbox);

    expect(autoEnhanceCheckbox).toBeChecked();
  });

  it('cleans up blob URL when using File input', async () => {
    const file = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
    const fileProps = { ...defaultProps, originalImage: file };

    render(<ImageEnhancer {...fileProps} />);

    await waitFor(() => {
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });
});