import type { SearchQuery, SearchFilters } from '@/types/domain/Search';

/**
 * Elasticsearch query builder for advanced search functionality
 */
export class ElasticsearchQueryBuilder {
  private query: any = {};

  constructor() {
    this.reset();
  }

  /**
   * Reset query to empty state
   */
  reset(): this {
    this.query = {
      query: {
        bool: {
          must: [],
          filter: [],
          should: [],
          must_not: []
        }
      },
      highlight: {
        fields: {
          title: {},
          content: {},
          'metadata.*': {}
        },
        pre_tags: ['<mark>'],
        post_tags: ['</mark>']
      },
      sort: [],
      size: 20,
      from: 0
    };
    return this;
  }

  /**
   * Add full-text search across multiple fields
   */
  addFullTextSearch(text: string, boost: Record<string, number> = {}): this {
    if (!text?.trim()) return this;

    const defaultBoost = {
      title: 3.0,
      content: 1.0,
      'metadata.description': 2.0,
      'metadata.tags': 1.5,
      'ocr.extractedText': 1.0,
      ...boost
    };

    this.query.query.bool.must.push({
      multi_match: {
        query: text.trim(),
        fields: Object.entries(defaultBoost).map(([field, boost]) => `${field}^${boost}`),
        type: 'best_fields',
        fuzziness: 'AUTO',
        operator: 'and'
      }
    });

    return this;
  }

  /**
   * Add document type filter
   */
  addDocumentTypeFilter(types: string[]): this {
    if (!types?.length) return this;

    this.query.query.bool.filter.push({
      terms: {
        documentType: types
      }
    });

    return this;
  }

  /**
   * Add date range filter
   */
  addDateRangeFilter(
    field: string = 'modifiedAt',
    start?: string,
    end?: string
  ): this {
    if (!start && !end) return this;

    const range: any = {};
    if (start) range.gte = start;
    if (end) range.lte = end;

    this.query.query.bool.filter.push({
      range: {
        [field]: range
      }
    });

    return this;
  }

  /**
   * Add author filter
   */
  addAuthorFilter(authors: string[]): this {
    if (!authors?.length) return this;

    this.query.query.bool.filter.push({
      terms: {
        'author.keyword': authors
      }
    });

    return this;
  }

  /**
   * Add status filter
   */
  addStatusFilter(statuses: string[]): this {
    if (!statuses?.length) return this;

    this.query.query.bool.filter.push({
      terms: {
        'metadata.status.keyword': statuses
      }
    });

    return this;
  }

  /**
   * Add tags filter
   */
  addTagsFilter(tags: string[]): this {
    if (!tags?.length) return this;

    this.query.query.bool.filter.push({
      terms: {
        'tags.keyword': tags
      }
    });

    return this;
  }

  /**
   * Add folder filter
   */
  addFolderFilter(folders: string[]): this {
    if (!folders?.length) return this;

    this.query.query.bool.filter.push({
      terms: {
        'metadata.folder.keyword': folders
      }
    });

    return this;
  }

  /**
   * Add custom metadata filters
   */
  addMetadataFilter(key: string, value: any): this {
    if (value === undefined || value === null) return this;

    const field = `metadata.${key}`;

    if (Array.isArray(value)) {
      this.query.query.bool.filter.push({
        terms: {
          [`${field}.keyword`]: value
        }
      });
    } else if (typeof value === 'string') {
      this.query.query.bool.filter.push({
        term: {
          [`${field}.keyword`]: value
        }
      });
    } else if (typeof value === 'number') {
      this.query.query.bool.filter.push({
        term: {
          [field]: value
        }
      });
    } else if (typeof value === 'object' && value.min !== undefined || value.max !== undefined) {
      // Range query for numeric metadata
      const range: any = {};
      if (value.min !== undefined) range.gte = value.min;
      if (value.max !== undefined) range.lte = value.max;

      this.query.query.bool.filter.push({
        range: {
          [field]: range
        }
      });
    }

    return this;
  }

  /**
   * Add boolean query with AND/OR/NOT logic
   */
  addBooleanQuery(
    operator: 'AND' | 'OR' | 'NOT',
    field: string,
    value: string
  ): this {
    const matchQuery = {
      match: {
        [field]: {
          query: value,
          operator: operator === 'AND' ? 'and' : 'or'
        }
      }
    };

    switch (operator) {
      case 'AND':
      case 'OR':
        this.query.query.bool.must.push(matchQuery);
        break;
      case 'NOT':
        this.query.query.bool.must_not.push(matchQuery);
        break;
    }

    return this;
  }

  /**
   * Add sorting
   */
  addSort(field: string, order: 'asc' | 'desc' = 'desc'): this {
    // Clear existing sort
    this.query.sort = [];

    switch (field) {
      case 'relevance':
        this.query.sort.push({ _score: { order: 'desc' } });
        break;
      case 'date':
        this.query.sort.push({ modifiedAt: { order } });
        break;
      case 'title':
        this.query.sort.push({ 'title.keyword': { order } });
        break;
      case 'author':
        this.query.sort.push({ 'author.keyword': { order } });
        break;
      default:
        this.query.sort.push({ [field]: { order } });
    }

    return this;
  }

  /**
   * Set pagination
   */
  setPagination(page: number, pageSize: number): this {
    this.query.size = pageSize;
    this.query.from = (page - 1) * pageSize;
    return this;
  }

  /**
   * Add aggregations for faceted search
   */
  addFacetAggregations(): this {
    this.query.aggs = {
      documentTypes: {
        terms: {
          field: 'documentType.keyword',
          size: 20
        }
      },
      authors: {
        terms: {
          field: 'author.keyword',
          size: 50
        }
      },
      tags: {
        terms: {
          field: 'tags.keyword',
          size: 100
        }
      },
      folders: {
        terms: {
          field: 'metadata.folder.keyword',
          size: 50
        }
      },
      status: {
        terms: {
          field: 'metadata.status.keyword',
          size: 20
        }
      },
      createdDateRange: {
        date_histogram: {
          field: 'createdAt',
          calendar_interval: 'month',
          format: 'yyyy-MM'
        }
      },
      modifiedDateRange: {
        date_histogram: {
          field: 'modifiedAt',
          calendar_interval: 'month',
          format: 'yyyy-MM'
        }
      }
    };

    return this;
  }

  /**
   * Build the final query
   */
  build(): any {
    // If no must clauses, add match_all
    if (this.query.query.bool.must.length === 0) {
      this.query.query.bool.must.push({ match_all: {} });
    }

    return this.query;
  }

  /**
   * Build query from SearchQuery object
   */
  static fromSearchQuery(searchQuery: SearchQuery): any {
    const builder = new ElasticsearchQueryBuilder();

    // Add main text search
    if (searchQuery.text) {
      builder.addFullTextSearch(searchQuery.text);
    }

    // Add filters
    const filters = searchQuery.filters;
    if (filters.documentTypes?.length) {
      builder.addDocumentTypeFilter(filters.documentTypes);
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      builder.addDateRangeFilter('modifiedAt', filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.authors?.length) {
      builder.addAuthorFilter(filters.authors);
    }

    if (filters.status?.length) {
      builder.addStatusFilter(filters.status);
    }

    if (filters.tags?.length) {
      builder.addTagsFilter(filters.tags);
    }

    if (filters.folders?.length) {
      builder.addFolderFilter(filters.folders);
    }

    // Add custom metadata filters
    if (filters.customMetadata) {
      Object.entries(filters.customMetadata).forEach(([key, value]) => {
        builder.addMetadataFilter(key, value);
      });
    }

    // Add facet aggregations
    builder.addFacetAggregations();

    return builder.build();
  }

  /**
   * Build simple query from text and filters
   */
  static buildSimpleQuery(
    text: string,
    filters: SearchFilters = {},
    page: number = 1,
    pageSize: number = 20,
    sortBy: string = 'relevance'
  ): any {
    const builder = new ElasticsearchQueryBuilder();

    if (text) {
      builder.addFullTextSearch(text);
    }

    // Apply filters
    if (filters.documentTypes?.length) {
      builder.addDocumentTypeFilter(filters.documentTypes);
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      builder.addDateRangeFilter('modifiedAt', filters.dateRange.start, filters.dateRange.end);
    }

    if (filters.authors?.length) {
      builder.addAuthorFilter(filters.authors);
    }

    if (filters.status?.length) {
      builder.addStatusFilter(filters.status);
    }

    if (filters.tags?.length) {
      builder.addTagsFilter(filters.tags);
    }

    if (filters.folders?.length) {
      builder.addFolderFilter(filters.folders);
    }

    if (filters.customMetadata) {
      Object.entries(filters.customMetadata).forEach(([key, value]) => {
        builder.addMetadataFilter(key, value);
      });
    }

    // Set pagination and sorting
    builder.setPagination(page, pageSize);
    builder.addSort(sortBy);
    builder.addFacetAggregations();

    return builder.build();
  }
}

/**
 * Utility functions for search query manipulation
 */
export const searchQueryUtils = {
  /**
   * Parse natural language query into structured search
   */
  parseNaturalLanguage(query: string): { text: string; filters: SearchFilters } {
    const filters: SearchFilters = {};
    let cleanText = query;

    // Extract document type filters
    const typeMatches = query.match(/type:(\w+)/gi);
    if (typeMatches) {
      filters.documentTypes = typeMatches.map(match => match.split(':')[1].toLowerCase());
      cleanText = cleanText.replace(/type:\w+/gi, '').trim();
    }

    // Extract author filters
    const authorMatches = query.match(/author:"([^"]+)"|author:(\w+)/gi);
    if (authorMatches) {
      filters.authors = authorMatches.map(match => {
        const parts = match.split(':');
        return parts[1].replace(/"/g, '');
      });
      cleanText = cleanText.replace(/author:"[^"]+"|author:\w+/gi, '').trim();
    }

    // Extract tag filters
    const tagMatches = query.match(/tag:(\w+)/gi);
    if (tagMatches) {
      filters.tags = tagMatches.map(match => match.split(':')[1]);
      cleanText = cleanText.replace(/tag:\w+/gi, '').trim();
    }

    // Extract date filters
    const dateMatches = query.match(/after:(\d{4}-\d{2}-\d{2})|before:(\d{4}-\d{2}-\d{2})/gi);
    if (dateMatches) {
      const dateRange: { start?: string; end?: string } = {};
      dateMatches.forEach(match => {
        if (match.startsWith('after:')) {
          dateRange.start = match.split(':')[1];
        } else if (match.startsWith('before:')) {
          dateRange.end = match.split(':')[1];
        }
      });
      if (Object.keys(dateRange).length > 0) {
        filters.dateRange = dateRange;
      }
      cleanText = cleanText.replace(/after:\d{4}-\d{2}-\d{2}|before:\d{4}-\d{2}-\d{2}/gi, '').trim();
    }

    return {
      text: cleanText.replace(/\s+/g, ' ').trim(),
      filters
    };
  },

  /**
   * Convert filters to human-readable text
   */
  filtersToText(filters: SearchFilters): string {
    const parts: string[] = [];

    if (filters.documentTypes?.length) {
      parts.push(`Type: ${filters.documentTypes.join(', ')}`);
    }

    if (filters.authors?.length) {
      parts.push(`Author: ${filters.authors.join(', ')}`);
    }

    if (filters.tags?.length) {
      parts.push(`Tags: ${filters.tags.join(', ')}`);
    }

    if (filters.dateRange?.start || filters.dateRange?.end) {
      const start = filters.dateRange.start ? new Date(filters.dateRange.start).toLocaleDateString() : 'Beginning';
      const end = filters.dateRange.end ? new Date(filters.dateRange.end).toLocaleDateString() : 'Now';
      parts.push(`Date: ${start} - ${end}`);
    }

    if (filters.status?.length) {
      parts.push(`Status: ${filters.status.join(', ')}`);
    }

    return parts.join(' • ');
  },

  /**
   * Validate search query
   */
  validateQuery(query: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!query || query.trim().length === 0) {
      errors.push('Search query cannot be empty');
    }

    if (query.length > 1000) {
      errors.push('Search query too long (max 1000 characters)');
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /script[^>]*>/i,
      /<iframe/i,
      /javascript:/i,
      /data:text\/html/i
    ];

    if (dangerousPatterns.some(pattern => pattern.test(query))) {
      errors.push('Search query contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Suggest search improvements
   */
  suggestImprovements(query: string, resultCount: number): string[] {
    const suggestions: string[] = [];

    if (resultCount === 0) {
      suggestions.push('Try using different keywords');
      suggestions.push('Remove some filters to broaden your search');
      suggestions.push('Check spelling of search terms');

      if (query.length < 3) {
        suggestions.push('Use more specific search terms');
      }
    } else if (resultCount > 1000) {
      suggestions.push('Add more specific keywords to narrow results');
      suggestions.push('Use filters to refine your search');
      suggestions.push('Try using quotes for exact phrases');
    }

    return suggestions;
  }
};

export default ElasticsearchQueryBuilder;