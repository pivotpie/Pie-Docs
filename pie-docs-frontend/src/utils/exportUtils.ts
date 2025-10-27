import jsPDF from 'jspdf';
import type {
  ExecutiveAnalyticsData,
  ExportOptions
} from '@/types/domain/ExecutiveAnalytics';

export class AnalyticsExporter {

  /**
   * Export analytics data to PDF format
   */
  static async exportToPDF(
    data: ExecutiveAnalyticsData,
    options: ExportOptions
  ): Promise<Blob> {
    const pdf = new jsPDF();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Helper function to add text with automatic page break
    const addText = (text: string, fontSize = 12, isBold = false) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(fontSize);
      if (isBold) {
        pdf.setFont(undefined, 'bold');
      } else {
        pdf.setFont(undefined, 'normal');
      }

      pdf.text(text, 20, yPosition);
      yPosition += fontSize * 0.6;
    };

    // Helper function to format currency
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(amount);
    };

    // Helper function to format percentage
    const formatPercentage = (value: number) => {
      return `${(value * 100).toFixed(1)}%`;
    };

    try {
      // Title
      addText('Executive Analytics Report', 18, true);
      addText(`Generated on: ${new Date().toLocaleString()}`, 10);
      yPosition += 10;

      // KPI Section
      if (options.sections.includes('kpi') && data.kpiMetrics) {
        addText('Key Performance Indicators', 16, true);
        yPosition += 5;

        // Document Processing
        addText('Document Processing:', 14, true);
        addText(`Total Documents: ${data.kpiMetrics.documentProcessing.totalDocuments.toLocaleString()}`);
        addText(`Documents Created: ${data.kpiMetrics.documentProcessing.documentsCreated.toLocaleString()}`);
        addText(`Processing Time: ${data.kpiMetrics.documentProcessing.processingTime.toFixed(1)}s`);
        addText(`Growth Rate: ${formatPercentage(data.kpiMetrics.documentProcessing.growthRate)}`);
        yPosition += 5;

        // User Adoption
        addText('User Adoption:', 14, true);
        addText(`Active Users: ${data.kpiMetrics.userAdoption.activeUsers.toLocaleString()}`);
        addText(`New Users: ${data.kpiMetrics.userAdoption.newUsers.toLocaleString()}`);
        addText(`Adoption Rate: ${formatPercentage(data.kpiMetrics.userAdoption.adoptionRate)}`);
        addText(`User Engagement: ${formatPercentage(data.kpiMetrics.userAdoption.userEngagement)}`);
        yPosition += 5;

        // System Performance
        addText('System Performance:', 14, true);
        addText(`Uptime: ${formatPercentage(data.kpiMetrics.systemPerformance.uptime)}`);
        addText(`Average Response Time: ${data.kpiMetrics.systemPerformance.averageResponseTime}ms`);
        addText(`Error Rate: ${formatPercentage(data.kpiMetrics.systemPerformance.errorRate)}`);
        addText(`Throughput: ${data.kpiMetrics.systemPerformance.throughput.toLocaleString()} req/min`);
        yPosition += 10;
      }

      // ROI Section
      if (options.sections.includes('roi') && data.roiCalculation) {
        addText('Return on Investment Analysis', 16, true);
        yPosition += 5;

        addText(`Total ROI: ${data.roiCalculation.roi.toFixed(1)}x`);
        addText(`Total Cost Savings: ${formatCurrency(data.roiCalculation.totalCostSavings)}`);
        addText(`Projected Annual Savings: ${formatCurrency(data.roiCalculation.projectedAnnualSavings)}`);
        addText(`Payback Period: ${data.roiCalculation.paybackPeriod.toFixed(1)} months`);
        addText(`Time Savings: ${data.roiCalculation.timeSavings.toLocaleString()} hours`);
        yPosition += 5;

        addText('Savings Breakdown:', 14, true);
        addText(`- Workflow Automation: ${formatCurrency(data.roiCalculation.workflowAutomationSavings)}`);
        addText(`- Storage Cost Reduction: ${formatCurrency(data.roiCalculation.storageCostReduction)}`);
        addText(`- Productivity Improvement: ${formatPercentage(data.roiCalculation.productivityImprovement)}`);
        addText(`- Compliance Efficiency: ${formatPercentage(data.roiCalculation.complianceEfficiency)}`);
        yPosition += 10;
      }

      // Department Usage Section
      if (options.sections.includes('departments') && data.departmentUsage) {
        addText('Department Usage Statistics', 16, true);
        yPosition += 5;

        data.departmentUsage.forEach((dept) => {
          addText(`${dept.departmentName}:`, 14, true);
          addText(`  Documents: ${dept.documentCount.toLocaleString()}`);
          addText(`  Active Users: ${dept.activeUsers}`);
          addText(`  Efficiency: ${formatPercentage(dept.efficiency)}`);
          addText(`  Growth Rate: ${formatPercentage(dept.growthRate)}`);
          yPosition += 3;
        });
        yPosition += 10;
      }

      // Performance Summary
      if (options.sections.includes('performance') && data.performanceMetrics.length > 0) {
        addText('System Performance Summary', 16, true);
        yPosition += 5;

        const avgCpu = data.performanceMetrics.reduce((acc, m) => acc + m.cpuUsage, 0) / data.performanceMetrics.length;
        const avgMemory = data.performanceMetrics.reduce((acc, m) => acc + m.memoryUsage, 0) / data.performanceMetrics.length;
        const avgResponse = data.performanceMetrics.reduce((acc, m) => acc + m.responseTime, 0) / data.performanceMetrics.length;

        addText(`Average CPU Usage: ${formatPercentage(avgCpu)}`);
        addText(`Average Memory Usage: ${formatPercentage(avgMemory)}`);
        addText(`Average Response Time: ${avgResponse.toFixed(1)}ms`);
        yPosition += 10;
      }

      // Footer
      if (options.branding) {
        const footerY = pageHeight - 20;
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text('Generated by Pie-Docs Enterprise Document Management System', 20, footerY);
      }

      return new Blob([pdf.output('blob')], { type: 'application/pdf' });

    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF export');
    }
  }

  /**
   * Export analytics data to Excel format
   */
  static async exportToExcel(
    data: ExecutiveAnalyticsData,
    options: ExportOptions
  ): Promise<Blob> {
    try {
      const workbook = new ExcelJS.Workbook();

      // KPI Summary Sheet
      if (options.sections.includes('kpi') && data.kpiMetrics) {
        const kpiWorksheet = workbook.addWorksheet('KPI Summary');

        // Add KPI data
        kpiWorksheet.addRow(['Key Performance Indicators', '', '']);
        kpiWorksheet.addRow(['', '', '']);
        kpiWorksheet.addRow(['Document Processing', '', '']);
        kpiWorksheet.addRow(['Total Documents', data.kpiMetrics.documentProcessing.totalDocuments, '']);
        kpiWorksheet.addRow(['Documents Created', data.kpiMetrics.documentProcessing.documentsCreated, '']);
        kpiWorksheet.addRow(['Documents Accessed', data.kpiMetrics.documentProcessing.documentsAccessed, '']);
        kpiWorksheet.addRow(['Processing Time (s)', data.kpiMetrics.documentProcessing.processingTime, '']);
        kpiWorksheet.addRow(['Growth Rate', data.kpiMetrics.documentProcessing.growthRate * 100, '%']);
        kpiWorksheet.addRow(['', '', '']);
        kpiWorksheet.addRow(['User Adoption', '', '']);
        kpiWorksheet.addRow(['Active Users', data.kpiMetrics.userAdoption.activeUsers, '']);
        kpiWorksheet.addRow(['New Users', data.kpiMetrics.userAdoption.newUsers, '']);
        kpiWorksheet.addRow(['Adoption Rate', data.kpiMetrics.userAdoption.adoptionRate * 100, '%']);
        kpiWorksheet.addRow(['User Engagement', data.kpiMetrics.userAdoption.userEngagement * 100, '%']);
        kpiWorksheet.addRow(['', '', '']);
        kpiWorksheet.addRow(['System Performance', '', '']);
        kpiWorksheet.addRow(['Uptime', data.kpiMetrics.systemPerformance.uptime * 100, '%']);
        kpiWorksheet.addRow(['Avg Response Time (ms)', data.kpiMetrics.systemPerformance.averageResponseTime, '']);
        kpiWorksheet.addRow(['Error Rate', data.kpiMetrics.systemPerformance.errorRate * 100, '%']);
        kpiWorksheet.addRow(['Throughput (req/min)', data.kpiMetrics.systemPerformance.throughput, '']);
        kpiWorksheet.addRow(['', '', '']);
        kpiWorksheet.addRow(['Workflow Efficiency', '', '']);
        kpiWorksheet.addRow(['Completed Workflows', data.kpiMetrics.workflowEfficiency.completedWorkflows, '']);
        kpiWorksheet.addRow(['Avg Completion Time (hrs)', data.kpiMetrics.workflowEfficiency.averageCompletionTime, '']);
        kpiWorksheet.addRow(['Automation Rate', data.kpiMetrics.workflowEfficiency.automationRate * 100, '%']);
        kpiWorksheet.addRow(['SLA Compliance', data.kpiMetrics.workflowEfficiency.slaCompliance * 100, '%']);
      }

      // ROI Analysis Sheet
      if (options.sections.includes('roi') && data.roiCalculation) {
        const roiWorksheet = workbook.addWorksheet('ROI Analysis');

        roiWorksheet.addRow(['ROI Analysis', '', '']);
        roiWorksheet.addRow(['', '', '']);
        roiWorksheet.addRow(['Metric', 'Value', 'Unit']);
        roiWorksheet.addRow(['Total ROI', data.roiCalculation.roi.toFixed(2), 'x']);
        roiWorksheet.addRow(['Total Cost Savings', data.roiCalculation.totalCostSavings, '$']);
        roiWorksheet.addRow(['Projected Annual Savings', data.roiCalculation.projectedAnnualSavings, '$']);
        roiWorksheet.addRow(['Payback Period', data.roiCalculation.paybackPeriod.toFixed(1), 'months']);
        roiWorksheet.addRow(['Time Savings', data.roiCalculation.timeSavings, 'hours']);
        roiWorksheet.addRow(['', '', '']);
        roiWorksheet.addRow(['Savings Breakdown', '', '']);
        roiWorksheet.addRow(['Workflow Automation Savings', data.roiCalculation.workflowAutomationSavings, '$']);
        roiWorksheet.addRow(['Storage Cost Reduction', data.roiCalculation.storageCostReduction, '$']);
        roiWorksheet.addRow(['Productivity Improvement', data.roiCalculation.productivityImprovement * 100, '%']);
        roiWorksheet.addRow(['Compliance Efficiency', data.roiCalculation.complianceEfficiency * 100, '%']);
      }

      // Department Usage Sheet
      if (options.sections.includes('departments') && data.departmentUsage) {
        const deptWorksheet = workbook.addWorksheet('Department Usage');

        const deptHeaders = [
          'Department',
          'Document Count',
          'Active Users',
          'Storage Used (GB)',
          'Workflows Completed',
          'Efficiency (%)',
          'Growth Rate (%)',
          'Benchmark Comparison',
        ];

        deptWorksheet.addRow(deptHeaders);

        data.departmentUsage.forEach(dept => {
          deptWorksheet.addRow([
            dept.departmentName,
            dept.documentCount,
            dept.activeUsers,
            (dept.storageUsed / (1024 * 1024 * 1024)).toFixed(2),
            dept.workflowsCompleted,
            (dept.efficiency * 100).toFixed(1),
            (dept.growthRate * 100).toFixed(1),
            dept.benchmarkComparison.toFixed(2),
          ]);
        });
      }

      // Trend Data Sheet
      if (options.sections.includes('trends') && data.trendData.length > 0) {
        const trendWorksheet = workbook.addWorksheet('Trend Data');

        const trendHeaders = ['Timestamp', 'Metric', 'Value', 'Category'];
        trendWorksheet.addRow(trendHeaders);

        data.trendData.forEach(trend => {
          trendWorksheet.addRow([
            trend.timestamp.toISOString(),
            trend.metric,
            trend.value,
            trend.category,
          ]);
        });
      }

      // Performance Metrics Sheet
      if (options.sections.includes('performance') && data.performanceMetrics.length > 0) {
        const perfWorksheet = workbook.addWorksheet('Performance Metrics');

        const perfHeaders = [
          'Timestamp',
          'CPU Usage (%)',
          'Memory Usage (%)',
          'Disk Usage (%)',
          'Network Throughput (MB/s)',
          'Active Connections',
          'Response Time (ms)',
          'Error Count',
          'Requests/Second',
        ];

        perfWorksheet.addRow(perfHeaders);

        data.performanceMetrics.forEach(metric => {
          perfWorksheet.addRow([
            metric.timestamp.toISOString(),
            (metric.cpuUsage * 100).toFixed(1),
            (metric.memoryUsage * 100).toFixed(1),
            (metric.diskUsage * 100).toFixed(1),
            (metric.networkThroughput / 1024).toFixed(2),
            metric.activeConnections,
            metric.responseTime.toFixed(1),
            metric.errorCount,
            metric.requestsPerSecond.toFixed(1),
          ]);
        });
      }

      // Generate Excel file
      const buffer = await workbook.xlsx.writeBuffer();

      return new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    } catch (error) {
      console.error('Error generating Excel:', error);
      throw new Error('Failed to generate Excel export');
    }
  }

  /**
   * Export analytics data to CSV format
   */
  static async exportToCSV(
    data: ExecutiveAnalyticsData,
    options: ExportOptions
  ): Promise<Blob> {
    try {
      let csvContent = '';

      // Add header
      csvContent += `Executive Analytics Report\n`;
      csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;

      // KPI Section
      if (options.sections.includes('kpi') && data.kpiMetrics) {
        csvContent += `Key Performance Indicators\n`;
        csvContent += `Metric,Value,Unit\n`;
        csvContent += `Total Documents,${data.kpiMetrics.documentProcessing.totalDocuments},count\n`;
        csvContent += `Documents Created,${data.kpiMetrics.documentProcessing.documentsCreated},count\n`;
        csvContent += `Processing Time,${data.kpiMetrics.documentProcessing.processingTime},seconds\n`;
        csvContent += `Growth Rate,${(data.kpiMetrics.documentProcessing.growthRate * 100).toFixed(1)},percent\n`;
        csvContent += `Active Users,${data.kpiMetrics.userAdoption.activeUsers},count\n`;
        csvContent += `Adoption Rate,${(data.kpiMetrics.userAdoption.adoptionRate * 100).toFixed(1)},percent\n`;
        csvContent += `System Uptime,${(data.kpiMetrics.systemPerformance.uptime * 100).toFixed(1)},percent\n`;
        csvContent += `Response Time,${data.kpiMetrics.systemPerformance.averageResponseTime},milliseconds\n`;
        csvContent += `\n`;
      }

      // Department Usage
      if (options.sections.includes('departments') && data.departmentUsage) {
        csvContent += `Department Usage Statistics\n`;
        csvContent += `Department,Document Count,Active Users,Storage (GB),Efficiency (%)\n`;
        data.departmentUsage.forEach(dept => {
          csvContent += `${dept.departmentName},${dept.documentCount},${dept.activeUsers},${(dept.storageUsed / (1024 * 1024 * 1024)).toFixed(2)},${(dept.efficiency * 100).toFixed(1)}\n`;
        });
        csvContent += `\n`;
      }

      return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    } catch (error) {
      console.error('Error generating CSV:', error);
      throw new Error('Failed to generate CSV export');
    }
  }

  /**
   * Download exported file
   */
  static downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generate filename with timestamp
   */
  static generateFilename(prefix: string, format: string): string {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}-${timestamp}.${format}`;
  }
}