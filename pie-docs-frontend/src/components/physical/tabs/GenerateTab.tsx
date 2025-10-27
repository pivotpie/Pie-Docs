import React from 'react';
import { BarcodeGenerator } from '@/components/physical/BarcodeGenerator';

interface GenerateTabProps {
  onBarcodeGenerated: (barcode: { code: string; image: string }) => void;
  onNavigateTab: (tab: string) => void;
}

export const GenerateTab: React.FC<GenerateTabProps> = ({
  onBarcodeGenerated,
  onNavigateTab,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BarcodeGenerator onBarcodeGenerated={onBarcodeGenerated} />

      {/* Quick Actions */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-white mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <button
            onClick={() => onNavigateTab('batch')}
            className="w-full text-left p-4 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/50 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📦</span>
              <div>
                <div className="font-medium text-white">Batch Generate</div>
                <div className="text-sm text-gray-300">Generate multiple barcodes at once</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('history')}
            className="w-full text-left p-4 bg-green-500/20 hover:bg-green-500/30 border border-green-400/50 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">📋</span>
              <div>
                <div className="font-medium text-white">View History</div>
                <div className="text-sm text-gray-300">Browse all generated barcodes</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigateTab('print')}
            className="w-full text-left p-4 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/50 rounded-lg transition-colors"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">🖨️</span>
              <div>
                <div className="font-medium text-white">Print Labels</div>
                <div className="text-sm text-gray-300">Print professional barcode labels</div>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};