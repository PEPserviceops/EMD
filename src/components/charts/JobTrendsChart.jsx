/**
 * Job Trends Chart Component
 * Displays job completion trends over time with interactive filtering
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
import { Line, Bar } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { TrendingUp, Calendar, Filter } from 'lucide-react';

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

export default function JobTrendsChart({ data, dateRange, jobTypeFilter, chartType = 'line' }) {
  const chartData = useMemo(() => {
    if (!data?.data) return null;

    // Filter data by job type if specified
    let filteredData = data.data;
    if (jobTypeFilter && jobTypeFilter !== 'all') {
      filteredData = data.data.filter(job => job.job_type === jobTypeFilter);
    }

    // Group jobs by date
    const jobsByDate = {};
    filteredData.forEach(job => {
      const date = new Date(job.snapshot_timestamp).toISOString().split('T')[0];
      if (!jobsByDate[date]) {
        jobsByDate[date] = {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0
        };
      }
      jobsByDate[date].total++;
      if (job.job_status === 'completed') jobsByDate[date].completed++;
      else if (job.job_status === 'in_progress') jobsByDate[date].inProgress++;
      else jobsByDate[date].pending++;
    });

    // Sort dates
    const sortedDates = Object.keys(jobsByDate).sort();

    const datasets = [
      {
        label: 'Total Jobs',
        data: sortedDates.map(date => jobsByDate[date].total),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Completed',
        data: sortedDates.map(date => jobsByDate[date].completed),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'In Progress',
        data: sortedDates.map(date => jobsByDate[date].inProgress),
        borderColor: 'rgb(251, 191, 36)',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        tension: 0.4,
        fill: true,
      }
    ];

    return {
      labels: sortedDates,
      datasets
    };
  }, [data, jobTypeFilter]);

  const options = {
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
      title: {
        display: true,
        text: `Job Trends ${jobTypeFilter !== 'all' ? `(${jobTypeFilter})` : ''}`,
        font: {
          size: 16,
          weight: 'bold'
        },
        padding: 20
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
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
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  if (!chartData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <TrendingUp className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Job Data Available</h3>
        <p className="text-slate-600">Job trend data will appear here once jobs are processed.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl">
            <TrendingUp className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Job Trends</h3>
            <p className="text-sm text-slate-600">Daily job completion patterns</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      <div className="h-80">
        {chartType === 'bar' ? (
          <Bar data={chartData} options={options} />
        ) : (
          <Line data={chartData} options={options} />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <div className="flex items-center gap-4">
          <span>Total Jobs: {chartData.datasets[0].data.reduce((a, b) => a + b, 0)}</span>
          <span>Completed: {chartData.datasets[1].data.reduce((a, b) => a + b, 0)}</span>
          <span>Avg Daily: {(chartData.datasets[0].data.reduce((a, b) => a + b, 0) / chartData.labels.length).toFixed(1)}</span>
        </div>
      </div>
    </div>
  );
}
