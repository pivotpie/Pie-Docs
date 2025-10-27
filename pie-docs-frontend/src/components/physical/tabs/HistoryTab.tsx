import React from 'react';
import type { BarcodeRecord } from '@/store/slices/physicalDocsSlice';

interface HistoryTabProps {
  barcodes: BarcodeRecord[];
  selectedBarcodes: string[];
  onBarcodeSelect: (barcodeId: string, selected: boolean) => void;
  onNavigateTab: (tab: string) => void;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({
  barcodes,
  selectedBarcodes,
  onBarcodeSelect,
  onNavigateTab,
}) => {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg shadow-md">
      <div className="px-6 py-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-white">Generated Barcodes History</h3>
          {selectedBarcodes.length > 0 && (
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-300">
                {selectedBarcodes.length} selected
              </span>
              <button
                onClick={() => onNavigateTab('print')}
                className="bg-green-500/30 backdrop-blur-sm text-white border border-green-400/50 px-3 py-1 rounded-md hover:bg-green-500/50 text-sm"
              >
                Print Selected
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/20">
          <thead className="bg-white/5 backdrop-blur-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Format
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white/5 backdrop-blur-sm divide-y divide-white/20">
            {barcodes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-300">
                  No barcodes generated yet. Start by generating your first barcode.
                </td>
              </tr>
            ) : (
              barcodes.map((barcode) => (
                <tr key={barcode.id} className="hover:bg-white/10">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedBarcodes.includes(barcode.id)}
                        onChange={(e) => onBarcodeSelect(barcode.id, e.target.checked)}
                        className="mr-3 rounded border-white/20 text-blue-400 shadow-sm focus:border-blue-400 focus:ring focus:ring-blue-400 focus:ring-opacity-50"
                      />
                      <div>
                        <div className="text-sm font-medium text-white font-mono">
                          {barcode.code}
                        </div>
                        {barcode.documentId && (
                          <div className="text-xs text-gray-300">
                            Doc: {barcode.documentId}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/30 text-blue-200 border border-blue-400/50">
                      {barcode.format.name}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {new Date(barcode.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      barcode.isActive
                        ? 'bg-green-500/30 text-green-200 border border-green-400/50'
                        : 'bg-red-500/30 text-red-200 border border-red-400/50'
                    }`}>
                      {barcode.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-blue-400 hover:text-blue-300">
                        View
                      </button>
                      <button
                        onClick={() => onNavigateTab('print')}
                        className="text-green-400 hover:text-green-300"
                      >
                        Print
                      </button>
                      {barcode.isActive && (
                        <button className="text-red-400 hover:text-red-300">
                          Deactivate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};