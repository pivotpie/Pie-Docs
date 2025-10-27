import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarcodeFormat } from '@zxing/browser';
import BarcodeValidator from '@/components/mobile/BarcodeValidator';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

describe('BarcodeValidator', () => {
  const mockOnValidationComplete = vi.fn();
  const mockOnRetryRequested = vi.fn();

  const defaultProps = {
    barcode: 'TEST123456',
    format: BarcodeFormat.CODE_128,
    onValidationComplete: mockOnValidationComplete,
    onRetryRequested: mockOnRetryRequested,
    isVisible: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => '[]'),
        setItem: vi.fn(),
      },
    });

    // Mock navigator.vibrate
    Object.defineProperty(navigator, 'vibrate', {
      value: vi.fn(),
      writable: true,
    });
  });

  it('renders validation interface when visible', () => {
    render(<BarcodeValidator {...defaultProps} />);

    expect(screen.getByText('Validating Barcode')).toBeInTheDocument();
    expect(screen.getByText('TEST123456')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<BarcodeValidator {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Validating Barcode')).not.toBeInTheDocument();
  });

  it('shows confidence building animation during validation', async () => {
    render(<BarcodeValidator {...defaultProps} />);

    expect(screen.getByText(/Confidence:/)).toBeInTheDocument();

    // Should start at 0% and build up
    await waitFor(() => {
      expect(screen.getByText(/Confidence: \d+%/)).toBeInTheDocument();
    });
  });

  it('displays success state for valid barcode', async () => {
    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Valid Barcode')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('Continue')).toBeInTheDocument();
  });

  it('calls validation complete callback with valid result', async () => {
    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(mockOnValidationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          isValid: expect.any(Boolean),
          confidence: expect.any(Number),
          format: expect.any(String),
          isDuplicate: expect.any(Boolean),
        })
      );
    }, { timeout: 2000 });
  });

  it('shows error state for invalid barcode format', async () => {
    const invalidProps = {
      ...defaultProps,
      barcode: '!@#$%', // Invalid characters for CODE_128
    };

    render(<BarcodeValidator {...invalidProps} />);

    await waitFor(() => {
      expect(screen.getByText('Invalid Barcode')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('detects duplicate scans', async () => {
    // Mock localStorage to return existing scan
    window.localStorage.getItem = vi.fn(() => JSON.stringify(['TEST123456']));

    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(mockOnValidationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          isDuplicate: true,
        })
      );
    }, { timeout: 2000 });
  });

  it('shows suggestions for validation errors', async () => {
    const invalidProps = {
      ...defaultProps,
      barcode: 'AB', // Too short
    };

    render(<BarcodeValidator {...invalidProps} />);

    await waitFor(() => {
      expect(screen.getByText('Suggestions:')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles retry button click', async () => {
    const invalidProps = {
      ...defaultProps,
      barcode: '!@#$%',
    };

    render(<BarcodeValidator {...invalidProps} />);

    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    }, { timeout: 2000 });

    fireEvent.click(screen.getByText('Try Again'));
    expect(mockOnRetryRequested).toHaveBeenCalled();
  });

  it('handles cancel button click', async () => {
    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cancel'));
    expect(mockOnValidationComplete).toHaveBeenCalled();
  });

  it('provides haptic feedback for validation results', async () => {
    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(navigator.vibrate).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('validates different barcode formats correctly', async () => {
    const qrProps = {
      ...defaultProps,
      format: BarcodeFormat.QR_CODE,
      barcode: 'https://example.com',
    };

    render(<BarcodeValidator {...qrProps} />);

    await waitFor(() => {
      expect(mockOnValidationComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          format: expect.any(String),
        })
      );
    }, { timeout: 2000 });
  });

  it('calculates confidence based on barcode characteristics', async () => {
    const shortCodeProps = {
      ...defaultProps,
      barcode: 'ABC', // Short code should have lower confidence
    };

    render(<BarcodeValidator {...shortCodeProps} />);

    await waitFor(() => {
      const call = mockOnValidationComplete.mock.calls[0];
      expect(call[0].confidence).toBeLessThan(100);
    }, { timeout: 2000 });
  });

  it('shows duplicate warning state', async () => {
    // Mock localStorage to return existing scan
    window.localStorage.getItem = vi.fn(() => JSON.stringify(['TEST123456']));

    render(<BarcodeValidator {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Duplicate Scan')).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});