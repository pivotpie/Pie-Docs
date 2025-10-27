import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BarcodeStandardsManager } from '@/components/physical/BarcodeStandardsManager';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock the barcode generation utility
vi.mock('@/utils/barcodeGenerator', () => ({
  barcodeGenerator: {
    getBarcodeFormatInfo: vi.fn((standard) => ({
      name: `${standard} Format`,
      type: standard === 'QR' ? '2d' : 'linear',
      category: standard === 'EAN13' ? 'retail' : 'industrial',
      description: `Mock description for ${standard}`,
      useCases: ['Use case 1', 'Use case 2', 'Use case 3'],
      maxLength: standard === 'CODE128' ? 80 : 43,
      charset: 'Mock charset',
      hasCheckDigit: true,
    })),
    generateEAN13: vi.fn((code) => code.padStart(12, '0') + '1'),
    generateEAN8: vi.fn((code) => code.padStart(7, '0') + '8'),
    generateUPC: vi.fn((code) => code.padStart(11, '0') + '2'),
    validateBarcodeFormat: vi.fn(() => true),
    generateBarcodeImage: vi.fn(() => Promise.resolve('data:image/png;base64,mock-image')),
  }
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      physicalDocs: physicalDocsSlice,
    },
  });
};

const renderWithStore = async (component: React.ReactElement) => {
  const store = createMockStore();
  let result;
  await act(async () => {
    result = render(
      <Provider store={store}>
        {component}
      </Provider>
    );
  });
  return result;
};

describe('BarcodeStandardsManager', () => {
  const mockOnFormatSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    expect(screen.getByText('Barcode Standards Manager')).toBeInTheDocument();
  });

  it('displays category filters', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    expect(screen.getByText('Filter by Category')).toBeInTheDocument();
    expect(screen.getByText('All Standards')).toBeInTheDocument();
    expect(screen.getByText('Retail')).toBeInTheDocument();
    expect(screen.getByText('Industrial')).toBeInTheDocument();
    expect(screen.getByText('Pharmaceutical')).toBeInTheDocument();
    expect(screen.getByText('Document')).toBeInTheDocument();
  });

  it('has preview code input', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const previewInput = screen.getByLabelText('Preview Code');
    expect(previewInput).toBeInTheDocument();
    expect(previewInput).toHaveValue('123456789');
  });

  it('allows changing preview code', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const previewInput = screen.getByLabelText('Preview Code');
    await act(async () => {
      fireEvent.change(previewInput, { target: { value: 'TEST123' } });
    });
    expect(previewInput).toHaveValue('TEST123');
  });

  it('has generate previews button', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const generateButton = screen.getByText('Generate Previews');
    expect(generateButton).toBeInTheDocument();
  });

  it('toggles comparison view', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const compareButton = screen.getByText('Compare Standards');
    expect(compareButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(compareButton);
    });
    expect(screen.getByText('Hide Comparison')).toBeInTheDocument();
    expect(screen.getByText('Standards Comparison')).toBeInTheDocument();
  });

  it('switches between category filters', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const retailButton = screen.getByText('Retail');
    await act(async () => {
      fireEvent.click(retailButton);
    });

    // Check that retail category is now active
    expect(retailButton.closest('button')).toHaveClass('bg-blue-100');
  });

  it('displays barcode format cards', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    // Should display the default barcode formats from the store
    expect(screen.getByText('Code 128')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();
  });

  it('handles format selection', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const code128Card = screen.getByText('Code 128').closest('div');
    if (code128Card) {
      await act(async () => {
        fireEvent.click(code128Card);
      });
      expect(mockOnFormatSelected).toHaveBeenCalledWith('code128');
    }
  });

  it('shows format details in cards', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    // Should show format details like character set, max length, etc.
    expect(screen.getAllByText('Character Set:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Check Digit:').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Common Uses:').length).toBeGreaterThan(0);
  });

  it('shows linear and 2D format badges', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    expect(screen.getByText('Linear')).toBeInTheDocument();
    expect(screen.getByText('2D')).toBeInTheDocument();
  });

  it('displays comparison table when enabled', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const compareButton = screen.getByText('Compare Standards');
    await act(async () => {
      fireEvent.click(compareButton);
    });

    // Check for comparison table headers
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Max Length')).toBeInTheDocument();
    expect(screen.getByText('Primary Use')).toBeInTheDocument();
  });

  it('shows selected format info', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    // Click on a format to select it
    const code128Card = screen.getByText('Code 128').closest('div');
    if (code128Card) {
      await act(async () => {
        fireEvent.click(code128Card);
      });
    }

    // Should show selected format info
    expect(screen.getByText(/Selected:/)).toBeInTheDocument();
  });

  it('handles generate previews action', async () => {
    await renderWithStore(
      <BarcodeStandardsManager onFormatSelected={mockOnFormatSelected} />
    );

    const generateButton = screen.getByText('Generate Previews');
    await act(async () => {
      fireEvent.click(generateButton);
    });

    // The component should try to generate previews for the current formats
    // This would trigger the mock functions we set up
  });
});