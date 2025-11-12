import React, { useState, useEffect, useCallback } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';
import { MapPin, Truck, User, Clock, AlertTriangle, CheckCircle, RefreshCw, Navigation } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyADz-2xSWWqbquc9KOgd6U40Znlzf3WAdI';

// Google Maps Component
const GoogleMap = ({ center, zoom, markers, onMarkerClick }) => {
  const ref = React.useRef(null);
  const [map, setMap] = React.useState();

  React.useEffect(() => {
    if (ref.current && !map) {
      setMap(new window.google.maps.Map(ref.current, {
        center,
        zoom,
        styles: [
          {
            featureType: 'poi',
            stylers: [{ visibility: 'off' }]
          }
        ]
      }));
    }
  }, [ref, map, center, zoom]);

  React.useEffect(() => {
    if (map) {
      // Clear existing markers
      const existingMarkers = [];
      map.data.forEach((feature) => {
        existingMarkers.push(feature);
      });

      // Add new markers
      markers.forEach((marker) => {
        const markerObj = new window.google.maps.Marker({
          position: marker.position,
          map: map,
          title: marker.title,
          icon: {
            url: marker.icon,
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 32)
          }
        });

        // Add info window
        const infoWindow = new window.google.maps.InfoWindow({
          content: marker.infoContent
        });

        markerObj.addListener('click', () => {
          infoWindow.open(map, markerObj);
          if (onMarkerClick) {
            onMarkerClick(marker);
          }
        });
      });

      // Fit bounds to show all markers
      if (markers.length > 0) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach(marker => {
          bounds.extend(marker.position);
        });
        map.fitBounds(bounds);

        // Don't zoom in too much for single markers
        const listener = window.google.maps.event.addListener(map, 'idle', () => {
          if (map.getZoom() > 15) map.setZoom(15);
          window.google.maps.event.removeListener(listener);
        });
      }
    }
  }, [map, markers, onMarkerClick]);

  return <div ref={ref} className="w-full h-full rounded-lg" />;
};

// Map Loading/Error Components
const renderMap = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="flex items-center justify-center h-full"><RefreshCw className="animate-spin" size={24} /></div>;
    case Status.FAILURE:
      return <div className="flex items-center justify-center h-full text-red-500">Error loading map</div>;
    case Status.SUCCESS:
      return <GoogleMap />;
  }
};

// Fleet Status Dashboard Component
const FleetStatusDashboard = () => {
  const [fleetData, setFleetData] = useState(null);
  const [jobsData, setJobsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTruck, setSelectedTruck] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch fleet data
  const fetchFleetData = useCallback(async () => {
    try {
      setLoading(true);
      const [fleetResponse, jobsResponse] = await Promise.all([
        fetch('/api/fleet/gps-status'),
        fetch('/api/jobs/scheduled?date=' + new Date().toISOString().split('T')[0])
      ]);

      if (!fleetResponse.ok || !jobsResponse.ok) {
        throw new Error('Failed to fetch fleet data');
      }

      const fleetResult = await fleetResponse.json();
      const jobsResult = await jobsResponse.json();

      setFleetData(fleetResult);
      setJobsData(jobsResult.jobs || []);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching fleet data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFleetData();
    // Refresh every 2 minutes
    const interval = setInterval(fetchFleetData, 120000);
    return () => clearInterval(interval);
  }, [fetchFleetData]);

  // Prepare map markers
  const mapMarkers = React.useMemo(() => {
    if (!fleetData?.gpsStatus?.truckLocations) return [];

    return fleetData.gpsStatus.truckLocations.map(truck => {
      // Find associated job
      const job = jobsData.find(j => j.fieldData?._kf_trucks_id === truck.truckId);

      let markerColor = 'blue'; // Default
      let status = 'Unknown';

      if (truck.verificationStatus === 'verified') {
        markerColor = 'green';
        status = 'On Schedule';
      } else if (truck.verificationStatus === 'off_schedule') {
        markerColor = 'red';
        status = 'Off Schedule';
      } else if (truck.verificationStatus === 'unknown') {
        markerColor = 'yellow';
        status = 'GPS Unavailable';
      }

      return {
        position: { lat: truck.latitude, lng: truck.longitude },
        title: `Truck ${truck.truckId}`,
        icon: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
          <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="${markerColor}" stroke="white" stroke-width="2"/>
            <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">${truck.truckId}</text>
          </svg>
        `)}`,
        infoContent: `
          <div class="p-2">
            <h3 class="font-bold">Truck ${truck.truckId}</h3>
            <p class="text-sm">Status: ${status}</p>
            <p class="text-sm">Location: ${truck.latitude.toFixed(4)}, ${truck.longitude.toFixed(4)}</p>
            <p class="text-sm">Last Update: ${new Date(truck.lastUpdate).toLocaleTimeString()}</p>
            ${job ? `<p class="text-sm">Job: ${job.fieldData?._kp_job_id}</p>` : ''}
          </div>
        `,
        truckData: truck,
        jobData: job
      };
    });
  }, [fleetData, jobsData]);

  // Fleet statistics
  const fleetStats = React.useMemo(() => {
    if (!fleetData?.gpsStatus) return null;

    const stats = fleetData.gpsStatus;
    return {
      totalTrucks: stats.totalTrucks || 0,
      activeTrucks: stats.trucksWithGps || 0,
      onSchedule: stats.trucksOnSchedule || 0,
      offSchedule: stats.trucksOffSchedule || 0,
      gpsUnavailable: stats.trucksGpsUnavailable || 0
    };
  }, [fleetData]);

  const handleMarkerClick = (marker) => {
    setSelectedTruck(marker);
  };

  if (loading && !fleetData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-lg text-slate-600">Loading fleet status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <AlertTriangle className="text-red-500 mr-3" size={24} />
          <div>
            <h3 className="text-lg font-medium text-red-800">Error Loading Fleet Data</h3>
            <p className="text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Truck className="text-blue-600" size={28} />
            Fleet Status Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Real-time truck locations and status monitoring
            {lastUpdate && (
              <span className="ml-2 text-sm text-slate-500">
                • Last updated: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchFleetData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Fleet Statistics Cards */}
      {fleetStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Trucks</p>
                <p className="text-2xl font-bold text-slate-900">{fleetStats.totalTrucks}</p>
              </div>
              <Truck className="text-slate-400" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Active GPS</p>
                <p className="text-2xl font-bold text-green-600">{fleetStats.activeTrucks}</p>
              </div>
              <CheckCircle className="text-green-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">On Schedule</p>
                <p className="text-2xl font-bold text-blue-600">{fleetStats.onSchedule}</p>
              </div>
              <Navigation className="text-blue-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Off Schedule</p>
                <p className="text-2xl font-bold text-red-600">{fleetStats.offSchedule}</p>
              </div>
              <AlertTriangle className="text-red-500" size={24} />
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">GPS Unavailable</p>
                <p className="text-2xl font-bold text-yellow-600">{fleetStats.gpsUnavailable}</p>
              </div>
              <MapPin className="text-yellow-500" size={24} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border h-96">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <MapPin className="text-blue-600" size={20} />
                Live Fleet Map
              </h3>
            </div>
            <div className="h-80">
              <Wrapper apiKey={GOOGLE_MAPS_API_KEY} render={renderMap}>
                <GoogleMap
                  center={{ lat: 39.7392, lng: -104.9903 }} // Denver, CO
                  zoom={10}
                  markers={mapMarkers}
                  onMarkerClick={handleMarkerClick}
                />
              </Wrapper>
            </div>
          </div>
        </div>

        {/* Truck Details Panel */}
        <div className="space-y-4">
          {/* Selected Truck Details */}
          {selectedTruck ? (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-4 border-b">
                <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                  <Truck className="text-blue-600" size={20} />
                  Truck {selectedTruck.truckData.truckId}
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-slate-500" />
                  <span className="text-sm">
                    {selectedTruck.truckData.latitude.toFixed(4)}, {selectedTruck.truckData.longitude.toFixed(4)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-slate-500" />
                  <span className="text-sm">
                    Last Update: {new Date(selectedTruck.truckData.lastUpdate).toLocaleString()}
                  </span>
                </div>

                {selectedTruck.jobData && (
                  <div className="border-t pt-3">
                    <h4 className="font-medium text-slate-900 mb-2">Current Job</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Job ID:</strong> {selectedTruck.jobData.fieldData?._kp_job_id}</p>
                      <p><strong>Status:</strong> {selectedTruck.jobData.fieldData?.job_status}</p>
                      <p><strong>Driver:</strong> {selectedTruck.jobData.fieldData?._kf_driver_id || 'Not assigned'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-lg p-8 text-center">
              <MapPin className="text-slate-400 mx-auto mb-2" size={32} />
              <p className="text-slate-600">Click on a truck marker to view details</p>
            </div>
          )}

          {/* Active Jobs Summary */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <User className="text-green-600" size={20} />
                Today's Jobs
              </h3>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {jobsData.slice(0, 5).map((job, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
                    <div>
                      <p className="font-medium text-slate-900">{job.fieldData?._kp_job_id}</p>
                      <p className="text-sm text-slate-600">
                        Truck: {job.fieldData?._kf_trucks_id || 'Unassigned'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        job.fieldData?.job_status === 'Completed'
                          ? 'bg-green-100 text-green-800'
                          : job.fieldData?.job_status === 'In Progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.fieldData?.job_status || 'Unknown'}
                      </span>
                    </div>
                  </div>
                ))}
                {jobsData.length === 0 && (
                  <p className="text-slate-500 text-center py-4">No jobs scheduled for today</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetStatusDashboard;
