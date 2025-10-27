import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import type { DocumentToolProps } from './types';
import { ToolPageLayout } from './ToolPageLayout';
import { signaturesService } from '@/services/api/signaturesService';
import type { SignatureResponse } from '@/services/api/signaturesService';

interface Signature {
  id: string;
  dataUrl: string;
  createdBy: string;
  createdAt: string;
  type: 'draw' | 'upload';
  metadata?: {
    width: number;
    height: number;
  };
}

type SignatureMode = 'draw' | 'upload';

export const SignaturesTool: React.FC<DocumentToolProps> = ({ document, onBack, className = '' }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const [mode, setMode] = useState<SignatureMode>('draw');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#000000');
  const [penWidth, setPenWidth] = useState(3);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch signatures on component mount
  useEffect(() => {
    const fetchSignatures = async () => {
      if (!document?.id) return;

      setLoading(true);
      try {
        const response = await signaturesService.getDocumentSignatures(document.id);
        // Convert API response to local format
        const loadedSignatures: Signature[] = response.signatures.map((sig: SignatureResponse) => ({
          id: sig.id,
          dataUrl: sig.signature_data,
          createdBy: sig.created_by_name,
          createdAt: sig.created_at,
          type: sig.signature_type,
          metadata: sig.metadata,
        }));
        setSignatures(loadedSignatures);
      } catch (error) {
        console.error('Error loading signatures:', error);
        alert('Failed to load signatures');
      } finally {
        setLoading(false);
      }
    };

    fetchSignatures();
  }, [document?.id]);

  // Canvas setup
  useEffect(() => {
    if (mode === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penWidth;
      }
    }
  }, [mode, penColor, penWidth]);

  // Drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let x, y;

    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Save drawn signature
  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');

    // Check if canvas is empty
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let isEmpty = true;

    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] !== 0) {
        isEmpty = false;
        break;
      }
    }

    if (isEmpty) {
      alert('Please draw your signature first');
      return;
    }

    if (!document?.id) {
      alert('Document ID is missing');
      return;
    }

    setSaving(true);
    try {
      const response = await signaturesService.createSignature({
        document_id: document.id,
        signature_data: dataUrl,
        signature_type: 'draw',
        metadata: {
          width: canvas.width,
          height: canvas.height,
        },
      });

      // Add to local state
      const newSignature: Signature = {
        id: response.id,
        dataUrl: response.signature_data,
        createdBy: response.created_by_name,
        createdAt: response.created_at,
        type: response.signature_type,
        metadata: response.metadata,
      };

      setSignatures([...signatures, newSignature]);
      clearCanvas();
      alert('Signature saved successfully!');
    } catch (error) {
      console.error('Error saving signature:', error);
      alert('Failed to save signature. Please try again.');
    } finally {
      setSaving(false);
    }
  };


  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    if (!document?.id) {
      alert('Document ID is missing');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;

      const img = new Image();
      img.onload = async () => {
        setSaving(true);
        try {
          const response = await signaturesService.createSignature({
            document_id: document.id,
            signature_data: dataUrl,
            signature_type: 'upload',
            metadata: {
              width: img.width,
              height: img.height,
            },
          });

          // Add to local state
          const newSignature: Signature = {
            id: response.id,
            dataUrl: response.signature_data,
            createdBy: response.created_by_name,
            createdAt: response.created_at,
            type: response.signature_type,
            metadata: response.metadata,
          };

          setSignatures([...signatures, newSignature]);
          alert('Signature uploaded successfully!');
        } catch (error) {
          console.error('Error uploading signature:', error);
          alert('Failed to upload signature. Please try again.');
        } finally {
          setSaving(false);
        }
      };
      img.src = dataUrl;
    };

    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Delete signature
  const deleteSignature = async (id: string) => {
    if (!confirm('Are you sure you want to delete this signature?')) {
      return;
    }

    try {
      await signaturesService.deleteSignature(id);
      setSignatures(signatures.filter(sig => sig.id !== id));
      alert('Signature deleted successfully!');
    } catch (error) {
      console.error('Error deleting signature:', error);
      alert('Failed to delete signature. Please try again.');
    }
  };

  // Download signature
  const downloadSignature = (signature: Signature) => {
    const link = document.createElement('a');
    link.download = `signature-${signature.id}.png`;
    link.href = signature.dataUrl;
    link.click();
  };

  // Show loading state while fetching
  if (loading) {
    return (
      <ToolPageLayout title="Signature Captures" icon="✍️" onBack={onBack}>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ToolPageLayout>
    );
  }

  return (
    <ToolPageLayout title="Signature Captures" icon="✍️" onBack={onBack}>
      <div className="space-y-6">
        {/* Saving Indicator */}
        {saving && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded flex items-center">
            <svg className="animate-spin h-5 w-5 text-blue-600 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Saving signature...</span>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setMode('draw')}
            className={`flex-1 px-4 py-2 rounded transition-all ${
              mode === 'draw'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">✏️</span>
            Draw
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`flex-1 px-4 py-2 rounded transition-all ${
              mode === 'upload'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <span className="mr-2">📤</span>
            Upload
          </button>
        </div>

        {/* Draw Mode */}
        {mode === 'draw' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <h3 className="font-semibold mb-2">Draw Your Signature</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use your mouse or touchscreen to draw your signature in the box below
              </p>
            </div>

            {/* Drawing Controls */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Color:</label>
                <input
                  type="color"
                  value={penColor}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Width:</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={penWidth}
                  onChange={(e) => setPenWidth(Number(e.target.value))}
                  className="w-32"
                />
                <span className="text-sm">{penWidth}px</span>
              </div>
            </div>

            {/* Canvas */}
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={300}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full bg-white cursor-crosshair touch-none"
                style={{ maxHeight: '300px' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={clearCanvas}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear
              </button>
              <button
                onClick={saveDrawnSignature}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Signature'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Upload Mode */}
        {mode === 'upload' && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
              <h3 className="font-semibold mb-2">Upload Signature Image</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload a scanned or photographed image of your signature (PNG, JPG, max 2MB)
              </p>
            </div>

            {/* Upload Area */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all"
            >
              <div className="text-6xl mb-4">📤</div>
              <p className="text-lg font-medium mb-2">Click to upload</p>
              <p className="text-sm text-gray-500">or drag and drop</p>
              <p className="text-xs text-gray-400 mt-2">PNG, JPG up to 2MB</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        )}

        {/* Saved Signatures */}
        {signatures.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Saved Signatures ({signatures.length})</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {signatures.map((signature) => (
                <div
                  key={signature.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800"
                >
                  <div className="mb-3 p-2 bg-gray-50 dark:bg-gray-900 rounded overflow-hidden">
                    <img
                      src={signature.dataUrl}
                      alt="Signature"
                      className="w-full h-32 object-contain"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{signature.createdBy}</span>
                      <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                        {signature.type}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs">
                      {new Date(signature.createdAt).toLocaleString()}
                    </p>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => downloadSignature(signature)}
                        className="flex-1 px-3 py-1.5 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                      >
                        📥 Download
                      </button>
                      <button
                        onClick={() => deleteSignature(signature.id)}
                        className="flex-1 px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Section */}
        {signatures.length === 0 && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded">
            <h4 className="font-semibold mb-2">Signature Features</h4>
            <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
              <li>✓ Draw signatures with mouse or touch</li>
              <li>✓ Upload scanned signature images</li>
              <li>✓ Customize color and pen width</li>
              <li>✓ Download signatures as PNG files</li>
              <li>✓ Multiple signatures per document</li>
              <li>✓ Touch-friendly for mobile devices</li>
            </ul>
          </div>
        )}
      </div>
    </ToolPageLayout>
  );
};
