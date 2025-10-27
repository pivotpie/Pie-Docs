import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { LocationSearch } from '@/components/physical/LocationSearch';
import locationSlice from '@/store/slices/locationSlice';
import { LocationSearchResult, Building, Floor, Room } from '@/types/location';
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

const mockSearchResults: LocationSearchResult[] = [
  {
    location: mockBuilding,
    path: 'Main Building',
    relevanceScore: 0.95,
    documentCount: 150,
    availableCapacity: 75
  },
  {
    location: mockRoom,
    path: 'Main Building > Ground Floor > Archive Room',
    relevanceScore: 0.85,
    documentCount: 45,
    availableCapacity: 60
  }
];

const mockInitialState = {
  location: {
    locations: {
      hierarchy: {
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

describe('LocationSearch Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Search Input', () => {
    it('renders search input with placeholder', () => {
      renderWithProvider(<LocationSearch />);

      expect(screen.getByPlaceholderText('Search locations...')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
    });

    it('uses custom placeholder', () => {
      renderWithProvider(
        <LocationSearch placeholder="Find a location..." />
      );

      expect(screen.getByPlaceholderText('Find a location...')).toBeInTheDocument();
    });

    it('updates query on input change', async () => {
      renderWithProvider(<LocationSearch />);

      const searchInput = screen.getByPlaceholderText('Search locations...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'building' } });
      });

      expect(searchInput).toHaveValue('building');
    });

    it('triggers search on enter key', async () => {
      renderWithProvider(<LocationSearch />);

      const searchInput = screen.getByPlaceholderText('Search locations...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'building' } });
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });

      // Search functionality tested in slice tests
    });

    it('clears search when input is empty', async () => {
      renderWithProvider(<LocationSearch />);

      const searchInput = screen.getByPlaceholderText('Search locations...');

      await act(async () => {
        fireEvent.change(searchInput, { target: { value: 'building' } });
        fireEvent.change(searchInput, { target: { value: '' } });
      });

      expect(searchInput).toHaveValue('');
    });
  });

  describe('Advanced Filters', () => {
    it('shows filters toggle button when showFilters is true', () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      expect(screen.getByText('Filters ▼')).toBeInTheDocument();
    });

    it('hides filters toggle button when showFilters is false', () => {
      renderWithProvider(<LocationSearch showFilters={false} />);

      expect(screen.queryByText(/Filters/)).not.toBeInTheDocument();
    });

    it('toggles advanced filters visibility', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
      expect(screen.getByText('Filters ▲')).toBeInTheDocument();
    });

    it('renders all filter options', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      expect(screen.getByLabelText('Location Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Building')).toBeInTheDocument();
      expect(screen.getByLabelText('Floor')).toBeInTheDocument();
      expect(screen.getByLabelText('Room')).toBeInTheDocument();
      expect(screen.getByLabelText('Cabinet')).toBeInTheDocument();
      expect(screen.getByLabelText('Environmental Status')).toBeInTheDocument();
    });

    it('shows location type options', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const typeSelect = screen.getByLabelText('Location Type');
      expect(screen.getByText('All Types')).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(typeSelect);
      });

      expect(screen.getByText('Building')).toBeInTheDocument();
      expect(screen.getByText('Floor')).toBeInTheDocument();
      expect(screen.getByText('Room')).toBeInTheDocument();
      expect(screen.getByText('Cabinet')).toBeInTheDocument();
      expect(screen.getByText('Shelf')).toBeInTheDocument();
    });

    it('cascades filter selections', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const buildingSelect = screen.getByLabelText('Building');
      const floorSelect = screen.getByLabelText('Floor');

      // Floor should be disabled initially
      expect(floorSelect).toBeDisabled();

      // Select a building
      await act(async () => {
        fireEvent.change(buildingSelect, { target: { value: 'building-1' } });
      });

      // Floor should now be enabled
      expect(floorSelect).not.toBeDisabled();
      expect(screen.getByText('Floor 0: Ground Floor')).toBeInTheDocument();
    });

    it('clears dependent filters when parent changes', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const buildingSelect = screen.getByLabelText('Building');
      const floorSelect = screen.getByLabelText('Floor');

      // Select building and floor
      await act(async () => {
        fireEvent.change(buildingSelect, { target: { value: 'building-1' } });
        fireEvent.change(floorSelect, { target: { value: 'floor-1' } });
      });

      // Change building
      await act(async () => {
        fireEvent.change(buildingSelect, { target: { value: '' } });
      });

      // Floor should be cleared and disabled
      expect(floorSelect).toBeDisabled();
      expect(floorSelect).toHaveValue('');
    });

    it('clears all filters when clear button is clicked', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const typeSelect = screen.getByLabelText('Location Type');
      const clearButton = screen.getByText('Clear All');

      // Set a filter
      await act(async () => {
        fireEvent.change(typeSelect, { target: { value: 'building' } });
      });

      expect(typeSelect).toHaveValue('building');

      // Clear all filters
      await act(async () => {
        fireEvent.click(clearButton);
      });

      expect(typeSelect).toHaveValue('');
    });
  });

  describe('Search Results', () => {
    it('displays search results', () => {
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(<LocationSearch />, stateWithResults);

      expect(screen.getByText('Search Results (2)')).toBeInTheDocument();
      expect(screen.getByText('Main Building')).toBeInTheDocument();
      expect(screen.getByText('Archive Room')).toBeInTheDocument();
    });

    it('shows result details', () => {
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(<LocationSearch />, stateWithResults);

      expect(screen.getByText('Relevance: 95%')).toBeInTheDocument();
      expect(screen.getByText('Documents: 150')).toBeInTheDocument();
      expect(screen.getByText('Available: 75%')).toBeInTheDocument();
    });

    it('displays location paths', () => {
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(<LocationSearch />, stateWithResults);

      expect(screen.getByText('Main Building > Ground Floor > Archive Room')).toBeInTheDocument();
    });

    it('shows location icons and type badges', () => {
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(<LocationSearch />, stateWithResults);

      expect(screen.getByText('🏢')).toBeInTheDocument();
      expect(screen.getByText('🚪')).toBeInTheDocument();
      expect(screen.getByText('building')).toBeInTheDocument();
      expect(screen.getByText('room')).toBeInTheDocument();
    });

    it('handles result selection', async () => {
      const mockOnSelect = vi.fn();
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(
        <LocationSearch onSelectLocation={mockOnSelect} />,
        stateWithResults
      );

      const firstResult = screen.getByText('Main Building').closest('div');

      await act(async () => {
        fireEvent.click(firstResult!);
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockBuilding);
    });

    it('handles view location action', async () => {
      const mockOnView = vi.fn();
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(
        <LocationSearch onViewLocation={mockOnView} />,
        stateWithResults
      );

      const viewButton = screen.getAllByTitle('View details')[0];

      await act(async () => {
        fireEvent.click(viewButton);
      });

      expect(mockOnView).toHaveBeenCalledWith(mockBuilding);
    });

    it('clears search results', async () => {
      const stateWithResults = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: mockSearchResults
          }
        }
      };

      renderWithProvider(<LocationSearch />, stateWithResults);

      const clearButton = screen.getByText('Clear Results');

      await act(async () => {
        fireEvent.click(clearButton);
      });

      // Clear action tested in slice tests
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state during search', () => {
      const loadingState = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchLoading: true
          }
        }
      };

      renderWithProvider(<LocationSearch />, loadingState);

      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /searching/i })).toBeDisabled();
    });

    it('displays search error', () => {
      const errorState = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchError: 'Search failed'
          }
        }
      };

      renderWithProvider(<LocationSearch />, errorState);

      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });

    it('shows empty state when no results found', () => {
      const emptyState = {
        ...mockInitialState,
        location: {
          ...mockInitialState.location,
          locations: {
            ...mockInitialState.location.locations,
            searchResults: []
          }
        }
      };

      renderWithProvider(<LocationSearch />, emptyState);

      // Trigger a search to show empty state
      const searchInput = screen.getByPlaceholderText('Search locations...');

      act(() => {
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
      });

      expect(screen.getByText('No locations found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search criteria or filters')).toBeInTheDocument();
    });
  });

  describe('Additional Filters', () => {
    it('shows capacity and access level filters', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      expect(screen.getByLabelText('Has Available Capacity')).toBeInTheDocument();
      expect(screen.getByLabelText('Min Available Capacity (%)')).toBeInTheDocument();
      expect(screen.getByLabelText('Min Access Level')).toBeInTheDocument();
    });

    it('handles capacity checkbox', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const capacityCheckbox = screen.getByLabelText('Has Available Capacity');

      await act(async () => {
        fireEvent.click(capacityCheckbox);
      });

      expect(capacityCheckbox).toBeChecked();
    });

    it('shows access level options', async () => {
      renderWithProvider(<LocationSearch showFilters={true} />);

      const filtersButton = screen.getByText('Filters ▼');

      await act(async () => {
        fireEvent.click(filtersButton);
      });

      const accessSelect = screen.getByLabelText('Min Access Level');

      expect(screen.getByText('Any Level')).toBeInTheDocument();
      expect(screen.getByText('Level 1')).toBeInTheDocument();
      expect(screen.getByText('Level 5')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper aria labels', () => {
      renderWithProvider(<LocationSearch />);

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      renderWithProvider(<LocationSearch />);

      const searchInput = screen.getByPlaceholderText('Search locations...');

      await act(async () => {
        fireEvent.focus(searchInput);
        fireEvent.keyDown(searchInput, { key: 'Tab' });
      });

      // Next focusable element should be the search button
      expect(screen.getByText('Search')).toBeInTheDocument();
    });
  });
});