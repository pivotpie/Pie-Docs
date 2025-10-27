import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderCreationDialog from './FolderCreationDialog';
import type { DocumentFolder, FolderCreationRequest } from '@/types/domain/Document';

// Mock parent folder
const mockParentFolder: DocumentFolder = {
  id: 'parent1',
  name: 'Parent Folder',
  path: '/parent',
  type: 'regular',
  childFolders: [],
  documentCount: 0,
  totalSize: 0,
  dateCreated: '2025-01-01T00:00:00Z',
  dateModified: '2025-01-01T00:00:00Z',
  documentRefs: [],
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: true,
    canCreateChild: true,
    canManagePermissions: true,
    inheritPermissions: false,
  },
  statistics: {
    documentCount: 0,
    totalSize: 0,
    averageFileSize: 0,
    lastActivity: '2025-01-01T00:00:00Z',
    fileTypeDistribution: {},
  },
};

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onSubmit: vi.fn(),
  parentFolder: mockParentFolder,
};

describe('FolderCreationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<FolderCreationDialog {...defaultProps} />);

      expect(screen.getByText('Create New Folder')).toBeInTheDocument();
      expect(screen.getByLabelText(/folder name/i)).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<FolderCreationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument();
    });

    it('closes dialog when close button is clicked', () => {
      render(<FolderCreationDialog {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('closes dialog when overlay is clicked', () => {
      render(<FolderCreationDialog {...defaultProps} />);

      const overlay = screen.getByTestId('dialog-overlay');
      fireEvent.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('requires folder name', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/folder name is required/i)).toBeInTheDocument();
    });

    it('validates folder name length', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'a'.repeat(256)); // Too long

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/folder name too long/i)).toBeInTheDocument();
    });

    it('validates description length', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'Valid Name');
      await user.type(descriptionInput, 'a'.repeat(501)); // Too long

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(screen.getByText(/description too long/i)).toBeInTheDocument();
    });
  });

  describe('Regular Folder Creation', () => {
    it('submits regular folder with valid data', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'Test Folder');
      await user.type(descriptionInput, 'Test description');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Folder',
            description: 'Test description',
            type: 'regular',
            parentId: 'parent1',
          })
        );
      });
    });

    it('allows setting folder color', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Colored Folder');

      // Select a color
      const colorInput = screen.getByLabelText(/color/i);
      await user.click(colorInput);
      fireEvent.change(colorInput, { target: { value: '#ff0000' } });

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Colored Folder',
            color: '#ff0000',
          })
        );
      });
    });
  });

  describe('Smart Folder Creation', () => {
    it('switches to smart folder type', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const smartFolderRadio = screen.getByLabelText(/smart folder/i);
      await user.click(smartFolderRadio);

      expect(screen.getByText(/smart folder criteria/i)).toBeInTheDocument();
    });

    it('submits smart folder with criteria', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Smart Test Folder');

      const smartFolderRadio = screen.getByLabelText(/smart folder/i);
      await user.click(smartFolderRadio);

      // Set document type criteria
      const pdfCheckbox = screen.getByLabelText(/pdf/i);
      await user.click(pdfCheckbox);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Smart Test Folder',
            type: 'smart',
            smartCriteria: expect.objectContaining({
              documentTypes: expect.arrayContaining(['pdf']),
            }),
          })
        );
      });
    });

    it('allows setting date range criteria', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Date Range Folder');

      const smartFolderRadio = screen.getByLabelText(/smart folder/i);
      await user.click(smartFolderRadio);

      // Set date range
      const startDateInput = screen.getByLabelText(/start date/i);
      const endDateInput = screen.getByLabelText(/end date/i);

      await user.type(startDateInput, '2025-01-01');
      await user.type(endDateInput, '2025-12-31');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            smartCriteria: expect.objectContaining({
              dateRange: {
                start: '2025-01-01',
                end: '2025-12-31',
              },
            }),
          })
        );
      });
    });

    it('allows setting size range criteria', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Size Range Folder');

      const smartFolderRadio = screen.getByLabelText(/smart folder/i);
      await user.click(smartFolderRadio);

      // Set size range
      const minSizeInput = screen.getByLabelText(/minimum size/i);
      const maxSizeInput = screen.getByLabelText(/maximum size/i);

      await user.type(minSizeInput, '1024');
      await user.type(maxSizeInput, '10485760');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            smartCriteria: expect.objectContaining({
              sizeRange: {
                min: 1024,
                max: 10485760,
              },
            }),
          })
        );
      });
    });

    it('enables auto-refresh for smart folders', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Auto Refresh Folder');

      const smartFolderRadio = screen.getByLabelText(/smart folder/i);
      await user.click(smartFolderRadio);

      const autoRefreshCheckbox = screen.getByLabelText(/auto.refresh/i);
      await user.click(autoRefreshCheckbox);

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            autoRefresh: true,
          })
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error when submission fails', async () => {
      const user = userEvent.setup();
      const onSubmitError = vi.fn().mockRejectedValue(new Error('Creation failed'));

      render(<FolderCreationDialog {...defaultProps} onSubmit={onSubmitError} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Test Folder');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });

    it('disables submit button during submission', async () => {
      const user = userEvent.setup();
      let resolveSubmit: (value: unknown) => void;
      const onSubmitPending = vi.fn(() => new Promise(resolve => {
        resolveSubmit = resolve;
      }));

      render(<FolderCreationDialog {...defaultProps} onSubmit={onSubmitPending} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Test Folder');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText(/creating/i)).toBeInTheDocument();

      // Resolve the promise
      resolveSubmit!({});

      await waitFor(() => {
        expect(submitButton).not.toBeDisabled();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides proper ARIA labels', () => {
      render(<FolderCreationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByLabelText(/folder name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.tab();

      expect(nameInput).toHaveFocus();

      await user.tab();
      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveFocus();
    });

    it('closes on Escape key', async () => {
      const user = userEvent.setup();
      render(<FolderCreationDialog {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Form Reset', () => {
    it('resets form when dialog is reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<FolderCreationDialog {...defaultProps} />);

      const nameInput = screen.getByLabelText(/folder name/i);
      await user.type(nameInput, 'Test Input');

      // Close dialog
      rerender(<FolderCreationDialog {...defaultProps} isOpen={false} />);

      // Reopen dialog
      rerender(<FolderCreationDialog {...defaultProps} isOpen={true} />);

      const newNameInput = screen.getByLabelText(/folder name/i);
      expect(newNameInput).toHaveValue('');
    });
  });

  describe('Parent Folder Context', () => {
    it('displays parent folder information', () => {
      render(<FolderCreationDialog {...defaultProps} />);

      expect(screen.getByText(/parent folder/i)).toBeInTheDocument();
      expect(screen.getByText('Parent Folder')).toBeInTheDocument();
    });

    it('works without parent folder (root level)', () => {
      render(<FolderCreationDialog {...defaultProps} parentFolder={undefined} />);

      expect(screen.getByText(/root level/i)).toBeInTheDocument();
    });
  });
});