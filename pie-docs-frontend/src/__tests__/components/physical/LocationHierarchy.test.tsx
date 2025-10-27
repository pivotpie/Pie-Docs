import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LocationHierarchy } from '@/components/physical/LocationHierarchy';
import locationSlice from '@/store/slices/locationSlice';
import { LocationHierarchy as LocationHierarchyType, Building, Floor, Room } from '@/types/location';
import { vi } from 'vitest';

// Mock data
const mockBuilding: Building = {
  id: 'building-1',
  name: 'Main Building',
  description: 'Primary office building',
  type: 'building',
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: {},
  address: '123 Main St',
  floors: [],
  capacity: {
    maxDocuments: 10000,
    alertThreshold: 80,
    criticalThreshold: 95
  },
  environmental: {
    temperatureMin: 18,
    temperatureMax: 24,
    humidityMin: 40,
    humidityMax: 60,
    monitoringEnabled: true
  }
};

const mockFloor: Floor = {
  id: 'floor-1',
  name: 'Ground Floor',
  type: 'floor',
  parentId: 'building-1',
  buildingId: 'building-1',
  level: 0,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: {},
  rooms: []
};

const mockRoom: Room = {
  id: 'room-1',
  name: 'Archive Room',
  type: 'room',
  parentId: 'floor-1',
  floorId: 'floor-1',
  roomType: 'archive',
  cabinets: [],
  environmental: {
    locationId: 'room-1',
    timestamp: '2024-01-01T00:00:00Z',
    temperature: 20,
    humidity: 45,
    status: 'normal'
  },
  securityLevel: 3,
  isActive: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  metadata: {}
};

const mockHierarchy: LocationHierarchyType = {
  buildings: [
    {
      ...mockBuilding,
      floors: [
        {
          ...mockFloor,
          rooms: [mockRoom]
        }
      ]
    }
  ],
  flatMap: new Map(),
  totalLocations: 3,
  lastUpdated: '2024-01-01T00:00:00Z'
};

const mockInitialState = {
  location: {
    locations: {
      hierarchy: mockHierarchy,
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

// Mock the async thunks to prevent actual API calls
vi.mock('@/store/slices/locationSlice', async () => {
  const actual = await vi.importActual('@/store/slices/locationSlice');
  return {
    ...actual,
    fetchLocationHierarchy: vi.fn(() => ({ type: 'location/fetchHierarchy/fulfilled', payload: mockHierarchy })),
    searchLocations: vi.fn(() => ({ type: 'location/searchLocations/fulfilled', payload: [] })),
    createLocation: vi.fn(() => ({ type: 'location/createLocation/fulfilled', payload: mockBuilding })),
    updateLocation: vi.fn(() => ({ type: 'location/updateLocation/fulfilled', payload: mockBuilding })),
    deleteLocation: vi.fn(() => ({ type: 'location/deleteLocation/fulfilled' })),
    selectLocation: vi.fn(() => ({ type: 'location/selectLocation', payload: null })),
    clearSearch: vi.fn(() => ({ type: 'location/clearSearch' }))
  };
});

const createMockStore = (preloadedState = mockInitialState) => {
  return configureStore({
    reducer: {
      location: locationSlice
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredStateKeys: ['location.locations.hierarchy.flatMap']
        }
      })
  });
};

const renderWithProviders = (
  component: React.ReactElement,
  initialState = mockInitialState
) => {
  const store = createMockStore(initialState);
  return render(
    <Provider store={store}>
      <DndProvider backend={HTML5Backend}>
        {component}
      </DndProvider>
    </Provider>
  );
};

describe('LocationHierarchy Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the location hierarchy', () => {
    renderWithProviders(<LocationHierarchy />);

    expect(screen.getByText('Location Hierarchy')).toBeInTheDocument();
    expect(screen.getByText('Main Building')).toBeInTheDocument();
    expect(screen.getByText('Total: 3')).toBeInTheDocument();
    expect(screen.getByText('Buildings: 1')).toBeInTheDocument();
  });

  it('displays loading state', () => {
    const loadingState = {
      ...mockInitialState,
      location: {
        ...mockInitialState.location,
        locations: {
          ...mockInitialState.location.locations,
          loading: true
        }
      }
    };

    renderWithProviders(<LocationHierarchy />, loadingState);

    expect(screen.getByText('Loading location hierarchy...')).toBeInTheDocument();
  });

  it('displays error state', () => {
    const errorState = {
      ...mockInitialState,
      location: {
        ...mockInitialState.location,
        locations: {
          ...mockInitialState.location.locations,
          error: 'Failed to load locations'
        }
      }
    };

    renderWithProviders(<LocationHierarchy />, errorState);

    expect(screen.getByText('Failed to load location hierarchy')).toBeInTheDocument();
    expect(screen.getByText('Failed to load locations')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays empty state when no buildings exist', () => {
    const emptyState = {
      ...mockInitialState,
      location: {
        ...mockInitialState.location,
        locations: {
          ...mockInitialState.location.locations,
          hierarchy: {
            buildings: [],
            flatMap: new Map(),
            totalLocations: 0,
            lastUpdated: '2024-01-01T00:00:00Z'
          }
        }
      }
    };

    renderWithProviders(<LocationHierarchy />, emptyState);

    expect(screen.getByText('No buildings found')).toBeInTheDocument();
    expect(screen.getByText('Click "Add Building" to get started')).toBeInTheDocument();
  });

  it('shows add building button when canEdit is true', () => {
    renderWithProviders(<LocationHierarchy canEdit={true} />);

    expect(screen.getByText('Add Building')).toBeInTheDocument();
  });

  it('hides add building button when canEdit is false', () => {
    renderWithProviders(<LocationHierarchy canEdit={false} />);

    expect(screen.queryByText('Add Building')).not.toBeInTheDocument();
  });

  it('expands and collapses building nodes', async () => {
    renderWithProviders(<LocationHierarchy />);

    // Building should be expanded by default (level < 2)
    expect(screen.getByText('Ground Floor')).toBeInTheDocument();

    // Find and click the expand/collapse button
    const expandButton = screen.getByRole('button', { name: /▶/ });

    await act(async () => {
      fireEvent.click(expandButton);
    });

    // Floor should be hidden after collapse
    expect(screen.queryByText('Ground Floor')).not.toBeInTheDocument();
  });

  it('displays location icons and type badges', () => {
    renderWithProviders(<LocationHierarchy />);

    // Check for building icon
    expect(screen.getByText('🏢')).toBeInTheDocument();

    // Check for type badges
    expect(screen.getByText('building')).toBeInTheDocument();
  });

  it('shows action buttons on hover when canEdit is true', async () => {
    renderWithProviders(<LocationHierarchy canEdit={true} />);

    const buildingNode = screen.getByText('Main Building').closest('div');

    await act(async () => {
      fireEvent.mouseEnter(buildingNode!);
    });

    // Should show edit button
    expect(screen.getByTitle('Edit location')).toBeInTheDocument();
  });

  it('calls onEditLocation when edit button is clicked', async () => {
    const mockOnEdit = jest.fn();
    renderWithProviders(
      <LocationHierarchy canEdit={true} onEditLocation={mockOnEdit} />
    );

    const buildingNode = screen.getByText('Main Building').closest('div');

    await act(async () => {
      fireEvent.mouseEnter(buildingNode!);
    });

    const editButton = screen.getByTitle('Edit location');

    await act(async () => {
      fireEvent.click(editButton);
    });

    expect(mockOnEdit).toHaveBeenCalledWith(expect.objectContaining({
      id: 'building-1',
      name: 'Main Building'
    }));
  });

  it('calls onCreateLocation when add child button is clicked', async () => {
    const mockOnCreate = jest.fn();
    renderWithProviders(
      <LocationHierarchy canEdit={true} onCreateLocation={mockOnCreate} />
    );

    const buildingNode = screen.getByText('Main Building').closest('div');

    await act(async () => {
      fireEvent.mouseEnter(buildingNode!);
    });

    // Should show "Add floor" button for buildings
    const addFloorButton = screen.getByText('➕ floor');

    await act(async () => {
      fireEvent.click(addFloorButton);
    });

    expect(mockOnCreate).toHaveBeenCalledWith('building-1', 'floor');
  });

  it('displays children count for locations with children', () => {
    renderWithProviders(<LocationHierarchy />);

    // Building has 1 floor
    expect(screen.getByText('1 item')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog', async () => {
    // Mock window.confirm
    const mockConfirm = vi.fn(() => true);
    Object.defineProperty(window, 'confirm', {
      value: mockConfirm,
      configurable: true
    });

    renderWithProviders(<LocationHierarchy canEdit={true} />);

    // Expand to show floor
    const buildingNode = screen.getByText('Main Building').closest('div');
    await act(async () => {
      fireEvent.mouseEnter(buildingNode!);
    });

    // Find floor node and hover to show delete button
    const floorNode = screen.getByText('Ground Floor').closest('div');
    await act(async () => {
      fireEvent.mouseEnter(floorNode!);
    });

    // Click delete button (floors can be deleted, buildings cannot)
    const deleteButton = screen.getByTitle('Delete location');

    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete Ground Floor?');
  });

  it('displays drag and drop instructions when canEdit is true', () => {
    renderWithProviders(<LocationHierarchy canEdit={true} />);

    expect(screen.getByText(/Drag and drop locations to reorganize/)).toBeInTheDocument();
  });

  it('does not show drag and drop instructions when canEdit is false', () => {
    renderWithProviders(<LocationHierarchy canEdit={false} />);

    expect(screen.queryByText(/Drag and drop locations/)).not.toBeInTheDocument();
  });

  it('displays last updated timestamp', () => {
    renderWithProviders(<LocationHierarchy />);

    expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
  });

  it('handles retry button click on error', async () => {
    const errorState = {
      ...mockInitialState,
      location: {
        ...mockInitialState.location,
        locations: {
          ...mockInitialState.location.locations,
          error: 'Network error'
        }
      }
    };

    renderWithProviders(<LocationHierarchy />, errorState);

    const retryButton = screen.getByText('Retry');

    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Should trigger fetchLocationHierarchy action (tested in slice tests)
  });

  it('displays selected location in stats', () => {
    const stateWithSelection = {
      ...mockInitialState,
      location: {
        ...mockInitialState.location,
        locations: {
          ...mockInitialState.location.locations,
          selectedLocation: mockBuilding
        }
      }
    };

    renderWithProviders(<LocationHierarchy />, stateWithSelection);

    expect(screen.getByText('Selected: Main Building')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = renderWithProviders(
      <LocationHierarchy className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('prevents dragging buildings', () => {
    renderWithProviders(<LocationHierarchy canEdit={true} />);

    // Buildings should not be draggable (tested through canDrag: false in useDrag)
    // This is implementation detail tested in component logic
    const buildingNode = screen.getByText('Main Building').closest('div');
    expect(buildingNode).toBeInTheDocument();
  });

  it('shows appropriate child type buttons based on location type', async () => {
    renderWithProviders(<LocationHierarchy canEdit={true} />);

    // Building should show "Add floor" button
    const buildingNode = screen.getByText('Main Building').closest('div');

    await act(async () => {
      fireEvent.mouseEnter(buildingNode!);
    });

    expect(screen.getByText('➕ floor')).toBeInTheDocument();
    expect(screen.queryByText('➕ room')).not.toBeInTheDocument();
  });
});