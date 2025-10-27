import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import CameraScanner from '@/components/mobile/CameraScanner';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock @zxing/browser
vi.mock('@zxing/browser', () => ({
  BrowserMultiFormatReader: vi.fn().mockImplementation(() => ({
    decodeFromVideoDevice: vi.fn(),
    reset: vi.fn(),
  })),
}));

// Mock navigator.mediaDevices
const mockMediaDevices = {
  getUserMedia: vi.fn(),
  enumerateDevices: vi.fn(),
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true,
});

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
});

// Mock HTMLVideoElement.srcObject
Object.defineProperty(HTMLVideoElement.prototype, 'srcObject', {
  set: vi.fn(),
  get: vi.fn(() => null),
  configurable: true,
});

const createMockStore = () => {
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
          currentSession: {
            id: 'session-1',
            startedAt: '2025-01-15T10:00:00Z',
            scannedCount: 0,
            capturedCount: 0,
            status: 'active',
          },
          scanQueue: [],
          offlineQueue: [],
          cameraStatus: {
            isActive: false,
            hasPermission: false,
            constraints: {
              video: {
                width: { ideal: 1920, max: 4096 },
                height: { ideal: 1080, max: 4096 },
                facingMode: { ideal: 'environment' },
              },
            },
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
          barcodeFormats: [],
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
      },
    },
  });
};

describe('CameraScanner', () => {
  let store: any;
  let mockStream: MediaStream;

  beforeEach(() => {
    store = createMockStore();
    vi.clearAllMocks();

    // Mock MediaStream
    mockStream = {
      getTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
          getCapabilities: vi.fn().mockReturnValue({}),
          applyConstraints: vi.fn(),
        },
      ]),
      getVideoTracks: vi.fn().mockReturnValue([
        {
          stop: vi.fn(),
          getCapabilities: vi.fn().mockReturnValue({}),
          applyConstraints: vi.fn(),
        },
      ]),
    } as any;

    mockMediaDevices.getUserMedia.mockResolvedValue(mockStream);
    mockMediaDevices.enumerateDevices.mockResolvedValue([
      {
        deviceId: 'camera1',
        kind: 'videoinput',
        label: 'Back Camera',
      },
      {
        deviceId: 'camera2',
        kind: 'videoinput',
        label: 'Front Camera',
      },
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isActive: true,
      onScanSuccess: vi.fn(),
      onScanError: vi.fn(),
    };

    return act(() => {
      return render(
        <Provider store={store}>
          <CameraScanner {...defaultProps} {...props} />
        </Provider>
      );
    });
  };

  it('renders camera scanner when active', () => {
    renderComponent();

    expect(screen.getByRole('application')).toBeInTheDocument();
    expect(screen.getByText('Align barcode within the frame')).toBeInTheDocument();
    expect(screen.getByText('Scanning will happen automatically')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    renderComponent({ isActive: false });

    expect(screen.queryByRole('application')).not.toBeInTheDocument();
  });

  it('requests camera permission when activated', async () => {
    renderComponent();

    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1920, max: 4096 },
          height: { ideal: 1080, max: 4096 },
          facingMode: { ideal: 'environment' },
          focusMode: { ideal: 'continuous' },
        },
      });
    });
  });

  it('displays scan target overlay with corner indicators', () => {
    renderComponent();

    // Check for scan frame elements
    const scanFrame = document.querySelector('.w-64.h-64.border-2');
    expect(scanFrame).toBeInTheDocument();

    // Check for corner indicators
    const corners = document.querySelectorAll('.border-green-400');
    expect(corners).toHaveLength(4);
  });

  it('shows torch toggle button', () => {
    renderComponent();

    const torchButton = screen.getByRole('button', { name: 'Toggle flashlight' });
    expect(torchButton).toBeInTheDocument();
  });

  it('displays scan count indicator', () => {
    renderComponent();

    expect(screen.getByText('Scanned: 0')).toBeInTheDocument();
  });

  it('toggles torch when torch button is clicked', async () => {
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn(),
    };

    mockStream.getVideoTracks = vi.fn().mockReturnValue([mockTrack]);

    renderComponent();

    // Wait for camera to initialize
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const torchButton = screen.getByRole('button', { name: 'Toggle flashlight' });
    fireEvent.click(torchButton);

    await waitFor(() => {
      expect(mockTrack.applyConstraints).toHaveBeenCalledWith({
        advanced: [{ torch: true }],
      });
    });
  });

  it('handles camera permission denied', async () => {
    const onScanError = vi.fn();
    mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Permission denied'));

    renderComponent({ onScanError });

    await waitFor(() => {
      expect(onScanError).toHaveBeenCalledWith(
        expect.stringContaining('Camera access failed')
      );
    });
  });

  it('shows loading indicator when scanning', () => {
    store = configureStore({
      reducer: { physicalDocs: physicalDocsSlice },
      preloadedState: {
        physicalDocs: {
          ...store.getState().physicalDocs,
          loading: {
            ...store.getState().physicalDocs.loading,
            scanning: true,
          },
        },
      },
    });

    renderComponent();

    expect(screen.getByRole('button', { name: /loading/i })).toBeInTheDocument();
  });

  it('shows error message when camera fails', () => {
    store = configureStore({
      reducer: { physicalDocs: physicalDocsSlice },
      preloadedState: {
        physicalDocs: {
          ...store.getState().physicalDocs,
          mobileScanning: {
            ...store.getState().physicalDocs.mobileScanning,
            cameraStatus: {
              ...store.getState().physicalDocs.mobileScanning.cameraStatus,
              error: 'Camera initialization failed',
            },
          },
        },
      },
    });

    renderComponent();

    expect(screen.getByText('Camera initialization failed')).toBeInTheDocument();
  });

  it('processes successful scan results', async () => {
    const onScanSuccess = vi.fn();
    const { BrowserMultiFormatReader } = await import('@zxing/browser');

    // Mock successful scan result
    const mockResult = {
      getText: () => '1234567890',
      getBarcodeFormat: () => ({ toString: () => 'CODE_128' }),
    };

    const mockReader = {
      decodeFromVideoDevice: vi.fn((deviceId, video, callback) => {
        // Simulate successful scan after a short delay
        setTimeout(() => callback(mockResult, null), 100);
      }),
      reset: vi.fn(),
    };

    (BrowserMultiFormatReader as any).mockImplementation(() => mockReader);

    renderComponent({ onScanSuccess });

    await waitFor(() => {
      expect(onScanSuccess).toHaveBeenCalledWith(mockResult);
    }, { timeout: 2000 });
  });

  it('prevents duplicate scans within time threshold', async () => {
    const onScanSuccess = vi.fn();
    const { BrowserMultiFormatReader } = await import('@zxing/browser');

    const mockResult = {
      getText: () => '1234567890',
      getBarcodeFormat: () => ({ toString: () => 'CODE_128' }),
    };

    const mockReader = {
      decodeFromVideoDevice: vi.fn((deviceId, video, callback) => {
        // Trigger multiple rapid scans
        callback(mockResult, null);
        callback(mockResult, null);
        callback(mockResult, null);
      }),
      reset: vi.fn(),
    };

    (BrowserMultiFormatReader as any).mockImplementation(() => mockReader);

    renderComponent({ onScanSuccess });

    await waitFor(() => {
      // Should only be called once due to duplicate prevention
      expect(onScanSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it('provides haptic feedback on successful scan', async () => {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');

    const mockResult = {
      getText: () => '1234567890',
      getBarcodeFormat: () => ({ toString: () => 'CODE_128' }),
    };

    const mockReader = {
      decodeFromVideoDevice: vi.fn((deviceId, video, callback) => {
        setTimeout(() => callback(mockResult, null), 100);
      }),
      reset: vi.fn(),
    };

    (BrowserMultiFormatReader as any).mockImplementation(() => mockReader);

    renderComponent();

    await waitFor(() => {
      expect(navigator.vibrate).toHaveBeenCalledWith([100, 50, 100]);
    }, { timeout: 2000 });
  });

  it('cleans up camera stream on unmount', () => {
    const { unmount } = renderComponent();

    const stopTrack = vi.fn();
    mockStream.getTracks = vi.fn().mockReturnValue([{ stop: stopTrack }]);

    unmount();

    expect(stopTrack).toHaveBeenCalled();
  });

  it('handles torch control errors gracefully', async () => {
    const mockTrack = {
      getCapabilities: vi.fn().mockReturnValue({ torch: true }),
      applyConstraints: vi.fn().mockRejectedValue(new Error('Torch error')),
    };

    mockStream.getVideoTracks = vi.fn().mockReturnValue([mockTrack]);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    renderComponent();

    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const torchButton = screen.getByRole('button', { name: 'Toggle flashlight' });
    fireEvent.click(torchButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Torch control failed:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('updates scan count in display', () => {
    store = configureStore({
      reducer: { physicalDocs: physicalDocsSlice },
      preloadedState: {
        physicalDocs: {
          ...store.getState().physicalDocs,
          mobileScanning: {
            ...store.getState().physicalDocs.mobileScanning,
            scanQueue: [
              {
                id: 'scan1',
                barcode: '123456',
                format: { id: 'code128', name: 'Code 128', type: 'linear', standard: 'CODE128', configuration: {} },
                confidence: 1.0,
                timestamp: '2025-01-15T10:00:00Z',
                validated: true,
              },
            ],
          },
        },
      },
    });

    renderComponent();

    expect(screen.getByText('Scanned: 1')).toBeInTheDocument();
  });
});