import React from 'react';
import { QRCodeGenerator } from '@/components/physical/QRCodeGenerator';

interface QRCodeTabProps {
  onQRGenerated: (qr: { code: string; image: string; metadata?: any }) => void;
  onNavigateTab: (tab: string) => void;
}

export const QRCodeTab: React.FC<QRCodeTabProps> = ({
  onQRGenerated,
  onNavigateTab,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <QRCodeGenerator onQRGenerated={onQRGenerated} />

      {/* QR Code Features */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-white mb-4">QR Code Features</h3>
        <div className="space-y-4">
          <div className="p-4 bg-green-500/20 border border-green-400/50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📱</span>
              <div>
                <div className="font-medium text-white">Multiple Data Types</div>
                <div className="text-sm text-gray-300">
                  Support for URLs, emails, phone numbers, WiFi, locations, and more
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-500/20 border border-blue-400/50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🛡️</span>
              <div>
                <div className="font-medium text-white">Error Correction</div>
                <div className="text-sm text-gray-300">
                  Configurable error correction levels (L, M, Q, H) for damaged code recovery
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-purple-500/20 border border-purple-400/50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">🎨</span>
              <div>
                <div className="font-medium text-white">Customizable</div>
                <div className="text-sm text-gray-300">
                  Custom colors, sizes, and embedded metadata for enhanced functionality
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-yellow-500/20 border border-yellow-400/50 rounded-lg">
            <div className="flex items-center">
              <span className="text-2xl mr-3">📊</span>
              <div>
                <div className="font-medium text-white">Analytics</div>
                <div className="text-sm text-gray-300">
                  Data analysis and optimization suggestions for better QR codes
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <h4 className="text-sm font-medium text-white mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigateTab('batch')}
              className="px-3 py-1 bg-blue-500/30 backdrop-blur-sm text-white border border-blue-400/50 rounded-full text-sm hover:bg-blue-500/50"
            >
              Batch QR Generation
            </button>
            <button
              onClick={() => onNavigateTab('history')}
              className="px-3 py-1 bg-green-500/30 backdrop-blur-sm text-white border border-green-400/50 rounded-full text-sm hover:bg-green-500/50"
            >
              View History
            </button>
            <button
              onClick={() => onNavigateTab('print')}
              className="px-3 py-1 bg-purple-500/30 backdrop-blur-sm text-white border border-purple-400/50 rounded-full text-sm hover:bg-purple-500/50"
            >
              Print QR Codes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};