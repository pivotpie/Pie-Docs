import React, { useCallback } from 'react';
import { useDrop } from 'react-dnd';
import {
  MetadataSchema,
  MetadataField,
  FieldType,
  FieldGroup
} from '../../../types/domain/MetadataSchema';
import FieldCard from './FieldCard';
import GroupContainer from './GroupContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Plus, Settings, Trash2, Move } from 'lucide-react';

interface SchemaCanvasProps {
  schema: MetadataSchema | null;
  selectedField: MetadataField | null;
  onFieldAdd: (fieldType: FieldType, position?: { x: number; y: number }) => void;
  onFieldUpdate: (fieldId: string, updates: Partial<MetadataField>) => void;
  onFieldDelete: (fieldId: string) => void;
  onFieldSelect: (field: MetadataField | null) => void;
  onSchemaUpdate: (updates: Partial<MetadataSchema>) => void;
}

const SchemaCanvas: React.FC<SchemaCanvasProps> = ({
  schema,
  selectedField,
  onFieldAdd,
  onFieldUpdate,
  onFieldDelete,
  onFieldSelect,
  onSchemaUpdate
}) => {
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'FIELD',
    drop: (item: { fieldType: FieldType }, monitor) => {
      const offset = monitor.getDropResult();
      onFieldAdd(item.fieldType, offset ? { x: offset.x, y: offset.y } : undefined);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  const handleAddGroup = useCallback(() => {
    if (!schema) return;

    const newGroup: FieldGroup = {
      id: `group_${Date.now()}`,
      name: `group_${schema.groups.length + 1}`,
      label: `Group ${schema.groups.length + 1}`,
      description: '',
      collapsible: true,
      collapsed: false,
      order: schema.groups.length
    };

    onSchemaUpdate({
      groups: [...schema.groups, newGroup]
    });
  }, [schema, onSchemaUpdate]);

  const handleGroupUpdate = useCallback((groupId: string, updates: Partial<FieldGroup>) => {
    if (!schema) return;

    const updatedGroups = schema.groups.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    );

    onSchemaUpdate({ groups: updatedGroups });
  }, [schema, onSchemaUpdate]);

  const handleGroupDelete = useCallback((groupId: string) => {
    if (!schema) return;

    // Move fields from deleted group to default group
    const updatedFields = schema.fields.map(field =>
      field.groupId === groupId ? { ...field, groupId: 'default' } : field
    );

    const updatedGroups = schema.groups.filter(group => group.id !== groupId);

    onSchemaUpdate({
      groups: updatedGroups,
      fields: updatedFields
    });
  }, [schema, onSchemaUpdate]);

  const handleFieldMove = useCallback((fieldId: string, newGroupId: string, newOrder: number) => {
    if (!schema) return;

    const field = schema.fields.find(f => f.id === fieldId);
    if (!field) return;

    // Update field's group and order
    const updatedFields = schema.fields.map(f => {
      if (f.id === fieldId) {
        return { ...f, groupId: newGroupId, order: newOrder };
      }
      // Adjust order of other fields in the same group
      if (f.groupId === newGroupId && f.order >= newOrder) {
        return { ...f, order: f.order + 1 };
      }
      return f;
    });

    onSchemaUpdate({ fields: updatedFields });
  }, [schema, onSchemaUpdate]);

  const groupedFields = React.useMemo(() => {
    if (!schema) return {};

    return schema.fields.reduce((acc, field) => {
      const groupId = field.groupId || 'default';
      if (!acc[groupId]) {
        acc[groupId] = [];
      }
      acc[groupId].push(field);
      return acc;
    }, {} as Record<string, MetadataField[]>);
  }, [schema]);

  if (!schema) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <Settings className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No schema selected</p>
        </div>
      </div>
    );
  }

  const sortedGroups = [...schema.groups].sort((a, b) => a.order - b.order);

  return (
    <div className="h-full flex flex-col">
      {/* Schema Header */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Schema Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Schema Name
              </label>
              <Input
                value={schema.name}
                onChange={(e) => onSchemaUpdate({ name: e.target.value })}
                placeholder="Enter schema name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Version
              </label>
              <Input
                value={schema.version}
                onChange={(e) => onSchemaUpdate({ version: e.target.value })}
                placeholder="1.0.0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <Textarea
              value={schema.description || ''}
              onChange={(e) => onSchemaUpdate({ description: e.target.value })}
              placeholder="Describe the purpose of this schema"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Canvas Area */}
      <div
        ref={drop}
        className={`
          flex-1 min-h-96 border-2 border-dashed rounded-lg p-4 overflow-y-auto
          ${isOver && canDrop ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${canDrop ? 'border-blue-300' : ''}
        `}
      >
        {isOver && canDrop && (
          <div className="absolute inset-4 flex items-center justify-center pointer-events-none z-10">
            <div className="bg-blue-100 border-2 border-blue-400 border-dashed rounded-lg p-8">
              <p className="text-blue-700 font-medium">Drop field here to add it to the schema</p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* Groups */}
          {sortedGroups.map((group) => {
            const groupFields = groupedFields[group.id] || [];
            const sortedGroupFields = [...groupFields].sort((a, b) => a.order - b.order);

            return (
              <GroupContainer
                key={group.id}
                group={group}
                fields={sortedGroupFields}
                selectedField={selectedField}
                onGroupUpdate={handleGroupUpdate}
                onGroupDelete={handleGroupDelete}
                onFieldSelect={onFieldSelect}
                onFieldUpdate={onFieldUpdate}
                onFieldDelete={onFieldDelete}
                onFieldMove={handleFieldMove}
                canDelete={group.id !== 'default'}
              />
            );
          })}

          {/* Add Group Button */}
          <div className="flex justify-center pt-4">
            <Button
              variant="outline"
              onClick={handleAddGroup}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Group
            </Button>
          </div>

          {/* Empty State */}
          {schema.fields.length === 0 && (
            <div className="text-center py-12">
              <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No fields added yet
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Drag fields from the palette on the left to start building your schema
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={() => onFieldAdd('text')}
                  variant="outline"
                  size="sm"
                >
                  Add Text Field
                </Button>
                <Button
                  onClick={() => onFieldAdd('select')}
                  variant="outline"
                  size="sm"
                >
                  Add Dropdown
                </Button>
                <Button
                  onClick={() => onFieldAdd('date')}
                  variant="outline"
                  size="sm"
                >
                  Add Date Field
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500 bg-white p-3 rounded-lg border">
        <div className="flex items-center gap-4">
          <span>Fields: {schema.fields.length}</span>
          <span>Groups: {schema.groups.length}</span>
          <span>Version: {schema.version}</span>
        </div>
        <div className="flex items-center gap-2">
          {selectedField && (
            <span className="text-blue-600 font-medium">
              Selected: {selectedField.label}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SchemaCanvas;