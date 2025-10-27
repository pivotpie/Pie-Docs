import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MetadataFilterBuilder } from '@/components/search/MetadataFilterBuilder';
import type { SearchFilters } from '@/types/domain/Search';

describe('MetadataFilterBuilder', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnClose = vi.fn();

  const defaultProps = {
    filters: {} as SearchFilters,
    onFiltersChange: mockOnFiltersChange,
    isOpen: true,
    onClose: mockOnClose,
  };

  const mockAvailableFields = {
    category: ['Reports', 'Invoices', 'Contracts'],
    priority: ['High', 'Medium', 'Low'],
    department: ['Engineering', 'Sales', 'Marketing'],
    version: ['1.0', '1.1', '2.0'],
    language: ['English', 'Spanish', 'French'],
    active: [true, false],
    score: [95, 87, 92, 78],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      expect(screen.getByText('Add Metadata Filter')).toBeInTheDocument();
      expect(screen.getByText('Metadata Field')).toBeInTheDocument();
      expect(screen.getByText('Select a field...')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          isOpen={false}
          availableFields={mockAvailableFields}
        />
      );

      expect(screen.queryByText('Add Metadata Filter')).not.toBeInTheDocument();
    });

    it('should render close button', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      expect(screen.getByLabelText('Close')).toBeInTheDocument();
    });
  });

  describe('field selection', () => {
    it('should display available fields in dropdown', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.click(fieldSelect);

      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Department')).toBeInTheDocument();
    });

    it('should show condition dropdown after field selection', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      expect(screen.getByText('Condition')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Equals')).toBeInTheDocument();
    });

    it('should show value input after field selection', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      expect(screen.getByText('Value')).toBeInTheDocument();
      expect(screen.getByText('Select a value...')).toBeInTheDocument();
    });
  });

  describe('field type handling', () => {
    it('should render select dropdown for select field type', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      const valueSelect = screen.getByLabelText('Value');
      fireEvent.click(valueSelect);

      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Invoices')).toBeInTheDocument();
      expect(screen.getByText('Contracts')).toBeInTheDocument();
    });

    it('should render boolean dropdown for boolean field type', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'active' } });

      const valueSelect = screen.getByLabelText('Value');
      fireEvent.click(valueSelect);

      expect(screen.getByText('True')).toBeInTheDocument();
      expect(screen.getByText('False')).toBeInTheDocument();
    });

    it('should render number input for number field type', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'score' } });

      const valueInput = screen.getByLabelText('Value');
      expect(valueInput).toHaveAttribute('type', 'number');
    });

    it('should render text input for text field type', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      const valueInput = screen.getByLabelText('Value');
      expect(valueInput).toHaveAttribute('type', 'text');
      expect(valueInput).toHaveAttribute('placeholder', 'Enter project...');
    });
  });

  describe('operator handling', () => {
    it('should show text operators for text fields', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      const operatorSelect = screen.getByLabelText('Condition');
      fireEvent.click(operatorSelect);

      expect(screen.getByText('Equals')).toBeInTheDocument();
      expect(screen.getByText('Contains')).toBeInTheDocument();
      expect(screen.getByText('Starts with')).toBeInTheDocument();
      expect(screen.getByText('Ends with')).toBeInTheDocument();
    });

    it('should show number operators for number fields', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'score' } });

      const operatorSelect = screen.getByLabelText('Condition');
      fireEvent.click(operatorSelect);

      expect(screen.getByText('Equals')).toBeInTheDocument();
      expect(screen.getByText('Greater than')).toBeInTheDocument();
      expect(screen.getByText('Less than')).toBeInTheDocument();
      expect(screen.getByText('Between')).toBeInTheDocument();
    });

    it('should show only equals operator for select and boolean fields', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      const operatorSelect = screen.getByLabelText('Condition');
      const options = operatorSelect.querySelectorAll('option');

      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent('Equals');
    });
  });

  describe('help text', () => {
    it('should show help text for contains operator', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      const operatorSelect = screen.getByLabelText('Condition');
      fireEvent.change(operatorSelect, { target: { value: 'contains' } });

      expect(screen.getByText(/Use wildcards/)).toBeInTheDocument();
    });

    it('should show help text for between operator', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'score' } });

      const operatorSelect = screen.getByLabelText('Condition');
      fireEvent.change(operatorSelect, { target: { value: 'between' } });

      expect(screen.getByText(/Use format: min-max/)).toBeInTheDocument();
    });

    it('should show help text for select fields', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      expect(screen.getByText(/Select from available values/)).toBeInTheDocument();
    });
  });

  describe('filter addition', () => {
    it('should add text filter correctly', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      // Enter value
      const valueInput = screen.getByLabelText('Value');
      fireEvent.change(valueInput, { target: { value: 'Web App' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          project: 'Web App'
        }
      });
    });

    it('should add select filter correctly', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      // Select value
      const valueSelect = screen.getByLabelText('Value');
      fireEvent.change(valueSelect, { target: { value: 'Reports' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          category: 'Reports'
        }
      });
    });

    it('should add number filter correctly', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'score' } });

      // Enter value
      const valueInput = screen.getByLabelText('Value');
      fireEvent.change(valueInput, { target: { value: '85' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          score: 85
        }
      });
    });

    it('should add boolean filter correctly', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'active' } });

      // Select value
      const valueSelect = screen.getByLabelText('Value');
      fireEvent.change(valueSelect, { target: { value: 'true' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          active: true
        }
      });
    });

    it('should handle wildcard operators correctly', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      // Select contains operator
      const operatorSelect = screen.getByLabelText('Condition');
      fireEvent.change(operatorSelect, { target: { value: 'contains' } });

      // Enter value
      const valueInput = screen.getByLabelText('Value');
      fireEvent.change(valueInput, { target: { value: 'report' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          project: '*report*'
        }
      });
    });

    it('should preserve existing custom metadata when adding new filter', () => {
      const existingFilters: SearchFilters = {
        customMetadata: {
          category: 'Reports'
        }
      };

      render(
        <MetadataFilterBuilder
          {...defaultProps}
          filters={existingFilters}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'priority' } });

      // Select value
      const valueSelect = screen.getByLabelText('Value');
      fireEvent.change(valueSelect, { target: { value: 'High' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          category: 'Reports',
          priority: 'High'
        }
      });
    });
  });

  describe('form validation', () => {
    it('should disable add button when no field is selected', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const addButton = screen.getByText('Add Filter');
      expect(addButton).toBeDisabled();
    });

    it('should disable add button when field is selected but no value', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field only
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      const addButton = screen.getByText('Add Filter');
      expect(addButton).toBeDisabled();
    });

    it('should enable add button when both field and value are selected', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      // Select value
      const valueSelect = screen.getByLabelText('Value');
      fireEvent.change(valueSelect, { target: { value: 'Reports' } });

      const addButton = screen.getByText('Add Filter');
      expect(addButton).toBeEnabled();
    });

    it('should not add filter with empty value after trimming', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      // Enter whitespace-only value
      const valueInput = screen.getByLabelText('Value');
      fireEvent.change(valueInput, { target: { value: '   ' } });

      const addButton = screen.getByText('Add Filter');
      expect(addButton).toBeDisabled();
    });
  });

  describe('form reset', () => {
    it('should reset form after adding filter', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Fill form
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      const valueSelect = screen.getByLabelText('Value');
      fireEvent.change(valueSelect, { target: { value: 'Reports' } });

      // Add filter
      const addButton = screen.getByText('Add Filter');
      fireEvent.click(addButton);

      // Form should be reset
      expect(fieldSelect).toHaveValue('');
      expect(screen.queryByText('Condition')).not.toBeInTheDocument();
      expect(screen.queryByText('Value')).not.toBeInTheDocument();
    });

    it('should reset form when field selection changes', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      // Select field and enter value
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'project' } });

      const valueInput = screen.getByLabelText('Value');
      fireEvent.change(valueInput, { target: { value: 'Test Project' } });

      // Change field selection
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      // Value should be reset
      const newValueSelect = screen.getByLabelText('Value');
      expect(newValueSelect).toHaveValue('');
    });
  });

  describe('modal interactions', () => {
    it('should call onClose when close button is clicked', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when cancel button is clicked', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper labels for form fields', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      expect(screen.getByLabelText('Metadata Field')).toBeInTheDocument();

      // Select a field to show other inputs
      const fieldSelect = screen.getByLabelText('Metadata Field');
      fireEvent.change(fieldSelect, { target: { value: 'category' } });

      expect(screen.getByLabelText('Condition')).toBeInTheDocument();
      expect(screen.getByLabelText('Value')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(
        <MetadataFilterBuilder
          {...defaultProps}
          availableFields={mockAvailableFields}
        />
      );

      const fieldSelect = screen.getByLabelText('Metadata Field');
      fieldSelect.focus();
      expect(fieldSelect).toHaveFocus();
    });
  });
});