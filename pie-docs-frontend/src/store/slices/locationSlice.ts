import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  LocationRecord,
  LocationHierarchy,
  CapacityUtilization,
  CapacityAlert,
  MovementRecord,
  PendingMovement,
  MovementAudit,
  BulkMovementOperation,
  InventorySnapshot,
  InventoryDiscrepancy,
  InventoryReport,
  ReportSchedule,
  EnvironmentalReading,
  EnvironmentalAlert,
  PreservationAdvice,
  FloorPlan,
  MapInteraction,
  LocationSearchCriteria,
  LocationSearchResult,
  PlacementRecommendation,
  Building,
  Floor,
  Room,
  Cabinet,
  Shelf,
  LocationType
} from '@/types/location';

// State interface
export interface LocationState {
  locations: {
    hierarchy: LocationHierarchy;
    flatList: LocationRecord[];
    selectedLocation: LocationRecord | null;
    searchResults: LocationSearchResult[];
    loading: boolean;
    error: string | null;
  };
  capacity: {
    utilizationData: CapacityUtilization[];
    alerts: CapacityAlert[];
    optimizations: PlacementRecommendation[];
    loading: boolean;
    error: string | null;
  };
  movements: {
    recentMovements: MovementRecord[];
    pendingMovements: PendingMovement[];
    auditTrail: MovementAudit[];
    bulkOperations: BulkMovementOperation[];
    loading: boolean;
    error: string | null;
  };
  inventory: {
    currentInventory: InventorySnapshot | null;
    discrepancies: InventoryDiscrepancy[];
    reports: InventoryReport[];
    scheduledReports: ReportSchedule[];
    loading: boolean;
    error: string | null;
  };
  environmental: {
    sensorData: EnvironmentalReading[];
    alerts: EnvironmentalAlert[];
    preservationRecommendations: PreservationAdvice[];
    loading: boolean;
    error: string | null;
  };
  mapping: {
    floorPlans: FloorPlan[];
    currentMap: FloorPlan | null;
    mapInteractions: MapInteraction[];
    loading: boolean;
    error: string | null;
  };
}

// Initial state
const initialState: LocationState = {
  locations: {
    hierarchy: {
      buildings: [],
      flatMap: {},
      totalLocations: 0,
      lastUpdated: new Date().toISOString()
    },
    flatList: [],
    selectedLocation: null,
    searchResults: [],
    loading: false,
    error: null
  },
  capacity: {
    utilizationData: [],
    alerts: [],
    optimizations: [],
    loading: false,
    error: null
  },
  movements: {
    recentMovements: [],
    pendingMovements: [],
    auditTrail: [],
    bulkOperations: [],
    loading: false,
    error: null
  },
  inventory: {
    currentInventory: null,
    discrepancies: [],
    reports: [],
    scheduledReports: [],
    loading: false,
    error: null
  },
  environmental: {
    sensorData: [],
    alerts: [],
    preservationRecommendations: [],
    loading: false,
    error: null
  },
  mapping: {
    floorPlans: [],
    currentMap: null,
    mapInteractions: [],
    loading: false,
    error: null
  }
};

// Mock API functions (to be replaced with actual API calls)
const mockLocationAPI = {
  getLocationHierarchy: (): Promise<LocationHierarchy> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockHierarchy: LocationHierarchy = {
          buildings: [
            {
              id: 'building-1',
              name: 'Main Archive Building',
              description: 'Primary document storage facility',
              type: 'building',
              address: '123 Archive Street, Document City, DC 12345',
              floors: [],
              capacity: {
                maxDocuments: 50000,
                maxWeight: 10000,
                maxVolume: 500,
                alertThreshold: 80,
                criticalThreshold: 95
              },
              environmental: {
                temperatureMin: 18,
                temperatureMax: 22,
                humidityMin: 40,
                humidityMax: 60,
                monitoringEnabled: true
              },
              coordinates: {
                latitude: 40.7128,
                longitude: -74.0060
              },
              contactInfo: {
                manager: 'John Smith',
                phone: '+1-555-0123',
                email: 'j.smith@company.com'
              },
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: new Date().toISOString(),
              isActive: true,
              metadata: {}
            }
          ],
          flatMap: {},
          totalLocations: 1,
          lastUpdated: new Date().toISOString()
        };
        resolve(mockHierarchy);
      }, 500);
    });
  },

  searchLocations: (criteria: LocationSearchCriteria): Promise<LocationSearchResult[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockResults: LocationSearchResult[] = [
          {
            location: {
              id: 'room-101',
              name: 'Archive Room 101',
              description: 'Climate-controlled archive storage',
              type: 'room',
              floorId: 'floor-1',
              roomType: 'archive',
              cabinets: [],
              environmental: {
                locationId: 'room-101',
                timestamp: new Date().toISOString(),
                temperature: 20.5,
                humidity: 45,
                status: 'normal'
              },
              securityLevel: 3,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: new Date().toISOString(),
              isActive: true,
              metadata: {}
            } as Room,
            path: 'Main Archive Building > Floor 1 > Archive Room 101',
            relevanceScore: 95,
            availableCapacity: 75,
            documentCount: 1250
          }
        ];
        resolve(mockResults);
      }, 300);
    });
  },

  createLocation: (locationData: Partial<LocationRecord>): Promise<LocationRecord> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!locationData.name || !locationData.type) {
          reject(new Error('Name and type are required'));
          return;
        }

        const newLocation: LocationRecord = {
          id: `location-${Date.now()}`,
          name: locationData.name,
          description: locationData.description || '',
          type: locationData.type,
          parentId: locationData.parentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          metadata: locationData.metadata || {},
          ...locationData
        } as LocationRecord;

        resolve(newLocation);
      }, 300);
    });
  },

  updateLocation: (id: string, updates: Partial<LocationRecord>): Promise<LocationRecord> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock update logic
        resolve({
          id,
          ...updates,
          updatedAt: new Date().toISOString()
        } as LocationRecord);
      }, 300);
    });
  },

  deleteLocation: (id: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock validation - check if location has children or documents
        const hasChildren = Math.random() > 0.7;
        if (hasChildren) {
          reject(new Error('Cannot delete location with child locations or documents'));
          return;
        }
        resolve();
      }, 300);
    });
  },

  getCapacityUtilization: (): Promise<CapacityUtilization[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockData: CapacityUtilization[] = [
          {
            locationId: 'building-1',
            locationName: 'Main Archive Building',
            locationType: 'building',
            currentDocuments: 35750,
            maxCapacity: 50000,
            utilizationPercentage: 71.5,
            weight: {
              current: 7150,
              maximum: 10000
            },
            lastUpdated: new Date().toISOString(),
            trend: 'increasing'
          }
        ];
        resolve(mockData);
      }, 300);
    });
  },

  logMovement: (movement: Omit<MovementRecord, 'id' | 'movedAt' | 'verified'>): Promise<MovementRecord> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newMovement: MovementRecord = {
          ...movement,
          id: `movement-${Date.now()}`,
          movedAt: new Date().toISOString(),
          verified: false
        };
        resolve(newMovement);
      }, 200);
    });
  }
};

// Async thunks
export const fetchLocationHierarchy = createAsyncThunk(
  'location/fetchHierarchy',
  async () => {
    const hierarchy = await mockLocationAPI.getLocationHierarchy();
    return hierarchy;
  }
);

export const searchLocations = createAsyncThunk(
  'location/searchLocations',
  async (criteria: LocationSearchCriteria) => {
    const results = await mockLocationAPI.searchLocations(criteria);
    return results;
  }
);

export const createLocation = createAsyncThunk(
  'location/createLocation',
  async (locationData: Partial<LocationRecord>) => {
    const newLocation = await mockLocationAPI.createLocation(locationData);
    return newLocation;
  }
);

export const updateLocation = createAsyncThunk(
  'location/updateLocation',
  async ({ id, updates }: { id: string; updates: Partial<LocationRecord> }) => {
    const updatedLocation = await mockLocationAPI.updateLocation(id, updates);
    return updatedLocation;
  }
);

export const deleteLocation = createAsyncThunk(
  'location/deleteLocation',
  async (id: string) => {
    await mockLocationAPI.deleteLocation(id);
    return id;
  }
);

export const fetchCapacityUtilization = createAsyncThunk(
  'location/fetchCapacityUtilization',
  async () => {
    const data = await mockLocationAPI.getCapacityUtilization();
    return data;
  }
);

export const logDocumentMovement = createAsyncThunk(
  'location/logMovement',
  async (movement: Omit<MovementRecord, 'id' | 'movedAt' | 'verified'>) => {
    const newMovement = await mockLocationAPI.logMovement(movement);
    return newMovement;
  }
);

// Helper functions
const buildFlatList = (buildings: Building[]): LocationRecord[] => {
  const flatList: LocationRecord[] = [];

  const processLocation = (location: LocationRecord) => {
    flatList.push(location);

    switch (location.type) {
      case 'building':
        (location as Building).floors.forEach(processLocation);
        break;
      case 'floor':
        (location as Floor).rooms.forEach(processLocation);
        break;
      case 'room':
        (location as Room).cabinets.forEach(processLocation);
        break;
      case 'cabinet':
        (location as Cabinet).shelves.forEach(processLocation);
        break;
    }
  };

  buildings.forEach(processLocation);
  return flatList;
};

const buildFlatMap = (locations: LocationRecord[]): Record<string, LocationRecord> => {
  const map: Record<string, LocationRecord> = {};
  locations.forEach(location => {
    map[location.id] = location;
  });
  return map;
};

// Slice
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    selectLocation: (state, action: PayloadAction<LocationRecord | null>) => {
      state.locations.selectedLocation = action.payload;
    },

    clearLocationSearch: (state) => {
      state.locations.searchResults = [];
    },

    addCapacityAlert: (state, action: PayloadAction<CapacityAlert>) => {
      state.capacity.alerts.push(action.payload);
    },

    acknowledgeCapacityAlert: (state, action: PayloadAction<{ id: string; userId: string }>) => {
      const alert = state.capacity.alerts.find(a => a.id === action.payload.id);
      if (alert) {
        alert.acknowledgedAt = new Date().toISOString();
        alert.acknowledgedBy = action.payload.userId;
      }
    },

    resolveCapacityAlert: (state, action: PayloadAction<string>) => {
      const alert = state.capacity.alerts.find(a => a.id === action.payload);
      if (alert) {
        alert.resolved = true;
      }
    },

    addEnvironmentalReading: (state, action: PayloadAction<EnvironmentalReading>) => {
      state.environmental.sensorData.push(action.payload);
      // Keep only last 1000 readings per location
      if (state.environmental.sensorData.length > 1000) {
        state.environmental.sensorData = state.environmental.sensorData.slice(-1000);
      }
    },

    addMapInteraction: (state, action: PayloadAction<MapInteraction>) => {
      state.mapping.mapInteractions.push(action.payload);
      // Keep only last 100 interactions
      if (state.mapping.mapInteractions.length > 100) {
        state.mapping.mapInteractions = state.mapping.mapInteractions.slice(-100);
      }
    },

    setCurrentMap: (state, action: PayloadAction<FloorPlan | null>) => {
      state.mapping.currentMap = action.payload;
    },

    updateLocationInHierarchy: (state, action: PayloadAction<LocationRecord>) => {
      const location = action.payload;

      // Update in flat list
      const index = state.locations.flatList.findIndex(l => l.id === location.id);
      if (index !== -1) {
        state.locations.flatList[index] = location;
      }

      // Update in flat map
      state.locations.hierarchy.flatMap[location.id] = location;

      // Update hierarchy last modified
      state.locations.hierarchy.lastUpdated = new Date().toISOString();
    },

    removeLocationFromHierarchy: (state, action: PayloadAction<string>) => {
      const locationId = action.payload;

      // Remove from flat list
      state.locations.flatList = state.locations.flatList.filter(l => l.id !== locationId);

      // Remove from flat map
      delete state.locations.hierarchy.flatMap[locationId];

      // Update count
      state.locations.hierarchy.totalLocations = state.locations.flatList.length;

      // Update hierarchy last modified
      state.locations.hierarchy.lastUpdated = new Date().toISOString();
    }
  },

  extraReducers: (builder) => {
    // Fetch hierarchy
    builder
      .addCase(fetchLocationHierarchy.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(fetchLocationHierarchy.fulfilled, (state, action) => {
        state.locations.loading = false;
        state.locations.hierarchy = action.payload;
        state.locations.flatList = buildFlatList(action.payload.buildings);
        state.locations.hierarchy.flatMap = buildFlatMap(state.locations.flatList);
        state.locations.hierarchy.totalLocations = state.locations.flatList.length;
      })
      .addCase(fetchLocationHierarchy.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.error.message || 'Failed to fetch location hierarchy';
      });

    // Search locations
    builder
      .addCase(searchLocations.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(searchLocations.fulfilled, (state, action) => {
        state.locations.loading = false;
        state.locations.searchResults = action.payload;
      })
      .addCase(searchLocations.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.error.message || 'Failed to search locations';
      });

    // Create location
    builder
      .addCase(createLocation.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(createLocation.fulfilled, (state, action) => {
        state.locations.loading = false;
        state.locations.flatList.push(action.payload);
        state.locations.hierarchy.flatMap[action.payload.id] = action.payload;
        state.locations.hierarchy.totalLocations = state.locations.flatList.length;
        state.locations.hierarchy.lastUpdated = new Date().toISOString();
      })
      .addCase(createLocation.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.error.message || 'Failed to create location';
      });

    // Update location
    builder
      .addCase(updateLocation.fulfilled, (state, action) => {
        const location = action.payload;
        const index = state.locations.flatList.findIndex(l => l.id === location.id);
        if (index !== -1) {
          state.locations.flatList[index] = location;
        }
        state.locations.hierarchy.flatMap[location.id] = location;
        state.locations.hierarchy.lastUpdated = new Date().toISOString();
      });

    // Delete location
    builder
      .addCase(deleteLocation.fulfilled, (state, action) => {
        const locationId = action.payload;
        state.locations.flatList = state.locations.flatList.filter(l => l.id !== locationId);
        delete state.locations.hierarchy.flatMap[locationId];
        state.locations.hierarchy.totalLocations = state.locations.flatList.length;
        state.locations.hierarchy.lastUpdated = new Date().toISOString();

        // Clear selection if deleted location was selected
        if (state.locations.selectedLocation?.id === locationId) {
          state.locations.selectedLocation = null;
        }
      });

    // Capacity utilization
    builder
      .addCase(fetchCapacityUtilization.pending, (state) => {
        state.capacity.loading = true;
        state.capacity.error = null;
      })
      .addCase(fetchCapacityUtilization.fulfilled, (state, action) => {
        state.capacity.loading = false;
        state.capacity.utilizationData = action.payload;
      })
      .addCase(fetchCapacityUtilization.rejected, (state, action) => {
        state.capacity.loading = false;
        state.capacity.error = action.error.message || 'Failed to fetch capacity data';
      });

    // Log movement
    builder
      .addCase(logDocumentMovement.fulfilled, (state, action) => {
        state.movements.recentMovements.unshift(action.payload);
        // Keep only last 100 movements
        if (state.movements.recentMovements.length > 100) {
          state.movements.recentMovements = state.movements.recentMovements.slice(0, 100);
        }
      });
  }
});

export const {
  selectLocation,
  clearLocationSearch,
  addCapacityAlert,
  acknowledgeCapacityAlert,
  resolveCapacityAlert,
  addEnvironmentalReading,
  addMapInteraction,
  setCurrentMap,
  updateLocationInHierarchy,
  removeLocationFromHierarchy
} = locationSlice.actions;

export default locationSlice.reducer;