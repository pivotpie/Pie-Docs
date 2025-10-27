import React from 'react';
import { MetadataUploadDemo } from '@/components/documents/upload/MetadataUploadDemo';

/**
 * Page wrapper for the Metadata Upload Demo
 * Shows how dynamic metadata works with document uploads
 */
const MetadataUploadPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <MetadataUploadDemo />
    </div>
  );
};

export default MetadataUploadPage;
