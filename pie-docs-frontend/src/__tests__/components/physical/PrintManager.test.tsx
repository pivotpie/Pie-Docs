import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PrintManager } from '@/components/physical/PrintManager';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      physicalDocs: physicalDocsSlice,
    },
    preloadedState: {
      physicalDocs: {
        barcodes: {
          generated: [
            {
              id: 'barcode1',
              code: 'DOC123456789',
              format: {
                id: 'code128',
                name: 'Code 128',
                type: 'linear',
                standard: 'CODE128',
                configuration: {},
              },
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
              isActive: true,
            },
            {
              id: 'barcode2',
              code: 'DOC987654321',
              format: {
                id: 'qr',
                name: 'QR Code',
                type: '2d',
                standard: 'QR',
                configuration: {},
              },
              createdAt: '2023-01-01T00:00:00Z',
              updatedAt: '2023-01-01T00:00:00Z',
              isActive: true,
            },
          ],
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

describe('PrintManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with default printer options', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    expect(screen.getByText('Print Manager')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Printer')).toBeInTheDocument();
    expect(screen.getByLabelText('Label Template')).toBeInTheDocument();
    expect(screen.getByLabelText('Number of Copies')).toBeInTheDocument();
  });

  it('shows barcode summary correctly', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1', 'barcode2']} />);

    expect(screen.getByText('Barcodes to print: 2')).toBeInTheDocument();
    expect(screen.getByText('Total labels: 2')).toBeInTheDocument();
    expect(screen.getByText(/DOC123456789, DOC987654321/)).toBeInTheDocument();
  });

  it('updates copies and recalculates total labels', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    const copiesInput = screen.getByLabelText('Number of Copies');
    fireEvent.change(copiesInput, { target: { value: '3' } });

    expect(copiesInput).toHaveValue(3);
    expect(screen.getByText('Total labels: 3')).toBeInTheDocument();
  });

  it('enforces minimum copies of 1', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    const copiesInput = screen.getByLabelText('Number of Copies');
    fireEvent.change(copiesInput, { target: { value: '0' } });

    expect(copiesInput).toHaveValue(1);
  });

  it('shows print preview when checkbox is checked', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    const previewCheckbox = screen.getByLabelText('Show print preview');
    fireEvent.click(previewCheckbox);

    expect(screen.getByText('Print Preview')).toBeInTheDocument();
  });

  it('disables print button when no printer selected', () => {
    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    const printerSelect = screen.getByLabelText('Select Printer');
    fireEvent.change(printerSelect, { target: { value: '' } });

    const printButton = screen.getByRole('button', { name: /print labels/i });
    expect(printButton).toBeDisabled();
  });

  it('disables print button when no barcodes provided', () => {
    renderWithStore(<PrintManager barcodeIds={[]} />);

    const printButton = screen.getByRole('button', { name: /print labels/i });
    expect(printButton).toBeDisabled();
  });

  it('calls onPrintComplete callback when print job completes', async () => {
    vi.useFakeTimers();

    const mockOnPrintComplete = vi.fn();
    renderWithStore(
      <PrintManager barcodeIds={['barcode1']} onPrintComplete={mockOnPrintComplete} />
    );

    const printerSelect = screen.getByLabelText('Select Printer');
    fireEvent.change(printerSelect, { target: { value: 'zebra_zd620' } });

    const templateSelect = screen.getByLabelText('Label Template');
    fireEvent.change(templateSelect, { target: { value: 'small_label' } });

    const printButton = screen.getByRole('button', { name: /print labels/i });
    fireEvent.click(printButton);

    // Fast-forward through all timers
    await vi.advanceTimersByTimeAsync(4000);

    expect(mockOnPrintComplete).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('shows loading state during printing', async () => {
    vi.useFakeTimers();

    renderWithStore(<PrintManager barcodeIds={['barcode1']} />);

    const printerSelect = screen.getByLabelText('Select Printer');
    fireEvent.change(printerSelect, { target: { value: 'zebra_zd620' } });

    const templateSelect = screen.getByLabelText('Label Template');
    fireEvent.change(templateSelect, { target: { value: 'small_label' } });

    const printButton = screen.getByRole('button', { name: /print labels/i });
    fireEvent.click(printButton);

    // Should show loading state immediately
    expect(screen.getByText('Printing...')).toBeInTheDocument();
    expect(printButton).toBeDisabled();

    vi.useRealTimers();
  });

  it('displays print queue when jobs are present', () => {
    const store = createMockStore({
      printing: {
        printQueue: [
          {
            id: 'job123',
            status: 'printing',
            templateId: 'template1',
            barcodeIds: ['barcode1'],
            copies: 2,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
        availablePrinters: [],
        printHistory: [],
        templates: [],
      },
    });

    renderWithStore(<PrintManager barcodeIds={['barcode1']} />, store);

    expect(screen.getByText('Print Queue')).toBeInTheDocument();
    expect(screen.getByText('Print Job #job123')).toBeInTheDocument();
    expect(screen.getByText('1 labels × 2 copies')).toBeInTheDocument();
  });

  it('shows different status indicators for print jobs', () => {
    const store = createMockStore({
      printing: {
        printQueue: [
          {
            id: 'job1',
            status: 'pending',
            templateId: 'template1',
            barcodeIds: ['barcode1'],
            copies: 1,
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            id: 'job2',
            status: 'completed',
            templateId: 'template1',
            barcodeIds: ['barcode1'],
            copies: 1,
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            id: 'job3',
            status: 'failed',
            templateId: 'template1',
            barcodeIds: ['barcode1'],
            copies: 1,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ],
        availablePrinters: [],
        printHistory: [],
        templates: [],
      },
    });

    renderWithStore(<PrintManager barcodeIds={['barcode1']} />, store);

    expect(screen.getByText('⏳ Pending')).toBeInTheDocument();
    expect(screen.getByText('✅ Completed')).toBeInTheDocument();
    expect(screen.getByText('❌ Failed')).toBeInTheDocument();
  });

  it('displays error message when printing fails', () => {
    const store = createMockStore({
      errors: {
        printing: 'Printer not available',
      },
    });

    renderWithStore(<PrintManager barcodeIds={['barcode1']} />, store);

    expect(screen.getByText('Printer not available')).toBeInTheDocument();
  });

  it('shows truncated barcode list when many barcodes are selected', () => {
    const manyBarcodeIds = ['barcode1', 'barcode2', 'barcode3', 'barcode4', 'barcode5'];

    // Create additional mock barcodes
    const store = createMockStore({
      barcodes: {
        generated: [
          {
            id: 'barcode1',
            code: 'DOC1',
            format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            isActive: true,
          },
          {
            id: 'barcode2',
            code: 'DOC2',
            format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            isActive: true,
          },
          {
            id: 'barcode3',
            code: 'DOC3',
            format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            isActive: true,
          },
          {
            id: 'barcode4',
            code: 'DOC4',
            format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            isActive: true,
          },
          {
            id: 'barcode5',
            code: 'DOC5',
            format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
            isActive: true,
          },
        ],
        pending: [],
        templates: [],
        printJobs: [],
      },
    });

    renderWithStore(<PrintManager barcodeIds={manyBarcodeIds} />, store);

    expect(screen.getByText(/DOC1, DOC2, DOC3/)).toBeInTheDocument();
    expect(screen.getByText(/\+2 more/)).toBeInTheDocument();
  });
});