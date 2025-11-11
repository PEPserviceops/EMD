/**
 * Route Optimization Dashboard Component
 * 
 * Intelligent Route Optimization & Dynamic Dispatch Center
 * Provides real-time route optimization, vehicle tracking, and dispatch management
 * 
 * @module components/RouteOptimization
 */

import React, { useState, useEffect } from 'react';
import { 
  Navigation, 
  MapPin, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  RefreshCw, 
  Target,
  Users,
  Route,
  Zap,
  Activity,
  CheckCircle,
  XCircle,
  ArrowUpDown
} from 'lucide-react';

export default function RouteOptimization() {
  const [optimizationStatus, setOptimizationStatus] = useState('loading');
  const [vehicles, setVehicles] = useState([]);
  const [optimizedRoutes, setOptimizedRoutes] = useState([]);
  const [dispatchAssignments, setDispatchAssignments] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // overview, vehicles, routes, dispatch, performance

  // Auto-refresh data every 30 seconds
  useEffect(() => {
    loadRouteOptimizationData();
    const interval = setInterval(loadRouteOptimizationData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadRouteOptimizationData = async () => {
    try {
      setOptimizationStatus('loading');
      
      // Load all route optimization data
      const [statusResponse, vehiclesResponse, performanceResponse] = await Promise.all([
        fetch('/api/route-optimization?action=status'),
        fetch('/api/route-optimization?action=vehicles'),
        fetch('/api/route-optimization?action=performance')
      ]);

      const statusData = await statusResponse.json();
      const vehiclesData = await vehiclesResponse.json();
      const performanceData = await performanceResponse.json();

      if (statusData.success) {
        setOptimizationStatus('operational');
        setVehicles(vehiclesData.vehicles || []);
        setPerformanceMetrics(performanceData.performance || {});
        setLastUpdate(new Date().toLocaleTimeString());
      }

    } catch (error) {
      console.error('Failed to load route optimization data:', error);
      setOptimizationStatus('error');
    }
  };

  const handleOptimizeRoutes = async () => {
    setIsOptimizing(true);
    try {
      // Get current active jobs (mock data for demonstration)
      const mockJobs = [
        {
          id: 'JOB_001',
          priority: 'HIGH',
          location: { lat: 39.7392, lng: -104.9903 },
          dueDate: '2025-11-11T15:00:00Z'
        },
        {
          id: 'JOB_002', 
          priority: 'MEDIUM',
          location: { lat: 39.7506, lng: -105.0205 },
          dueDate: '2025-11-11T16:00:00Z'
        }
      ];

      const mockVehicles = vehicles.map(vehicle => ({
        id: vehicle.id,
        driverId: vehicle.driverId,
        location: vehicle.location,
        capacity: vehicle.capacity,
        currentJobs: 0
      }));

      const response = await fetch('/api/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize',
          jobs: mockJobs,
          vehicles: mockVehicles,
          options: { algorithm: 'nearest_neighbor' }
        })
      });

      const data = await response.json();
      if (data.success) {
        setOptimizedRoutes(data.optimization.routes || []);
      }

    } catch (error) {
      console.error('Route optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleDispatchOptimization = async () => {
    setIsOptimizing(true);
    try {
      const mockJobs = [
        { id: 'JOB_001', priority: 'URGENT', location: { lat: 39.7392, lng: -104.9903 } },
        { id: 'JOB_002', priority: 'HIGH', location: { lat: 39.7506, lng: -105.0205 } },
        { id: 'JOB_003', priority: 'MEDIUM', location: { lat: 39.6877, lng: -104.9613 } }
      ];

      const mockDrivers = vehicles.map(vehicle => ({
        id: vehicle.driverId,
        vehicleId: vehicle.id,
        currentJobs: 0,
        status: 'active'
      }));

      const response = await fetch('/api/route-optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'dispatch',
          jobs: mockJobs,
          vehicles: mockDrivers,
          options: {}
        })
      });

      const data = await response.json();
      if (data.success) {
        setDispatchAssignments(data.dispatch.assignments || []);
      }

    } catch (error) {
      console.error('Dispatch optimization failed:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'operational': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getEfficiencyGrade = (efficiency) => {
    if (efficiency >= 90) return { grade: 'A', color: 'text-green-600', bg: 'bg-green-100' };
    if (efficiency >= 80) return { grade: 'B', color: 'text-blue-600', bg: 'bg-blue-100' };
    if (efficiency >= 70) return { grade: 'C', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { grade: 'D', color: 'text-red-600', bg: 'bg-red-100' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-lg">
              <Navigation className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Route Optimization & Dispatch</h2>
              <p className="text-slate-600 mt-1">Intelligent routing and dynamic dispatch management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Status Indicator */}
            <div className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
              optimizationStatus === 'operational' 
                ? 'bg-emerald-100 text-emerald-700' 
                : optimizationStatus === 'loading'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}>
              <Activity size={16} />
              {optimizationStatus === 'operational' ? 'Operational' : 
               optimizationStatus === 'loading' ? 'Loading...' : 'Error'}
            </div>

            {/* Last Update */}
            <div className="text-right bg-slate-50 px-4 py-2 rounded-xl">
              <p className="text-xs text-slate-500">Last Update</p>
              <p className="text-sm font-bold text-slate-900">{lastUpdate || 'Loading...'}</p>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadRouteOptimizationData}
              className="p-3 rounded-xl bg-white hover:bg-slate-50 transition-all shadow-md hover:shadow-lg border border-slate-200"
              title="Refresh route optimization data"
            >
              <RefreshCw size={20} className="text-slate-700" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-1">
        <div className="flex space-x-1">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'vehicles', label: 'Vehicles', icon: MapPin },
            { id: 'routes', label: 'Optimized Routes', icon: Route },
            { id: 'dispatch', label: 'Dispatch', icon: Users },
            { id: 'performance', label: 'Performance', icon: Target }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeView === tab.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content based on active view */}
      {activeView === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Optimization Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Zap className="text-blue-600" size={20} />
                Optimization Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleOptimizeRoutes}
                  disabled={isOptimizing}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    isOptimizing
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">Optimize Routes</p>
                      <p className="text-sm opacity-90">Find optimal routes for all vehicles</p>
                    </div>
                    <Route size={20} />
                  </div>
                </button>

                <button
                  onClick={handleDispatchOptimization}
                  disabled={isOptimizing}
                  className={`w-full p-3 rounded-xl text-left transition-all ${
                    isOptimizing
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold">Optimize Dispatch</p>
                      <p className="text-sm opacity-90">Balance workload and assign jobs</p>
                    </div>
                    <Users size={20} />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="lg:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Target className="text-green-600" size={20} />
                Performance Overview
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">{vehicles.length}</div>
                  <div className="text-sm text-slate-600 font-medium">Active Vehicles</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">{optimizedRoutes.length}</div>
                  <div className="text-sm text-slate-600 font-medium">Optimized Routes</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-yellow-600">{dispatchAssignments.length}</div>
                  <div className="text-sm text-slate-600 font-medium">Dispatch Assignments</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">95%</div>
                  <div className="text-sm text-slate-600 font-medium">Efficiency Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeView === 'vehicles' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <MapPin className="text-blue-600" size={20} />
            Vehicle Locations & Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900">{vehicle.name}</h4>
                  <div className={`w-3 h-3 rounded-full ${
                    vehicle.isOnline ? 'bg-green-500' : 'bg-red-500'
                  }`}></div>
                </div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Driver:</span>
                    <span className="font-medium">{vehicle.driverId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className={`font-medium ${vehicle.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                      {vehicle.status}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span className="font-medium">{vehicle.speed || 0} mph</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fuel:</span>
                    <span className="font-medium">{vehicle.fuelLevel || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jobs:</span>
                    <span className="font-medium">{vehicle.currentJobs || 0}</span>
                  </div>
                </div>
                {vehicle.trafficConditions && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <div className="flex justify-between text-sm">
                      <span>Traffic:</span>
                      <span className={`font-medium capitalize ${
                        vehicle.trafficConditions === 'light' ? 'text-green-600' :
                        vehicle.trafficConditions === 'normal' ? 'text-blue-600' :
                        vehicle.trafficConditions === 'heavy' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {vehicle.trafficConditions}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeView === 'routes' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Route className="text-green-600" size={20} />
            Optimized Routes
          </h3>
          {optimizedRoutes.length === 0 ? (
            <div className="text-center py-12">
              <Route className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 text-lg">No optimized routes available</p>
              <p className="text-slate-500">Click "Optimize Routes" to generate route plans</p>
            </div>
          ) : (
            <div className="space-y-4">
              {optimizedRoutes.map((route, index) => {
                const efficiency = getEfficiencyGrade(route.efficiency || 'B');
                return (
                  <div key={index} className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900">{route.vehicle?.name || `Vehicle ${route.vehicleId}`}</h4>
                        <div className={`px-2 py-1 rounded-lg text-sm font-bold ${efficiency.bg} ${efficiency.color}`}>
                          Grade {efficiency.grade}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-600">
                        <div>{route.totalDistance?.toFixed(1) || 0} miles</div>
                        <div>{route.jobs?.length || 0} jobs</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Total Distance:</span>
                        <div className="font-bold">{route.totalDistance?.toFixed(1) || 0} mi</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Deadhead:</span>
                        <div className="font-bold">{route.deadheadDistance?.toFixed(1) || 0} mi</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Efficiency:</span>
                        <div className="font-bold">{efficiency.grade}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Savings:</span>
                        <div className="font-bold text-green-600">
                          {route.savings?.distance?.toFixed(1) || 0} mi saved
                        </div>
                      </div>
                    </div>
                    {route.jobs && route.jobs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="text-sm text-slate-600 mb-2">Route Stops:</div>
                        <div className="flex flex-wrap gap-2">
                          {route.jobs.map((job, jobIndex) => (
                            <div key={jobIndex} className="bg-white px-2 py-1 rounded text-xs font-medium text-slate-700">
                              {job.id}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'dispatch' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="text-purple-600" size={20} />
            Dispatch Assignments
          </h3>
          {dispatchAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="mx-auto text-slate-400 mb-4" size={48} />
              <p className="text-slate-600 text-lg">No dispatch assignments available</p>
              <p className="text-slate-500">Click "Optimize Dispatch" to create assignments</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dispatchAssignments.map((assignment, index) => (
                <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-slate-900">Job: {assignment.job?.id || 'Unknown'}</h4>
                      <div className={`px-2 py-1 rounded-lg text-sm font-bold ${
                        assignment.assigned ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {assignment.assigned ? 'Assigned' : 'Unassigned'}
                      </div>
                    </div>
                    <div className="text-right text-sm text-slate-600">
                      <div>Score: {assignment.assignment?.score?.toFixed(0) || 0}</div>
                      <div>Priority: {assignment.job?.priority || 'MEDIUM'}</div>
                    </div>
                  </div>
                  {assignment.assigned && assignment.assignment && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-slate-500">Driver:</span>
                        <div className="font-bold">{assignment.assignment.driver?.driverId || 'Unknown'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Vehicle:</span>
                        <div className="font-bold">{assignment.assignment.driver?.name || 'Unknown'}</div>
                      </div>
                      <div>
                        <span className="text-slate-500">ETA:</span>
                        <div className="font-bold">{assignment.assignment.estimatedTime || 0} min</div>
                      </div>
                      <div>
                        <span className="text-slate-500">Efficiency:</span>
                        <div className="font-bold text-green-600">
                          {assignment.assignment.efficiency?.toFixed(1) || 0}%
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-purple-200">
                    <div className="text-sm text-slate-600">
                      <strong>Reason:</strong> {assignment.reason || 'Optimal match'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'performance' && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Target className="text-orange-600" size={20} />
            Performance Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Dispatch Efficiency</h4>
              <div className="text-3xl font-bold text-blue-600">
                {performanceMetrics.dispatchEfficiency || 0}%
              </div>
              <div className="text-sm text-slate-600 mt-2">
                {performanceMetrics.totalDispatches || 0} dispatches processed
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Response Time</h4>
              <div className="text-3xl font-bold text-green-600">
                {performanceMetrics.responseTime || 0} min
              </div>
              <div className="text-sm text-slate-600 mt-2">Average dispatch time</div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Workload Balance</h4>
              <div className="text-3xl font-bold text-yellow-600">
                {performanceMetrics.workloadBalance || 0}%
              </div>
              <div className="text-sm text-slate-600 mt-2">Driver workload distribution</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Reassignment Rate</h4>
              <div className="text-3xl font-bold text-purple-600">
                {performanceMetrics.reassignmentRate || 0}%
              </div>
              <div className="text-sm text-slate-600 mt-2">Jobs reassigned for optimization</div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Emergency Handling</h4>
              <div className="text-3xl font-bold text-red-600">
                {performanceMetrics.emergencyHandling || 0}%
              </div>
              <div className="text-sm text-slate-600 mt-2">Emergency response success rate</div>
            </div>

            <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Overall Score</h4>
              <div className="text-3xl font-bold text-slate-700">
                {Math.round(((performanceMetrics.dispatchEfficiency || 0) + 
                             (performanceMetrics.workloadBalance || 0) + 
                             (performanceMetrics.emergencyHandling || 0)) / 3)}%
              </div>
              <div className="text-sm text-slate-600 mt-2">Combined performance score</div>
            </div>
          </div>

          {performanceMetrics.insights && performanceMetrics.insights.length > 0 && (
            <div className="mt-6 p-4 bg-slate-50 rounded-xl">
              <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={20} />
                Performance Insights
              </h4>
              <div className="space-y-2">
                {performanceMetrics.insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-slate-700">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}