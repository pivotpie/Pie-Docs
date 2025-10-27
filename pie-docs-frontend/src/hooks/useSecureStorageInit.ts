import { useEffect } from 'react';
import SecureStorage from '@/utils/secureStorage';

/**
 * Hook to initialize secure storage and migrate existing unencrypted data
 */
export const useSecureStorageInit = () => {
  useEffect(() => {
    const initializeSecureStorage = async () => {
      if (!SecureStorage.isSupported()) {
        console.warn('Secure storage not supported in this browser');
        return;
      }

      try {
        // Define keys that contain sensitive data and need encryption
        const sensitiveKeys = [
          'locationPrivacySettings',
          'locationCache',
          'mobileScanHistory',
          'metadataHistory'
        ];

        // Migrate existing unencrypted data to encrypted format
        await SecureStorage.migrateExistingData(sensitiveKeys);

        console.log('Secure storage initialized and data migrated');
      } catch (error) {
        console.error('Failed to initialize secure storage:', error);
      }
    };

    initializeSecureStorage();
  }, []);
};

export default useSecureStorageInit;