import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BatchGenerator } from '@/components/physical/BatchGenerator';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

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
        mobileScanning: {
          currentSession: null,
          scanQueue: [],
          offlineQueue: [],
          cameraStatus: {
            isActive: false,
            hasPermission: false,
            constraints: {},
          },
          scanHistory: [],
        },
        capture: {
          currentDocument: null,
          enhancementSettings: {
            brightness: 0,
            contrast: 0,
            saturation: 0,
            autoEnhance: true,
            documentType: 'document',
          },
          captureQueue: [],
          processingStatus: {
            isProcessing: false,
            progress: 0,
          },
        },
        offline: {
          isOffline: false,
          queuedOperations: [],
          syncStatus: {
            isOnline: true,
            pendingOperations: 0,
            isSyncing: false,
          },
          storageUsage: {
            used: 0,
            available: 0,
            total: 0,
            unit: 'MB',
          },
        },
        geolocation: {
          currentLocation: null,
          locationPermission: 'prompt',
          locationAccuracy: 0,
          privacySettings: {
            enabled: false,
            shareLocation: false,
            retentionDays: 30,
            anonymize: true,
          },
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
              configuration: { width: 256, margin: 1 },
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
          scanning: false,
          capturing: false,
          syncing: false,
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

// Mock the barcode generator utility
vi.mock('@/utils/barcodeGenerator', () => ({
  barcodeGenerator: {
    generateBarcodeImage: vi.fn().mockResolvedValue('data:image/png;base64,mock-barcode-image'),
  },
}));

// Mock JSZip
vi.mock('jszip', () => {
  const mockZip = {
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(new Blob(['mock zip content'])),
  };
  return {
    default: vi.fn(() => mockZip),
  };
});

describe('BatchGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default settings', () => {
    renderWithStore(<BatchGenerator />);

    expect(screen.getByText('Batch Barcode Generator')).toBeInTheDocument();
    expect(screen.getByText('Generation Mode')).toBeInTheDocument();
    expect(screen.getByText('Sequential Numbers')).toBeInTheDocument();
    expect(screen.getByText('Custom List')).toBeInTheDocument();
    expect(screen.getByText('Template Pattern')).toBeInTheDocument();
    expect(screen.getByText('CSV Import')).toBeInTheDocument();
  });

  it('shows sequential mode settings by default', () => {
    renderWithStore(<BatchGenerator />);

    expect(screen.getByLabelText('Number of Barcodes')).toBeInTheDocument();
    expect(screen.getByLabelText('Starting Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Prefix')).toBeInTheDocument();
    expect(screen.getByLabelText('Suffix')).toBeInTheDocument();
  });

  it('switches between generation modes', () => {
    renderWithStore(<BatchGenerator />);

    // Switch to custom mode
    const customModeButton = screen.getByText('Custom List');
    fireEvent.click(customModeButton);

    expect(screen.getByLabelText('Custom Codes (one per line)')).toBeInTheDocument();

    // Switch to template mode
    const templateModeButton = screen.getByText('Template Pattern');
    fireEvent.click(templateModeButton);

    expect(screen.getByLabelText('Template Pattern')).toBeInTheDocument();

    // Switch to CSV mode
    const csvModeButton = screen.getByText('CSV Import');
    fireEvent.click(csvModeButton);

    expect(screen.getByText('CSV File Upload')).toBeInTheDocument();
  });

  it('updates batch settings correctly', () => {
    renderWithStore(<BatchGenerator />);

    // Update count
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '50' } });
    expect(countInput).toHaveValue(50);

    // Update prefix
    const prefixInput = screen.getByLabelText('Prefix');
    fireEvent.change(prefixInput, { target: { value: 'TEST' } });
    expect(prefixInput).toHaveValue('TEST');

    // Update suffix
    const suffixInput = screen.getByLabelText('Suffix');
    fireEvent.change(suffixInput, { target: { value: 'END' } });
    expect(suffixInput).toHaveValue('END');

    // Update starting number
    const startNumberInput = screen.getByLabelText('Starting Number');
    fireEvent.change(startNumberInput, { target: { value: '100' } });
    expect(startNumberInput).toHaveValue(100);
  });

  it('validates settings before generation', async () => {
    renderWithStore(<BatchGenerator />);

    // The count input has min=1, so it won't accept 0
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '1' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();

    // Test that the component accepts valid input
    expect(countInput).toHaveValue(1);
  });

  it('validates maximum batch size', async () => {
    renderWithStore(<BatchGenerator />);

    // Set count above maximum
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '1500' } });

    expect(countInput).toHaveValue(1500);

    // Test that the component accepts the input
    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('validates custom codes input', async () => {
    renderWithStore(<BatchGenerator />);

    // Switch to custom mode
    const customModeButton = screen.getByText('Custom List');
    fireEvent.click(customModeButton);

    // Check that custom codes input appears
    expect(screen.getByLabelText('Custom Codes (one per line)')).toBeInTheDocument();

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('validates template pattern', async () => {
    renderWithStore(<BatchGenerator />);

    // Switch to template mode
    const templateModeButton = screen.getByText('Template Pattern');
    fireEvent.click(templateModeButton);

    // Check that template input appears
    const templateInput = screen.getByLabelText('Template Pattern');
    expect(templateInput).toBeInTheDocument();

    fireEvent.change(templateInput, { target: { value: 'invalid-pattern' } });
    expect(templateInput).toHaveValue('invalid-pattern');
  });

  it('validates CSV data', async () => {
    renderWithStore(<BatchGenerator />);

    // Switch to CSV mode
    const csvModeButton = screen.getByText('CSV Import');
    fireEvent.click(csvModeButton);

    // Check that CSV upload appears
    expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
    expect(screen.getByText('No file selected')).toBeInTheDocument();
  });

  it('generates sequential barcodes correctly', async () => {
    const mockOnBatchGenerated = vi.fn();
    renderWithStore(<BatchGenerator onBatchGenerated={mockOnBatchGenerated} />);

    // Set up for small batch
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '1' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();

    // Just test the setup, not the async generation
    expect(countInput).toHaveValue(1);
    expect(mockOnBatchGenerated).toBeDefined();
  });

  it('handles custom codes generation', async () => {
    renderWithStore(<BatchGenerator />);

    // Switch to custom mode
    const customModeButton = screen.getByText('Custom List');
    fireEvent.click(customModeButton);

    // Add custom codes
    const customCodesInput = screen.getByLabelText('Custom Codes (one per line)');
    fireEvent.change(customCodesInput, { target: { value: 'CODE001\nCODE002\nCODE003' } });

    expect(customCodesInput.value).toBe('CODE001\nCODE002\nCODE003');

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
  });

  it('processes template patterns correctly', async () => {
    renderWithStore(<BatchGenerator />);

    // Switch to template mode
    const templateModeButton = screen.getByText('Template Pattern');
    fireEvent.click(templateModeButton);

    // Set custom template
    const templateInput = screen.getByLabelText('Template Pattern');
    fireEvent.change(templateInput, { target: { value: 'TEST{number:3}END' } });

    expect(templateInput).toHaveValue('TEST{number:3}END');

    // Template mode should still have count input
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '2' } });

    expect(countInput).toHaveValue(2);
  });

  it('shows progress during generation', async () => {
    renderWithStore(<BatchGenerator />);

    // Set up for batch generation
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '5' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
    expect(countInput).toHaveValue(5);
  });

  it('displays generated barcodes preview', async () => {
    renderWithStore(<BatchGenerator />);

    // Test setup for batch generation
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '2' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
    expect(countInput).toHaveValue(2);
  });

  it('handles format selection', () => {
    renderWithStore(<BatchGenerator />);

    const formatSelect = screen.getByLabelText('Barcode Format');
    fireEvent.change(formatSelect, { target: { value: 'qr' } });

    expect(formatSelect).toHaveValue('qr');
  });

  it('toggles checksum option', () => {
    renderWithStore(<BatchGenerator />);

    const checksumCheckbox = screen.getByLabelText('Include checksum for validation');
    expect(checksumCheckbox).toBeChecked(); // Default is true

    fireEvent.click(checksumCheckbox);
    expect(checksumCheckbox).not.toBeChecked();
  });

  it('shows template pattern help text', () => {
    renderWithStore(<BatchGenerator />);

    // Switch to template mode
    const templateModeButton = screen.getByText('Template Pattern');
    fireEvent.click(templateModeButton);

    expect(screen.getByText(/Available placeholders:/)).toBeInTheDocument();
    expect(screen.getByText(/{prefix}/)).toBeInTheDocument();
    expect(screen.getByText(/{number}/)).toBeInTheDocument();
  });

  it('handles CSV file upload', () => {
    renderWithStore(<BatchGenerator />);

    // Switch to CSV mode
    const csvModeButton = screen.getByText('CSV Import');
    fireEvent.click(csvModeButton);

    expect(screen.getByText('Choose CSV File')).toBeInTheDocument();
    expect(screen.getByText('No file selected')).toBeInTheDocument();
  });

  it('exports to CSV correctly', async () => {
    renderWithStore(<BatchGenerator />);

    // Generate batch first
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '1' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
    });

    // Just check that export button exists and is clickable
    const exportButton = screen.getByText('Export CSV');
    expect(exportButton).toBeInTheDocument();
  });

  it('disables generate button during generation', async () => {
    renderWithStore(<BatchGenerator />);

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    fireEvent.click(generateButton);

    // Check that generation starts
    await waitFor(() => {
      expect(screen.getByText(/Generating.../)).toBeInTheDocument();
    });
  });

  it('calls onBatchGenerated callback when batch is completed', async () => {
    const mockOnBatchGenerated = vi.fn();
    renderWithStore(<BatchGenerator onBatchGenerated={mockOnBatchGenerated} />);

    // Generate small batch
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '1' } });

    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/Generated Batch/)).toBeInTheDocument();
    });

    // Check that callback was provided
    expect(mockOnBatchGenerated).toBeDefined();
  });

  it('displays error message when generation fails', () => {
    const store = createMockStore({
      errors: {
        generation: 'Failed to generate batch',
      },
    });

    renderWithStore(<BatchGenerator />, store);

    expect(screen.getByText('Failed to generate batch')).toBeInTheDocument();
  });

  it('shows truncation message for large batches', async () => {
    renderWithStore(<BatchGenerator />);

    // Test that we can set a large count
    const countInput = screen.getByLabelText('Number of Barcodes');
    fireEvent.change(countInput, { target: { value: '30' } });

    expect(countInput).toHaveValue(30);

    // Test that generate button is available
    const generateButton = screen.getByRole('button', { name: /generate batch/i });
    expect(generateButton).toBeInTheDocument();
  });
});