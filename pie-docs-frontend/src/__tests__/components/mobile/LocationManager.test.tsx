import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LocationManager from '@/components/mobile/LocationManager';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn(),
  watchPosition: vi.fn(),
  clearWatch: vi.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

// Mock permissions API
const mockPermissions = {
  query: vi.fn(),
};

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

describe('LocationManager', () => {
  const mockOnLocationCaptured = vi.fn();
  const mockOnLocationError = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    onLocationCaptured: mockOnLocationCaptured,
    onLocationError: mockOnLocationError,
    isVisible: true,
    onClose: mockOnClose,
    autoCapture: false,
    showPrivacyControls: true,
  };

  const mockPosition = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      accuracy: 10,
    },
    timestamp: Date.now(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
      },
      writable: true,
    });

    // Mock permissions query
    mockPermissions.query.mockResolvedValue({
      state: 'prompt',
      onchange: null,
    });

    // Reset geolocation mocks
    mockGeolocation.getCurrentPosition.mockImplementation((success) => {
      setTimeout(() => success(mockPosition), 100);
    });
  });

  it('renders location manager interface when visible', () => {
    render(<LocationManager {...defaultProps} />);

    expect(screen.getByText('Location Services')).toBeInTheDocument();
    expect(screen.getByText('Current Location')).toBeInTheDocument();
    expect(screen.getByText('Privacy Settings')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<LocationManager {...defaultProps} isVisible={false} />);

    expect(screen.queryByText('Location Services')).not.toBeInTheDocument();
  });

  it('displays permission status', async () => {
    mockPermissions.query.mockResolvedValue({
      state: 'granted',
      onchange: null,
    });

    render(<LocationManager {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Location Permission: granted/)).toBeInTheDocument();
    });
  });

  it('captures location when Get Location button is clicked', async () => {
    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    expect(screen.getByText('Getting Location...')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('displays location data after successful capture', async () => {
    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    await waitFor(() => {
      expect(screen.getByText(/40.712800° N, 74.006000° W/)).toBeInTheDocument();
      expect(screen.getByText(/Very High \(±10m\)/)).toBeInTheDocument();
    });
  });

  it('calls onLocationCaptured when location is captured successfully', async () => {
    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    await waitFor(() => {
      expect(mockOnLocationCaptured).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 40.7128,
          longitude: -74.0060,
          accuracy: 10,
        })
      );
    });
  });

  it('handles geolocation errors', async () => {
    const mockError = {
      code: 1, // PERMISSION_DENIED
      message: 'Permission denied',
    };

    mockGeolocation.getCurrentPosition.mockImplementation((success, error) => {
      setTimeout(() => error(mockError), 100);
    });

    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    await waitFor(() => {
      expect(screen.getByText('Location access denied by user')).toBeInTheDocument();
      expect(mockOnLocationError).toHaveBeenCalledWith('Location access denied by user');
    });
  });

  it('updates privacy settings', () => {
    render(<LocationManager {...defaultProps} />);

    const enableLocationCheckbox = screen.getByRole('checkbox', { name: /enable location capture/i });

    fireEvent.click(enableLocationCheckbox);

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'locationPrivacySettings',
      expect.stringContaining('"enableLocationCapture":false')
    );
  });

  it('changes accuracy level setting', () => {
    render(<LocationManager {...defaultProps} />);

    const accuracySelect = screen.getByDisplayValue('Medium (Network)');
    fireEvent.change(accuracySelect, { target: { value: 'high' } });

    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      'locationPrivacySettings',
      expect.stringContaining('"accuracyLevel":"high"')
    );
  });

  it('shows location history when enabled', () => {
    // Mock stored location cache
    window.localStorage.getItem = vi.fn((key) => {
      if (key === 'locationPrivacySettings') {
        return JSON.stringify({ retainLocationHistory: true });
      }
      if (key === 'locationCache') {
        return JSON.stringify([
          {
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 15,
              timestamp: Date.now() - 3600000, // 1 hour ago
              address: '123 Test St',
            },
            timestamp: Date.now() - 3600000,
            accuracy: 15,
          },
        ]);
      }
      return null;
    });

    render(<LocationManager {...defaultProps} />);

    expect(screen.getByText('Recent Locations')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show'));

    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    expect(screen.getByText('Use')).toBeInTheDocument();
  });

  it('uses stored location when Use button is clicked', () => {
    window.localStorage.getItem = vi.fn((key) => {
      if (key === 'locationPrivacySettings') {
        return JSON.stringify({ retainLocationHistory: true, shareWithDocuments: true });
      }
      if (key === 'locationCache') {
        return JSON.stringify([
          {
            location: {
              latitude: 40.7128,
              longitude: -74.0060,
              accuracy: 15,
              timestamp: Date.now() - 3600000,
              address: '123 Test St',
            },
            timestamp: Date.now() - 3600000,
            accuracy: 15,
          },
        ]);
      }
      return null;
    });

    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Show'));
    fireEvent.click(screen.getByText('Use'));

    expect(mockOnLocationCaptured).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 40.7128,
        longitude: -74.0060,
        address: '123 Test St',
      })
    );
  });

  it('clears location history', () => {
    window.localStorage.getItem = vi.fn((key) => {
      if (key === 'locationPrivacySettings') {
        return JSON.stringify({ retainLocationHistory: true });
      }
      if (key === 'locationCache') {
        return JSON.stringify([{ location: mockPosition.coords, timestamp: Date.now() }]);
      }
      return null;
    });

    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Show'));
    fireEvent.click(screen.getByText('Clear History'));

    expect(window.localStorage.removeItem).toHaveBeenCalledWith('locationCache');
  });

  it('handles auto-capture when enabled', () => {
    render(<LocationManager {...defaultProps} autoCapture={true} />);

    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('closes modal when close button is clicked', () => {
    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Close'));

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('disables location capture when privacy setting is disabled', async () => {
    window.localStorage.getItem = vi.fn(() =>
      JSON.stringify({ enableLocationCapture: false })
    );

    render(<LocationManager {...defaultProps} />);

    await waitFor(() => {
      const getLocationButton = screen.getByText('Get Location');
      expect(getLocationButton).toBeDisabled();
    });
  });

  it('handles missing geolocation support', () => {
    // Temporarily remove geolocation
    const originalGeolocation = global.navigator.geolocation;
    delete (global.navigator as any).geolocation;

    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    expect(mockOnLocationError).toHaveBeenCalledWith(
      'Geolocation is not supported by this browser'
    );

    // Restore geolocation
    global.navigator.geolocation = originalGeolocation;
  });

  it('formats coordinates correctly', () => {
    render(<LocationManager {...defaultProps} />);

    fireEvent.click(screen.getByText('Get Location'));

    waitFor(() => {
      expect(screen.getByText('40.712800° N, 74.006000° W')).toBeInTheDocument();
    });
  });

  it('displays accuracy levels correctly', () => {
    const testCases = [
      { accuracy: 5, expected: 'Very High (±5m)' },
      { accuracy: 25, expected: 'High (±25m)' },
      { accuracy: 75, expected: 'Medium (±75m)' },
      { accuracy: 150, expected: 'Low (±150m)' },
    ];

    testCases.forEach(({ accuracy, expected }) => {
      mockGeolocation.getCurrentPosition.mockImplementation((success) => {
        setTimeout(() => success({
          ...mockPosition,
          coords: { ...mockPosition.coords, accuracy }
        }), 100);
      });

      const { rerender } = render(<LocationManager {...defaultProps} />);

      fireEvent.click(screen.getByText('Get Location'));

      waitFor(() => {
        expect(screen.getByText(expected)).toBeInTheDocument();
      });

      rerender(<LocationManager {...defaultProps} key={accuracy} />);
    });
  });

  it('loads and saves privacy settings from localStorage', () => {
    const storedSettings = {
      enableLocationCapture: false,
      shareWithDocuments: false,
      retainLocationHistory: true,
      accuracyLevel: 'high',
      autoCapture: true,
    };

    window.localStorage.getItem = vi.fn(() => JSON.stringify(storedSettings));

    render(<LocationManager {...defaultProps} />);

    expect(window.localStorage.getItem).toHaveBeenCalledWith('locationPrivacySettings');

    // Check that the UI reflects the loaded settings
    const enableLocationCheckbox = screen.getByRole('checkbox', { name: /enable location capture/i });
    expect(enableLocationCheckbox).not.toBeChecked();
  });
});