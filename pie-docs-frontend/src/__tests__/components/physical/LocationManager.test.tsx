import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LocationManager } from '@/components/physical/LocationManager';
import { vi } from 'vitest';

// Mock console.log since the component uses it for placeholder functionality
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

const renderComponent = () => {
  return render(<LocationManager />);
};

describe('LocationManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders with warehouses tab active by default', () => {
      renderComponent();

      expect(screen.getByText('Location Manager')).toBeInTheDocument();
      expect(screen.getAllByText('Warehouses')).toHaveLength(2); // Tab and table header
      expect(screen.getByText('Zones')).toBeInTheDocument();
      expect(screen.getByText('Shelves')).toBeInTheDocument();
      expect(screen.getByText('Racks')).toBeInTheDocument();
    });

    it('shows warehouse navigation tabs', () => {
      renderComponent();

      const warehousesTab = screen.getByRole('button', { name: /warehouses/i });
      const zonesTab = screen.getByRole('button', { name: /zones/i });
      const shelvesTab = screen.getByRole('button', { name: /shelves/i });
      const racksTab = screen.getByRole('button', { name: /racks/i });

      expect(warehousesTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(zonesTab).toHaveClass('border-transparent', 'text-gray-500');
      expect(shelvesTab).toHaveClass('border-transparent', 'text-gray-500');
      expect(racksTab).toHaveClass('border-transparent', 'text-gray-500');
    });

    it('displays warehouse table with sample data', () => {
      renderComponent();

      // Check table headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Code')).toBeInTheDocument();
      expect(screen.getByText('Address')).toBeInTheDocument();
      expect(screen.getByText('Manager')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();

      // Check sample data
      expect(screen.getByText('Jabel Ali')).toBeInTheDocument();
      expect(screen.getByText('DXBJA')).toBeInTheDocument();
      expect(screen.getByText('Jumeirah')).toBeInTheDocument();
      expect(screen.getByText('DXBJM')).toBeInTheDocument();
      expect(screen.getAllByText('Ajay')).toHaveLength(2);
      expect(screen.getAllByText('Active')).toHaveLength(2);
    });

    it('shows add warehouse button', () => {
      renderComponent();

      expect(screen.getByText('Add Warehouse')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    it('switches to zones tab', async () => {
      renderComponent();

      const zonesTab = screen.getByRole('button', { name: /zones/i });

      await act(async () => {
        fireEvent.click(zonesTab);
      });

      expect(zonesTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Zones management will be available in a future update.')).toBeInTheDocument();
    });

    it('switches to shelves tab', async () => {
      renderComponent();

      const shelvesTab = screen.getByRole('button', { name: /shelves/i });

      await act(async () => {
        fireEvent.click(shelvesTab);
      });

      expect(shelvesTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Shelves management will be available in a future update.')).toBeInTheDocument();
    });

    it('switches to racks tab', async () => {
      renderComponent();

      const racksTab = screen.getByRole('button', { name: /racks/i });

      await act(async () => {
        fireEvent.click(racksTab);
      });

      expect(racksTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(screen.getByText('Coming Soon')).toBeInTheDocument();
      expect(screen.getByText('Racks management will be available in a future update.')).toBeInTheDocument();
    });

    it('switches back to warehouses tab', async () => {
      renderComponent();

      // Switch to another tab first
      const zonesTab = screen.getByRole('button', { name: /zones/i });
      await act(async () => {
        fireEvent.click(zonesTab);
      });

      // Switch back to warehouses
      const warehousesTab = screen.getByRole('button', { name: /warehouses/i });
      await act(async () => {
        fireEvent.click(warehousesTab);
      });

      expect(warehousesTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(screen.getByText('Jabel Ali')).toBeInTheDocument();
      expect(screen.getByText('Jumeirah')).toBeInTheDocument();
    });
  });

  describe('Warehouse Actions', () => {
    it('handles add warehouse button click', async () => {
      renderComponent();

      const addButton = screen.getByText('Add Warehouse');

      await act(async () => {
        fireEvent.click(addButton);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('Add warehouse clicked');
    });

    it('handles edit warehouse button click', async () => {
      renderComponent();

      const editButtons = screen.getAllByTitle('Edit');

      await act(async () => {
        fireEvent.click(editButtons[0]);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('Edit warehouse:', '1');
    });

    it('handles delete warehouse button click', async () => {
      renderComponent();

      const deleteButtons = screen.getAllByTitle('Delete');

      await act(async () => {
        fireEvent.click(deleteButtons[0]);
      });

      expect(mockConsoleLog).toHaveBeenCalledWith('Delete warehouse:', '1');
    });
  });

  describe('Custom Props', () => {
    it('applies custom className', () => {
      const { container } = render(<LocationManager className="custom-class" />);

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });

  describe('Table Structure', () => {
    it('renders table with correct structure', () => {
      renderComponent();

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Check for proper table structure
      const headers = screen.getAllByRole('columnheader');
      expect(headers).toHaveLength(6);

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3); // 1 header + 2 data rows
    });

    it('displays warehouse status badges correctly', () => {
      renderComponent();

      const statusBadges = screen.getAllByText('Active');
      statusBadges.forEach(badge => {
        expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
      });
    });
  });
});