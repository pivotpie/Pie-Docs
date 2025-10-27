import React, { useState, useCallback } from 'react';
import {
  PlusIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon,
  DocumentTextIcon,
  CalendarIcon,
  UserIcon,
  TagIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

interface SearchCriteria {
  id: string;
  field: 'content' | 'title' | 'author' | 'tags' | 'created_date' | 'modified_date' | 'file_type' | 'metadata';
  operator: 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
  value: string;
  connector: 'AND' | 'OR' | 'NOT';
}

interface SearchGroup {
  id: string;
  criteria: SearchCriteria[];
  connector: 'AND' | 'OR';
}

interface AdvancedSearchBuilderProps {
  onQueryBuild: (query: AdvancedSearchQuery) => void;
  onPreview: (query: string) => void;
  className?: string;
}

interface AdvancedSearchQuery {
  groups: SearchGroup[];
  naturalLanguage: string;
  elasticsearch: object;
}

const fieldOptions = [
  { value: 'content', label: 'Document Content', icon: DocumentTextIcon },
  { value: 'title', label: 'Title', icon: DocumentTextIcon },
  { value: 'author', label: 'Author', icon: UserIcon },
  { value: 'tags', label: 'Tags', icon: TagIcon },
  { value: 'created_date', label: 'Created Date', icon: CalendarIcon },
  { value: 'modified_date', label: 'Modified Date', icon: CalendarIcon },
  { value: 'file_type', label: 'File Type', icon: FunnelIcon },
  { value: 'metadata', label: 'Custom Metadata', icon: AdjustmentsHorizontalIcon }
];

const operatorOptions = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'equals', label: 'Equals' },
    { value: 'starts_with', label: 'Starts with' },
    { value: 'ends_with', label: 'Ends with' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' }
  ],
  date: [
    { value: 'equals', label: 'On' },
    { value: 'greater_than', label: 'After' },
    { value: 'less_than', label: 'Before' }
  ]
};

export const AdvancedSearchBuilder: React.FC<AdvancedSearchBuilderProps> = ({
  onQueryBuild,
  onPreview,
  className = ''
}) => {
  const [groups, setGroups] = useState<SearchGroup[]>([
    {
      id: `group-${Date.now()}`,
      criteria: [{
        id: `criteria-${Date.now()}`,
        field: 'content',
        operator: 'contains',
        value: '',
        connector: 'AND'
      }],
      connector: 'AND'
    }
  ]);

  const [showPreview, setShowPreview] = useState(false);

  const addCriteria = useCallback((groupId: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? {
            ...group,
            criteria: [...group.criteria, {
              id: `criteria-${Date.now()}`,
              field: 'content',
              operator: 'contains',
              value: '',
              connector: 'AND'
            }]
          }
        : group
    ));
  }, []);

  const removeCriteria = useCallback((groupId: string, criteriaId: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? {
            ...group,
            criteria: group.criteria.filter(c => c.id !== criteriaId)
          }
        : group
    ));
  }, []);

  const updateCriteria = useCallback((groupId: string, criteriaId: string, updates: Partial<SearchCriteria>) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? {
            ...group,
            criteria: group.criteria.map(c =>
              c.id === criteriaId ? { ...c, ...updates } : c
            )
          }
        : group
    ));
  }, []);

  const addGroup = useCallback(() => {
    setGroups(prev => [...prev, {
      id: `group-${Date.now()}`,
      criteria: [{
        id: `criteria-${Date.now()}`,
        field: 'content',
        operator: 'contains',
        value: '',
        connector: 'AND'
      }],
      connector: 'AND'
    }]);
  }, []);

  const removeGroup = useCallback((groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const updateGroupConnector = useCallback((groupId: string, connector: 'AND' | 'OR') => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, connector } : group
    ));
  }, []);

  const generateNaturalLanguage = useCallback((groups: SearchGroup[]): string => {
    const groupDescriptions = groups.map(group => {
      const criteriaDescriptions = group.criteria.map(criteria => {
        const field = fieldOptions.find(f => f.value === criteria.field)?.label || criteria.field;
        const operator = operatorOptions.text.find(o => o.value === criteria.operator)?.label || criteria.operator;
        return `${field} ${operator} "${criteria.value}"`;
      });

      return criteriaDescriptions.join(` ${group.connector} `);
    });

    return groupDescriptions.join(' AND ');
  }, []);

  const generateElasticsearchQuery = useCallback((groups: SearchGroup[]): object => {
    const mustClauses = groups.map(group => {
      const groupClauses = group.criteria.map(criteria => {
        switch (criteria.operator) {
          case 'contains':
            return { match: { [criteria.field]: criteria.value } };
          case 'equals':
            return { term: { [`${criteria.field}.keyword`]: criteria.value } };
          case 'starts_with':
            return { prefix: { [criteria.field]: criteria.value } };
          case 'ends_with':
            return { wildcard: { [criteria.field]: `*${criteria.value}` } };
          default:
            return { match: { [criteria.field]: criteria.value } };
        }
      });

      return group.connector === 'AND'
        ? { bool: { must: groupClauses } }
        : { bool: { should: groupClauses } };
    });

    return {
      query: {
        bool: {
          must: mustClauses
        }
      }
    };
  }, []);

  const handleBuildQuery = useCallback(() => {
    const query: AdvancedSearchQuery = {
      groups,
      naturalLanguage: generateNaturalLanguage(groups),
      elasticsearch: generateElasticsearchQuery(groups)
    };

    onQueryBuild(query);
    onPreview(query.naturalLanguage);
  }, [groups, generateNaturalLanguage, generateElasticsearchQuery, onQueryBuild, onPreview]);

  const getOperatorOptions = (field: string) => {
    return field === 'created_date' || field === 'modified_date'
      ? operatorOptions.date
      : operatorOptions.text;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <AdjustmentsHorizontalIcon className="h-5 w-5 mr-2 text-blue-600" />
            Advanced Search Builder
          </h3>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
        </div>
      </div>

      {showPreview && (
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="text-sm text-gray-600 mb-2">Natural Language Query:</div>
          <div className="text-sm font-mono bg-white p-3 rounded border">
            {generateNaturalLanguage(groups) || 'Build your query using the criteria below...'}
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">
        {groups.map((group, groupIndex) => (
          <div key={group.id} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Group {groupIndex + 1}</span>
                <select
                  value={group.connector}
                  onChange={(e) => updateGroupConnector(group.id, e.target.value as 'AND' | 'OR')}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
              {groups.length > 1 && (
                <button
                  onClick={() => removeGroup(group.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {group.criteria.map((criteria, criteriaIndex) => (
                <div key={criteria.id} className="flex items-center space-x-2">
                  {criteriaIndex > 0 && (
                    <select
                      value={criteria.connector}
                      onChange={(e) => updateCriteria(group.id, criteria.id, { connector: e.target.value as 'AND' | 'OR' | 'NOT' })}
                      className="text-sm border border-gray-300 rounded px-2 py-1 w-16"
                    >
                      <option value="AND">AND</option>
                      <option value="OR">OR</option>
                      <option value="NOT">NOT</option>
                    </select>
                  )}

                  <select
                    value={criteria.field}
                    onChange={(e) => updateCriteria(group.id, criteria.id, { field: e.target.value as any })}
                    className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                  >
                    {fieldOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={criteria.operator}
                    onChange={(e) => updateCriteria(group.id, criteria.id, { operator: e.target.value as any })}
                    className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                  >
                    {getOperatorOptions(criteria.field).map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  {!['is_empty', 'is_not_empty'].includes(criteria.operator) && (
                    <input
                      type={criteria.field.includes('date') ? 'date' : 'text'}
                      value={criteria.value}
                      onChange={(e) => updateCriteria(group.id, criteria.id, { value: e.target.value })}
                      placeholder="Enter value..."
                      className="border border-gray-300 rounded px-3 py-2 text-sm flex-1"
                    />
                  )}

                  {group.criteria.length > 1 && (
                    <button
                      onClick={() => removeCriteria(group.id, criteria.id)}
                      className="text-red-600 hover:text-red-700 p-1"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => addCriteria(group.id)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Criteria
              </button>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            onClick={addGroup}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Add Group
          </button>

          <div className="flex space-x-3">
            <button
              onClick={() => onPreview(generateNaturalLanguage(groups))}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
            >
              Preview Query
            </button>
            <button
              onClick={handleBuildQuery}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Build & Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSearchBuilder;