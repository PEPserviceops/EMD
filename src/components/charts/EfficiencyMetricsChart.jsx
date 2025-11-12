/**
 * Efficiency Metrics Chart Component
 * Displays truck efficiency scores, route optimization metrics, and performance trends
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
import { Line, Bar, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Truck, Zap, TrendingUp, Target, Activity } from 'lucide-react';

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

export default function EfficiencyMetricsChart({ data, dateRange, chartType = 'scores' }) {
  const chartData = useMemo(() => {
    if (!data?.data) return null;

    if (chartType === 'scores') {
      // Efficiency scores over time
      const scoresByDate = {};
      data.data.forEach(metric => {
        const date = new Date(metric.date || metric.timestamp).toISOString().split('T')[0];
        if (!scoresByDate[date]) {
          scoresByDate[date] = [];
        }
        if (metric.efficiency_score !== undefined) {
          scoresByDate[date].push(metric.efficiency_score);
        }
      });

      const sortedDates = Object.keys(scoresByDate).sort();
      const avgScores = sortedDates.map(date =>
        scoresByDate[date].reduce((a, b) => a + b, 0) / scoresByDate[date].length
      );

      return {
        labels: sortedDates,
        datasets: [{
          label: 'Average Efficiency Score',
          data: avgScores,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    } else if (chartType === 'trucks') {
      // Individual truck performance
      const truckScores = {};
      data.data.forEach(metric => {
        if (!truckScores[metric.truck_id]) {
          truckScores[metric.truck_id] = [];
        }
        if (metric.efficiency_score !== undefined) {
          truckScores[metric.truck_id].push(metric.efficiency_score);
        }
      });

      const truckIds = Object.keys(truckScores);
      const avgScores = truckIds.map(id =>
        truckScores[id].reduce((a, b) => a + b, 0) / truckScores[id].length
      );

      return {
        labels: truckIds,
        datasets: [{
          label: 'Efficiency Score by Truck',
          data: avgScores,
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        }]
      };
    } else if (chartType === 'miles') {
      // Miles analysis
      const milesData = data.data
        .filter(metric => metric.total_miles !== undefined && metric.excess_miles !== undefined)
        .map(metric => ({
          x: metric.total_miles,
          y: metric.excess_miles,
          truck: metric.truck_id
        }));

      return {
        datasets: [{
          label: 'Miles Efficiency',
          data: milesData,
          backgroundColor: 'rgba(251, 191, 36, 0.6)',
          borderColor: 'rgb(251, 191, 36)',
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

    if (type === 'scores') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Efficiency Score Trends',
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
            max: 100,
            grid: { color: 'rgba(0, 0, 0, 0.1)' },
            ticks: {
              callback: (value) => `${value}%`
            }
          }
        }
      };
    } else if (type === 'trucks') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Truck Efficiency Comparison',
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
          }
        }
      };
    } else if (type === 'miles') {
      return {
        ...baseOptions,
        plugins: {
          ...baseOptions.plugins,
          title: {
            display: true,
            text: 'Miles Efficiency Analysis',
            font: { size: 16, weight: 'bold' },
            padding: 20
          },
          tooltip: {
            ...baseOptions.plugins.tooltip,
            callbacks: {
              label: (context) => [
                `Truck: ${context.raw.truck}`,
                `Total Miles: ${context.parsed.x}`,
                `Excess Miles: ${context.parsed.y}`
              ]
            }
          }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Total Miles Driven'
            },
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          },
          y: {
            title: {
              display: true,
              text: 'Excess Miles'
            },
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.1)' }
          }
        }
      };
    }

    return baseOptions;
  };

  if (!chartData) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-center">
        <Truck className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Efficiency Data Available</h3>
        <p className="text-slate-600">Efficiency metrics will appear here once route optimization runs.</p>
      </div>
    );
  }

  const renderChart = () => {
    if (chartType === 'scores') {
      return <Line data={chartData} options={getOptions('scores')} />;
    } else if (chartType === 'trucks') {
      return <Bar data={chartData} options={getOptions('trucks')} />;
    } else if (chartType === 'miles') {
      return <Scatter data={chartData} options={getOptions('miles')} />;
    }
  };

  const getStats = () => {
    if (!data?.data) return null;

    const validMetrics = data.data.filter(m => m.efficiency_score !== undefined);
    const avgEfficiency = validMetrics.length > 0
      ? (validMetrics.reduce((sum, m) => sum + m.efficiency_score, 0) / validMetrics.length).toFixed(1)
      : 0;

    const totalMiles = data.data
      .filter(m => m.total_miles !== undefined)
      .reduce((sum, m) => sum + m.total_miles, 0);

    const excessMiles = data.data
      .filter(m => m.excess_miles !== undefined)
      .reduce((sum, m) => sum + m.excess_miles, 0);

    const fuelSaved = data.data
      .filter(m => m.fuel_saved !== undefined)
      .reduce((sum, m) => sum + m.fuel_saved, 0);

    return {
      avgEfficiency,
      totalMiles: totalMiles.toLocaleString(),
      excessMiles: excessMiles.toLocaleString(),
      fuelSaved: fuelSaved.toFixed(1)
    };
  };

  const stats = getStats();

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-green-100 to-emerald-100 p-3 rounded-xl">
            <Zap className="text-green-600" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Efficiency Metrics</h3>
            <p className="text-sm text-slate-600">
              {chartType === 'scores' && 'Efficiency score trends over time'}
              {chartType === 'trucks' && 'Individual truck performance'}
              {chartType === 'miles' && 'Miles driven vs excess miles analysis'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Activity size={16} />
          <span>{dateRange.start} to {dateRange.end}</span>
        </div>
      </div>

      <div className="h-80">
        {renderChart()}
      </div>

      {stats && (
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.avgEfficiency}%</div>
            <div className="text-slate-600">Avg Efficiency</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.totalMiles}</div>
            <div className="text-slate-600">Total Miles</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.excessMiles}</div>
            <div className="text-slate-600">Excess Miles</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-slate-900">{stats.fuelSaved} gal</div>
            <div className="text-slate-600">Fuel Saved</div>
          </div>
        </div>
      )}
    </div>
  );
}
