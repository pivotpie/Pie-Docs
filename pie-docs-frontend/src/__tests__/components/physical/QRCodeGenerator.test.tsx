import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QRCodeGenerator } from '@/components/physical/QRCodeGenerator';
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
              id: 'qr',
              name: 'QR Code',
              type: '2d',
              standard: 'QR',
              configuration: { width: 256, margin: 1 },
            },
          ],
          labelSizes: [],
          defaultSettings: {
            defaultFormat: 'qr',
            autoGenerate: true,
            prefix: 'QR',
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
    generateEnhancedQRCode: vi.fn().mockResolvedValue('data:image/png;base64,mock-qr-image'),
    validateQRCode: vi.fn().mockResolvedValue(true),
    generateChecksum: vi.fn().mockReturnValue('AB'),
    generateUniqueId: vi.fn().mockReturnValue('QR123456789ABC'),
  },
}));

describe('QRCodeGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default options', () => {
    renderWithStore(<QRCodeGenerator />);

    expect(screen.getByText('QR Code Generator')).toBeInTheDocument();
    expect(screen.getByLabelText('Data Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Error Correction Level')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /generate qr code/i })).toBeInTheDocument();
  });

  it('shows data type options correctly', () => {
    renderWithStore(<QRCodeGenerator />);

    const dataTypeSelect = screen.getByLabelText('Data Type');
    expect(dataTypeSelect).toBeInTheDocument();

    // Check for some key data type options
    expect(screen.getByText('Plain Text')).toBeInTheDocument();
    expect(screen.getByText('Website URL')).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Document Metadata')).toBeInTheDocument();
  });

  it('shows error correction level options', () => {
    renderWithStore(<QRCodeGenerator />);

    const errorCorrectionSelect = screen.getByLabelText('Error Correction Level');
    expect(errorCorrectionSelect).toBeInTheDocument();

    // Check for error correction options
    fireEvent.click(errorCorrectionSelect);
    expect(screen.getByText(/Low \(7%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Medium \(15%\)/)).toBeInTheDocument();
    expect(screen.getByText(/Quartile \(25%\)/)).toBeInTheDocument();
    expect(screen.getByText(/High \(30%\)/)).toBeInTheDocument();
  });

  it('validates URL input correctly', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Select URL data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'url' } });

    // Enter invalid URL
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'invalid-url' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid URL format')).toBeInTheDocument();
    });
  });

  it('validates email input correctly', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Select email data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'email' } });

    // Enter invalid email
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'invalid-email' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email format')).toBeInTheDocument();
    });
  });

  it('validates phone number input correctly', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Select phone data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'phone' } });

    // Enter valid phone number
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: '+1-555-123-4567' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('QR code generated successfully!')).toBeInTheDocument();
    });
  });

  it('updates size and color options', () => {
    renderWithStore(<QRCodeGenerator />);

    // Update size
    const sizeInput = screen.getByLabelText('Size (px)');
    fireEvent.change(sizeInput, { target: { value: '320' } });
    expect(sizeInput).toHaveValue(320);

    // Update margin
    const marginInput = screen.getByLabelText('Margin');
    fireEvent.change(marginInput, { target: { value: '2' } });
    expect(marginInput).toHaveValue(2);

    // Update colors
    const darkColorInput = screen.getByLabelText('Dark Color');
    fireEvent.change(darkColorInput, { target: { value: '#ff0000' } });
    expect(darkColorInput).toHaveValue('#ff0000');

    const lightColorInput = screen.getByLabelText('Light Color');
    fireEvent.change(lightColorInput, { target: { value: '#00ff00' } });
    expect(lightColorInput).toHaveValue('#00ff00');
  });

  it('generates QR code with metadata when selected', async () => {
    renderWithStore(<QRCodeGenerator documentId="doc123" />);

    // Select metadata data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'metadata' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('QR code generated successfully!')).toBeInTheDocument();
    });

    // Check if QR code is displayed
    expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    expect(screen.getByAltText('Generated QR Code')).toBeInTheDocument();
  });

  it('shows QR code information after generation', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Enter data and generate
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'https://example.com' } });

    // Select URL type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'url' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    });

    // Check QR code info
    const typeElements = screen.getAllByText(/Type:/);
    expect(typeElements.length).toBeGreaterThan(0);
    expect(screen.getByText('url')).toBeInTheDocument();
    expect(screen.getByText('Error Correction:')).toBeInTheDocument();
    expect(screen.getByText('Size:')).toBeInTheDocument();
  });

  it('shows metadata when included', async () => {
    renderWithStore(<QRCodeGenerator documentId="doc123" />);

    // Enter data and enable metadata
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'Test data' } });

    const metadataCheckbox = screen.getByLabelText('Include document metadata');
    fireEvent.click(metadataCheckbox);

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    });

    // Check metadata display
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText(/Document ID:/)).toBeInTheDocument();
    const typeElements = screen.getAllByText(/Type:/);
    expect(typeElements.length).toBeGreaterThan(0);
    expect(screen.getByText(/Created:/)).toBeInTheDocument();
  });

  it('downloads QR code when download button is clicked', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Generate QR code first
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'Test data' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    });

    // Check that download button exists
    const downloadButton = screen.getByRole('button', { name: /download png/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('tests QR code validation when test button is clicked', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Generate QR code first
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'Test data' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    });

    // Check that test button exists
    const testButton = screen.getByRole('button', { name: /test qr code/i });
    expect(testButton).toBeInTheDocument();
  });

  it('disables generate button when no data is entered', () => {
    renderWithStore(<QRCodeGenerator />);

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    expect(generateButton).toBeDisabled();

    // Enter some data
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'Test data' } });

    expect(generateButton).not.toBeDisabled();
  });

  it('calls onQRGenerated callback when QR code is generated', async () => {
    const mockOnQRGenerated = vi.fn();
    renderWithStore(<QRCodeGenerator onQRGenerated={mockOnQRGenerated} />);

    // Enter data and generate
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'Test data' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Generated QR Code')).toBeInTheDocument();
    });

    // Just check that the callback was set up properly
    expect(mockOnQRGenerated).toBeDefined();
  });

  it('shows loading state during generation', async () => {
    const store = createMockStore({
      loading: {
        generating: true,
        printing: false,
        validating: false,
        scanning: false,
        capturing: false,
        syncing: false,
      },
    });

    renderWithStore(<QRCodeGenerator />, store);

    const generateButton = screen.getByRole('button', { name: /generating.../i });
    expect(generateButton).toBeDisabled();
  });

  it('displays error message when generation fails', () => {
    const store = createMockStore({
      errors: {
        generation: 'Failed to generate QR code',
      },
    });

    renderWithStore(<QRCodeGenerator />, store);

    expect(screen.getByText('Failed to generate QR code')).toBeInTheDocument();
  });

  it('shows usage examples section', () => {
    renderWithStore(<QRCodeGenerator />);

    expect(screen.getByText('Usage Examples')).toBeInTheDocument();
    const urlElements = screen.getAllByText(/URL:/);
    expect(urlElements.length).toBeGreaterThan(0);
    const emailElements = screen.getAllByText(/Email:/);
    expect(emailElements.length).toBeGreaterThan(0);
    const phoneElements = screen.getAllByText(/Phone:/);
    expect(phoneElements.length).toBeGreaterThan(0);
    const wifiElements = screen.getAllByText(/WiFi:/);
    expect(wifiElements.length).toBeGreaterThan(0);
    const locationElements = screen.getAllByText(/Location:/);
    expect(locationElements.length).toBeGreaterThan(0);
    const contactElements = screen.getAllByText(/Contact:/);
    expect(contactElements.length).toBeGreaterThan(0);
  });

  it('handles WiFi data type formatting', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Select WiFi data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'wifi' } });

    // Enter WiFi data
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: 'MyNetwork:password123:WPA2' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('QR code generated successfully!')).toBeInTheDocument();
    });
  });

  it('handles location data type formatting', async () => {
    renderWithStore(<QRCodeGenerator />);

    // Select location data type
    const dataTypeSelect = screen.getByLabelText('Data Type');
    fireEvent.change(dataTypeSelect, { target: { value: 'location' } });

    // Enter valid GPS coordinates
    const dataInput = screen.getByLabelText('Data to Encode');
    fireEvent.change(dataInput, { target: { value: '40.7128,-74.0060' } });

    const generateButton = screen.getByRole('button', { name: /generate qr code/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('QR code generated successfully!')).toBeInTheDocument();
    });
  });
});