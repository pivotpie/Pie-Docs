import React, { useState, useCallback, useMemo } from 'react';
import type { SearchFilters } from '@/types/domain/Search';

interface MetadataFilterBuilderProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  availableFields?: Record<string, any[]>;
  isOpen: boolean;
  onClose: () => void;
}

interface MetadataField {
  key: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  label: string;
  options?: string[];
}

export const MetadataFilterBuilder: React.FC<MetadataFilterBuilderProps> = ({
  filters,
  onFiltersChange,
  availableFields = {},
  isOpen,
  onClose
}) => {
  const [selectedField, setSelectedField] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [operator, setOperator] = useState<string>('equals');

  // Detect field types and available values from the available fields data
  const metadataFields = useMemo<MetadataField[]>(() => {
    const fields: MetadataField[] = [];

    // Common metadata fields that are often searchable
    const commonFields = [
      { key: 'category', type: 'select' as const, label: 'Category' },
      { key: 'priority', type: 'select' as const, label: 'Priority' },
      { key: 'department', type: 'select' as const, label: 'Department' },
      { key: 'project', type: 'text' as const, label: 'Project' },
      { key: 'version', type: 'text' as const, label: 'Version' },
      { key: 'language', type: 'select' as const, label: 'Language' },
      { key: 'classification', type: 'select' as const, label: 'Classification' },
      { key: 'cost_center', type: 'text' as const, label: 'Cost Center' },
      { key: 'client', type: 'text' as const, label: 'Client' },
      { key: 'contract_number', type: 'text' as const, label: 'Contract Number' },
    ];

    // Add detected fields from available data
    Object.entries(availableFields).forEach(([key, values]) => {
      const existingField = commonFields.find(f => f.key === key);
      if (existingField) {
        fields.push({
          ...existingField,
          options: values.map(String)
        });
      } else {
        // Auto-detect field type based on values
        const sampleValues = values.slice(0, 10);
        const isNumeric = sampleValues.every(v => !isNaN(Number(v)));
        const isBoolean = sampleValues.every(v =>
          typeof v === 'boolean' || ['true', 'false', '1', '0'].includes(String(v).toLowerCase())
        );
        const hasLimitedOptions = values.length <= 20;

        fields.push({
          key,
          type: isBoolean ? 'boolean' : isNumeric ? 'number' : hasLimitedOptions ? 'select' : 'text',
          label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          options: hasLimitedOptions ? values.map(String) : undefined
        });
      }
    });

    // Add common fields even if not in available data
    commonFields.forEach(field => {
      if (!fields.find(f => f.key === field.key)) {
        fields.push(field);
      }
    });

    return fields.sort((a, b) => a.label.localeCompare(b.label));
  }, [availableFields]);

  const selectedFieldConfig = useMemo(() => {
    return metadataFields.find(field => field.key === selectedField);
  }, [metadataFields, selectedField]);

  const handleAddFilter = useCallback(() => {
    if (!selectedField || !filterValue.trim()) return;

    const currentMetadata = filters.customMetadata || {};

    // Convert value based on field type
    let processedValue: any = filterValue.trim();
    if (selectedFieldConfig?.type === 'number') {
      processedValue = Number(processedValue);
    } else if (selectedFieldConfig?.type === 'boolean') {
      processedValue = ['true', '1', 'yes'].includes(processedValue.toLowerCase());
    }

    // Handle different operators
    let finalValue = processedValue;
    if (operator === 'contains' && selectedFieldConfig?.type === 'text') {
      finalValue = `*${processedValue}*`; // Wildcard search
    } else if (operator === 'starts_with' && selectedFieldConfig?.type === 'text') {
      finalValue = `${processedValue}*`;
    } else if (operator === 'ends_with' && selectedFieldConfig?.type === 'text') {
      finalValue = `*${processedValue}`;
    }

    const newMetadata = {
      ...currentMetadata,
      [selectedField]: finalValue
    };

    onFiltersChange({
      ...filters,
      customMetadata: newMetadata
    });

    // Reset form
    setSelectedField('');
    setFilterValue('');
    setOperator('equals');
  }, [selectedField, filterValue, operator, filters, onFiltersChange, selectedFieldConfig]);

  const getOperatorOptions = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'contains', label: 'Contains' },
          { value: 'starts_with', label: 'Starts with' },
          { value: 'ends_with', label: 'Ends with' },
        ];
      case 'number':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'greater_than', label: 'Greater than' },
          { value: 'less_than', label: 'Less than' },
          { value: 'between', label: 'Between' },
        ];
      case 'select':
      case 'boolean':
      default:
        return [
          { value: 'equals', label: 'Equals' },
        ];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Add Metadata Filter
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metadata Field
            </label>
            <select
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setFilterValue('');
                setOperator('equals');
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a field...</option>
              {metadataFields.map(field => (
                <option key={field.key} value={field.key}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Selection */}
          {selectedFieldConfig && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Condition
              </label>
              <select
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {getOperatorOptions(selectedFieldConfig.type).map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Value Input */}
          {selectedFieldConfig && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Value
              </label>

              {selectedFieldConfig.type === 'select' && selectedFieldConfig.options ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a value...</option>
                  {selectedFieldConfig.options.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : selectedFieldConfig.type === 'boolean' ? (
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select...</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type={selectedFieldConfig.type === 'number' ? 'number' : 'text'}
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder={`Enter ${selectedFieldConfig.label.toLowerCase()}...`}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          )}

          {/* Help Text */}
          {selectedFieldConfig && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <p>
                {selectedFieldConfig.type === 'text' && operator === 'contains' &&
                  'Use wildcards: "report" will match "Annual Report 2024"'
                }
                {selectedFieldConfig.type === 'number' && operator === 'between' &&
                  'Use format: min-max (e.g., 100-500)'
                }
                {selectedFieldConfig.type === 'select' &&
                  'Select from available values in your documents'
                }
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                     bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600
                     rounded-md hover:bg-gray-50 dark:hover:bg-gray-600
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleAddFilter}
            disabled={!selectedField || !filterValue.trim()}
            className="px-4 py-2 text-sm font-medium text-white
                     bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed
                     rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:hover:bg-gray-400"
          >
            Add Filter
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataFilterBuilder;