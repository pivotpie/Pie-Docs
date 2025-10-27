import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { LocationHierarchy } from '@/components/physical/LocationHierarchy';
import locationSlice from '@/store/slices/locationSlice';

const mockStore = configureStore({
  reducer: {
    location: locationSlice
  },
  preloadedState: {
    location: {
      locations: {
        hierarchy: {
          buildings: [
            {
              id: 'building-1',
              name: 'Test Building',
              type: 'building',
              isActive: true,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              metadata: {},
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
                monitoringEnabled: false
              }
            }
          ],
          flatMap: new Map(),
          totalLocations: 1,
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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredStateKeys: ['location.locations.hierarchy.flatMap']
      }
    })
});

const renderComponent = () => {
  return render(
    <Provider store={mockStore}>
      <DndProvider backend={HTML5Backend}>
        <LocationHierarchy />
      </DndProvider>
    </Provider>
  );
};

describe('LocationHierarchy Simple Tests', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Location Hierarchy')).toBeInTheDocument();
  });

  it('displays building information', () => {
    renderComponent();
    expect(screen.getByText('Test Building')).toBeInTheDocument();
    expect(screen.getByText('building')).toBeInTheDocument();
  });

  it('shows total locations count', () => {
    renderComponent();
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
    expect(screen.getByText('Buildings: 1')).toBeInTheDocument();
  });
});