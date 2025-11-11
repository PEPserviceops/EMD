/**
 * Enhanced Dashboard Component with Predictive Analytics
 * Main dashboard view for Exception Management Dashboard with AI-powered insights
 */

import React, { useState, useEffect, useRef } from 'react';
import AlertCard from './AlertCard';
import PredictiveAnalytics from './PredictiveAnalytics';
import RouteOptimization from './RouteOptimization';
import { Activity, Clock, TrendingUp, AlertCircle, RefreshCw, Wifi, WifiOff, Brain, BarChart3, Navigation, MapPin, Truck, Zap } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts', 'predictions', 'route-optimization', or 'gps-verification'
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

  // GPS Verification State
  const [gpsStatus, setGpsStatus] = useState(null);
  const [gpsMapping, setGpsMapping] = useState(null);
  const [isGpsLoading, setIsGpsLoading] = useState(false);
  const [lastGpsUpdate, setLastGpsUpdate] = useState(null);

  // Fetch alerts from API
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Fetch GPS verification data
  useEffect(() => {
    if (activeTab === 'gps-verification') {
      fetchGpsData();
    }
  }, [activeTab]);

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

  // Fetch GPS verification data
  const fetchGpsData = async () => {
    setIsGpsLoading(true);
    try {
      // Fetch GPS status
      const statusResponse = await fetch('/api/fleet/gps-status');
      const statusData = await statusResponse.json();
      setGpsStatus(statusData);

      // Fetch truck mapping
      const mappingResponse = await fetch('/api/fleet/truck-mapping');
      const mappingData = await mappingResponse.json();
      setGpsMapping(mappingData);

      setLastGpsUpdate(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching GPS data:', error);
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Manual GPS sync
  const triggerGpsSync = async () => {
    setIsGpsLoading(true);
    try {
      const response = await fetch('/api/fleet/sync-gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      
      if (data.success) {
        // Refresh GPS data after sync
        setTimeout(fetchGpsData, 2000);
      }
    } catch (error) {
      console.error('Error triggering GPS sync:', error);
    } finally {
      setIsGpsLoading(false);
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
          <div className="grid grid-cols-4 gap-2">
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

            <button
              onClick={() => setActiveTab('gps-verification')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === 'gps-verification'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                  : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <MapPin size={20} />
              <span>GPS Verification</span>
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
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
        ) : activeTab === 'route-optimization' ? (
          <RouteOptimization />
        ) : (
          <GpsVerificationPanel 
            gpsStatus={gpsStatus}
            gpsMapping={gpsMapping}
            isGpsLoading={isGpsLoading}
            lastGpsUpdate={lastGpsUpdate}
            onRefresh={fetchGpsData}
            onSync={triggerGpsSync}
          />
        )}
      </div>

      {/* Audio element for alert notifications */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGS57OihUBELTKXh8bllHAU2jdXvzn0vBSh+zPDajzsKElyx6OyrWBUIQ5zd8sFuJAUuhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvs6KFQEQtMpeHxuWUcBTeN1e/OfS8FKH7M8NqPOwsSXLHo7atYFQhDnN3ywW4kBS+Ez/PbiTYGHGq77OihUBELTKXh8bllHAU3jdXvzn0vBSh+zPDajzsKElyx6O2rWBUIQ5zd8sFuJAUvhM/z24k2Bhxqu+zooVARC0yl4fG5ZRwFN43V7859LwUofszw2o87ChJcsejtq1gVCEOc3fLBbiQFL4TP89uJNgYcarvsA==" type="audio/wav" />
      </audio>
    </div>
  );
}

// GPS Verification Panel Component
function GpsVerificationPanel({ gpsStatus, gpsMapping, isGpsLoading, lastGpsUpdate, onRefresh, onSync }) {
  const status = gpsStatus?.gpsStatus;
  const mapping = gpsMapping?.truckMapping;
  const serviceInfo = gpsStatus?.serviceInfo;

  if (isGpsLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto mb-6"></div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Loading GPS Verification Data...</h3>
        <p className="text-slate-600">Fetching fleet locations and verification status</p>
      </div>
    );
  }

  if (!serviceInfo?.enabled) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-16 text-center">
        <div className="bg-gradient-to-br from-orange-100 to-yellow-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
          <MapPin className="text-orange-600" size={40} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3">
          GPS Verification Not Configured
        </h3>
        <p className="text-slate-600 text-lg mb-6">
          Configure SAMSARA_API_KEY in environment variables to enable GPS verification.
        </p>
        <div className="bg-slate-50 rounded-lg p-4 text-left max-w-md mx-auto">
          <h4 className="font-bold text-slate-900 mb-2">Required Configuration:</h4>
          <code className="text-sm text-slate-700">SAMSARA_API_KEY=your_api_key_here</code>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">GPS Verification System</h2>
          <p className="text-slate-600">
            Real-time truck location verification against scheduled jobs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={isGpsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 shadow-sm transition-all"
          >
            <RefreshCw size={18} className={isGpsLoading ? 'animate-spin' : ''} />
            <span className="text-sm font-medium">Refresh</span>
          </button>
          <button
            onClick={onSync}
            disabled={isGpsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl hover:from-cyan-700 hover:to-blue-700 shadow-lg transition-all"
          >
            <Zap size={18} />
            <span className="text-sm font-medium">Sync GPS</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      {status && (
        <div className="grid grid-cols-4 gap-5">
          <GpsStatCard
            title="Total Trucks"
            value={status.totalTrucks}
            icon={Truck}
            color="blue"
          />
          <GpsStatCard
            title="With GPS"
            value={status.trucksWithGps}
            icon={MapPin}
            color="green"
          />
          <GpsStatCard
            title="Active"
            value={status.activeTrucks}
            icon={Activity}
            color="purple"
          />
          <GpsStatCard
            title="Idle"
            value={status.idleTrucks}
            icon={Clock}
            color="orange"
          />
        </div>
      )}

      {/* Service Information */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin size={20} className="text-cyan-600" />
          GPS Integration Status
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${serviceInfo.enabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-slate-700">Service Enabled</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-3 h-3 rounded-full ${serviceInfo.apiConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium text-slate-700">API Configured</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="font-medium text-slate-700">Mappings: {serviceInfo.truckMappings}</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-1">Last GPS Update</p>
            <p className="font-medium text-slate-900">{lastGpsUpdate || 'Never'}</p>
            <p className="text-xs text-slate-500 mt-1">
              Cache size: {serviceInfo.cacheSize} locations
            </p>
          </div>
        </div>
      </div>

      {/* Truck Details */}
      {status?.trucks && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck size={20} className="text-cyan-600" />
              Fleet GPS Status ({status.trucks.length} trucks)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-4 font-semibold text-slate-900">Truck ID</th>
                  <th className="text-left p-4 font-semibold text-slate-900">Status</th>
                  <th className="text-left p-4 font-semibold text-slate-900">GPS Coverage</th>
                  <th className="text-left p-4 font-semibold text-slate-900">Location</th>
                  <th className="text-left p-4 font-semibold text-slate-900">Last Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {status.trucks.map((truck) => (
                  <tr key={truck.truckId} className="hover:bg-slate-50">
                    <td className="p-4 font-medium text-slate-900">{truck.truckId}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        truck.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : truck.status === 'idle'
                          ? 'bg-yellow-100 text-yellow-800'
                          : truck.status === 'no_mapping'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {truck.status === 'active' && <Activity size={12} className="mr-1" />}
                        {truck.status === 'idle' && <Clock size={12} className="mr-1" />}
                        {truck.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {truck.samsaraId ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <MapPin size={12} className="mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Not Mapped
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {truck.location ? (
                        <div>
                          <div>{truck.location.latitude?.toFixed(4)}, {truck.location.longitude?.toFixed(4)}</div>
                          {truck.location.speed !== undefined && (
                            <div className="text-xs text-slate-500">{truck.location.speed} mph</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">No location data</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {truck.lastUpdate ? new Date(truck.lastUpdate).toLocaleTimeString() : 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Truck Mapping */}
      {mapping && Object.keys(mapping).length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Truck size={20} className="text-cyan-600" />
              Truck ID Mappings
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(mapping).map(([fileMakerId, samsaraId]) => (
                <div key={fileMakerId} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-slate-900">{fileMakerId}</span>
                    {samsaraId ? (
                      <MapPin size={16} className="text-green-600" />
                    ) : (
                      <MapPin size={16} className="text-red-400" />
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    <div>Samsara ID: {samsaraId || 'Not mapped'}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {samsaraId ? 'Ready for GPS tracking' : 'No Samsara tracking'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {gpsStatus?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-red-600" size={20} />
            <span className="font-medium text-red-900">GPS Status Error</span>
          </div>
          <p className="text-red-700 mt-1">{gpsStatus.error}</p>
        </div>
      )}
    </div>
  );
}

// GPS Stat Card Component
function GpsStatCard({ title, value, icon: Icon, color }) {
  const colorClasses = {
    blue: {
      bg: 'from-blue-500 to-cyan-600',
      shadow: 'shadow-blue-500/30'
    },
    green: {
      bg: 'from-green-500 to-emerald-600',
      shadow: 'shadow-green-500/30'
    },
    purple: {
      bg: 'from-purple-500 to-indigo-600',
      shadow: 'shadow-purple-500/30'
    },
    orange: {
      bg: 'from-orange-500 to-red-500',
      shadow: 'shadow-orange-500/30'
    }
  };

  const config = colorClasses[color];

  return (
    <div className={`bg-gradient-to-br ${config.bg} text-white rounded-2xl p-6 shadow-lg ${config.shadow} backdrop-blur-sm border border-white/20`}>
      <div className="flex items-center justify-between mb-3">
        <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl shadow-lg">
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <span className="text-4xl font-black drop-shadow-lg">{value}</span>
      </div>
      <p className="text-sm font-bold uppercase tracking-wider opacity-90">{title}</p>
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
