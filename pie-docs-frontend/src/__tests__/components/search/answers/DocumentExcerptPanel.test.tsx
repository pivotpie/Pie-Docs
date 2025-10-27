import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DocumentExcerptPanel from '@/components/search/answers/DocumentExcerptPanel';
import type { GeneratedAnswer } from '@/types/domain/Answer';
import type { SearchResult } from '@/types/domain/Search';

const mockAnswer: GeneratedAnswer = {
  id: 'answer-1',
  query: 'How to configure document workflows?',
  content: 'To configure document workflows, you need to access the admin panel and set up approval stages with proper notifications and routing rules.',
  citations: [],
  confidence: 0.85,
  confidenceExplanation: 'High confidence based on documentation',
  generatedAt: new Date(),
  processingTime: 1500,
  sources: ['doc-1', 'doc-2'],
  relatedQuestions: [],
};

const mockSearchResults: SearchResult[] = [
  {
    id: 'doc-1',
    title: 'Workflow Configuration Guide',
    content: 'To configure document workflows, you need to access the admin panel. The system provides comprehensive workflow management with approval stages and routing.',
    excerpt: 'To configure document workflows, you need to access the admin panel',
    score: 0.95,
    documentType: 'pdf',
    metadata: {
      pageNumber: 15,
      sectionId: 'config',
      sectionTitle: 'Configuration',
    },
  },
  {
    id: 'doc-2',
    title: 'Advanced Workflow Setup',
    content: 'Approval stages can be configured with custom notifications and routing rules. The workflow builder allows for complex business logic implementation.',
    excerpt: 'Approval stages can be configured with custom notifications',
    score: 0.88,
    documentType: 'docx',
    metadata: {
      pageNumber: 8,
      sectionId: 'advanced',
      sectionTitle: 'Advanced Features',
    },
  },
  {
    id: 'doc-3',
    title: 'User Management',
    content: 'User roles and permissions are essential for workflow security. Different users have different access levels.',
    excerpt: 'User roles and permissions are essential',
    score: 0.45,
    documentType: 'pdf',
    metadata: {
      pageNumber: 3,
      sectionId: 'users',
      sectionTitle: 'User Management',
    },
  },
];

describe('DocumentExcerptPanel', () => {
  const renderComponent = (props = {}) => {
    return render(
      <DocumentExcerptPanel
        answer={mockAnswer}
        searchResults={mockSearchResults}
        {...props}
      />
    );
  };

  it('renders source verification panel with relevant excerpts', () => {
    renderComponent();

    expect(screen.getByText('Source Verification')).toBeInTheDocument();
    expect(screen.getByText(/relevant excerpts/)).toBeInTheDocument();
    expect(screen.getByText('Workflow Configuration Guide')).toBeInTheDocument();
    expect(screen.getByText('Advanced Workflow Setup')).toBeInTheDocument();
  });

  it('highlights matching terms in excerpts', () => {
    renderComponent();

    // Should highlight key terms like "configure", "workflow", "admin"
    const excerptElements = screen.getAllByText(/configure/i);
    expect(excerptElements.length).toBeGreaterThan(0);
  });

  it('shows relevance indicators for excerpts', () => {
    renderComponent();

    // Should show relevance percentages
    expect(screen.getByText(/% relevant/)).toBeInTheDocument();

    // Should show relevance reasons
    expect(screen.getByText(/key terms match/)).toBeInTheDocument();
  });

  it('filters out low-relevance excerpts', () => {
    renderComponent();

    // User Management should not appear as it has low relevance
    expect(screen.queryByText('User Management')).not.toBeInTheDocument();
  });

  it('opens side-by-side comparison when excerpt is selected', () => {
    renderComponent();

    const firstExcerpt = screen.getByText('Workflow Configuration Guide').closest('div');
    fireEvent.click(firstExcerpt!);

    expect(screen.getByText('Side-by-Side Comparison')).toBeInTheDocument();
    expect(screen.getByText('Generated Answer')).toBeInTheDocument();
    expect(screen.getByText('Source Excerpt')).toBeInTheDocument();
  });

  it('closes comparison view when close button is clicked', () => {
    renderComponent();

    // Open comparison
    const firstExcerpt = screen.getByText('Workflow Configuration Guide').closest('div');
    fireEvent.click(firstExcerpt!);

    // Close comparison
    const closeButton = screen.getByLabelText('Close comparison');
    fireEvent.click(closeButton);

    expect(screen.queryByText('Side-by-Side Comparison')).not.toBeInTheDocument();
  });

  it('calls onExcerptClick when excerpt is clicked', () => {
    const onExcerptClick = vi.fn();
    renderComponent({ onExcerptClick });

    const firstExcerpt = screen.getByText('Workflow Configuration Guide').closest('div');
    fireEvent.click(firstExcerpt!);

    expect(onExcerptClick).toHaveBeenCalledWith(
      expect.objectContaining({
        documentId: 'doc-1',
        documentTitle: 'Workflow Configuration Guide',
      })
    );
  });

  it('shows empty state when no relevant excerpts found', () => {
    const irrelevantResults: SearchResult[] = [
      {
        id: 'doc-unrelated',
        title: 'Completely Unrelated Document',
        content: 'This document talks about something entirely different with no matching terms.',
        excerpt: 'Something entirely different',
        score: 0.1,
        documentType: 'pdf',
      },
    ];

    render(
      <DocumentExcerptPanel
        answer={mockAnswer}
        searchResults={irrelevantResults}
      />
    );

    expect(screen.getByText('No relevant source excerpts found for verification')).toBeInTheDocument();
    expect(screen.getByText('The answer may be based on synthesized information')).toBeInTheDocument();
  });

  it('shows "Show more excerpts" button when applicable', () => {
    // Create many search results to trigger the show more button
    const manyResults = Array.from({ length: 15 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      content: `Configure workflow admin panel document management system approval ${i}`,
      excerpt: `Configure workflow admin panel ${i}`,
      score: 0.8,
      documentType: 'pdf' as const,
    }));

    render(
      <DocumentExcerptPanel
        answer={mockAnswer}
        searchResults={manyResults}
      />
    );

    expect(screen.getByText(/Show more excerpts/)).toBeInTheDocument();
  });

  it('expands to show more excerpts when button is clicked', () => {
    const manyResults = Array.from({ length: 15 }, (_, i) => ({
      id: `doc-${i}`,
      title: `Document ${i}`,
      content: `Configure workflow admin panel document management system approval ${i}`,
      excerpt: `Configure workflow admin panel ${i}`,
      score: 0.8,
      documentType: 'pdf' as const,
    }));

    render(
      <DocumentExcerptPanel
        answer={mockAnswer}
        searchResults={manyResults}
      />
    );

    const showMoreButton = screen.getByText(/Show more excerpts/);
    fireEvent.click(showMoreButton);

    // Should show more documents after clicking
    expect(screen.getByText('Document 10')).toBeInTheDocument();
  });

  it('displays page numbers and section titles when available', () => {
    renderComponent();

    expect(screen.getByText('Configuration • Page 15')).toBeInTheDocument();
    expect(screen.getByText('Advanced Features • Page 8')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    const { container } = renderComponent({ className: 'custom-class' });

    expect(container.firstChild).toHaveClass('custom-class');
  });
});