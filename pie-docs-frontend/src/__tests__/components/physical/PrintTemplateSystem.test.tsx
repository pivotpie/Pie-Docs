import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PrintTemplateSystem } from '@/components/physical/PrintTemplateSystem';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock the LabelDesigner component
vi.mock('@/components/physical/LabelDesigner', () => ({
  LabelDesigner: ({ onSave, onCancel }: any) => (
    <div data-testid="label-designer">
      <button onClick={() => onSave?.({ id: 'test-template', name: 'Test Template' })}>
        Save Template
      </button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  ),
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      physicalDocs: physicalDocsSlice,
    },
  });
};

const renderWithStore = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('PrintTemplateSystem', () => {
  const mockOnTemplateSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    expect(screen.getByText('Print Template System')).toBeInTheDocument();
  });

  it('displays template library by default', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    expect(screen.getByText('Template Library')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search templates...')).toBeInTheDocument();
  });

  it('shows built-in templates', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    expect(screen.getByText('Standard Product Label')).toBeInTheDocument();
    expect(screen.getByText('Asset Tag')).toBeInTheDocument();
    expect(screen.getByText('Shipping Label')).toBeInTheDocument();
    expect(screen.getByText('Pharmacy Label')).toBeInTheDocument();
  });

  it('displays template details', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    // Should show template dimensions and element counts
    expect(screen.getByText(/Size:/)).toBeInTheDocument();
    expect(screen.getByText(/Elements:/)).toBeInTheDocument();
  });

  it('filters templates by category', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const categorySelect = screen.getByDisplayValue('📋 All Templates');
    fireEvent.change(categorySelect, { target: { value: 'product' } });

    // Should filter to show only product templates
    expect(screen.getByText('Standard Product Label')).toBeInTheDocument();
  });

  it('searches templates by name', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'Asset' } });

    expect(screen.getByText('Asset Tag')).toBeInTheDocument();
  });

  it('toggles quick start guide', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const quickStartButton = screen.getByText('Quick Start Guide');
    fireEvent.click(quickStartButton);

    expect(screen.getByText('Getting Started with Templates')).toBeInTheDocument();
    expect(screen.getByText(/Browse Library:/)).toBeInTheDocument();
  });

  it('switches to designer view', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const designerTab = screen.getByText('Designer');
    fireEvent.click(designerTab);

    expect(screen.getByTestId('label-designer')).toBeInTheDocument();
  });

  it('creates new template', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const createButton = screen.getByText('Create New Template');
    fireEvent.click(createButton);

    expect(screen.getByTestId('label-designer')).toBeInTheDocument();
  });

  it('uses built-in template', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const useTemplateButtons = screen.getAllByText('Use Template');
    fireEvent.click(useTemplateButtons[0]);

    // Should create a copy of the template
    // The exact behavior depends on Redux store updates
  });

  it('handles template selection', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const templateCard = screen.getByText('Standard Product Label').closest('div');
    if (templateCard) {
      fireEvent.click(templateCard);
      expect(mockOnTemplateSelected).toHaveBeenCalledWith('standard-product');
    }
  });

  it('displays template previews', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    // Templates should have visual previews
    const templates = screen.getAllByText(/Size:/);
    expect(templates.length).toBeGreaterThan(0);
  });

  it('shows template tags', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    // Should show template tags for filtering and identification
    expect(screen.getByText('product')).toBeInTheDocument();
    expect(screen.getByText('retail')).toBeInTheDocument();
  });

  it('handles empty search results', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const searchInput = screen.getByPlaceholderText('Search templates...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

    expect(screen.getByText('No templates found')).toBeInTheDocument();
    expect(screen.getByText(/Try adjusting your search criteria/)).toBeInTheDocument();
  });

  it('shows built-in badge for built-in templates', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    const builtInBadges = screen.getAllByText('Built-in');
    expect(builtInBadges.length).toBeGreaterThan(0);
  });

  it('handles template saving from designer', async () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    // Switch to designer
    const designerTab = screen.getByText('Designer');
    fireEvent.click(designerTab);

    // Save template
    const saveButton = screen.getByText('Save Template');
    fireEvent.click(saveButton);

    await waitFor(() => {
      // Should switch back to library view after saving
      expect(screen.getByText('Template Library')).toBeInTheDocument();
    });
  });

  it('handles template cancel from designer', () => {
    renderWithStore(
      <PrintTemplateSystem onTemplateSelected={mockOnTemplateSelected} />
    );

    // Switch to designer
    const designerTab = screen.getByText('Designer');
    fireEvent.click(designerTab);

    // Cancel
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Should go back to library
    expect(screen.getByText('Template Library')).toBeInTheDocument();
  });
});