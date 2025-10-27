import React from 'react';
import type { MetadataField } from '@/services/api/metadataSchemaService';

interface DynamicMetadataFormProps {
  fields: MetadataField[];
  metadata: Record<string, any>;
  onChange: (fieldName: string, value: any) => void;
  errors?: Record<string, string>;
}

export const DynamicMetadataForm: React.FC<DynamicMetadataFormProps> = ({
  fields,
  metadata,
  onChange,
  errors = {}
}) => {
  // Group fields by group_name
  const groupedFields = fields.reduce((acc, field) => {
    const group = field.group_name || 'General';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(field);
    return acc;
  }, {} as Record<string, MetadataField[]>);

  // Sort fields within groups by display_order
  Object.keys(groupedFields).forEach(group => {
    groupedFields[group].sort((a, b) => a.display_order - b.display_order);
  });

  const renderField = (field: MetadataField) => {
    const value = metadata[field.field_name] || field.default_value || '';
    const error = errors[field.field_name];
    const widthClass = getWidthClass(field.display_width);

    const commonClasses = `px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
      error ? 'border-red-500' : 'border-gray-300'
    }`;

    return (
      <div key={field.id} className={widthClass}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {field.field_label}
          {field.is_required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {field.description && (
          <p className="text-xs text-gray-500 mb-2">{field.description}</p>
        )}

        {renderFieldInput(field, value, commonClasses)}

        {field.help_text && (
          <p className="text-xs text-gray-500 mt-1">{field.help_text}</p>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}
      </div>
    );
  };

  const renderFieldInput = (field: MetadataField, value: any, commonClasses: string) => {
    switch (field.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
            pattern={field.pattern || undefined}
            required={field.is_required}
            className={`w-full ${commonClasses}`}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => onChange(field.field_name, parseFloat(e.target.value))}
            placeholder={field.placeholder || ''}
            min={field.min_value || undefined}
            max={field.max_value || undefined}
            required={field.is_required}
            className={`w-full ${commonClasses}`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(field.field_name, e.target.value)}
            required={field.is_required}
            className={`w-full ${commonClasses}`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => onChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            minLength={field.min_length || undefined}
            maxLength={field.max_length || undefined}
            required={field.is_required}
            rows={4}
            className={`w-full ${commonClasses}`}
          />
        );

      case 'dropdown':
        return (
          <select
            value={value}
            onChange={(e) => onChange(field.field_name, e.target.value)}
            required={field.is_required}
            className={`w-full ${commonClasses}`}
          >
            <option value="">Select {field.field_label}</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <select
            multiple
            value={Array.isArray(value) ? value : []}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value);
              onChange(field.field_name, selected);
            }}
            required={field.is_required}
            className={`w-full ${commonClasses}`}
            size={Math.min(field.options?.length || 5, 5)}
          >
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(field.field_name, e.target.checked)}
              required={field.is_required}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              {field.placeholder || field.field_label}
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(field.field_name, e.target.value)}
            placeholder={field.placeholder || ''}
            className={`w-full ${commonClasses}`}
          />
        );
    }
  };

  const getWidthClass = (displayWidth: string): string => {
    switch (displayWidth) {
      case 'full':
        return 'w-full';
      case 'half':
        return 'w-full md:w-1/2';
      case 'third':
        return 'w-full md:w-1/3';
      case 'quarter':
        return 'w-full md:w-1/4';
      default:
        return 'w-full';
    }
  };

  if (fields.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No metadata fields defined for this document type
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedFields).map(([groupName, groupFields]) => (
        <div key={groupName} className="space-y-4">
          {Object.keys(groupedFields).length > 1 && (
            <h4 className="text-md font-medium text-gray-900 border-b pb-2">
              {groupName}
            </h4>
          )}
          <div className="flex flex-wrap gap-4">
            {groupFields.map(renderField)}
          </div>
        </div>
      ))}
    </div>
  );
};
