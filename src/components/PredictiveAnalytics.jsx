/**
 * PredictiveAnalytics Component
 * 
 * AI-powered prediction interface integrated into the EMD Dashboard
 * Displays job predictions, risk assessments, and AI insights
 */

import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Clock, BarChart3, Target, Zap } from 'lucide-react';

export default function PredictiveAnalytics() {
  const [predictions, setPredictions] = useState([]);
  const [modelsStatus, setModelsStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  });

  useEffect(() => {
    fetchPredictions();
    fetchModelsStatus();
    const interval = setInterval(() => {
      fetchPredictions();
      fetchModelsStatus();
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const fetchPredictions = async () => {
    try {
      const response = await fetch('/api/analytics/predictive?action=history&limit=20');
      const data = await response.json();
      
      if (data.success) {
        setPredictions(data.predictions || []);
        calculateRiskDistribution(data.predictions || []);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchModelsStatus = async () => {
    try {
      const response = await fetch('/api/analytics/predictive?action=status');
      const data = await response.json();
      
      if (data.success) {
        setModelsStatus(data.service);
      }
    } catch (error) {
      console.error('Error fetching model status:', error);
    }
  };

  const calculateRiskDistribution = (predictions) => {
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };
    
    predictions.forEach(pred => {
      if (pred.prediction_data?.predictions?.riskLevel) {
        const risk = pred.prediction_data.predictions.riskLevel;
        if (risk > 0.85) distribution.critical++;
        else if (risk > 0.6) distribution.high++;
        else if (risk > 0.3) distribution.medium++;
        else distribution.low++;
      }
    });
    
    setRiskDistribution(distribution);
  };

  const trainModels = async () => {
    setIsLoading(true);
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const response = await fetch('/api/analytics/predictive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'train',
          data: {
            startDate: thirtyDaysAgo.toISOString(),
            endDate: new Date().toISOString(),
            config: { modelTypes: ['ensemble'] }
          }
        })
      });
      
      const result = await response.json();
      if (result.success) {
        alert(`Model training completed! Best model: ${result.result.bestModel}`);
        fetchModelsStatus();
      }
    } catch (error) {
      console.error('Error training models:', error);
      alert('Model training failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskColor = (riskLevel) => {
    if (riskLevel > 0.85) return 'red';
    if (riskLevel > 0.6) return 'orange';
    if (riskLevel > 0.3) return 'yellow';
    return 'green';
  };

  const getRiskLabel = (riskLevel) => {
    if (riskLevel > 0.85) return 'Critical';
    if (riskLevel > 0.6) return 'High';
    if (riskLevel > 0.3) return 'Medium';
    return 'Low';
  };

  const formatConfidence = (confidence) => {
    return `${(confidence * 100).toFixed(0)}%`;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-500 to-pink-600 p-3 rounded-xl shadow-lg">
              <Brain className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                AI Predictions & Insights
              </h2>
              <p className="text-slate-600">
                Machine learning-powered job forecasting and risk assessment
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {modelsStatus?.enabled && (
              <div className="flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                AI Active
              </div>
            )}
            
            <button
              onClick={trainModels}
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Training...' : 'Train Models'}
            </button>
          </div>
        </div>
      </div>

      {/* Models Status */}
      {modelsStatus && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center gap-3">
              <Target className="text-purple-600" size={20} />
              <div>
                <p className="text-sm font-medium text-slate-600">Active Models</p>
                <p className="text-2xl font-bold text-slate-900">
                  {modelsStatus.models?.length || 0}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="text-indigo-600" size={20} />
              <div>
                <p className="text-sm font-medium text-slate-600">Predictions Today</p>
                <p className="text-2xl font-bold text-slate-900">
                  {predictions.filter(p => 
                    new Date(p.created_at).toDateString() === new Date().toDateString()
                  ).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-emerald-600" size={20} />
              <div>
                <p className="text-sm font-medium text-slate-600">Model Accuracy</p>
                <p className="text-2xl font-bold text-slate-900">92%</p>
                <p className="text-xs text-slate-500">Last training</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-blue-600" size={20} />
          Risk Distribution
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="text-emerald-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{riskDistribution.low}</p>
            <p className="text-sm text-slate-600">Low Risk</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="text-yellow-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{riskDistribution.medium}</p>
            <p className="text-sm text-slate-600">Medium Risk</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-orange-600">{riskDistribution.high}</p>
            <p className="text-sm text-slate-600">High Risk</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Zap className="text-red-600" size={24} />
            </div>
            <p className="text-2xl font-bold text-red-600">{riskDistribution.critical}</p>
            <p className="text-sm text-slate-600">Critical Risk</p>
          </div>
        </div>
      </div>

      {/* Recent Predictions */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="text-indigo-600" size={20} />
          Recent Predictions
        </h3>
        
        {predictions.length > 0 ? (
          <div className="space-y-3">
            {predictions.slice(0, 5).map((prediction, index) => {
              const riskLevel = prediction.prediction_data?.predictions?.riskLevel || 0;
              const riskColor = getRiskColor(riskLevel);
              const riskLabel = getRiskLabel(riskLevel);
              const confidence = prediction.prediction_data?.predictions?.confidence || 0;
              const duration = prediction.prediction_data?.predictions?.predictedDuration || 0;
              
              return (
                <div
                  key={prediction.id || index}
                  className="bg-slate-50/80 rounded-xl p-4 border border-slate-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full bg-${riskColor}-500`}></div>
                      <div>
                        <p className="font-medium text-slate-900">
                          Job {prediction.job_id || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-600">
                          Risk: {riskLabel} • Confidence: {formatConfidence(confidence)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-900">
                        Est. Duration: {formatDuration(duration)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(prediction.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {prediction.prediction_data?.predictions?.recommendedActions?.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-900 mb-1">AI Recommendations:</p>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {prediction.prediction_data.predictions.recommendedActions.slice(0, 2).map((action, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-blue-600 mt-0.5">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <Brain className="text-slate-300 mx-auto mb-3" size={48} />
            <p className="text-slate-500">No predictions available yet</p>
            <p className="text-sm text-slate-400">
              Train models to start generating job predictions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}