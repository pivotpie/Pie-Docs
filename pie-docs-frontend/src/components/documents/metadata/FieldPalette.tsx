import React from 'react';
import { useDrag } from 'react-dnd';
import { FieldType, FieldRenderer } from '../../../types/domain/MetadataSchema';
import {
  Type,
  Hash,
  Calendar,
  Clock,
  ToggleLeft,
  ChevronDown,
  CheckSquare,
  FileText,
  Image,
  Link,
  Mail,
  Phone,
  Palette,
  Code,
  ArrowRight
} from 'lucide-react';

interface FieldPaletteProps {
  onFieldDrag: (fieldType: FieldType) => void;
}

const fieldTypes: FieldRenderer[] = [
  {
    type: 'text',
    component: () => null,
    icon: 'Type',
    label: 'Text Input',
    description: 'Single line text input',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength', 'pattern']
  },
  {
    type: 'textarea',
    component: () => null,
    icon: 'FileText',
    label: 'Text Area',
    description: 'Multi-line text input',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required', 'minLength', 'maxLength']
  },
  {
    type: 'number',
    component: () => null,
    icon: 'Hash',
    label: 'Number',
    description: 'Numeric input field',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  {
    type: 'decimal',
    component: () => null,
    icon: 'Hash',
    label: 'Decimal',
    description: 'Decimal number input',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required', 'min', 'max']
  },
  {
    type: 'date',
    component: () => null,
    icon: 'Calendar',
    label: 'Date',
    description: 'Date picker field',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'datetime',
    component: () => null,
    icon: 'Clock',
    label: 'Date & Time',
    description: 'Date and time picker',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'time',
    component: () => null,
    icon: 'Clock',
    label: 'Time',
    description: 'Time picker field',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'boolean',
    component: () => null,
    icon: 'ToggleLeft',
    label: 'Boolean',
    description: 'True/false toggle',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'select',
    component: () => null,
    icon: 'ChevronDown',
    label: 'Dropdown',
    description: 'Single selection dropdown',
    defaultValidation: [],
    supportsOptions: true,
    supportsValidation: ['required']
  },
  {
    type: 'multiselect',
    component: () => null,
    icon: 'CheckSquare',
    label: 'Multi-Select',
    description: 'Multiple selection dropdown',
    defaultValidation: [],
    supportsOptions: true,
    supportsValidation: ['required']
  },
  {
    type: 'radio',
    component: () => null,
    icon: 'CheckSquare',
    label: 'Radio Group',
    description: 'Radio button selection',
    defaultValidation: [],
    supportsOptions: true,
    supportsValidation: ['required']
  },
  {
    type: 'checkbox',
    component: () => null,
    icon: 'CheckSquare',
    label: 'Checkbox Group',
    description: 'Multiple checkbox selection',
    defaultValidation: [],
    supportsOptions: true,
    supportsValidation: ['required']
  },
  {
    type: 'file',
    component: () => null,
    icon: 'FileText',
    label: 'File Upload',
    description: 'File attachment field',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'image',
    component: () => null,
    icon: 'Image',
    label: 'Image Upload',
    description: 'Image file upload',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'url',
    component: () => null,
    icon: 'Link',
    label: 'URL',
    description: 'Website URL input',
    defaultValidation: [
      {
        id: 'url-validation',
        type: 'url',
        message: 'Please enter a valid URL'
      }
    ],
    supportsOptions: false,
    supportsValidation: ['required', 'url']
  },
  {
    type: 'email',
    component: () => null,
    icon: 'Mail',
    label: 'Email',
    description: 'Email address input',
    defaultValidation: [
      {
        id: 'email-validation',
        type: 'email',
        message: 'Please enter a valid email address'
      }
    ],
    supportsOptions: false,
    supportsValidation: ['required', 'email']
  },
  {
    type: 'phone',
    component: () => null,
    icon: 'Phone',
    label: 'Phone',
    description: 'Phone number input',
    defaultValidation: [
      {
        id: 'phone-validation',
        type: 'phone',
        message: 'Please enter a valid phone number'
      }
    ],
    supportsOptions: false,
    supportsValidation: ['required', 'phone']
  },
  {
    type: 'color',
    component: () => null,
    icon: 'Palette',
    label: 'Color',
    description: 'Color picker field',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  },
  {
    type: 'json',
    component: () => null,
    icon: 'Code',
    label: 'JSON Data',
    description: 'Structured JSON input',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required', 'custom']
  },
  {
    type: 'reference',
    component: () => null,
    icon: 'ArrowRight',
    label: 'Reference',
    description: 'Reference to another document',
    defaultValidation: [],
    supportsOptions: false,
    supportsValidation: ['required']
  }
];

const iconComponents = {
  Type,
  FileText,
  Hash,
  Calendar,
  Clock,
  ToggleLeft,
  ChevronDown,
  CheckSquare,
  Image,
  Link,
  Mail,
  Phone,
  Palette,
  Code,
  ArrowRight
};

interface DraggableFieldProps {
  fieldType: FieldRenderer;
  onDrag: (fieldType: FieldType) => void;
}

const DraggableField: React.FC<DraggableFieldProps> = ({ fieldType, onDrag }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'FIELD',
    item: { fieldType: fieldType.type },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    end: (item, monitor) => {
      if (monitor.didDrop()) {
        onDrag(item.fieldType);
      }
    }
  });

  const IconComponent = iconComponents[fieldType.icon as keyof typeof iconComponents] || Type;

  return (
    <div
      ref={drag}
      className={`
        group cursor-move rounded-lg border-2 border-dashed border-gray-300
        bg-white p-3 transition-all hover:border-blue-400 hover:bg-blue-50
        ${isDragging ? 'opacity-50' : 'opacity-100'}
      `}
      onClick={() => onDrag(fieldType.type)}
    >
      <div className="flex items-start space-x-3">
        <div className="rounded-md bg-blue-100 p-2 group-hover:bg-blue-200">
          <IconComponent className="h-4 w-4 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-gray-900 group-hover:text-blue-900">
            {fieldType.label}
          </h4>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
            {fieldType.description}
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {fieldType.supportsOptions && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                Options
              </span>
            )}
            {fieldType.supportsValidation.length > 0 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                Validation
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FieldPalette: React.FC<FieldPaletteProps> = ({ onFieldDrag }) => {
  const basicFields = fieldTypes.filter(field =>
    ['text', 'textarea', 'number', 'date', 'boolean'].includes(field.type)
  );

  const advancedFields = fieldTypes.filter(field =>
    ['select', 'multiselect', 'radio', 'checkbox', 'file', 'image'].includes(field.type)
  );

  const specializedFields = fieldTypes.filter(field =>
    ['url', 'email', 'phone', 'color', 'json', 'reference'].includes(field.type)
  );

  return (
    <div className="h-full overflow-y-auto">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Field Types</h2>
        <p className="text-sm text-gray-600">
          Drag and drop fields to add them to your schema
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Fields */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
            Basic Fields
          </h3>
          <div className="space-y-2">
            {basicFields.map((fieldType) => (
              <DraggableField
                key={fieldType.type}
                fieldType={fieldType}
                onDrag={onFieldDrag}
              />
            ))}
          </div>
        </div>

        {/* Advanced Fields */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <div className="w-2 h-2 bg-green-600 rounded-full mr-2"></div>
            Selection Fields
          </h3>
          <div className="space-y-2">
            {advancedFields.map((fieldType) => (
              <DraggableField
                key={fieldType.type}
                fieldType={fieldType}
                onDrag={onFieldDrag}
              />
            ))}
          </div>
        </div>

        {/* Specialized Fields */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <div className="w-2 h-2 bg-purple-600 rounded-full mr-2"></div>
            Specialized Fields
          </h3>
          <div className="space-y-2">
            {specializedFields.map((fieldType) => (
              <DraggableField
                key={fieldType.type}
                fieldType={fieldType}
                onDrag={onFieldDrag}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Instructions</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Drag fields to the canvas to add them</li>
          <li>• Click on fields in the canvas to configure</li>
          <li>• Use the preview tab to test your schema</li>
          <li>• Save your schema when ready</li>
        </ul>
      </div>
    </div>
  );
};

export default FieldPalette;