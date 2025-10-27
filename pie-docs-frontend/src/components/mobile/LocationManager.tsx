import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SecureStorage from '@/utils/secureStorage';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  address?: string;
  city?: string;
  country?: string;
}

interface LocationPrivacySettings {
  enableLocationCapture: boolean;
  shareWithDocuments: boolean;
  retainLocationHistory: boolean;
  accuracyLevel: 'high' | 'medium' | 'low';
  autoCapture: boolean;
}

interface LocationCacheEntry {
  location: LocationData;
  timestamp: number;
  accuracy: number;
}

interface LocationManagerProps {
  onLocationCaptured: (location: LocationData) => void;
  onLocationError: (error: string) => void;
  isVisible: boolean;
  onClose: () => void;
  autoCapture?: boolean;
  showPrivacyControls?: boolean;
}

const LocationManager: React.FC<LocationManagerProps> = ({
  onLocationCaptured,
  onLocationError,
  isVisible,
  onClose,
  autoCapture = false,
  showPrivacyControls = true
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string>('');
  const [permissionStatus, setPermissionStatus] = useState<PermissionState>('prompt');

  const [privacySettings, setPrivacySettings] = useState<LocationPrivacySettings>({
    enableLocationCapture: true,
    shareWithDocuments: true,
    retainLocationHistory: false,
    accuracyLevel: 'medium',
    autoCapture: false
  });

  const [locationCache, setLocationCache] = useState<LocationCacheEntry[]>([]);
  const [showLocationHistory, setShowLocationHistory] = useState(false);
  const [isGeocodingAddress, setIsGeocodingAddress] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const locationCacheRef = useRef<Map<string, LocationCacheEntry>>(new Map());

  useEffect(() => {
    const initializeData = async () => {
      // Load privacy settings from localStorage
      await loadPrivacySettings();

      // Load location cache
      await loadLocationCache();

      // Check permission status
      checkLocationPermission();

      // Auto-capture if enabled
      if (autoCapture && privacySettings.enableLocationCapture) {
        handleLocationCapture();
      }
    };

    initializeData();

    return () => {
      stopLocationWatch();
    };
  }, [autoCapture]);

  const loadPrivacySettings = async () => {
    try {
      const settings = await SecureStorage.getItem('locationPrivacySettings');
      if (settings) {
        setPrivacySettings({ ...privacySettings, ...settings });
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  };

  const savePrivacySettings = async (settings: LocationPrivacySettings) => {
    setPrivacySettings(settings);
    await SecureStorage.setItem('locationPrivacySettings', settings);
  };

  const loadLocationCache = async () => {
    try {
      const cache = await SecureStorage.getItem('locationCache');
      if (cache) {
        setLocationCache(cache);

        // Populate cache ref for quick lookups
        cache.forEach((entry: LocationCacheEntry) => {
          const key = `${entry.location.latitude.toFixed(4)},${entry.location.longitude.toFixed(4)}`;
          locationCacheRef.current.set(key, entry);
        });
      }
    } catch (error) {
      console.error('Failed to load location cache:', error);
    }
  };

  const saveLocationToCache = async (location: LocationData) => {
    if (!privacySettings.retainLocationHistory) return;

    const cacheEntry: LocationCacheEntry = {
      location,
      timestamp: Date.now(),
      accuracy: location.accuracy
    };

    const key = `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)}`;
    locationCacheRef.current.set(key, cacheEntry);

    const updatedCache = Array.from(locationCacheRef.current.values())
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50); // Keep last 50 locations

    setLocationCache(updatedCache);
    await SecureStorage.setItem('locationCache', updatedCache);
  };

  const checkLocationPermission = async () => {
    if ('permissions' in navigator) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionStatus(permission.state);

        permission.onchange = () => {
          setPermissionStatus(permission.state);
        };
      } catch (error) {
        console.error('Failed to check location permission:', error);
      }
    }
  };

  const getLocationOptions = (): PositionOptions => {
    const options: PositionOptions = {
      enableHighAccuracy: privacySettings.accuracyLevel === 'high',
      timeout: 10000,
      maximumAge: privacySettings.accuracyLevel === 'low' ? 300000 : 60000 // 5 min for low, 1 min for others
    };

    return options;
  };

  const handleLocationCapture = async () => {
    if (!privacySettings.enableLocationCapture) {
      onLocationError('Location capture is disabled in privacy settings');
      return;
    }

    if (!navigator.geolocation) {
      onLocationError('Geolocation is not supported by this browser');
      return;
    }

    setLocationStatus('requesting');
    setLocationError('');

    const options = getLocationOptions();

    try {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          // Try to get address if accuracy is good enough
          if (position.coords.accuracy < 100) {
            try {
              setIsGeocodingAddress(true);
              const addressData = await reverseGeocode(locationData.latitude, locationData.longitude);
              locationData.address = addressData.address;
              locationData.city = addressData.city;
              locationData.country = addressData.country;
            } catch (error) {
              console.warn('Failed to get address:', error);
            } finally {
              setIsGeocodingAddress(false);
            }
          }

          setCurrentLocation(locationData);
          setLocationStatus('success');

          // Cache the location
          saveLocationToCache(locationData);

          if (privacySettings.shareWithDocuments) {
            onLocationCaptured(locationData);
          }
        },
        (error) => {
          let errorMessage = 'Failed to get location';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          setLocationError(errorMessage);
          setLocationStatus('error');
          onLocationError(errorMessage);
        },
        options
      );
    } catch (error) {
      const errorMessage = 'Failed to start location capture';
      setLocationError(errorMessage);
      setLocationStatus('error');
      onLocationError(errorMessage);
    }
  };

  const startLocationWatch = () => {
    if (!navigator.geolocation || watchIdRef.current) return;

    const options = getLocationOptions();

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };

        setCurrentLocation(locationData);
        saveLocationToCache(locationData);
      },
      (error) => {
        console.error('Location watch error:', error);
      },
      { ...options, maximumAge: 30000 } // Update every 30 seconds
    );
  };

  const stopLocationWatch = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<{
    address?: string;
    city?: string;
    country?: string;
  }> => {
    // In a real implementation, this would use a geocoding service
    // For demo purposes, we'll simulate the response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          address: `${Math.floor(Math.random() * 9999)} Main St`,
          city: 'Sample City',
          country: 'Sample Country'
        });
      }, 1000);
    });
  };

  const formatCoordinates = (lat: number, lng: number): string => {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';

    return `${Math.abs(lat).toFixed(6)}° ${latDir}, ${Math.abs(lng).toFixed(6)}° ${lngDir}`;
  };

  const formatAccuracy = (accuracy: number): string => {
    if (accuracy < 10) return 'Very High';
    if (accuracy < 50) return 'High';
    if (accuracy < 100) return 'Medium';
    return 'Low';
  };

  const getAccuracyColor = (accuracy: number): string => {
    if (accuracy < 10) return 'text-green-600';
    if (accuracy < 50) return 'text-blue-600';
    if (accuracy < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const clearLocationHistory = () => {
    setLocationCache([]);
    locationCacheRef.current.clear();
    localStorage.removeItem('locationCache');
  };

  const useStoredLocation = (location: LocationData) => {
    setCurrentLocation(location);
    setLocationStatus('success');

    if (privacySettings.shareWithDocuments) {
      onLocationCaptured(location);
    }
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end justify-center z-50"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 500 }}
          className="bg-white/10 backdrop-blur-md border-t border-white/20 rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/20">
            <h3 className="text-lg font-semibold text-white">
              Location Services
            </h3>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Permission Status */}
            <div className={`p-4 rounded-lg border backdrop-blur-sm ${
              permissionStatus === 'granted' ? 'bg-green-500/20 border-green-400/50' :
              permissionStatus === 'denied' ? 'bg-red-500/20 border-red-400/50' :
              'bg-yellow-500/20 border-yellow-400/50'
            }`}>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${
                  permissionStatus === 'granted' ? 'bg-green-500' :
                  permissionStatus === 'denied' ? 'bg-red-500' :
                  'bg-yellow-500'
                }`} />
                <span className="text-sm font-medium">
                  Location Permission: {permissionStatus}
                </span>
              </div>
            </div>

            {/* Current Location */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-white">Current Location</h4>
                <button
                  onClick={handleLocationCapture}
                  disabled={locationStatus === 'requesting' || !privacySettings.enableLocationCapture}
                  className="px-4 py-2 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-lg text-sm font-medium hover:bg-blue-500/50 disabled:bg-white/10 disabled:border-white/20 disabled:cursor-not-allowed transition-colors"
                >
                  {locationStatus === 'requesting' ? 'Getting Location...' : 'Get Location'}
                </button>
              </div>

              {locationStatus === 'requesting' && (
                <div className="flex items-center justify-center py-8">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full"
                  />
                  <span className="ml-3 text-gray-300">Getting your location...</span>
                </div>
              )}

              {locationStatus === 'error' && (
                <div className="bg-red-500/20 backdrop-blur-sm border border-red-400/50 rounded-lg p-4">
                  <p className="text-red-300 text-sm">{locationError}</p>
                </div>
              )}

              {currentLocation && (
                <div className="bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-sm text-gray-300">Coordinates</p>
                    <p className="font-mono text-sm text-white">{formatCoordinates(currentLocation.latitude, currentLocation.longitude)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-300">Accuracy</p>
                    <p className={`text-sm font-medium ${getAccuracyColor(currentLocation.accuracy)}`}>
                      {formatAccuracy(currentLocation.accuracy)} (±{Math.round(currentLocation.accuracy)}m)
                    </p>
                  </div>

                  {currentLocation.address && (
                    <div>
                      <p className="text-sm text-gray-300">Address</p>
                      <p className="text-sm text-white">{currentLocation.address}</p>
                      {currentLocation.city && currentLocation.country && (
                        <p className="text-sm text-gray-300">{currentLocation.city}, {currentLocation.country}</p>
                      )}
                    </div>
                  )}

                  {isGeocodingAddress && (
                    <div className="flex items-center text-sm text-gray-300">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border border-gray-300 border-t-transparent rounded-full mr-2"
                      />
                      Getting address...
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-300">Captured</p>
                    <p className="text-sm text-white">{new Date(currentLocation.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Privacy Settings */}
            {showPrivacyControls && (
              <div className="space-y-4">
                <h4 className="font-medium text-white">Privacy Settings</h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">Enable location capture</label>
                    <input
                      type="checkbox"
                      checked={privacySettings.enableLocationCapture}
                      onChange={(e) => savePrivacySettings({
                        ...privacySettings,
                        enableLocationCapture: e.target.checked
                      })}
                      className="rounded border-white/20 text-blue-400 bg-white/10 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">Share with documents</label>
                    <input
                      type="checkbox"
                      checked={privacySettings.shareWithDocuments}
                      onChange={(e) => savePrivacySettings({
                        ...privacySettings,
                        shareWithDocuments: e.target.checked
                      })}
                      className="rounded border-white/20 text-blue-400 bg-white/10 focus:ring-blue-400"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-300">Retain location history</label>
                    <input
                      type="checkbox"
                      checked={privacySettings.retainLocationHistory}
                      onChange={(e) => savePrivacySettings({
                        ...privacySettings,
                        retainLocationHistory: e.target.checked
                      })}
                      className="rounded border-white/20 text-blue-400 bg-white/10 focus:ring-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-sm text-gray-300 block mb-2">Accuracy Level</label>
                    <select
                      value={privacySettings.accuracyLevel}
                      onChange={(e) => savePrivacySettings({
                        ...privacySettings,
                        accuracyLevel: e.target.value as 'high' | 'medium' | 'low'
                      })}
                      className="w-full px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:ring-blue-400 focus:border-blue-400 rounded-lg text-sm"
                    >
                      <option value="high" className="bg-gray-800">High (GPS + Network)</option>
                      <option value="medium" className="bg-gray-800">Medium (Network)</option>
                      <option value="low" className="bg-gray-800">Low (Cached)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Location History */}
            {privacySettings.retainLocationHistory && locationCache.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-white">Recent Locations</h4>
                  <button
                    onClick={() => setShowLocationHistory(!showLocationHistory)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    {showLocationHistory ? 'Hide' : 'Show'}
                  </button>
                </div>

                {showLocationHistory && (
                  <div className="space-y-2">
                    {locationCache.slice(0, 5).map((entry, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white/5 backdrop-blur-sm border border-white/20 rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-mono text-white">
                            {formatCoordinates(entry.location.latitude, entry.location.longitude)}
                          </p>
                          {entry.location.address && (
                            <p className="text-xs text-gray-300">{entry.location.address}</p>
                          )}
                          <p className="text-xs text-gray-300">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => useStoredLocation(entry.location)}
                          className="px-3 py-1 text-xs bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded hover:bg-blue-500/50"
                        >
                          Use
                        </button>
                      </div>
                    ))}

                    <button
                      onClick={clearLocationHistory}
                      className="w-full py-2 text-sm text-red-400 hover:text-red-300"
                    >
                      Clear History
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/20">
            <div className="text-xs text-gray-300 mb-3">
              Location data is processed locally and only shared when explicitly enabled in privacy settings.
            </div>
            <button
              onClick={onClose}
              className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-gray-300 hover:bg-white/20 hover:text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LocationManager;