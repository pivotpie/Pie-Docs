import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store';
import type {
  RoutingRule,
  RoutingCondition,
  ApprovalChain,
} from '@/store/slices/approvalsSlice';
import {
  routeDocument,
  addRoutingRule,
  updateRoutingRule,
  deleteRoutingRule,
} from '@/store/slices/approvalsSlice';

interface Document {
  id: string;
  title: string;
  type: string;
  metadata: Record<string, any>;
  value?: number;
  department?: string;
  confidentiality?: string;
}

interface RoutingEngineProps {
  document?: Document;
  onRouteComplete?: (chainId: string) => void;
  showRuleBuilder?: boolean;
}

const RoutingEngine: React.FC<RoutingEngineProps> = ({
  document,
  onRouteComplete,
  showRuleBuilder = false,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { routingRules, approvalChains } = useSelector((state: RootState) => state.approvals);

  const [selectedChain, setSelectedChain] = useState<string>('');
  const [routingResult, setRoutingResult] = useState<{
    chainId: string;
    chainName: string;
    reason: string;
  } | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);

  // Rule builder state
  const [ruleName, setRuleName] = useState('');
  const [ruleDescription, setRuleDescription] = useState('');
  const [conditions, setConditions] = useState<RoutingCondition[]>([]);
  const [targetChainId, setTargetChainId] = useState('');
  const [rulePriority, setRulePriority] = useState(1);

  useEffect(() => {
    if (document) {
      const result = evaluateRoutingRules(document);
      setRoutingResult(result);
    }
  }, [document, routingRules]);

  const evaluateRoutingRules = (doc: Document) => {
    // Sort rules by priority (highest first)
    const sortedRules = [...routingRules]
      .filter(rule => rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (evaluateConditions(rule.conditions, doc)) {
        const chain = approvalChains.find(chain => chain.id === rule.targetChainId);
        return {
          chainId: rule.targetChainId,
          chainName: chain?.name || 'Unknown Chain',
          reason: `Matched rule: ${rule.name}`,
        };
      }
    }

    // Default routing based on document type
    const defaultChain = getDefaultChainForDocumentType(doc.type);
    return {
      chainId: defaultChain.id,
      chainName: defaultChain.name,
      reason: 'Default routing for document type',
    };
  };

  const evaluateConditions = (conditions: RoutingCondition[], doc: Document): boolean => {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogicalOperator: 'AND' | 'OR' = 'AND';

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = evaluateSingleCondition(condition, doc);

      if (i === 0) {
        result = conditionResult;
      } else {
        if (currentLogicalOperator === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }

      // Set logical operator for next iteration
      if (condition.logicalOperator) {
        currentLogicalOperator = condition.logicalOperator;
      }
    }

    return result;
  };

  const evaluateSingleCondition = (condition: RoutingCondition, doc: Document): boolean => {
    const fieldValue = getFieldValue(condition.field, doc);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  };

  const getFieldValue = (field: string, doc: Document): any => {
    switch (field) {
      case 'type':
        return doc.type;
      case 'title':
        return doc.title;
      case 'value':
        return doc.value;
      case 'department':
        return doc.department;
      case 'confidentiality':
        return doc.confidentiality;
      default:
        return doc.metadata[field];
    }
  };

  const getDefaultChainForDocumentType = (documentType: string) => {
    const defaultChains = {
      'contract': approvalChains.find(chain => chain.name.includes('Contract')) || approvalChains[0],
      'policy': approvalChains.find(chain => chain.name.includes('Policy')) || approvalChains[0],
      'procedure': approvalChains.find(chain => chain.name.includes('Procedure')) || approvalChains[0],
      'report': approvalChains.find(chain => chain.name.includes('Report')) || approvalChains[0],
      'proposal': approvalChains.find(chain => chain.name.includes('Proposal')) || approvalChains[0],
    };

    return defaultChains[documentType as keyof typeof defaultChains] || approvalChains[0] || {
      id: 'default',
      name: 'Standard Approval',
    };
  };

  const handleRouteDocument = async () => {
    if (!document || !selectedChain) return;

    try {
      await dispatch(routeDocument({
        documentId: document.id,
        chainId: selectedChain,
        priority: document.metadata?.priority || 'medium',
        metadata: document.metadata || {}
      }));

      if (onRouteComplete) {
        onRouteComplete(selectedChain);
      }

      alert('Document routed successfully!');
    } catch (error) {
      console.error('Failed to route document:', error);
      alert('Failed to route document. Please try again.');
    }
  };

  const handleAddCondition = () => {
    setConditions(prev => [...prev, {
      field: 'type',
      operator: 'equals',
      value: '',
      logicalOperator: prev.length > 0 ? 'AND' : undefined,
    }]);
  };

  const handleUpdateCondition = (index: number, updatedCondition: Partial<RoutingCondition>) => {
    setConditions(prev =>
      prev.map((condition, i) =>
        i === index ? { ...condition, ...updatedCondition } : condition
      )
    );
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveRule = async () => {
    if (!ruleName || !targetChainId) {
      alert('Please provide rule name and target chain');
      return;
    }

    const rule: RoutingRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      name: ruleName,
      description: ruleDescription,
      conditions,
      targetChainId,
      priority: rulePriority,
      isActive: true,
    };

    try {
      if (editingRule) {
        await dispatch(updateRoutingRule(rule));
        alert('Routing rule updated successfully!');
      } else {
        await dispatch(addRoutingRule(rule));
        alert('Routing rule created successfully!');
      }

      resetRuleForm();
    } catch (error) {
      console.error('Failed to save routing rule:', error);
      alert('Failed to save routing rule. Please try again.');
    }
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleDescription(rule.description);
    setConditions(rule.conditions);
    setTargetChainId(rule.targetChainId);
    setRulePriority(rule.priority);
    setShowRuleForm(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (confirm('Are you sure you want to delete this routing rule?')) {
      try {
        await dispatch(deleteRoutingRule(ruleId));
      } catch (error) {
        console.error('Failed to delete routing rule:', error);
      }
    }
  };

  const resetRuleForm = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleDescription('');
    setConditions([]);
    setTargetChainId('');
    setRulePriority(1);
    setShowRuleForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Document Routing Section */}
      {document && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Document Routing</h3>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Document Information</h4>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Title:</span> {document.title}</p>
                <p><span className="font-medium">Type:</span> {document.type}</p>
                <p><span className="font-medium">Department:</span> {document.department || 'N/A'}</p>
                <p><span className="font-medium">Value:</span> {document.value ? `$${document.value.toLocaleString()}` : 'N/A'}</p>
                <p><span className="font-medium">Confidentiality:</span> {document.confidentiality || 'Standard'}</p>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Routing Result</h4>
              {routingResult ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm font-medium text-blue-900">{routingResult.chainName}</p>
                  <p className="text-xs text-blue-700 mt-1">{routingResult.reason}</p>
                  <button
                    onClick={() => setSelectedChain(routingResult.chainId)}
                    className="mt-2 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Use This Chain
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No routing rules matched</p>
              )}
            </div>
          </div>

          {/* Manual Chain Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Select Approval Chain (Override)
            </label>
            <div className="flex space-x-3">
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose approval chain...</option>
                {approvalChains.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({chain.steps.length} steps)
                  </option>
                ))}
              </select>
              <button
                onClick={handleRouteDocument}
                disabled={!selectedChain}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Route Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Routing Rules Management */}
      {showRuleBuilder && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Routing Rules</h3>
            <button
              onClick={() => setShowRuleForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add New Rule
            </button>
          </div>

          {/* Existing Rules */}
          <div className="space-y-3 mb-6">
            {routingRules.map(rule => (
              <div key={rule.id} className="p-4 border border-gray-200 rounded-md">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Priority: {rule.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                    <div className="text-xs text-gray-500 mt-2">
                      <span className="font-medium">Target:</span> {
                        approvalChains.find(chain => chain.id === rule.targetChainId)?.name || 'Unknown Chain'
                      }
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="font-medium">Conditions:</span> {rule.conditions.length} condition(s)
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {routingRules.length === 0 && (
              <p className="text-center text-gray-500 py-8">
                No routing rules configured. Add your first rule to get started.
              </p>
            )}
          </div>

          {/* Rule Builder Form */}
          {showRuleForm && (
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">
                {editingRule ? 'Edit' : 'Create'} Routing Rule
              </h4>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      value={ruleName}
                      onChange={(e) => setRuleName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., High Value Contract Routing"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Priority
                    </label>
                    <input
                      type="number"
                      value={rulePriority}
                      onChange={(e) => setRulePriority(Number(e.target.value))}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={ruleDescription}
                    onChange={(e) => setRuleDescription(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe when this rule should apply..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Approval Chain
                  </label>
                  <select
                    value={targetChainId}
                    onChange={(e) => setTargetChainId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select approval chain...</option>
                    {approvalChains.map(chain => (
                      <option key={chain.id} value={chain.id}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Conditions Builder */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Conditions
                    </label>
                    <button
                      onClick={handleAddCondition}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Add Condition
                    </button>
                  </div>

                  <div className="space-y-3">
                    {conditions.map((condition, index) => (
                      <div key={index} className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                        {index > 0 && (
                          <select
                            value={condition.logicalOperator || 'AND'}
                            onChange={(e) => handleUpdateCondition(index, {
                              logicalOperator: e.target.value as 'AND' | 'OR'
                            })}
                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}

                        <select
                          value={condition.field}
                          onChange={(e) => handleUpdateCondition(index, { field: e.target.value })}
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value="type">Document Type</option>
                          <option value="value">Document Value</option>
                          <option value="department">Department</option>
                          <option value="confidentiality">Confidentiality</option>
                          <option value="title">Title</option>
                        </select>

                        <select
                          value={condition.operator}
                          onChange={(e) => handleUpdateCondition(index, {
                            operator: e.target.value as RoutingCondition['operator']
                          })}
                          className="px-2 py-1 text-xs border border-gray-300 rounded"
                        >
                          <option value="equals">Equals</option>
                          <option value="contains">Contains</option>
                          <option value="greater_than">Greater Than</option>
                          <option value="less_than">Less Than</option>
                          <option value="in">In List</option>
                          <option value="not_in">Not In List</option>
                        </select>

                        <input
                          type="text"
                          value={condition.value}
                          onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                          placeholder="Value..."
                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
                        />

                        <button
                          onClick={() => handleRemoveCondition(index)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {conditions.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No conditions set. This rule will apply to all documents.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-3">
                  <button
                    onClick={resetRuleForm}
                    className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveRule}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingRule ? 'Update' : 'Create'} Rule
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutingEngine;