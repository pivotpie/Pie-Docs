import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import DocumentCapture from '@/components/mobile/DocumentCapture';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
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

// Mock HTMLCanvasElement methods
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(1024), // Mock image data
    width: 32,
    height: 32,
  })),
}));

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mockImageData');
HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
  callback(new Blob(['mock'], { type: 'image/jpeg' }));
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
              } as MediaTrackConstraints,
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

describe('DocumentCapture', () => {
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
    ]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderComponent = (props = {}) => {
    const defaultProps = {
      isActive: true,
      onCaptureSuccess: vi.fn(),
      onCaptureError: vi.fn(),
    };

    return act(() => {
      return render(
        <Provider store={store}>
          <DocumentCapture {...defaultProps} {...props} />
        </Provider>
      );
    });
  };

  it('renders document capture interface when active', () => {
    renderComponent();

    expect(screen.getByRole('application')).toBeInTheDocument();
    expect(screen.getByText('Position document within the frame')).toBeInTheDocument();
    expect(screen.getByText('Document edges will be highlighted when detected')).toBeInTheDocument();
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

  it('displays document frame guide with corner indicators', () => {
    renderComponent();

    // Check for document frame
    const frameGuide = document.querySelector('.border-white.border-opacity-50');
    expect(frameGuide).toBeInTheDocument();

    // Check for corner indicators
    const corners = document.querySelectorAll('.border-blue-400');
    expect(corners).toHaveLength(4);
  });

  it('shows capture button when camera is ready', async () => {
    renderComponent();

    // Wait for camera initialization
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    expect(captureButton).toBeInTheDocument();
  });

  it('captures photo when capture button is clicked', async () => {
    const onCaptureSuccess = vi.fn();
    renderComponent({ onCaptureSuccess });

    // Wait for camera initialization
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    });
  });

  it('shows enhancement controls in preview mode', async () => {
    renderComponent();

    // Simulate successful photo capture
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText('Image Enhancement')).toBeInTheDocument();
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
    });
  });

  it('allows adjustment of enhancement settings', async () => {
    renderComponent();

    // Wait for camera and capture
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      const brightnessSlider = screen.getByLabelText('Brightness');
      expect(brightnessSlider).toBeInTheDocument();

      fireEvent.change(brightnessSlider, { target: { value: '25' } });
      expect(brightnessSlider).toHaveValue('25');
    });
  });

  it('shows retake and accept buttons in preview mode', async () => {
    renderComponent();

    // Wait for camera and capture
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(screen.getByText('Retake')).toBeInTheDocument();
      expect(screen.getByText('Accept')).toBeInTheDocument();
    });
  });

  it('handles camera initialization errors', async () => {
    const onCaptureError = vi.fn();
    mockMediaDevices.getUserMedia.mockRejectedValue(new Error('Camera access denied'));

    renderComponent({ onCaptureError });

    await waitFor(() => {
      expect(onCaptureError).toHaveBeenCalledWith(
        expect.stringContaining('Camera access failed')
      );
    });
  });

  it('provides haptic feedback on successful capture', async () => {
    renderComponent();

    // Wait for camera initialization
    await waitFor(() => {
      expect(mockMediaDevices.getUserMedia).toHaveBeenCalled();
    });

    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    await waitFor(() => {
      expect(navigator.vibrate).toHaveBeenCalledWith([100]);
    });
  });

  it('cleans up camera stream on unmount', () => {
    const { unmount } = renderComponent();

    const stopTrack = vi.fn();
    mockStream.getTracks = vi.fn().mockReturnValue([{ stop: stopTrack }]);

    unmount();

    expect(stopTrack).toHaveBeenCalled();
  });

  it('displays processing status during document processing', () => {
    store = configureStore({
      reducer: { physicalDocs: physicalDocsSlice },
      preloadedState: {
        physicalDocs: {
          ...store.getState().physicalDocs,
          capture: {
            ...store.getState().physicalDocs.capture,
            processingStatus: {
              isProcessing: true,
              progress: 50,
            },
          },
        },
      },
    });

    renderComponent();

    // Capture a photo first
    const captureButton = screen.getByRole('button', { name: 'Capture document' });
    fireEvent.click(captureButton);

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('shows captured documents count', () => {
    store = configureStore({
      reducer: { physicalDocs: physicalDocsSlice },
      preloadedState: {
        physicalDocs: {
          ...store.getState().physicalDocs,
          capture: {
            ...store.getState().physicalDocs.capture,
            captureQueue: [
              {
                id: 'capture1',
                sessionId: 'session1',
                originalImage: new Blob(),
                timestamp: '2025-01-15T10:00:00Z',
                pages: 1,
                metadata: {},
              },
            ],
          },
        },
      },
    });

    renderComponent();

    expect(screen.getByText('1 document(s) captured')).toBeInTheDocument();
  });
});