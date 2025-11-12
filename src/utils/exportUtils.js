/**
 * Export Utilities for Analytics Dashboard
 * Handles CSV and PDF export functionality
 */

import Papa from 'papaparse';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Export data to CSV format
 */
export const exportToCSV = (data, filename) => {
  try {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw new Error('Failed to export CSV');
  }
};

/**
 * Export data to PDF format
 */
export const exportToPDF = (data, filename, title) => {
  try {
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text(title, 20, 20);

    // Add timestamp
    doc.setFontSize(10);
    doc.text(`Generated on ${new Date().toLocaleString()}`, 20, 30);

    // Convert data to table format
    const headers = Object.keys(data[0] || {});
    const rows = data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Format dates and numbers appropriately
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        if (typeof value === 'number') {
          return value.toLocaleString();
        }
        return String(value || '');
      })
    );

    // Add table
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue header
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
    });

    // Save the PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Failed to export PDF');
  }
};

/**
 * Prepare analytics data for export
 */
export const prepareAnalyticsData = (analyticsData, dateRange) => {
  const exportData = {
    summary: {
      dateRange: `${dateRange.start} to ${dateRange.end}`,
      generatedAt: new Date().toISOString(),
      totalJobs: analyticsData.jobs?.count || 0,
      totalAlerts: analyticsData.alerts?.count || 0,
      avgEfficiency: analyticsData.efficiency?.data?.length > 0
        ? (analyticsData.efficiency.data.reduce((sum, item) => sum + (item.efficiency_score || 0), 0) / analyticsData.efficiency.data.length).toFixed(1)
        : 0,
      totalRevenue: analyticsData.profitability?.data?.length > 0
        ? analyticsData.profitability.data.reduce((sum, item) => sum + (item.total_revenue || 0), 0)
        : 0
    },
    jobs: analyticsData.jobs?.data || [],
    alerts: analyticsData.alerts?.alerts || [],
    efficiency: analyticsData.efficiency?.data || [],
    profitability: analyticsData.profitability?.data || []
  };

  return exportData;
};

/**
 * Export complete analytics report (CSV)
 */
export const exportAnalyticsReport = (analyticsData, dateRange) => {
  const preparedData = prepareAnalyticsData(analyticsData, dateRange);

  // Create a flattened export structure
  const exportRows = [];

  // Add summary section
  exportRows.push({ section: 'SUMMARY', key: 'Date Range', value: preparedData.summary.dateRange });
  exportRows.push({ section: 'SUMMARY', key: 'Generated At', value: preparedData.summary.generatedAt });
  exportRows.push({ section: 'SUMMARY', key: 'Total Jobs', value: preparedData.summary.totalJobs });
  exportRows.push({ section: 'SUMMARY', key: 'Total Alerts', value: preparedData.summary.totalAlerts });
  exportRows.push({ section: 'SUMMARY', key: 'Average Efficiency', value: `${preparedData.summary.avgEfficiency}%` });
  exportRows.push({ section: 'SUMMARY', key: 'Total Revenue', value: `$${preparedData.summary.totalRevenue.toLocaleString()}` });

  // Add separator
  exportRows.push({ section: '', key: '', value: '' });

  // Add jobs data
  preparedData.jobs.forEach((job, index) => {
    if (index === 0) {
      exportRows.push({ section: 'JOBS', key: 'Job Data', value: '' });
    }
    exportRows.push({
      section: 'JOBS',
      key: `Job ${job.job_id}`,
      value: `${job.job_status} - ${job.job_type || 'Unknown'} - ${new Date(job.snapshot_timestamp).toLocaleDateString()}`
    });
  });

  // Add separator
  exportRows.push({ section: '', key: '', value: '' });

  // Add alerts data
  preparedData.alerts.forEach((alert, index) => {
    if (index === 0) {
      exportRows.push({ section: 'ALERTS', key: 'Alert Data', value: '' });
    }
    exportRows.push({
      section: 'ALERTS',
      key: `Alert ${alert.id}`,
      value: `${alert.severity} - ${alert.title} - ${new Date(alert.created_at).toLocaleDateString()}`
    });
  });

  const filename = `analytics-report-${dateRange.start}-to-${dateRange.end}.csv`;
  exportToCSV(exportRows, filename);
};

/**
 * Export complete analytics report (PDF)
 */
export const exportAnalyticsReportPDF = (analyticsData, dateRange) => {
  const preparedData = prepareAnalyticsData(analyticsData, dateRange);

  const filename = `analytics-report-${dateRange.start}-to-${dateRange.end}.pdf`;
  const title = `Analytics Report: ${dateRange.start} to ${dateRange.end}`;

  // Create PDF data structure
  const pdfData = [
    { section: 'Summary', metric: 'Date Range', value: preparedData.summary.dateRange },
    { section: 'Summary', metric: 'Total Jobs', value: preparedData.summary.totalJobs.toString() },
    { section: 'Summary', metric: 'Total Alerts', value: preparedData.summary.totalAlerts.toString() },
    { section: 'Summary', metric: 'Average Efficiency', value: `${preparedData.summary.avgEfficiency}%` },
    { section: 'Summary', metric: 'Total Revenue', value: `$${preparedData.summary.totalRevenue.toLocaleString()}` },
  ];

  exportToPDF(pdfData, filename, title);
};
