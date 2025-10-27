import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AssetTaggingSystem } from '@/components/physical/AssetTaggingSystem';
import physicalDocsSlice from '@/store/slices/physicalDocsSlice';

// Mock the barcode generator utility
vi.mock('@/utils/barcodeGenerator', () => ({
  barcodeGenerator: {
    generateBarcodeImage: vi.fn(() => Promise.resolve('data:image/png;base64,mock-barcode')),
  }
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

describe('AssetTaggingSystem', () => {
  const mockOnAssetTagged = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    expect(screen.getByText('Asset Tagging System')).toBeInTheDocument();
  });

  it('displays register asset form by default', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    expect(screen.getByText('Asset Information')).toBeInTheDocument();
    expect(screen.getByText('Generate Asset Tag')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter asset name')).toBeInTheDocument();
  });

  it('has asset type options', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const typeSelect = screen.getByDisplayValue('Select type');
    expect(typeSelect).toBeInTheDocument();

    // Check if asset types are available
    fireEvent.click(typeSelect);
    expect(screen.getByText(/Computer Equipment/)).toBeInTheDocument();
    expect(screen.getByText(/Office Furniture/)).toBeInTheDocument();
  });

  it('allows filling asset information', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const nameInput = screen.getByPlaceholderText('Enter asset name');
    const serialInput = screen.getByPlaceholderText('Enter serial number');

    fireEvent.change(nameInput, { target: { value: 'Test Laptop' } });
    fireEvent.change(serialInput, { target: { value: 'ABC123' } });

    expect(nameInput).toHaveValue('Test Laptop');
    expect(serialInput).toHaveValue('ABC123');
  });

  it('switches between views', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const manageTab = screen.getByText('Manage Assets');
    fireEvent.click(manageTab);

    expect(screen.getByText('Search assets...')).toBeInTheDocument();
    expect(screen.getByText('All Statuses')).toBeInTheDocument();
  });

  it('shows locations management', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const locationsTab = screen.getByText('Locations');
    fireEvent.click(locationsTab);

    expect(screen.getByText('Add New Location')).toBeInTheDocument();
    expect(screen.getByText('Existing Locations')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter location name')).toBeInTheDocument();
  });

  it('shows reports view', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const reportsTab = screen.getByText('Reports');
    fireEvent.click(reportsTab);

    expect(screen.getByText('Asset Reports')).toBeInTheDocument();
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Active Assets')).toBeInTheDocument();
  });

  it('displays tag format options', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Should show tag format selector
    expect(screen.getByText('Tag Format')).toBeInTheDocument();
  });

  it('shows tag preview placeholder', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    expect(screen.getByText('Tag Preview')).toBeInTheDocument();
    expect(screen.getByText('Fill in asset details to see preview')).toBeInTheDocument();
  });

  it('validates required fields for registration', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const registerButton = screen.getByText('Register Asset & Generate Tag');

    // Should be disabled when required fields are empty
    expect(registerButton).toBeDisabled();
  });

  it('enables registration when required fields are filled', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const nameInput = screen.getByPlaceholderText('Enter asset name');
    const typeSelect = screen.getByDisplayValue('Select type');

    fireEvent.change(nameInput, { target: { value: 'Test Asset' } });
    fireEvent.change(typeSelect, { target: { value: 'computer' } });

    const registerButton = screen.getByText('Register Asset & Generate Tag');
    expect(registerButton).not.toBeDisabled();
  });

  it('handles location addition', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to locations view
    const locationsTab = screen.getByText('Locations');
    fireEvent.click(locationsTab);

    const locationNameInput = screen.getByPlaceholderText('Enter location name');
    const addLocationButton = screen.getByText('Add Location');

    // Should be disabled initially
    expect(addLocationButton).toBeDisabled();

    // Enter location name
    fireEvent.change(locationNameInput, { target: { value: 'Storage Room A' } });
    expect(addLocationButton).not.toBeDisabled();
  });

  it('shows asset status filters', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to manage view
    const manageTab = screen.getByText('Manage Assets');
    fireEvent.click(manageTab);

    const statusFilter = screen.getByDisplayValue('All Statuses');
    fireEvent.click(statusFilter);

    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('shows empty state when no assets exist', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to manage view
    const manageTab = screen.getByText('Manage Assets');
    fireEvent.click(manageTab);

    expect(screen.getByText('No assets found. Register your first asset to get started.')).toBeInTheDocument();
  });

  it('shows empty state for locations', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to locations view
    const locationsTab = screen.getByText('Locations');
    fireEvent.click(locationsTab);

    expect(screen.getByText('No locations defined yet.')).toBeInTheDocument();
  });

  it('displays asset statistics in reports', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to reports view
    const reportsTab = screen.getByText('Reports');
    fireEvent.click(reportsTab);

    // Should show statistics cards
    expect(screen.getByText('Total Assets')).toBeInTheDocument();
    expect(screen.getByText('Active Assets')).toBeInTheDocument();
    expect(screen.getByText('In Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Retired')).toBeInTheDocument();
  });

  it('shows asset distribution by type', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    // Go to reports view
    const reportsTab = screen.getByText('Reports');
    fireEvent.click(reportsTab);

    expect(screen.getByText('Asset Distribution by Type')).toBeInTheDocument();
  });

  it('handles asset form field changes', () => {
    renderWithStore(
      <AssetTaggingSystem onAssetTagged={mockOnAssetTagged} />
    );

    const manufacturerInput = screen.getByPlaceholderText('Enter manufacturer');
    const modelInput = screen.getByPlaceholderText('Enter model');
    const priceInput = screen.getByPlaceholderText('0.00');

    fireEvent.change(manufacturerInput, { target: { value: 'Dell' } });
    fireEvent.change(modelInput, { target: { value: 'Latitude 5520' } });
    fireEvent.change(priceInput, { target: { value: '1200' } });

    expect(manufacturerInput).toHaveValue('Dell');
    expect(modelInput).toHaveValue('Latitude 5520');
    expect(priceInput).toHaveValue('1200');
  });
});