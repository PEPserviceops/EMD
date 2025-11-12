/**
 * Time Series Chart Component
 * Displays comprehensive time-series data for multiple metrics
 */

import React, { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Activity, TrendingUp, Calendar, Layers } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export default function TimeSeriesChart({
  jobsData,
  alertsData,
  efficiencyData,
  dateRange,
  metrics = ['jobs', 'alerts', 'efficiency']
}) {
  const [visibleMetrics, setVisibleMetrics] = useState(metrics);

  const chartData = useMemo(() => {
    // Combine all data sources into time series
    const timeSeriesData = {};

    // Process jobs data
    if (jobsData?.data && visibleMetrics.includes('jobs')) {
      jobsData.data.forEach(job => {
        const date = new Date(job.snapshot_timestamp).toISOString().split('T')[0];
        if (!timeSeriesData[date]) {
          timeSeriesData[date] = { jobs: 0, alerts: 0, efficiency: 0, efficiencyCount: 0 };
        }
        timeSeriesData[date].jobs++;
      });
    }

    // Process alerts data
    if (alertsData?.alerts && visibleMetrics.includes('alerts')) {
      alertsData.alerts.forEach(alert => {
        const date = new Date(alert.created_at).toISOString().split('T')[0];
        if (!timeSeriesData[date]) {
          timeSeriesData[date] = { jobs: 0, alerts: 0, efficiency: 0, efficiencyCount: 0 };
        }
        timeSeriesData[date].alerts++;
      });
    }

    // Process efficiency data
    if (efficiencyData?.data && visibleMetrics.includes('efficiency')) {
      efficiencyData.data.forEach(metric => {
        const date = new Date(metric.date || metric.timestamp).toISOString().split('T')[0];
        if (!timeSeriesData[date]) {
          timeSeriesData[date] = { jobs: 0, alerts: 0, efficiency: 0, efficiencyCount: 0 };
        }
        if (metric.efficiency_score !== undefined) {
          timeSeriesData[date].efficiency += metric.efficiency_score;
          timeSeriesData[date].efficiencyCount++;
        }
      });
    }

    // Sort dates and prepare datasets
    const sortedDates = Object.keys(timeSeriesData).sort();

    const datasets = [];

    if (visibleMetrics.includes('jobs')) {
      datasets.push({
        label: 'Jobs Completed',
        data: sortedDates.map(date => timeSeriesData[date].jobs),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        yAxisID: 'y',
        tension: 0.4,
        fill: false,
      });
    }

    if (visibleMetrics.includes('alerts')) {
      datasets.push({
        label: 'Alerts Generated',
        data: sortedDates.map(date => timeSeriesData[date].alerts),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        yAxisID: 'y',
        tension: 0.4,
        fill: false,
      });
    }

    if (visibleMetrics.includes('efficiency')) {
      datasets.push({
        label: 'Avg Efficiency (%)',
        data: sortedDates.map(date => {
          const data = timeSeriesData[date];
          return data.efficiencyCount > 0 ? data.efficiency / data.efficiencyCount : 0;
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        yAxisID: 'y1',
        tension: 0.4,
        fill: false,
      });
    }

    return {
      labels: sortedDates,
      datasets
    };
  }, [jobsData, alertsData, efficiencyData, visibleMetrics]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        }
      },
      title: {
        display: true,
        text: 'Operational Time Series',
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        callbacks: {
          title: (context) => {
            return new Date(context[0].parsed.x).toLocaleDateString();
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd'
          }
        },
        grid: {
          display: false
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Count'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      y1: {
        type: 'linear',
        display: visibleMetrics.includes('efficiency'),
        position: 'right',
        title: {
          display: true,
          text: 'Efficiency (%)'
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          callback: (value) => `${value}%`
        }
      }
    }
  };

  const toggleMetric = (metric) => {
    setVisibleMetrics(prev =>
      prev.includes(metric)
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  if (!chartData.datasets.length) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <Activity className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Time Series Data Available</h3>
        <p className="text-slate-600">Time series data will appear here once operational data is collected.</p>
      </div>
    );
  }

  const getStats = () => {
    const totalJobs = jobsData?.data?.length || 0;
    const totalAlerts = alertsData?.alerts?.length || 0;
    const avgEfficiency = efficiencyData?.data?.length > 0
      ? (efficiencyData.data.reduce((sum, m) => sum + (m.efficiency_score || 0), 0) / efficiencyData.data.length).toFixed(1)
      : 0;

    return { totalJobs, totalAlerts, avgEfficiency };
  };

  const stats = getStats();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-3 rounded-xl">
            <TrendingUp className="text-indigo-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Time Series Analytics</h3>
            <p className="text-sm text-slate-600">Multi-metric trends over time</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      {/* Metric Toggle Buttons */}
      <div className="flex items-center gap-2 mb-6">
        <Layers size={16} className="text-slate-500" />
        <span className="text-sm font-medium text-slate-700 mr-2">Metrics:</span>
        {['jobs', 'alerts', 'efficiency'].map(metric => (
          <button
            key={metric}
            onClick={() => toggleMetric(metric)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              visibleMetrics.includes(metric)
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            {metric.charAt(0).toUpperCase() + metric.slice(1)}
          </button>
        ))}
      </div>

      <div className="h-80">
        <Line data={chartData} options={options} />
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.totalJobs}</div>
            <div className="text-slate-600">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.totalAlerts}</div>
            <div className="text-slate-600">Total Alerts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.avgEfficiency}%</div>
            <div className="text-slate-600">Avg Efficiency</div>
          </div>
        </div>
      )}
    </div>
  );
}
