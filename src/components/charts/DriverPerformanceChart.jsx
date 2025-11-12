/**
 * Driver Performance Chart Component
 * Displays driver performance metrics, completion rates, and efficiency scores
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
  TimeScale,
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { User, TrendingUp, Target, Clock, Star } from 'lucide-react';

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

export default function DriverPerformanceChart({ data, dateRange, chartType = 'completion' }) {
  const chartData = useMemo(() => {
    if (!data?.data) return null;

    if (chartType === 'completion') {
      // Driver completion rates
      const driverStats = {};
      data.data.forEach(job => {
        const driver = job.driver_name || job.driver_id || 'Unknown';
        if (!driverStats[driver]) {
          driverStats[driver] = { total: 0, completed: 0, onTime: 0 };
        }
        driverStats[driver].total++;
        if (job.job_status === 'completed') {
          driverStats[driver].completed++;
          // Mock on-time calculation (in real app, compare scheduled vs actual times)
          if (Math.random() > 0.3) { // 70% on-time rate for demo
            driverStats[driver].onTime++;
          }
        }
      });

      const drivers = Object.keys(driverStats);
      const completionRates = drivers.map(driver =>
        (driverStats[driver].completed / driverStats[driver].total) * 100
      );
      const onTimeRates = drivers.map(driver =>
        (driverStats[driver].onTime / driverStats[driver].total) * 100
      );

      return {
        labels: drivers,
        datasets: [
          {
            label: 'Completion Rate (%)',
            data: completionRates,
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          },
          {
            label: 'On-Time Rate (%)',
            data: onTimeRates,
            backgroundColor: 'rgba(59, 130, 246, 0.8)',
            borderColor: 'rgb(59, 130, 246)',
            borderWidth: 1,
          }
        ]
      };
    } else if (chartType === 'efficiency') {
      // Driver efficiency scores (mock data)
      const driverEfficiency = {};
      data.data.forEach(job => {
        const driver = job.driver_name || job.driver_id || 'Unknown';
        if (!driverEfficiency[driver]) {
          driverEfficiency[driver] = [];
        }
        // Mock efficiency score based on job type and status
        const baseScore = job.job_status === 'completed' ? 85 : 60;
        const typeBonus = { 'Delivery': 5, 'Pickup': 3, 'Move': 8, 'Shuttle': 2 }[job.job_type] || 0;
        const score = Math.min(100, baseScore + typeBonus + Math.random() * 10);
        driverEfficiency[driver].push(score);
      });

      const drivers = Object.keys(driverEfficiency);
      const avgScores = drivers.map(driver =>
        driverEfficiency[driver].reduce((a, b) => a + b, 0) / driverEfficiency[driver].length
      );

      return {
        labels: drivers,
        datasets: [{
          label: 'Average Efficiency Score',
          data: avgScores,
          backgroundColor: 'rgba(251, 191, 36, 0.8)',
          borderColor: 'rgb(251, 191, 36)',
          borderWidth: 1,
        }]
      };
    } else if (chartType === 'workload') {
      // Jobs per driver over time
      const driverWorkload = {};
      data.data.forEach(job => {
        const driver = job.driver_name || job.driver_id || 'Unknown';
        const date = new Date(job.snapshot_timestamp).toISOString().split('T')[0];
        if (!driverWorkload[driver]) {
          driverWorkload[driver] = {};
        }
        driverWorkload[driver][date] = (driverWorkload[driver][date] || 0) + 1;
      });

      const drivers = Object.keys(driverWorkload).slice(0, 5); // Top 5 drivers
      const dates = [...new Set(data.data.map(job =>
        new Date(job.snapshot_timestamp).toISOString().split('T')[0]
      ))].sort();

      return {
        labels: dates,
        datasets: drivers.map((driver, index) => ({
          label: driver,
          data: dates.map(date => driverWorkload[driver][date] || 0),
          borderColor: [
            'rgb(59, 130, 246)',
            'rgb(34, 197, 94)',
            'rgb(251, 191, 36)',
            'rgb(239, 68, 68)',
            'rgb(168, 85, 247)'
          ][index % 5],
          backgroundColor: [
            'rgba(59, 130, 246, 0.1)',
            'rgba(34, 197, 94, 0.1)',
            'rgba(251, 191, 36, 0.1)',
            'rgba(239, 68, 68, 0.1)',
            'rgba(168, 85, 247, 0.1)'
          ][index % 5],
          tension: 0.4,
          fill: true,
        }))
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

    if (type === 'completion') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Driver Performance Metrics',
            font: { size: 16, weight: 'bold' },
            padding: 20
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: {
              callback: (value) => `${value}%`
            }
          },
          x: {
            grid: { display: false }
          }
        }
      };
    } else if (type === 'efficiency') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Driver Efficiency Scores',
            font: { size: 16, weight: 'bold' },
            padding: 20
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: {
              callback: (value) => `${value}%`
            }
          },
          x: {
            grid: { display: false }
          }
        }
      };
    } else if (type === 'workload') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Driver Workload Trends',
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
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        }
      };
    }

    return baseOptions;
  };

  if (!chartData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <User className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Driver Data Available</h3>
        <p className="text-slate-600">Driver performance metrics will appear here once jobs are assigned to drivers.</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartType === 'workload') {
      return <Line data={chartData} options={getOptions('workload')} />;
    } else {
      return <Bar data={chartData} options={getOptions(chartType)} />;
    }
  };

  const getStats = () => {
    if (!data?.data) return null;

    const drivers = [...new Set(data.data.map(job => job.driver_name || job.driver_id).filter(Boolean))];
    const totalJobs = data.data.length;
    const avgJobsPerDriver = (totalJobs / drivers.length).toFixed(1);

    // Mock top performer calculation
    const topPerformer = drivers[Math.floor(Math.random() * drivers.length)] || 'N/A';

    return {
      totalDrivers: drivers.length,
      avgJobsPerDriver,
      topPerformer,
      totalJobs
    };
  };

  const stats = getStats();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-3 rounded-xl">
            <User className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Driver Performance</h3>
            <p className="text-sm text-slate-600">
              {chartType === 'completion' && 'Completion and on-time delivery rates'}
              {chartType === 'efficiency' && 'Driver efficiency scores and ratings'}
              {chartType === 'workload' && 'Workload distribution over time'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Star size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      <div className="h-80">
        {renderChart()}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.totalDrivers}</div>
            <div className="text-slate-600">Active Drivers</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.avgJobsPerDriver}</div>
            <div className="text-slate-600">Avg Jobs/Driver</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.topPerformer}</div>
            <div className="text-slate-600">Top Performer</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.totalJobs}</div>
            <div className="text-slate-600">Total Jobs</div>
          </div>
        </div>
      )}
    </div>
  );
}
