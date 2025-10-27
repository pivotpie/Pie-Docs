import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  addFilesToQueue,
  removeFileFromQueue,
  updateFileProgress,
  setUploadQueueStatus,
  selectUploadFiles,
  selectIsUploading,
} from '@/store/slices/documentsSlice';
import { documentsService } from '@/services/api/documentsService';
import { FileValidator } from '@/utils/validation/fileValidator';
import { fileManager, processFilesForUpload } from '@/utils/upload/fileManager';
import type { UploadFile, UploadFileMetadata, UploadOptions } from '@/types/domain/Upload';

export const useUploadManager = () => {
  const dispatch = useDispatch();
  const uploadFiles = useSelector(selectUploadFiles);
  const isUploading = useSelector(selectIsUploading);

  // Store AbortControllers for each upload
  const abortControllers = useRef<Map<string, AbortController>>(new Map());

  /**
   * Get complete upload files (metadata + File objects)
   */
  const getCompleteUploadFiles = useCallback((): UploadFile[] => {
    return uploadFiles
      .map(metadata => fileManager.getUploadFile(metadata))
      .filter((file): file is UploadFile => file !== undefined);
  }, [uploadFiles]);

  /**
   * Add files to upload queue
   */
  const addFiles = useCallback((files: File[], options?: UploadOptions) => {
    // Validate files before adding to queue
    const validationResult = FileValidator.validateFiles(files);
    if (!validationResult.isValid) {
      console.error('File validation failed:', validationResult.errors);
      return { success: false, errors: validationResult.errors };
    }

    if (validationResult.warnings.length > 0) {
      console.warn('File validation warnings:', validationResult.warnings);
    }

    // Process files and store in file manager
    const uploadFileMetadata = processFilesForUpload(files, {
      generateId: () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      folderId: options?.folderId,
      folderPath: options?.folderPath,
      metadata: options?.metadata,
    });

    dispatch(addFilesToQueue(uploadFileMetadata));
    return { success: true, files: uploadFileMetadata };
  }, [dispatch]);

  /**
   * Remove file from queue
   */
  const removeFile = useCallback((fileId: string) => {
    // Cancel upload if in progress
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }

    // Remove from file manager
    fileManager.removeFile(fileId);

    dispatch(removeFileFromQueue(fileId));
  }, [dispatch]);

  /**
   * Start uploading files in queue
   */
  const startUploads = useCallback(async (options?: UploadOptions) => {
    const pendingFiles = uploadFiles.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    dispatch(setUploadQueueStatus(true));

    const concurrentLimit = 3; // Maximum concurrent uploads
    const uploadQueue = [...pendingFiles];
    const activeUploads = new Set<string>();

    const processNextUpload = async (): Promise<void> => {
      if (uploadQueue.length === 0 || activeUploads.size >= concurrentLimit) {
        return;
      }

      const uploadFile = uploadQueue.shift();
      if (!uploadFile) return;

      activeUploads.add(uploadFile.id);

      try {
        await uploadSingleFile(uploadFile, options);
      } catch (error) {
        console.error(`Upload failed for ${uploadFile.name}:`, error);
      } finally {
        activeUploads.delete(uploadFile.id);

        // Process next upload
        if (uploadQueue.length > 0) {
          processNextUpload();
        } else if (activeUploads.size === 0) {
          // All uploads completed
          dispatch(setUploadQueueStatus(false));
        }
      }
    };

    // Start initial batch of uploads
    const initialBatch = Math.min(concurrentLimit, uploadQueue.length);
    for (let i = 0; i < initialBatch; i++) {
      processNextUpload();
    }
  }, [uploadFiles, dispatch]);

  /**
   * Upload a single file
   */
  const uploadSingleFile = useCallback(async (
    uploadFileMetadata: UploadFileMetadata,
    options?: UploadOptions
  ): Promise<void> => {
    const { id } = uploadFileMetadata;

    // Get the File object from file manager
    const file = fileManager.getFile(id);
    if (!file) {
      console.error(`File not found in file manager for id: ${id}`);
      dispatch(updateFileProgress({
        fileId: id,
        progress: 0,
        status: 'error'
      }));
      return;
    }

    // Create abort controller for this upload
    const abortController = new AbortController();
    abortControllers.current.set(id, abortController);

    try {
      // Update upload start time and status
      dispatch(updateFileProgress({
        fileId: id,
        progress: 0,
        status: 'uploading'
      }));

      const uploadOptions: UploadOptions = {
        ...options,
        folderId: uploadFileMetadata.folderId || options?.folderId,
        metadata: uploadFileMetadata.metadata || options?.metadata,
      };

      const result = await documentsService.uploadFile(
        file,
        uploadOptions,
        (progress) => {
          dispatch(updateFileProgress({
            fileId: id,
            progress: progress.percentage,
          }));
        },
        abortController.signal
      );

      if (result.success) {
        dispatch(updateFileProgress({
          fileId: id,
          progress: 100,
          status: 'success'
        }));
      } else {
        dispatch(updateFileProgress({
          fileId: id,
          progress: 0,
          status: 'error'
        }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        dispatch(updateFileProgress({
          fileId: id,
          progress: 0,
          status: 'cancelled'
        }));
      } else {
        dispatch(updateFileProgress({
          fileId: id,
          progress: 0,
          status: 'error'
        }));
      }
    } finally {
      abortControllers.current.delete(id);
    }
  }, [dispatch]);

  /**
   * Cancel specific upload
   */
  const cancelUpload = useCallback((fileId: string) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }

    dispatch(updateFileProgress({
      fileId,
      progress: 0,
      status: 'cancelled'
    }));
  }, [dispatch]);

  /**
   * Retry failed upload
   */
  const retryUpload = useCallback(async (fileId: string, options?: UploadOptions) => {
    const uploadFileMetadata = uploadFiles.find(f => f.id === fileId);
    if (!uploadFileMetadata || uploadFileMetadata.status !== 'error') {
      return;
    }

    // Reset file status
    dispatch(updateFileProgress({
      fileId,
      progress: 0,
      status: 'pending'
    }));

    // Upload the file
    await uploadSingleFile(uploadFileMetadata, options);
  }, [uploadFiles, dispatch, uploadSingleFile]);

  /**
   * Cancel all uploads
   */
  const cancelAllUploads = useCallback(() => {
    // Cancel all active uploads
    abortControllers.current.forEach((controller) => {
      controller.abort();
    });
    abortControllers.current.clear();

    // Update status for all uploading files
    uploadFiles
      .filter(f => f.status === 'uploading' || f.status === 'pending')
      .forEach(f => {
        dispatch(updateFileProgress({
          fileId: f.id,
          progress: 0,
          status: 'cancelled'
        }));
      });

    dispatch(setUploadQueueStatus(false));
  }, [uploadFiles, dispatch]);

  /**
   * Pause uploads (cancel pending uploads but keep completed/failed ones)
   */
  const pauseUploads = useCallback(() => {
    // Cancel pending uploads only
    uploadFiles
      .filter(f => f.status === 'pending')
      .forEach(f => {
        dispatch(updateFileProgress({
          fileId: f.id,
          progress: 0,
          status: 'cancelled'
        }));
      });

    dispatch(setUploadQueueStatus(false));
  }, [uploadFiles, dispatch]);

  /**
   * Resume paused uploads
   */
  const resumeUploads = useCallback(async (options?: UploadOptions) => {
    const cancelledFiles = uploadFiles.filter(f => f.status === 'cancelled');

    // Reset cancelled files to pending
    cancelledFiles.forEach(f => {
      dispatch(updateFileProgress({
        fileId: f.id,
        progress: 0,
        status: 'pending'
      }));
    });

    // Start uploads for pending files
    await startUploads(options);
  }, [uploadFiles, dispatch, startUploads]);

  return {
    // State
    uploadFiles, // Metadata only (serializable)
    isUploading,

    // Actions
    addFiles,
    removeFile,
    startUploads,
    cancelUpload,
    retryUpload,
    cancelAllUploads,
    pauseUploads,
    resumeUploads,

    // Utilities
    getCompleteUploadFiles, // Get files with File objects
  };
};

export default useUploadManager;