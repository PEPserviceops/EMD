/**
 * Job Type Distribution Chart Component
 * Displays distribution of job types (Delivery, Pickup, Move, Recover, Drop, Shuttle)
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Package, Truck, MapPin, RotateCcw, ArrowDown, Shuffle } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function JobTypeDistributionChart({ data, dateRange, chartType = 'doughnut' }) {
  const chartData = useMemo(() => {
    if (!data?.data) return null;

    // Job type icons and colors
    const jobTypeConfig = {
      'Delivery': { icon: Package, color: 'rgba(59, 130, 246, 0.8)', borderColor: 'rgb(59, 130, 246)' },
      'Pickup': { icon: ArrowDown, color: 'rgba(34, 197, 94, 0.8)', borderColor: 'rgb(34, 197, 94)' },
      'Move': { icon: Shuffle, color: 'rgba(251, 191, 36, 0.8)', borderColor: 'rgb(251, 191, 36)' },
      'Recover': { icon: RotateCcw, color: 'rgba(239, 68, 68, 0.8)', borderColor: 'rgb(239, 68, 68)' },
      'Drop': { icon: MapPin, color: 'rgba(168, 85, 247, 0.8)', borderColor: 'rgb(168, 85, 247)' },
      'Shuttle': { icon: Truck, color: 'rgba(6, 182, 212, 0.8)', borderColor: 'rgb(6, 182, 212)' }
    };

    // Count jobs by type
    const typeCounts = {};
    data.data.forEach(job => {
      const type = job.job_type || 'Unknown';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });

    const labels = Object.keys(typeCounts);
    const values = Object.values(typeCounts);

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: labels.map(label => jobTypeConfig[label]?.color || 'rgba(156, 163, 175, 0.8)'),
        borderColor: labels.map(label => jobTypeConfig[label]?.borderColor || 'rgb(156, 163, 175)'),
        borderWidth: 2,
      }]
    };
  }, [data]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return datasets[0].data.map((data, i) => ({
              text: `${chart.data.labels[i]} (${data})`,
              fillStyle: datasets[0].backgroundColor[i],
              strokeStyle: datasets[0].borderColor[i],
              lineWidth: datasets[0].borderWidth,
              hidden: !chart.getDataVisibility(i),
              index: i
            }));
          }
        }
      },
      title: {
        display: true,
        text: 'Job Type Distribution',
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
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed} (${percentage}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Job Type Distribution',
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
          label: (context) => {
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.parsed.y / total) * 100).toFixed(1);
            return `${context.label}: ${context.parsed.y} (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  if (!chartData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <Package className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Job Data Available</h3>
        <p className="text-slate-600">Job type distribution will appear here once jobs are processed.</p>
      </div>
    );
  }

  const getStats = () => {
    if (!chartData) return null;

    const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
    const mostCommon = chartData.labels[chartData.datasets[0].data.indexOf(Math.max(...chartData.datasets[0].data))];
    const types = chartData.labels.length;

    return { total, mostCommon, types };
  };

  const stats = getStats();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-xl">
            <Package className="text-blue-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Job Type Distribution</h3>
            <p className="text-sm text-slate-600">Breakdown of job types by volume</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <MapPin size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      <div className="h-80">
        {chartType === 'bar' ? (
          <Bar data={chartData} options={barOptions} />
        ) : (
          <Doughnut data={chartData} options={options} />
        )}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.total}</div>
            <div className="text-slate-600">Total Jobs</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.mostCommon}</div>
            <div className="text-slate-600">Most Common</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.types}</div>
            <div className="text-slate-600">Job Types</div>
          </div>
        </div>
      )}

      {/* Job Type Legend with Icons */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3">
        {chartData.labels.map((type, index) => {
          const config = {
            'Delivery': { icon: Package, color: 'text-blue-600' },
            'Pickup': { icon: ArrowDown, color: 'text-green-600' },
            'Move': { icon: Shuffle, color: 'text-yellow-600' },
            'Recover': { icon: RotateCcw, color: 'text-red-600' },
            'Drop': { icon: MapPin, color: 'text-purple-600' },
            'Shuttle': { icon: Truck, color: 'text-cyan-600' }
          }[type] || { icon: Package, color: 'text-slate-600' };

          const IconComponent = config.icon;

          return (
            <div key={type} className="flex items-center gap-2 text-sm">
              <IconComponent className={`w-4 h-4 ${config.color}`} />
              <span className="text-slate-700">{type}</span>
              <span className="text-slate-500 ml-auto">
                {chartData.datasets[0].data[index]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
