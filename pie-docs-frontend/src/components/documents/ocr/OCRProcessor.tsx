import React, { useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// Simple UUID generation
const generateUUID = () => {
  return 'xxxx-xxxx-xxxx-xxxx'.replace(/[x]/g, () => {
    return (Math.random() * 16 | 0).toString(16);
  });
};
import type { Document } from '@/types/domain/Document';
import type {
  OCRProcessorProps,
  OCRJob,
  OCRProcessingSettings,
  OCRError,
} from '@/types/domain/OCR';
import {
  startOCRJob,
  updateOCRJob,
  completeOCRJob,
  failOCRJob,
  selectOCRJobById,
  selectOCRResultByDocumentId,
  selectOCRProcessingSettings,
} from '@/store/slices/documentsSlice';
import { ocrService } from '@/services/api/ocrService';
import { isDocumentOCRCompatible, getOptimalOCRSettings } from '@/utils/ocr/documentTypeDetection';

interface OCRProcessorComponentProps extends OCRProcessorProps {
  document: Document;
  className?: string;
  children?: React.ReactNode;
}

const OCRProcessor: React.FC<OCRProcessorComponentProps> = ({
  document,
  documentId,
  autoStart = false,
  onComplete,
  onError,
  onProgress,
  className,
  children,
}) => {
  const dispatch = useDispatch();
  const processingSettings = useSelector(selectOCRProcessingSettings);
  const existingResult = useSelector(selectOCRResultByDocumentId(documentId));

  const jobIdRef = useRef<string | null>(null);
  const pollingCleanupRef = useRef<(() => void) | null>(null);

  const currentJob = useSelector(selectOCRJobById(jobIdRef.current || ''));

  const checkOCRCompatibility = useCallback(() => {
    const compatibility = isDocumentOCRCompatible(
      document.type,
      undefined, // mimeType not available in Document type
      document.name
    );

    if (!compatibility.isCompatible) {
      const error: OCRError = {
        code: 'INCOMPATIBLE_DOCUMENT',
        message: `Document type '${document.type}' is not compatible with OCR processing`,
        details: { reasons: compatibility.reasons },
        timestamp: new Date().toISOString(),
        recoverable: false,
      };
      onError?.(error);
      return false;
    }

    return true;
  }, [document, onError]);

  const createOCRJob = useCallback(
    (settings?: Partial<OCRProcessingSettings>): OCRJob => {
      const jobId = generateUUID();
      const mergedSettings = {
        ...processingSettings,
        ...settings,
      };

      const optimalSettings = getOptimalOCRSettings(document.type, undefined, document.name);
      const finalSettings = optimalSettings ? { ...mergedSettings, ...optimalSettings } : mergedSettings;

      const job: OCRJob = {
        id: jobId,
        documentId,
        status: 'pending',
        progress: 0,
        language: 'auto',
        startTime: new Date().toISOString(),
        processingSettings: finalSettings,
        retryCount: 0,
        maxRetries: 3,
      };

      return job;
    },
    [documentId, document, processingSettings]
  );

  const startProcessing = useCallback(
    async (customSettings?: Partial<OCRProcessingSettings>) => {
      if (!checkOCRCompatibility()) {
        return;
      }

      if (existingResult) {
        onComplete?.(existingResult);
        return;
      }

      try {
        const job = createOCRJob(customSettings);
        jobIdRef.current = job.id;

        dispatch(startOCRJob(job));

        const serviceResponse = await ocrService.startOCRJob({
          documentId,
          documentUrl: document.downloadUrl,
          settings: job.processingSettings,
        });

        dispatch(
          updateOCRJob({
            jobId: job.id,
            updates: {
              status: 'processing',
              estimatedTimeRemaining: serviceResponse.estimatedTime,
            },
          })
        );

        // Start polling for status updates
        pollingCleanupRef.current = ocrService.createStatusPolling(
          job.id,
          (statusResponse) => {
            dispatch(
              updateOCRJob({
                jobId: job.id,
                updates: {
                  status: statusResponse.status,
                  progress: statusResponse.progress,
                  estimatedTimeRemaining: statusResponse.estimatedTimeRemaining,
                  detectedLanguage: statusResponse.result?.language,
                },
              })
            );

            onProgress?.(statusResponse.progress);

            if (statusResponse.status === 'completed' && statusResponse.result) {
              dispatch(completeOCRJob({ jobId: job.id, result: statusResponse.result }));
              onComplete?.(statusResponse.result);

              if (pollingCleanupRef.current) {
                pollingCleanupRef.current();
                pollingCleanupRef.current = null;
              }
            } else if (statusResponse.status === 'failed' && statusResponse.error) {
              dispatch(failOCRJob({ jobId: job.id, error: statusResponse.error }));
              onError?.(statusResponse.error);

              if (pollingCleanupRef.current) {
                pollingCleanupRef.current();
                pollingCleanupRef.current = null;
              }
            }
          },
          2000 // Poll every 2 seconds
        );
      } catch (error) {
        const ocrError: OCRError = {
          code: 'START_JOB_FAILED',
          message: error instanceof Error ? error.message : 'Failed to start OCR processing',
          timestamp: new Date().toISOString(),
          recoverable: true,
        };

        if (jobIdRef.current) {
          dispatch(failOCRJob({ jobId: jobIdRef.current, error: ocrError }));
        }

        onError?.(ocrError);
      }
    },
    [
      checkOCRCompatibility,
      existingResult,
      onComplete,
      createOCRJob,
      documentId,
      document.downloadUrl,
      dispatch,
      onProgress,
      onError,
    ]
  );

  const stopProcessing = useCallback(async () => {
    if (jobIdRef.current && currentJob?.status === 'processing') {
      try {
        await ocrService.cancelOCRJob(jobIdRef.current);
      } catch (error) {
        console.error('Error canceling OCR job:', error);
      }
    }

    if (pollingCleanupRef.current) {
      pollingCleanupRef.current();
      pollingCleanupRef.current = null;
    }
  }, [currentJob?.status]);

  const retryProcessing = useCallback(
    async (newSettings?: Partial<OCRProcessingSettings>) => {
      if (currentJob && currentJob.retryCount < currentJob.maxRetries) {
        await startProcessing(newSettings);
      }
    },
    [currentJob, startProcessing]
  );

  // Auto-start processing if enabled
  useEffect(() => {
    if (autoStart && !existingResult && !currentJob) {
      startProcessing();
    }
  }, [autoStart, existingResult, currentJob, startProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingCleanupRef.current) {
        pollingCleanupRef.current();
      }
    };
  }, []);

  // Expose methods to parent components through ref if needed
  React.useImperativeHandle(
    React.forwardRef<{
      start: (settings?: Partial<OCRProcessingSettings>) => Promise<void>;
      stop: () => Promise<void>;
      retry: (settings?: Partial<OCRProcessingSettings>) => Promise<void>;
      isProcessing: boolean;
      currentJob: OCRJob | undefined;
    }>(),
    () => ({
      start: startProcessing,
      stop: stopProcessing,
      retry: retryProcessing,
      isProcessing: currentJob?.status === 'processing' || currentJob?.status === 'retrying',
      currentJob,
    }),
    [startProcessing, stopProcessing, retryProcessing, currentJob]
  );

  if (children) {
    return (
      <div className={className}>
        {React.cloneElement(children as React.ReactElement, {
          onStartOCR: startProcessing,
          onStopOCR: stopProcessing,
          onRetryOCR: retryProcessing,
          ocrJob: currentJob,
          ocrResult: existingResult,
          isOCRProcessing: currentJob?.status === 'processing' || currentJob?.status === 'retrying',
        })}
      </div>
    );
  }

  return null;
};

export default OCRProcessor;