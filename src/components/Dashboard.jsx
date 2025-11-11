/**
 * Enhanced Dashboard Component with Predictive Analytics
 * Main dashboard view for Exception Management Dashboard with AI-powered insights
 */

import React, { useState, useEffect, useRef } from 'react';
import AlertCard from './AlertCard';
import PredictiveAnalytics from './PredictiveAnalytics';
import RouteOptimization from './RouteOptimization';
import { Activity, Clock, TrendingUp, AlertCircle, RefreshCw, Wifi, WifiOff, Brain, BarChart3, Navigation } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'predictions', or 'route-optimization'
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiStatus, setApiStatus] = useState('Connecting...');
  const [filter, setFilter] = useState('all'); // all, critical, high, medium, low
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newAlertCount, setNewAlertCount] = useState(0);
  const previousAlertCount = useRef(0);
  const audioRef = useRef(null);

  // Fetch alerts from API
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Play sound for new high-priority alerts
  useEffect(() => {
    if (alerts.length > previousAlertCount.current) {
      const newAlerts = alerts.slice(0, alerts.length - previousAlertCount.current);
      const hasHighPriority = newAlerts.some(a =>
        (a.severity === 'HIGH' || a.severity === 'CRITICAL') && !a.acknowledged
      );

      if (hasHighPriority && audioRef.current) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }

      setNewAlertCount(alerts.length - previousAlertCount.current);
      setTimeout(() => setNewAlertCount(0), 3000);
    }
    previousAlertCount.current = alerts.length;
  }, [alerts]);

  const fetchAlerts = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();

      setAlerts(data.alerts || []);
      setStats(data.stats || stats);
      setLastUpdate(new Date().toLocaleTimeString());
      setApiStatus('Connected');
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setApiStatus('Error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acknowledgedBy: 'user' })
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismiss = async (alertId) => {
    try {
      await fetch(`/api/alerts/${alertId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dismissedBy: 'user' })
      });
      fetchAlerts();
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Filter alerts based on selected filter
  const filteredAlerts = filter === 'all' 
    ? alerts 
    : alerts.filter(alert => alert.severity === filter.toUpperCase());

  // Group alerts by severity
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  const highAlerts = alerts.filter(a => a.severity === 'HIGH');
  const mediumAlerts = alerts.filter(a => a.severity === 'MEDIUM');
  const lowAlerts = alerts.filter(a => a.severity === 'LOW');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Exception Management Dashboard
              </h1>
              <p className="text-sm text-slate-600 mt-2 font-medium">
                Real-time operational intelligence for PepMove Logistics
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* New Alert Indicator */}
              {newAlertCount > 0 && (
                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full text-xs font-bold animate-bounce shadow-lg shadow-red-500/50">
                  +{newAlertCount} New Alert{newAlertCount > 1 ? 's' : ''}
                </div>
              )}

              {/* Refresh Button */}
              <button
                onClick={fetchAlerts}
                disabled={isRefreshing}
                className={`p-3 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-md hover:shadow-lg border border-slate-200 ${
                  isRefreshing ? 'animate-spin' : ''
                }`}
                title="Refresh alerts"
              >
                <RefreshCw size={20} className="text-slate-700" />
              </button>

              {/* Last Update Time */}
              <div className="text-right bg-white/60 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                  <Clock size={13} />
                  Last Update
                </p>
                <p className="text-sm font-bold text-slate-900">{lastUpdate || 'Loading...'}</p>
              </div>

              {/* Connection Status */}
              <div className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md ${
                apiStatus === 'Connected'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-green-500/30'
                  : 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/30'
              }`}>
                {apiStatus === 'Connected' ? (
                  <Wifi size={16} />
                ) : (
                  <WifiOff size={16} />
                )}
                {apiStatus}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Enhanced Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-8 pt-6">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-2">
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'alerts'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <AlertCircle size={20} />
              <span>Real-time Alerts</span>
              {stats.total > 0 && (
                <span className="bg-white/20 px-2 py-1 rounded-full text-xs font-bold">
                  {stats.total}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('predictions')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'predictions'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Brain size={20} />
              <span>AI Predictions</span>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            </button>

            <button
              onClick={() => setActiveTab('route-optimization')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'route-optimization'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <Navigation size={20} />
              <span>Route Optimization</span>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {activeTab === 'alerts' ? (
          <div className="space-y-8">
            {/* Stats Bar */}
            <div className="grid grid-cols-5 gap-5">
              <StatCard
                title="Total Alerts"
                value={stats.total}
                icon={AlertCircle}
                color="blue"
                active={filter === 'all'}
                onClick={() => setFilter('all')}
              />
              <StatCard
                title="Critical"
                value={stats.critical}
                icon={AlertCircle}
                color="red"
                active={filter === 'critical'}
                onClick={() => setFilter('critical')}
              />
              <StatCard
                title="High"
                value={stats.high}
                icon={AlertCircle}
                color="orange"
                active={filter === 'high'}
                onClick={() => setFilter('high')}
              />
              <StatCard
                title="Medium"
                value={stats.medium}
                icon={AlertCircle}
                color="yellow"
                active={filter === 'medium'}
                onClick={() => setFilter('medium')}
              />
              <StatCard
                title="Low"
                value={stats.low}
                icon={AlertCircle}
                color="green"
                active={filter === 'low'}
                onClick={() => setFilter('low')}
              />
            </div>

            {/* Alert Sections */}
            <div className="space-y-6">
              {/* Critical Alerts Section */}
              {(filter === 'all' || filter === 'critical') && criticalAlerts.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-red-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="drop-shadow-md" size={24} />
                    Critical Issues ({criticalAlerts.length})
                  </h2>
                  <div className="space-y-3">
                    {criticalAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* High Priority Alerts */}
              {(filter === 'all' || filter === 'high') && highAlerts.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-orange-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="drop-shadow-md" size={24} />
                    High Priority ({highAlerts.length})
                  </h2>
                  <div className="space-y-3">
                    {highAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Medium Priority Alerts */}
              {(filter === 'all' || filter === 'medium') && mediumAlerts.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-amber-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="drop-shadow-md" size={24} />
                    Medium Priority ({mediumAlerts.length})
                  </h2>
                  <div className="space-y-3">
                    {mediumAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Low Priority Alerts */}
              {(filter === 'all' || filter === 'low') && lowAlerts.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold text-emerald-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="drop-shadow-md" size={24} />
                    Low Priority ({lowAlerts.length})
                  </h2>
                  <div className="space-y-3">
                    {lowAlerts.map(alert => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onAcknowledge={handleAcknowledge}
                        onDismiss={handleDismiss}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* No Alerts Message */}
              {filteredAlerts.length === 0 && (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
                  <div className="bg-gradient-to-br from-emerald-100 to-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <Activity className="text-emerald-600" size={40} />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">
                    No Active Alerts
                  </h3>
                  <p className="text-slate-600 text-lg">
                    All systems are operating normally. Great job!
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : activeTab === 'predictions' ? (
          <PredictiveAnalytics />
        ) : (
          <RouteOptimization />
        )}
      </div>

      {/* Audio element for alert notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0vBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvsA==" type="audio/wav" />
      </audio>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon: Icon, color, active, onClick }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-indigo-600',
      shadow: 'shadow-blue-500/30',
      ring: 'ring-blue-400'
    },
    red: {
      bg: 'from-red-500 to-rose-600',
      shadow: 'shadow-red-500/30',
      ring: 'ring-red-400'
    },
    orange: {
      bg: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-500/30',
      ring: 'ring-orange-400'
    },
    yellow: {
      bg: 'from-amber-400 to-orange-500',
      shadow: 'shadow-amber-500/30',
      ring: 'ring-amber-400'
    },
    green: {
      bg: 'from-emerald-500 to-green-600',
      shadow: 'shadow-emerald-500/30',
      ring: 'ring-emerald-400'
    }
  };

  const config = colorClasses[color];
  const activeClass = active ? `ring-4 ${config.ring} scale-105` : 'hover:scale-105';

  return (
    <button
      onClick={onClick}
      className={`bg-gradient-to-br ${config.bg} text-white ${activeClass} rounded-2xl p-6 text-left transition-all duration-300 hover:shadow-2xl ${config.shadow} cursor-pointer shadow-lg backdrop-blur-sm border border-white/20 group`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl group-hover:bg-white/30 transition-all duration-300 shadow-lg">
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <span className="text-4xl font-black drop-shadow-lg">{value}</span>
      </div>
      <p className="text-sm font-bold uppercase tracking-wider opacity-90">{title}</p>
    </button>
  );
}
