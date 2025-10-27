import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import FolderPermissions from './FolderPermissions';
import type { DocumentFolder } from '@/types/domain/Document';

// Mock folder data
const mockFolder: DocumentFolder = {
  id: 'folder1',
  name: 'Test Folder',
  path: '/test',
  type: 'regular',
  parentId: undefined,
  childFolders: [],
  documentCount: 0,
  totalSize: 0,
  dateCreated: '2025-01-01T00:00:00Z',
  dateModified: '2025-01-01T00:00:00Z',
  documentRefs: [],
  permissions: {
    canView: true,
    canEdit: true,
    canDelete: false,
    canCreateChild: true,
    canManagePermissions: false,
    inheritPermissions: true,
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
  folder: mockFolder,
  onUpdate: vi.fn(),
};

describe('FolderPermissions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<FolderPermissions {...defaultProps} />);

      expect(screen.getByText(/Test Folder/)).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<FolderPermissions {...defaultProps} isOpen={false} />);

      expect(screen.queryByText(/Test Folder/)).not.toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('shows general tab by default', () => {
      render(<FolderPermissions {...defaultProps} />);

      const generalTab = screen.getByRole('button', { name: /general/i });
      expect(generalTab).toHaveClass('border-blue-500');
    });

    it('can switch to users tab', async () => {
      const user = userEvent.setup();
      render(<FolderPermissions {...defaultProps} />);

      const usersTab = screen.getByRole('button', { name: /users/i });
      await user.click(usersTab);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('can switch to groups tab', async () => {
      const user = userEvent.setup();
      render(<FolderPermissions {...defaultProps} />);

      const groupsTab = screen.getByRole('button', { name: /groups/i });
      await user.click(groupsTab);

      expect(screen.getByText('Document Managers')).toBeInTheDocument();
    });
  });

  describe('Form Actions', () => {
    it('calls onUpdate when save button is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderPermissions {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(defaultProps.onUpdate).toHaveBeenCalled();
    });

    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<FolderPermissions {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Permission Controls', () => {
    it('displays permission checkboxes', () => {
      render(<FolderPermissions {...defaultProps} />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('shows inheritance checkbox', () => {
      render(<FolderPermissions {...defaultProps} />);

      const inheritCheckbox = screen.getByRole('checkbox', { name: /inherit permissions/i });
      expect(inheritCheckbox).toBeInTheDocument();
      expect(inheritCheckbox).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('provides proper tab structure', () => {
      render(<FolderPermissions {...defaultProps} />);

      expect(screen.getByRole('tablist')).toBeInTheDocument();
      expect(screen.getAllByRole('tab')).toHaveLength(3);
    });
  });
});