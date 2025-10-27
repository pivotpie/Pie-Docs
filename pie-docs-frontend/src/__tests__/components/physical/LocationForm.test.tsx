import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LocationForm } from '@/components/physical/LocationForm';
import locationSlice from '@/store/slices/locationSlice';
import { Building } from '@/types/location';
import { vi } from 'vitest';

// Mock data
const mockBuilding: Building = {
  id: 'building-1',
  name: 'Test Building',
  description: 'A test building',
  type: 'building',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: { tag1: 'value1' },
  address: '123 Test St',
  floors: [],
  capacity: {
    maxDocuments: 1000,
    alertThreshold: 80,
    criticalThreshold: 95
  },
  environmental: {
    temperatureMin: 18,
    temperatureMax: 24,
    humidityMin: 40,
    humidityMax: 60,
    monitoringEnabled: true
  },
  coordinates: {
    latitude: 40.7128,
    longitude: -74.0060
  },
  contactInfo: {
    manager: 'John Doe',
    phone: '555-0123',
    email: 'john@example.com'
  }
};

const mockInitialState = {
  location: {
    locations: {
      hierarchy: {
        buildings: [],
        flatMap: new Map(),
        totalLocations: 0,
        lastUpdated: '2024-01-01T00:00:00Z'
      },
      selectedLocation: null,
      loading: false,
      error: null,
      searchResults: [],
      searchLoading: false,
      searchError: null
    },
    movements: {
      pending: [],
      history: [],
      loading: false,
      error: null
    },
    capacity: {
      utilizations: [],
      alerts: [],
      loading: false,
      error: null
    }
  }
};

const createMockStore = (preloadedState = mockInitialState) => {
  return configureStore({
    reducer: {
      location: locationSlice
    },
    preloadedState
  });
};

const renderWithProvider = (
  component: React.ReactElement,
  initialState = mockInitialState
) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('LocationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create Mode', () => {
    it('renders create form for building', () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      expect(screen.getByText('Create New building')).toBeInTheDocument();
      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
      expect(screen.getByText('Create Location')).toBeInTheDocument();
    });

    it('renders create form for floor', () => {
      renderWithProvider(
        <LocationForm parentId="building-1" type="floor" />
      );

      expect(screen.getByText('Create New floor')).toBeInTheDocument();
      expect(screen.getByLabelText('Floor Level *')).toBeInTheDocument();
      expect(screen.getByLabelText('Total Area (m²)')).toBeInTheDocument();
      expect(screen.getByLabelText('Access Restricted')).toBeInTheDocument();
    });

    it('renders create form for room', () => {
      renderWithProvider(
        <LocationForm parentId="floor-1" type="room" />
      );

      expect(screen.getByText('Create New room')).toBeInTheDocument();
      expect(screen.getByLabelText('Room Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Security Level (1-5)')).toBeInTheDocument();
    });

    it('renders create form for cabinet', () => {
      renderWithProvider(
        <LocationForm parentId="room-1" type="cabinet" />
      );

      expect(screen.getByText('Create New cabinet')).toBeInTheDocument();
      expect(screen.getByLabelText('Lock Type *')).toBeInTheDocument();
      expect(screen.getByLabelText('Manufacturer')).toBeInTheDocument();
    });

    it('renders create form for shelf', () => {
      renderWithProvider(
        <LocationForm parentId="cabinet-1" type="shelf" />
      );

      expect(screen.getByText('Create New shelf')).toBeInTheDocument();
      expect(screen.getByLabelText('Shelf Position *')).toBeInTheDocument();
    });
  });

  describe('Edit Mode', () => {
    it('renders edit form with populated data', () => {
      renderWithProvider(
        <LocationForm location={mockBuilding} />
      );

      expect(screen.getByText('Edit Test Building')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Building')).toBeInTheDocument();
      expect(screen.getByDisplayValue('A test building')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Test St')).toBeInTheDocument();
      expect(screen.getByText('Update Location')).toBeInTheDocument();
    });

    it('populates building-specific fields', () => {
      renderWithProvider(
        <LocationForm location={mockBuilding} />
      );

      expect(screen.getByDisplayValue('40.7128')).toBeInTheDocument();
      expect(screen.getByDisplayValue('-74.006')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('555-0123')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('shows existing metadata', () => {
      renderWithProvider(
        <LocationForm location={mockBuilding} />
      );

      expect(screen.getByText('tag1: value1')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for empty name', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Name is required')).toBeInTheDocument();
    });

    it('validates floor level for floors', async () => {
      renderWithProvider(
        <LocationForm parentId="building-1" type="floor" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const levelInput = screen.getByLabelText('Floor Level *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Floor' } });
        fireEvent.change(levelInput, { target: { value: '-1' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Floor level must be a non-negative number')).toBeInTheDocument();
    });

    it('validates room type for rooms', async () => {
      renderWithProvider(
        <LocationForm parentId="floor-1" type="room" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Room' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Room type is required')).toBeInTheDocument();
    });

    it('validates lock type for cabinets', async () => {
      renderWithProvider(
        <LocationForm parentId="room-1" type="cabinet" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Cabinet' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Lock type is required')).toBeInTheDocument();
    });

    it('validates shelf position for shelves', async () => {
      renderWithProvider(
        <LocationForm parentId="cabinet-1" type="shelf" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const positionInput = screen.getByLabelText('Shelf Position *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Shelf' } });
        fireEvent.change(positionInput, { target: { value: '0' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Shelf position must be a positive number')).toBeInTheDocument();
    });

    it('validates capacity configuration', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const maxDocsInput = screen.getByLabelText('Max Documents *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Building' } });
        fireEvent.change(maxDocsInput, { target: { value: '0' } });
        fireEvent.click(submitButton);
      });

      expect(screen.getByText('Maximum documents must be greater than 0')).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('updates form fields correctly', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const descInput = screen.getByLabelText('Description');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'New Building' } });
        fireEvent.change(descInput, { target: { value: 'New description' } });
      });

      expect(nameInput).toHaveValue('New Building');
      expect(descInput).toHaveValue('New description');
    });

    it('handles nested field updates', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const latInput = screen.getByLabelText('Latitude');
      const lngInput = screen.getByLabelText('Longitude');

      await act(async () => {
        fireEvent.change(latInput, { target: { value: '42.123' } });
        fireEvent.change(lngInput, { target: { value: '-71.456' } });
      });

      expect(latInput).toHaveValue(42.123);
      expect(lngInput).toHaveValue(-71.456);
    });

    it('toggles environmental monitoring', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const monitoringCheckbox = screen.getByLabelText('Enable Monitoring');

      await act(async () => {
        fireEvent.click(monitoringCheckbox);
      });

      expect(monitoringCheckbox).toBeChecked();

      // Should show environmental fields when enabled
      expect(screen.getByLabelText('Min Temperature (°C)')).toBeInTheDocument();
      expect(screen.getByLabelText('Max Temperature (°C)')).toBeInTheDocument();
    });

    it('adds metadata entries', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const keyInput = screen.getByPlaceholderText('Key');
      const valueInput = screen.getByPlaceholderText('Value');
      const addButton = screen.getByText('Add');

      await act(async () => {
        fireEvent.change(keyInput, { target: { value: 'testKey' } });
        fireEvent.change(valueInput, { target: { value: 'testValue' } });
        fireEvent.click(addButton);
      });

      expect(screen.getByText('testKey: testValue')).toBeInTheDocument();
    });

    it('removes metadata entries', async () => {
      renderWithProvider(
        <LocationForm location={mockBuilding} />
      );

      const removeButton = screen.getByRole('button', { name: '✕' });

      await act(async () => {
        fireEvent.click(removeButton);
      });

      expect(screen.queryByText('tag1: value1')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSuccess after successful creation', async () => {
      const mockOnSuccess = vi.fn();

      renderWithProvider(
        <LocationForm
          parentId=""
          type="building"
          onSuccess={mockOnSuccess}
        />
      );

      const nameInput = screen.getByLabelText('Name *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Building' } });
      });

      await act(async () => {
        fireEvent.click(submitButton);
      });

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('calls onCancel when cancel button is clicked', async () => {
      const mockOnCancel = vi.fn();

      renderWithProvider(
        <LocationForm
          parentId=""
          type="building"
          onCancel={mockOnCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows loading state during submission', async () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      const nameInput = screen.getByLabelText('Name *');
      const submitButton = screen.getByText('Create Location');

      await act(async () => {
        fireEvent.change(nameInput, { target: { value: 'Test Building' } });
        fireEvent.click(submitButton);
      });

      expect(submitButton).toBeDisabled();
    });
  });

  describe('Room Type Specific Fields', () => {
    it('shows room type options', async () => {
      renderWithProvider(
        <LocationForm parentId="floor-1" type="room" />
      );

      const roomTypeSelect = screen.getByLabelText('Room Type *');

      await act(async () => {
        fireEvent.click(roomTypeSelect);
      });

      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Office')).toBeInTheDocument();
      expect(screen.getByText('Storage')).toBeInTheDocument();
      expect(screen.getByText('Secure')).toBeInTheDocument();
      expect(screen.getByText('Climate Controlled')).toBeInTheDocument();
    });
  });

  describe('Cabinet Type Specific Fields', () => {
    it('shows lock type options', async () => {
      renderWithProvider(
        <LocationForm parentId="room-1" type="cabinet" />
      );

      const lockTypeSelect = screen.getByLabelText('Lock Type *');

      await act(async () => {
        fireEvent.click(lockTypeSelect);
      });

      expect(screen.getByText('No Lock')).toBeInTheDocument();
      expect(screen.getByText('Key Lock')).toBeInTheDocument();
      expect(screen.getByText('Digital Lock')).toBeInTheDocument();
      expect(screen.getByText('Biometric Lock')).toBeInTheDocument();
      expect(screen.getByText('Combination Lock')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      expect(screen.getByLabelText('Name *')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Address')).toBeInTheDocument();
    });

    it('has required field indicators', () => {
      renderWithProvider(
        <LocationForm parentId="" type="building" />
      );

      expect(screen.getByText('Name *')).toBeInTheDocument();
      expect(screen.getByText('Max Documents *')).toBeInTheDocument();
    });
  });
});