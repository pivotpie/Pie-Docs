import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  WidgetConfigPanelProps,
  ConfigProperty,
  WidgetConfigSchema
} from '@/types/domain/DashboardBuilder';

const WidgetConfigPanel: React.FC<WidgetConfigPanelProps> = ({
  widget,
  template,
  onConfigChange,
  onClose
}) => {
  const { t } = useTranslation('dashboard');
  const [config, setConfig] = useState(widget.config);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setConfig(widget.config);
  }, [widget.config]);

  const handleChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);

    // Clear error for this field
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: '' }));
    }
  };

  const handleSave = () => {
    const validationErrors = validateConfig(config, template.configSchema);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    onConfigChange(config);
    onClose();
  };

  const validateConfig = (config: Record<string, any>, schema: WidgetConfigSchema): Record<string, string> => {
    const errors: Record<string, string> = {};

    // Check required fields
    if (schema.required) {
      schema.required.forEach(field => {
        if (!config[field] || (Array.isArray(config[field]) && config[field].length === 0)) {
          errors[field] = `${field} is required`;
        }
      });
    }

    // Validate field types and constraints
    Object.entries(schema.properties).forEach(([key, property]) => {
      const value = config[key];

      if (value !== undefined && value !== null) {
        const error = validateProperty(value, property);
        if (error) {
          errors[key] = error;
        }
      }
    });

    return errors;
  };

  const validateProperty = (value: any, property: ConfigProperty): string | null => {
    switch (property.type) {
      case 'number':
        if (typeof value !== 'number') return 'Must be a number';
        if (property.minimum !== undefined && value < property.minimum) {
          return `Must be at least ${property.minimum}`;
        }
        if (property.maximum !== undefined && value > property.maximum) {
          return `Must be at most ${property.maximum}`;
        }
        break;

      case 'string':
        if (typeof value !== 'string') return 'Must be a string';
        break;

      case 'boolean':
        if (typeof value !== 'boolean') return 'Must be true or false';
        break;

      case 'array':
      case 'multiselect':
        if (!Array.isArray(value)) return 'Must be an array';
        break;
    }

    return null;
  };

  const renderField = (key: string, property: ConfigProperty) => {
    const value = config[key] ?? property.default;
    const hasError = !!errors[key];

    const baseClasses = `w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
      hasError
        ? 'border-red-300 dark:border-red-600'
        : 'border-gray-300 dark:border-gray-600'
    }`;

    switch (property.type) {
      case 'string':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={baseClasses}
            placeholder={property.description}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => handleChange(key, Number(e.target.value))}
            className={baseClasses}
            min={property.minimum}
            max={property.maximum}
            placeholder={property.description}
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleChange(key, e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {property.description || property.title}
            </span>
          </label>
        );

      case 'select':
        return (
          <select
            value={value || ''}
            onChange={(e) => handleChange(key, e.target.value)}
            className={baseClasses}
          >
            <option value="">Select an option...</option>
            {property.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {property.options?.map((option) => (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={(e) => {
                    const currentValues = value || [];
                    const newValues = e.target.checked
                      ? [...currentValues, option.value]
                      : currentValues.filter((v: any) => v !== option.value);
                    handleChange(key, newValues);
                  }}
                  className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        );

      case 'array':
        return (
          <div className="space-y-2">
            {(value || []).map((item: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newArray = [...(value || [])];
                    newArray[index] = e.target.value;
                    handleChange(key, newArray);
                  }}
                  className={baseClasses}
                />
                <button
                  onClick={() => {
                    const newArray = (value || []).filter((_: any, i: number) => i !== index);
                    handleChange(key, newArray);
                  }}
                  className="p-2 text-red-500 hover:text-red-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              onClick={() => handleChange(key, [...(value || []), ''])}
              className="inline-flex items-center px-3 py-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Item
            </button>
          </div>
        );

      default:
        return (
          <input
            type="text"
            value={JSON.stringify(value) || ''}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange(key, parsed);
              } catch {
                // Invalid JSON, keep as string
                handleChange(key, e.target.value);
              }
            }}
            className={baseClasses}
            placeholder="JSON value"
          />
        );
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 z-50 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Configure Widget
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {template.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-6">
          {/* Widget Info */}
          <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-2xl">{template.icon}</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {template.name}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <span className="capitalize">{template.defaultSize}</span>
              <span className="capitalize">{template.category}</span>
              <span>{template.isCustom ? 'Custom' : 'Built-in'}</span>
            </div>
          </div>

          {/* Configuration Fields */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Configuration
            </h4>

            {Object.entries(template.configSchema.properties).map(([key, property]) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {property.title}
                  {template.configSchema.required?.includes(key) && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>

                {property.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {property.description}
                  </p>
                )}

                {renderField(key, property)}

                {errors[key] && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {errors[key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Advanced Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 dark:text-white">
              Advanced Settings
            </h4>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Widget Title
              </label>
              <input
                type="text"
                value={widget.title}
                onChange={(e) => onConfigChange({ title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                value={(widget.refreshInterval || 300000) / 1000}
                onChange={(e) => onConfigChange({ refreshInterval: Number(e.target.value) * 1000 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                min="30"
                max="3600"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="widget-visible"
                checked={widget.isVisible}
                onChange={(e) => onConfigChange({ isVisible: e.target.checked })}
                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
              />
              <label htmlFor="widget-visible" className="text-sm text-gray-700 dark:text-gray-300">
                Widget is visible
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default WidgetConfigPanel;