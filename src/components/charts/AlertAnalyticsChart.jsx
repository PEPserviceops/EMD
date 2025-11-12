/**
 * Alert Analytics Chart Component
 * Displays alert patterns, severity distribution, and response times
 */

import React, { useMemo } from 'react';
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
  ArcElement,
  TimeScale,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { AlertTriangle, Clock, TrendingUp, Target } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

export default function AlertAnalyticsChart({ data, dateRange, chartType = 'severity' }) {
  const chartData = useMemo(() => {
    if (!data?.alerts) return null;

    if (chartType === 'severity') {
      // Severity distribution pie chart
      const severityCounts = {};
      data.alerts.forEach(alert => {
        severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
      });

      return {
        labels: Object.keys(severityCounts),
        datasets: [{
          data: Object.values(severityCounts),
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',   // CRITICAL - red
            'rgba(245, 101, 101, 0.8)', // HIGH - red-orange
            'rgba(251, 191, 36, 0.8)',  // MEDIUM - yellow
            'rgba(34, 197, 94, 0.8)',   // LOW - green
          ],
          borderColor: [
            'rgb(239, 68, 68)',
            'rgb(245, 101, 101)',
            'rgb(251, 191, 36)',
            'rgb(34, 197, 94)',
          ],
          borderWidth: 2,
        }]
      };
    } else if (chartType === 'timeline') {
      // Alerts over time
      const alertsByDate = {};
      data.alerts.forEach(alert => {
        const date = new Date(alert.created_at).toISOString().split('T')[0];
        if (!alertsByDate[date]) {
          alertsByDate[date] = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
        }
        alertsByDate[date].total++;
        alertsByDate[date][alert.severity.toLowerCase()]++;
      });

      const sortedDates = Object.keys(alertsByDate).sort();

      return {
        labels: sortedDates,
        datasets: [
          {
            label: 'Critical',
            data: sortedDates.map(date => alertsByDate[date].critical),
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            borderColor: 'rgb(239, 68, 68)',
            borderWidth: 1,
          },
          {
            label: 'High',
            data: sortedDates.map(date => alertsByDate[date].high),
            backgroundColor: 'rgba(245, 101, 101, 0.8)',
            borderColor: 'rgb(245, 101, 101)',
            borderWidth: 1,
          },
          {
            label: 'Medium',
            data: sortedDates.map(date => alertsByDate[date].medium),
            backgroundColor: 'rgba(251, 191, 36, 0.8)',
            borderColor: 'rgb(251, 191, 36)',
            borderWidth: 1,
          },
          {
            label: 'Low',
            data: sortedDates.map(date => alertsByDate[date].low),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          }
        ]
      };
    } else if (chartType === 'response') {
      // Response time analysis (mock data for now)
      const responseTimes = data.alerts.map(alert => {
        // Calculate response time in minutes (mock calculation)
        const created = new Date(alert.created_at);
        const acknowledged = alert.acknowledged_at ? new Date(alert.acknowledged_at) : new Date();
        const responseTime = (acknowledged - created) / (1000 * 60); // minutes
        return Math.min(responseTime, 120); // Cap at 2 hours
      });

      // Group by time buckets
      const buckets = {
        '< 5 min': 0,
        '5-15 min': 0,
        '15-30 min': 0,
        '30-60 min': 0,
        '1-2 hours': 0,
        '> 2 hours': 0
      };

      responseTimes.forEach(time => {
        if (time < 5) buckets['< 5 min']++;
        else if (time < 15) buckets['5-15 min']++;
        else if (time < 30) buckets['15-30 min']++;
        else if (time < 60) buckets['30-60 min']++;
        else if (time < 120) buckets['1-2 hours']++;
        else buckets['> 2 hours']++;
      });

      return {
        labels: Object.keys(buckets),
        datasets: [{
          label: 'Response Time Distribution',
          data: Object.values(buckets),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        }]
      };
    }

    return null;
  }, [data, chartType]);

  const getOptions = (type) => {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
        }
      }
    };

    if (type === 'severity') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Alert Severity Distribution',
            font: { size: 16, weight: 'bold' },
            padding: 20
          }
        }
      };
    } else if (type === 'timeline') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Alert Timeline',
            font: { size: 16, weight: 'bold' },
            padding: 20
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'day',
              displayFormats: { day: 'MMM dd' }
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          }
        }
      };
    } else {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Response Time Analysis',
            font: { size: 16, weight: 'bold' },
            padding: 20
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          }
        }
      };
    }
  };

  if (!chartData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <AlertTriangle className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Alert Data Available</h3>
        <p className="text-slate-600">Alert analytics will appear here once alerts are generated.</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartType === 'severity') {
      return <Doughnut data={chartData} options={getOptions('severity')} />;
    } else if (chartType === 'timeline') {
      return <Bar data={chartData} options={getOptions('timeline')} />;
    } else {
      return <Bar data={chartData} options={getOptions('response')} />;
    }
  };

  const getStats = () => {
    if (!data?.alerts) return null;

    const total = data.alerts.length;
    const acknowledged = data.alerts.filter(a => a.acknowledged).length;
    const avgResponseTime = data.alerts
      .filter(a => a.acknowledged_at)
      .reduce((sum, alert) => {
        const created = new Date(alert.created_at);
        const acknowledged = new Date(alert.acknowledged_at);
        return sum + (acknowledged - created) / (1000 * 60); // minutes
      }, 0) / Math.max(data.alerts.filter(a => a.acknowledged_at).length, 1);

    return { total, acknowledged, avgResponseTime: avgResponseTime.toFixed(1) };
  };

  const stats = getStats();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-red-100 to-orange-100 p-3 rounded-xl">
            <AlertTriangle className="text-red-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Alert Analytics</h3>
            <p className="text-sm text-slate-600">
              {chartType === 'severity' && 'Severity distribution and patterns'}
              {chartType === 'timeline' && 'Alert frequency over time'}
              {chartType === 'response' && 'Response time analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      <div className="h-80">
        {renderChart()}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.total}</div>
            <div className="text-slate-600">Total Alerts</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.acknowledged}</div>
            <div className="text-slate-600">Acknowledged</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.avgResponseTime}m</div>
            <div className="text-slate-600">Avg Response</div>
          </div>
        </div>
      )}
    </div>
  );
}
