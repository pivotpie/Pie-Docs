import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BarcodeGenerator } from '@/components/physical/BarcodeGenerator';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock the barcode generator utility
vi.mock('@/utils/barcodeGenerator', () => ({
  barcodeGenerator: {
    generateUniqueId: vi.fn(() => 'DOC123456789'),
    generateBarcodeImage: vi.fn(() => Promise.resolve('data:image/png;base64,mock-image')),
    regenerateBarcode: vi.fn(() => Promise.resolve({
      code: 'DOC987654321',
      image: 'data:image/png;base64,mock-regenerated-image'
    })),
  },
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      physicalDocs: physicalDocsSlice,
    },
    preloadedState: {
      physicalDocs: {
        barcodes: {
          generated: [],
          pending: [],
          templates: [],
          printJobs: [],
        },
        assets: {
          documents: [],
          equipment: [],
          locations: [],
        },
        printing: {
          availablePrinters: [],
          printQueue: [],
          printHistory: [],
          templates: [],
        },
        configuration: {
          barcodeFormats: [
            {
              id: 'code128',
              name: 'Code 128',
              type: 'linear',
              standard: 'CODE128',
              configuration: { height: 50, displayValue: true },
            },
            {
              id: 'qr',
              name: 'QR Code',
              type: '2d',
              standard: 'QR',
              configuration: { width: 128, height: 128, errorCorrectionLevel: 'M' },
            },
          ],
          labelSizes: [],
          defaultSettings: {
            defaultFormat: 'code128',
            autoGenerate: true,
            prefix: 'DOC',
            suffix: '',
            includeChecksum: true,
            qrErrorCorrection: 'M',
          },
        },
        loading: {
          generating: false,
          printing: false,
          validating: false,
        },
        errors: {},
        ...initialState,
      },
    },
  });
};

const renderWithStore = (component: React.ReactElement, store = createMockStore()) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('BarcodeGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default configuration', () => {
    renderWithStore(<BarcodeGenerator />);

    expect(screen.getByText('Barcode Generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Barcode Format')).toBeInTheDocument();
    expect(screen.getByLabelText('Prefix')).toHaveValue('DOC');
    expect(screen.getByLabelText('Include checksum for validation')).toBeChecked();
  });

  it('displays available barcode formats', () => {
    renderWithStore(<BarcodeGenerator />);

    const formatSelect = screen.getByLabelText('Barcode Format');
    expect(formatSelect).toBeInTheDocument();

    // Check if Code 128 option is present
    expect(screen.getByText('Code 128 (Linear)')).toBeInTheDocument();
    expect(screen.getByText('QR Code (2D)')).toBeInTheDocument();
  });

  it('allows changing prefix and suffix', () => {
    renderWithStore(<BarcodeGenerator />);

    const prefixInput = screen.getByLabelText('Prefix');
    const suffixInput = screen.getByLabelText('Suffix');

    fireEvent.change(prefixInput, { target: { value: 'TEST' } });
    fireEvent.change(suffixInput, { target: { value: 'END' } });

    expect(prefixInput).toHaveValue('TEST');
    expect(suffixInput).toHaveValue('END');
  });

  it('generates a barcode when Generate button is clicked', async () => {
    const mockOnGenerated = vi.fn();
    renderWithStore(<BarcodeGenerator onBarcodeGenerated={mockOnGenerated} />);

    const generateButton = screen.getByRole('button', { name: /generate barcode/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated Barcode')).toBeInTheDocument();
    });

    expect(screen.getByText('DOC123456789')).toBeInTheDocument();

    // The callback should be called after successful generation
    await waitFor(() => {
      expect(mockOnGenerated).toHaveBeenCalledWith({
        code: 'DOC123456789',
        image: 'data:image/png;base64,mock-image',
      });
    });
  });

  it('shows loading state during generation', async () => {
    const store = createMockStore({
      loading: { generating: true, printing: false, validating: false },
    });

    renderWithStore(<BarcodeGenerator />, store);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
  });

  it('displays error message when generation fails', () => {
    const store = createMockStore({
      errors: { generation: 'Failed to generate barcode' },
    });

    renderWithStore(<BarcodeGenerator />, store);

    expect(screen.getByText('Failed to generate barcode')).toBeInTheDocument();
  });

  it('shows document and asset information when provided', () => {
    renderWithStore(
      <BarcodeGenerator documentId="doc123" assetId="asset456" />
    );

    expect(screen.getByText('Document ID: doc123')).toBeInTheDocument();
    expect(screen.getByText('Asset ID: asset456')).toBeInTheDocument();
  });

  it('allows downloading generated barcode', async () => {
    const mockOnGenerated = vi.fn();
    renderWithStore(<BarcodeGenerator onBarcodeGenerated={mockOnGenerated} />);

    const generateButton = screen.getByRole('button', { name: /generate barcode/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated Barcode')).toBeInTheDocument();
    });

    const downloadButton = screen.getByRole('button', { name: /download png/i });
    expect(downloadButton).toBeInTheDocument();

    // Mock document.createElement and document.body methods
    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const mockLink = {
      click: vi.fn(),
      download: '',
      href: '',
    };
    createElementSpy.mockReturnValue(mockLink as unknown as HTMLElement);
    appendChildSpy.mockImplementation(() => mockLink as unknown as Node);
    removeChildSpy.mockImplementation(() => mockLink as unknown as Node);

    fireEvent.click(downloadButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.download).toBe('barcode_DOC123456789.png');
    expect(mockLink.href).toBe('data:image/png;base64,mock-image');
    expect(mockLink.click).toHaveBeenCalled();

    createElementSpy.mockRestore();
    appendChildSpy.mockRestore();
    removeChildSpy.mockRestore();
  });

  it('allows regenerating corrupted barcode', async () => {
    const { barcodeGenerator } = await import('@/utils/barcodeGenerator');
    const mockOnGenerated = vi.fn();

    renderWithStore(<BarcodeGenerator onBarcodeGenerated={mockOnGenerated} />);

    // First generate a barcode
    const generateButton = screen.getByRole('button', { name: /generate barcode/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated Barcode')).toBeInTheDocument();
    });

    // Then regenerate it
    const regenerateButton = screen.getByRole('button', { name: /regenerate/i });
    fireEvent.click(regenerateButton);

    await waitFor(() => {
      expect(barcodeGenerator.regenerateBarcode).toHaveBeenCalled();
    });

    expect(mockOnGenerated).toHaveBeenCalledWith({
      code: 'DOC987654321',
      image: 'data:image/png;base64,mock-regenerated-image',
    });
  });

  it('updates form values when configuration changes', () => {
    const store = createMockStore();
    const { rerender } = renderWithStore(<BarcodeGenerator />, store);

    expect(screen.getByLabelText('Prefix')).toHaveValue('DOC');

    // Update the store configuration
    const newStore = createMockStore({
      configuration: {
        barcodeFormats: [
          {
            id: 'code128',
            name: 'Code 128',
            type: 'linear',
            standard: 'CODE128',
            configuration: { height: 50, displayValue: true },
          },
        ],
        labelSizes: [],
        defaultSettings: {
          defaultFormat: 'code128',
          autoGenerate: true,
          prefix: 'NEW',
          suffix: 'TEST',
          includeChecksum: false,
          qrErrorCorrection: 'M',
        },
      },
    });

    rerender(
      <Provider store={newStore}>
        <BarcodeGenerator />
      </Provider>
    );

    expect(screen.getByLabelText('Prefix')).toHaveValue('NEW');
    expect(screen.getByLabelText('Suffix')).toHaveValue('TEST');
    expect(screen.getByLabelText('Include checksum for validation')).not.toBeChecked();
  });
});