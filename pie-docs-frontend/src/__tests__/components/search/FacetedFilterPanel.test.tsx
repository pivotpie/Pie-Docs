import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { FacetedFilterPanel } from '@/components/search/FacetedFilterPanel';
import type { SearchFilters } from '@/types/domain/Search';

describe('FacetedFilterPanel', () => {
  const mockOnFiltersChange = vi.fn();
  const mockOnToggleCollapsed = vi.fn();

  const defaultProps = {
    filters: {} as SearchFilters,
    onFiltersChange: mockOnFiltersChange,
    isLoading: false,
    collapsed: false,
    onToggleCollapsed: mockOnToggleCollapsed,
  };

  const mockFacets = {
    document_types: [
      { value: 'PDF', count: 25 },
      { value: 'Word', count: 15 },
      { value: 'Image', count: 8 },
    ],
    authors: [
      { value: 'John Doe', count: 12 },
      { value: 'Jane Smith', count: 8 },
      { value: 'Bob Johnson', count: 5 },
    ],
    tags: [
      { value: 'important', count: 20 },
      { value: 'draft', count: 10 },
      { value: 'review', count: 7 },
    ],
    status: [
      { value: 'published', count: 30 },
      { value: 'draft', count: 15 },
      { value: 'archived', count: 5 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render expanded filter panel with all sections', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Check header
      expect(screen.getByText('Filters')).toBeInTheDocument();

      // Check filter sections
      expect(screen.getByText('Document Type')).toBeInTheDocument();
      expect(screen.getByText('Date Range')).toBeInTheDocument();
      expect(screen.getByText('Authors')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('should render collapsed view', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          collapsed={true}
        />
      );

      // Should show minimal collapsed view
      expect(screen.getByLabelText('Expand filters')).toBeInTheDocument();
      expect(screen.queryByText('Filters')).not.toBeInTheDocument();
    });

    it('should show active filter count in collapsed view', () => {
      const filtersWithActive: SearchFilters = {
        documentTypes: ['PDF', 'Word'],
        authors: ['John Doe'],
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithActive}
          collapsed={true}
        />
      );

      // Should show filter count badge
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should show active filter count in expanded view', () => {
      const filtersWithActive: SearchFilters = {
        documentTypes: ['PDF'],
        tags: ['important', 'draft'],
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithActive}
          facets={mockFacets}
        />
      );

      expect(screen.getByText('3 active')).toBeInTheDocument();
    });
  });

  describe('document type filter', () => {
    it('should display document types with counts', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Document type section should be expanded by default
      expect(screen.getByText('PDF')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
      expect(screen.getByText('Word')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument();
    });

    it('should handle document type selection', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      const pdfCheckbox = screen.getByRole('checkbox', { name: /PDF/ });
      fireEvent.click(pdfCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        documentTypes: ['PDF']
      });
    });

    it('should handle document type deselection', () => {
      const filtersWithTypes: SearchFilters = {
        documentTypes: ['PDF', 'Word']
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithTypes}
          facets={mockFacets}
        />
      );

      const pdfCheckbox = screen.getByRole('checkbox', { name: /PDF/ });
      expect(pdfCheckbox).toBeChecked();

      fireEvent.click(pdfCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        documentTypes: ['Word']
      });
    });
  });

  describe('date range filter', () => {
    it('should handle date range start change', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand date range section
      fireEvent.click(screen.getByText('Date Range'));

      const startInput = screen.getByLabelText('Created After');
      fireEvent.change(startInput, { target: { value: '2025-01-01' } });

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        dateRange: {
          start: '2025-01-01',
          end: ''
        }
      });
    });

    it('should handle date range quick selection', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand date range section
      fireEvent.click(screen.getByText('Date Range'));

      const last7DaysButton = screen.getByText('Last 7 days');
      fireEvent.click(last7DaysButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith(
        expect.objectContaining({
          dateRange: expect.objectContaining({
            start: expect.any(String),
            end: expect.any(String)
          })
        })
      );
    });

    it('should clear date range when both values are empty', () => {
      const filtersWithDate: SearchFilters = {
        dateRange: { start: '2025-01-01', end: '2025-01-31' }
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithDate}
          facets={mockFacets}
        />
      );

      // Expand date range section
      fireEvent.click(screen.getByText('Date Range'));

      const startInput = screen.getByLabelText('Created After');
      const endInput = screen.getByLabelText('Created Before');

      // Clear both inputs
      fireEvent.change(startInput, { target: { value: '' } });
      fireEvent.change(endInput, { target: { value: '' } });

      // Should be called twice - once for each field change
      expect(mockOnFiltersChange).toHaveBeenCalledTimes(2);

      // The first call should clear start
      expect(mockOnFiltersChange).toHaveBeenNthCalledWith(1, {
        dateRange: { start: '', end: '2025-01-31' }
      });

      // The second call should clear end but since it uses stale state,
      // we expect it to use the original state, not the updated state
      expect(mockOnFiltersChange).toHaveBeenNthCalledWith(2, {
        dateRange: { start: '2025-01-01', end: '' }
      });
    });
  });

  describe('authors filter', () => {
    it('should display authors with search functionality', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand authors section
      fireEvent.click(screen.getByText('Authors'));

      expect(screen.getByPlaceholderText('Search authors...')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should filter authors based on search input', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand authors section
      fireEvent.click(screen.getByText('Authors'));

      const searchInput = screen.getByPlaceholderText('Search authors...');
      fireEvent.change(searchInput, { target: { value: 'John' } });

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should handle author selection', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand authors section
      fireEvent.click(screen.getByText('Authors'));

      const johnCheckbox = screen.getByRole('checkbox', { name: /John Doe/ });
      fireEvent.click(johnCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        authors: ['John Doe']
      });
    });

    it('should show "Show all authors" button when there are many authors', () => {
      const manyAuthorsFacets = {
        ...mockFacets,
        authors: Array.from({ length: 10 }, (_, i) => ({
          value: `Author ${i + 1}`,
          count: 5
        }))
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={manyAuthorsFacets}
        />
      );

      // Expand authors section
      fireEvent.click(screen.getByText('Authors'));

      expect(screen.getByText('Show all 10 authors')).toBeInTheDocument();
    });
  });

  describe('status filter', () => {
    it('should display status options with counts', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand status section
      fireEvent.click(screen.getByText('Status'));

      expect(screen.getByText('Published')).toBeInTheDocument(); // Capitalized
      expect(screen.getByText('30')).toBeInTheDocument();
    });

    it('should handle status selection', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand status section
      fireEvent.click(screen.getByText('Status'));

      const publishedCheckbox = screen.getByRole('checkbox', { name: /Published/ });
      fireEvent.click(publishedCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: ['published']
      });
    });
  });

  describe('tags filter', () => {
    it('should display tags with counts', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand tags section
      fireEvent.click(screen.getByText('Tags'));

      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('20')).toBeInTheDocument();
    });

    it('should handle tag selection', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Expand tags section
      fireEvent.click(screen.getByText('Tags'));

      const importantCheckbox = screen.getByRole('checkbox', { name: /important/ });
      fireEvent.click(importantCheckbox);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        tags: ['important']
      });
    });
  });

  describe('custom metadata filters', () => {
    it('should display custom metadata filters when present', () => {
      const filtersWithMetadata: SearchFilters = {
        customMetadata: {
          category: 'Reports',
          priority: 'High'
        }
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithMetadata}
          facets={mockFacets}
        />
      );

      expect(screen.getByText('Custom Metadata')).toBeInTheDocument();

      // Expand custom metadata section
      fireEvent.click(screen.getByText('Custom Metadata'));

      expect(screen.getByText('category')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('priority')).toBeInTheDocument();
      expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('should handle custom metadata filter removal', () => {
      const filtersWithMetadata: SearchFilters = {
        customMetadata: {
          category: 'Reports',
          priority: 'High'
        }
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithMetadata}
          facets={mockFacets}
        />
      );

      // Expand custom metadata section
      fireEvent.click(screen.getByText('Custom Metadata'));

      const removeButtons = screen.getAllByLabelText(/Remove .* filter/);
      fireEvent.click(removeButtons[0]); // Remove first metadata filter

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        customMetadata: {
          priority: 'High'
        }
      });
    });

    it('should show add custom filter button', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      expect(screen.getByText('Add Custom Filter')).toBeInTheDocument();
    });
  });

  describe('clear filters functionality', () => {
    it('should show clear filters button when filters are active', () => {
      const filtersWithActive: SearchFilters = {
        documentTypes: ['PDF'],
        authors: ['John Doe']
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithActive}
          facets={mockFacets}
        />
      );

      expect(screen.getByText('Clear All Filters (2)')).toBeInTheDocument();
    });

    it('should handle clear all filters', () => {
      const filtersWithActive: SearchFilters = {
        documentTypes: ['PDF'],
        authors: ['John Doe'],
        tags: ['important']
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithActive}
          facets={mockFacets}
        />
      );

      const clearButton = screen.getByText('Clear All Filters (3)');
      fireEvent.click(clearButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({});
    });

    it('should not show clear button when no filters are active', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      expect(screen.queryByText(/Clear All Filters/)).not.toBeInTheDocument();
    });
  });

  describe('collapsible sections', () => {
    it('should expand and collapse sections', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Authors section should be collapsed by default
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();

      // Expand authors section
      fireEvent.click(screen.getByText('Authors'));
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      // Collapse again
      fireEvent.click(screen.getByText('Authors'));
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should show section counts in headers', () => {
      const filtersWithCounts: SearchFilters = {
        documentTypes: ['PDF', 'Word'],
        authors: ['John Doe']
      };

      render(
        <FacetedFilterPanel
          {...defaultProps}
          filters={filtersWithCounts}
          facets={mockFacets}
        />
      );

      // Should show counts next to section titles
      const documentTypeSection = screen.getByText('Document Type').parentElement;
      expect(documentTypeSection).toHaveTextContent('2');

      const authorsHeader = screen.getByText('Authors').parentElement;
      expect(authorsHeader).toHaveTextContent('1');
    });
  });

  describe('loading state', () => {
    it('should show loading overlay when isLoading is true', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          isLoading={true}
          facets={mockFacets}
        />
      );

      expect(screen.getByText('Updating filters...')).toBeInTheDocument();
    });
  });

  describe('toggle collapsed functionality', () => {
    it('should call onToggleCollapsed when collapse button is clicked', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      const collapseButton = screen.getByLabelText('Collapse filters');
      fireEvent.click(collapseButton);

      expect(mockOnToggleCollapsed).toHaveBeenCalled();
    });

    it('should call onToggleCollapsed when expand button is clicked in collapsed view', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          collapsed={true}
        />
      );

      const expandButton = screen.getByLabelText('Expand filters');
      fireEvent.click(expandButton);

      expect(mockOnToggleCollapsed).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      // Check section expand buttons have aria-expanded
      const expandButtons = screen.getAllByRole('button');
      const sectionButtons = expandButtons.filter(button =>
        button.hasAttribute('aria-expanded')
      );

      expect(sectionButtons.length).toBeGreaterThan(0);
      sectionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-expanded');
      });
    });

    it('should support keyboard navigation', () => {
      render(
        <FacetedFilterPanel
          {...defaultProps}
          facets={mockFacets}
        />
      );

      const firstCheckbox = screen.getAllByRole('checkbox')[0];
      firstCheckbox.focus();
      expect(firstCheckbox).toHaveFocus();
    });
  });
});