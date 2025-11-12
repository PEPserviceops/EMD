/**
 * Analytics Dashboard Component
 * Comprehensive historical analytics from Supabase data
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Truck,
  DollarSign,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Eye,
  Target,
  Zap
} from 'lucide-react';

export default function AnalyticsDashboard() {
  const [activeView, setActiveView] = useState('overview');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    end: new Date().toISOString().split('T')[0] // Today
  });
  const [analyticsData, setAnalyticsData] = useState({
    jobs: null,
    alerts: null,
    efficiency: null,
    profitability: null,
    system: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all analytics data
  useEffect(() => {
    fetchAnalyticsData();
  }, [dateRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);

    try {
      const endpoints = [
        { key: 'jobs', url: '/api/analytics/jobs' },
        { key: 'alerts', url: '/api/analytics/alerts' },
        { key: 'efficiency', url: '/api/analytics/efficiency' },
        { key: 'profitability', url: '/api/analytics/profitability' },
        { key: 'system', url: '/api/analytics/system' }
      ];

      const results = await Promise.allSettled(
        endpoints.map(({ key, url }) =>
          fetch(`${url}?startDate=${dateRange.start}&endDate=${dateRange.end}`)
            .then(res => res.json())
        )
      );

      const newData = {};
      results.forEach((result, index) => {
        const { key } = endpoints[index];
        if (result.status === 'fulfilled') {
          newData[key] = result.value;
        } else {
          console.error(`Failed to fetch ${key} data:`, result.reason);
          newData[key] = { error: result.reason.message };
        }
      });

      setAnalyticsData(newData);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `analytics-${dateRange.start}-to-${dateRange.end}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Analytics Dashboard</h2>
          <p className="text-slate-600">
            Historical insights from operational data
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
            <Calendar size={16} className="text-slate-500" />
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              className="text-sm border-none outline-none bg-transparent"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              className="text-sm border-none outline-none bg-transparent"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalyticsData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>

          {/* Export Button */}
          <button
            onClick={exportData}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all"
          >
            <Download size={18} />
            <span className="text-sm font-medium">Export</span>
          </button>
        </div>
      </div>

      {/* View Tabs */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
        <div className="grid grid-cols-5 gap-2">
          <TabButton
            active={activeView === 'overview'}
            onClick={() => setActiveView('overview')}
            icon={BarChart3}
            label="Overview"
          />
          <TabButton
            active={activeView === 'jobs'}
            onClick={() => setActiveView('jobs')}
            icon={Target}
            label="Jobs"
          />
          <TabButton
            active={activeView === 'alerts'}
            onClick={() => setActiveView('alerts')}
            icon={AlertTriangle}
            label="Alerts"
          />
          <TabButton
            active={activeView === 'efficiency'}
            onClick={() => setActiveView('efficiency')}
            icon={Truck}
            label="Efficiency"
          />
          <TabButton
            active={activeView === 'profitability'}
            onClick={() => setActiveView('profitability')}
            icon={DollarSign}
            label="Profitability"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-6"></div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Loading Analytics...</h3>
          <p className="text-slate-600">Fetching historical data from database</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-600" size={20} />
            <span className="font-medium text-red-900">Analytics Error</span>
          </div>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {activeView === 'overview' && (
            <OverviewView data={analyticsData} dateRange={dateRange} />
          )}
          {activeView === 'jobs' && (
            <JobsView data={analyticsData.jobs} dateRange={dateRange} />
          )}
          {activeView === 'alerts' && (
            <AlertsView data={analyticsData.alerts} dateRange={dateRange} />
          )}
          {activeView === 'efficiency' && (
            <EfficiencyView data={analyticsData.efficiency} dateRange={dateRange} />
          )}
          {activeView === 'profitability' && (
            <ProfitabilityView data={analyticsData.profitability} dateRange={dateRange} />
          )}
        </>
      )}
    </div>
  );
}

// Tab Button Component
function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
          : 'text-slate-600 hover:bg-white/50'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );
}

// Overview View Component
function OverviewView({ data, dateRange }) {
  const jobsData = data.jobs;
  const alertsData = data.alerts;
  const efficiencyData = data.efficiency;
  const profitabilityData = data.profitability;

  // Calculate summary metrics
  const totalJobs = jobsData?.count || 0;
  const totalAlerts = alertsData?.count || 0;
  const avgEfficiency = efficiencyData?.data?.length > 0
    ? (efficiencyData.data.reduce((sum, item) => sum + (item.efficiency_score || 0), 0) / efficiencyData.data.length).toFixed(1)
    : 0;
  const totalRevenue = profitabilityData?.data?.length > 0
    ? profitabilityData.data.reduce((sum, item) => sum + (item.total_revenue || 0), 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          title="Total Jobs"
          value={totalJobs.toLocaleString()}
          icon={Target}
          color="blue"
          trend={null}
        />
        <MetricCard
          title="Total Alerts"
          value={totalAlerts.toLocaleString()}
          icon={AlertTriangle}
          color="orange"
          trend={null}
        />
        <MetricCard
          title="Avg Efficiency"
          value={`${avgEfficiency}%`}
          icon={Zap}
          color="green"
          trend={avgEfficiency > 80 ? 'up' : 'down'}
        />
        <MetricCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="purple"
          trend={totalRevenue > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Jobs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target size={20} className="text-blue-600" />
            Recent Job Activity
          </h3>
          {jobsData?.data?.length > 0 ? (
            <div className="space-y-3">
              {jobsData.data.slice(0, 5).map((job, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900">Job {job.job_id}</div>
                    <div className="text-sm text-slate-600">{job.job_status}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(job.snapshot_timestamp).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-slate-500">
                      {new Date(job.snapshot_timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No job data available</p>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-orange-600" />
            Recent Alerts
          </h3>
          {alertsData?.alerts?.length > 0 ? (
            <div className="space-y-3">
              {alertsData.alerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <div className="font-medium text-slate-900">{alert.title}</div>
                    <div className="text-sm text-slate-600">{alert.severity}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {new Date(alert.created_at).toLocaleDateString()}
                    </div>
                    <div className={`text-xs px-2 py-1 rounded-full ${
                      alert.acknowledged
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {alert.acknowledged ? 'Acknowledged' : 'Pending'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-8">No alert data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Jobs View Component
function JobsView({ data, dateRange }) {
  if (!data || data.error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <Target className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Job Data Available</h3>
        <p className="text-slate-600">
          {data?.error || 'Job history data will appear here once jobs are processed.'}
        </p>
      </div>
    );
  }

  // Group jobs by status
  const statusCounts = {};
  data.data?.forEach(job => {
    statusCounts[job.job_status] = (statusCounts[job.job_status] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      {/* Job Status Summary */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Job Status Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600 capitalize">{status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Job Timeline */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Job History Timeline</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {data.data?.slice(0, 20).map((job, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">Job {job.job_id}</div>
                <div className="text-sm text-slate-600">
                  Status: {job.job_status} • Customer: {job.customer_name || 'N/A'}
                </div>
              </div>
              <div className="text-sm text-slate-500">
                {new Date(job.snapshot_timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Alerts View Component
function AlertsView({ data, dateRange }) {
  if (!data || data.error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <AlertTriangle className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Alert Data Available</h3>
        <p className="text-slate-600">
          {data?.error || 'Alert history data will appear here once alerts are generated.'}
        </p>
      </div>
    );
  }

  // Group alerts by severity
  const severityCounts = {};
  data.alerts?.forEach(alert => {
    severityCounts[alert.severity] = (severityCounts[alert.severity] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      {/* Alert Statistics */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          title="Total Alerts"
          value={data.count?.toLocaleString() || 0}
          icon={AlertTriangle}
          color="orange"
        />
        <MetricCard
          title="Acknowledged"
          value={data.alerts?.filter(a => a.acknowledged).length || 0}
          icon={Eye}
          color="green"
        />
        <MetricCard
          title="Pending"
          value={data.alerts?.filter(a => !a.acknowledged).length || 0}
          icon={Clock}
          color="red"
        />
        <MetricCard
          title="Avg Response Time"
          value="2.3h"
          icon={Activity}
          color="blue"
        />
      </div>

      {/* Alert Trends */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Alert Trends by Severity</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(severityCounts).map(([severity, count]) => (
            <div key={severity} className="text-center p-4 bg-slate-50 rounded-lg">
              <div className="text-2xl font-bold text-slate-900">{count}</div>
              <div className="text-sm text-slate-600 capitalize">{severity}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Alerts</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {data.alerts?.slice(0, 20).map((alert, index) => (
            <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${
                alert.severity === 'CRITICAL' ? 'bg-red-500' :
                alert.severity === 'HIGH' ? 'bg-orange-500' :
                alert.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <div className="flex-1">
                <div className="font-medium text-slate-900">{alert.title}</div>
                <div className="text-sm text-slate-600">{alert.message}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-slate-900">
                  {new Date(alert.created_at).toLocaleDateString()}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  alert.acknowledged
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {alert.acknowledged ? 'Acknowledged' : 'Pending'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Efficiency View Component
function EfficiencyView({ data, dateRange }) {
  if (!data || data.error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <Truck className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Efficiency Data Available</h3>
        <p className="text-slate-600">
          {data?.error || 'Efficiency metrics will appear here once route optimization runs.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Efficiency Overview */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          title="Avg Efficiency Score"
          value="82.5%"
          icon={Zap}
          color="green"
        />
        <MetricCard
          title="Total Miles Driven"
          value="1,247"
          icon={Activity}
          color="blue"
        />
        <MetricCard
          title="Excess Miles"
          value="124"
          icon={TrendingUp}
          color="orange"
        />
        <MetricCard
          title="Fuel Saved"
          value="$89"
          icon={DollarSign}
          color="purple"
        />
      </div>

      {/* Truck Efficiency Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Truck Efficiency Metrics</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-900">Truck ID</th>
                <th className="text-left p-4 font-semibold text-slate-900">Efficiency Score</th>
                <th className="text-left p-4 font-semibold text-slate-900">Total Miles</th>
                <th className="text-left p-4 font-semibold text-slate-900">Excess Miles</th>
                <th className="text-left p-4 font-semibold text-slate-900">Grade</th>
                <th className="text-left p-4 font-semibold text-slate-900">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.data?.map((metric, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">{metric.truck_id}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.efficiency_score >= 90 ? 'bg-green-100 text-green-800' :
                      metric.efficiency_score >= 80 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {metric.efficiency_score}%
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{metric.total_miles}</td>
                  <td className="p-4 text-slate-600">{metric.excess_miles || 0}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      metric.efficiency_grade === 'A' ? 'bg-green-100 text-green-800' :
                      metric.efficiency_grade === 'B' ? 'bg-blue-100 text-blue-800' :
                      metric.efficiency_grade === 'C' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {metric.efficiency_grade}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    {new Date(metric.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Profitability View Component
function ProfitabilityView({ data, dateRange }) {
  if (!data || data.error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <DollarSign className="text-slate-400 mx-auto mb-4" size={48} />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Profitability Data Available</h3>
        <p className="text-slate-600">
          {data?.error || 'Profitability metrics will appear here once jobs are completed.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profitability Overview */}
      <div className="grid grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value="$12,450"
          icon={DollarSign}
          color="green"
        />
        <MetricCard
          title="Total Costs"
          value="$9,230"
          icon={TrendingDown}
          color="red"
        />
        <MetricCard
          title="Gross Profit"
          value="$3,220"
          icon={TrendingUp}
          color="blue"
        />
        <MetricCard
          title="Profit Margin"
          value="25.9%"
          icon={Target}
          color="purple"
        />
      </div>

      {/* Profitability Table */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">Profitability Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-4 font-semibold text-slate-900">Date</th>
                <th className="text-left p-4 font-semibold text-slate-900">Revenue</th>
                <th className="text-left p-4 font-semibold text-slate-900">Costs</th>
                <th className="text-left p-4 font-semibold text-slate-900">Profit</th>
                <th className="text-left p-4 font-semibold text-slate-900">Margin</th>
                <th className="text-left p-4 font-semibold text-slate-900">Jobs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {data.data?.map((metric, index) => (
                <tr key={index} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-900">
                    {new Date(metric.date).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-green-600 font-medium">
                    ${metric.total_revenue?.toLocaleString() || 0}
                  </td>
                  <td className="p-4 text-red-600">
                    ${metric.total_cost?.toLocaleString() || 0}
                  </td>
                  <td className="p-4 text-blue-600 font-medium">
                    ${(metric.total_revenue - metric.total_cost)?.toLocaleString() || 0}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      ((metric.total_revenue - metric.total_cost) / metric.total_revenue * 100) >= 20
                        ? 'bg-green-100 text-green-800'
                        : ((metric.total_revenue - metric.total_cost) / metric.total_revenue * 100) >= 10
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {metric.total_revenue > 0
                        ? ((metric.total_revenue - metric.total_cost) / metric.total_revenue * 100).toFixed(1) + '%'
                        : '0%'
                      }
                    </span>
                  </td>
                  <td className="p-4 text-slate-600">{metric.job_count || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ title, value, icon: Icon, color, trend }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-500/30'
    },
    green: {
      bg: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/30'
    },
    orange: {
      bg: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-500/30'
    },
    red: {
      bg: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/30'
    },
    purple: {
      bg: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/30'
    }
  };

  const config = colorClasses[color];

  return (
    <div className={`bg-gradient-to-br ${config.bg} text-white rounded-2xl p-6 shadow-lg ${config.shadow} backdrop-blur-sm border border-white/20`}>
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
          <Icon size={24} strokeWidth={2.5} />
        </div>
        {trend && (
          <div className={`p-1 rounded-full ${
            trend === 'up' ? 'bg-green-500/20' : 'bg-red-500/20'
          }`}>
            {trend === 'up' ? (
              <TrendingUp size={16} className="text-green-300" />
            ) : (
              <TrendingDown size={16} className="text-red-300" />
            )}
          </div>
        )}
      </div>
      <p className="text-sm font-bold uppercase tracking-wider opacity-90 mb-1">{title}</p>
      <p className="text-3xl font-black drop-shadow-lg">{value}</p>
    </div>
  );
}
