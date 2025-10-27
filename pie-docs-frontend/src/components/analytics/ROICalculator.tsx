import React, { useState, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import type { ROICalculation } from '@/types/domain/ExecutiveAnalytics';

export interface ROICalculatorProps {
  calculation?: ROICalculation;
  loading?: boolean;
  onParametersChange?: (parameters: Record<string, number>) => void;
  className?: string;
}

interface ROIParameters {
  implementationCost: number;
  operationalCostReduction: number;
  productivityGain: number;
  complianceSavings: number;
  storageSavings: number;
  timeValue: number; // hourly rate
  timeSavedHours: number;
}

const ROICalculator: React.FC<ROICalculatorProps> = ({
  calculation,
  loading = false,
  onParametersChange,
  className = '',
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [parameters, setParameters] = useState<ROIParameters>({
    implementationCost: 150000,
    operationalCostReduction: 50000,
    productivityGain: 80000,
    complianceSavings: 25000,
    storageSavings: 30000,
    timeValue: 50,
    timeSavedHours: 2000,
  });

  const [showDetails, setShowDetails] = useState(false);

  // Calculate ROI based on parameters
  const calculatedROI = useMemo(() => {
    const totalBenefits =
      parameters.operationalCostReduction +
      parameters.productivityGain +
      parameters.complianceSavings +
      parameters.storageSavings +
      (parameters.timeValue * parameters.timeSavedHours);

    const roi = totalBenefits / parameters.implementationCost;
    const paybackPeriod = parameters.implementationCost / (totalBenefits / 12); // months

    return {
      totalCostSavings: totalBenefits,
      productivityImprovement: parameters.productivityGain / parameters.implementationCost,
      storageCostReduction: parameters.storageSavings,
      workflowAutomationSavings: parameters.operationalCostReduction,
      complianceEfficiency: parameters.complianceSavings / parameters.implementationCost,
      timeSavings: parameters.timeSavedHours,
      roi: roi,
      paybackPeriod: paybackPeriod,
      projectedAnnualSavings: totalBenefits,
    };
  }, [parameters]);

  const handleParameterChange = (key: keyof ROIParameters, value: number) => {
    const newParameters = { ...parameters, [key]: value };
    setParameters(newParameters);
    onParametersChange?.(newParameters);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getROIColor = (roi: number) => {
    if (roi >= 3) return 'text-green-600';
    if (roi >= 2) return 'text-blue-600';
    if (roi >= 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getROIStatus = (roi: number) => {
    if (roi >= 3) return 'Excellent';
    if (roi >= 2) return 'Good';
    if (roi >= 1) return 'Acceptable';
    return 'Poor';
  };

  const roiData = calculation || calculatedROI;

  if (loading) {
    return (
      <div className={`glass-card rounded-lg border border-white/10 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 glass-panel rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 glass-panel rounded"></div>
            ))}
          </div>
          <div className="h-32 glass-panel rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">ROI Analysis</h3>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Key ROI Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700">Total ROI</p>
              <p className={`text-2xl font-bold ${getROIColor(roiData.roi)}`}>
                {roiData.roi.toFixed(1)}x
              </p>
              <p className="text-xs text-green-600">{getROIStatus(roiData.roi)}</p>
            </div>
            <div className="w-10 h-10 bg-green-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">Annual Savings</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(roiData.projectedAnnualSavings)}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700">Payback Period</p>
              <p className="text-2xl font-bold text-purple-600">
                {roiData.paybackPeriod.toFixed(1)}
              </p>
              <p className="text-xs text-purple-600">months</p>
            </div>
            <div className="w-10 h-10 bg-purple-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-700">Time Savings</p>
              <p className="text-2xl font-bold text-yellow-600">
                {roiData.timeSavings.toLocaleString()}
              </p>
              <p className="text-xs text-yellow-600">hours/year</p>
            </div>
            <div className="w-10 h-10 bg-yellow-200 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Breakdown */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Savings Breakdown</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
            <span className="text-sm font-medium text-gray-700">Workflow Automation</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(roiData.workflowAutomationSavings)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
            <span className="text-sm font-medium text-gray-700">Storage Cost Reduction</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(roiData.storageCostReduction)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
            <span className="text-sm font-medium text-gray-700">Productivity Improvement</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(parameters.productivityGain)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
            <span className="text-sm font-medium text-gray-700">Compliance Efficiency</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(parameters.complianceSavings)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 glass-panel rounded-lg">
            <span className="text-sm font-medium text-gray-700">Time Value Savings</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(parameters.timeValue * parameters.timeSavedHours)}
            </span>
          </div>
        </div>
      </div>

      {/* ROI Parameters (Editable when showDetails is true) */}
      {showDetails && (
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">ROI Parameters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Implementation Cost
              </label>
              <input
                type="number"
                value={parameters.implementationCost}
                onChange={(e) => handleParameterChange('implementationCost', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Operational Cost Reduction
              </label>
              <input
                type="number"
                value={parameters.operationalCostReduction}
                onChange={(e) => handleParameterChange('operationalCostReduction', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Productivity Gain
              </label>
              <input
                type="number"
                value={parameters.productivityGain}
                onChange={(e) => handleParameterChange('productivityGain', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compliance Savings
              </label>
              <input
                type="number"
                value={parameters.complianceSavings}
                onChange={(e) => handleParameterChange('complianceSavings', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Storage Savings
              </label>
              <input
                type="number"
                value={parameters.storageSavings}
                onChange={(e) => handleParameterChange('storageSavings', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hourly Value ($)
              </label>
              <input
                type="number"
                value={parameters.timeValue}
                onChange={(e) => handleParameterChange('timeValue', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Saved (hours/year)
              </label>
              <input
                type="number"
                value={parameters.timeSavedHours}
                onChange={(e) => handleParameterChange('timeSavedHours', Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ROICalculator;