/**
 * AlertCard Component
 * Displays individual alert with severity styling and actions
 */

import React from 'react';
import { AlertTriangle, AlertOctagon, Info, AlertCircle, X, Check } from 'lucide-react';
import { formatTimestamp } from '../utils/calculations';

const severityConfig = {
  LOW: {
    color: '#10B981',
    gradient: 'from-emerald-50 to-green-50',
    borderGradient: 'from-emerald-400 to-green-500',
    textColor: 'text-emerald-900',
    badgeBg: 'bg-gradient-to-r from-emerald-500 to-green-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    shadow: 'shadow-emerald-500/20',
    icon: Info
  },
  MEDIUM: {
    color: '#F59E0B',
    gradient: 'from-amber-50 to-yellow-50',
    borderGradient: 'from-amber-400 to-orange-500',
    textColor: 'text-amber-900',
    badgeBg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    shadow: 'shadow-amber-500/20',
    icon: AlertCircle
  },
  HIGH: {
    color: '#EF4444',
    gradient: 'from-orange-50 to-red-50',
    borderGradient: 'from-orange-500 to-red-500',
    textColor: 'text-red-900',
    badgeBg: 'bg-gradient-to-r from-orange-500 to-red-500',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    shadow: 'shadow-red-500/30',
    icon: AlertTriangle
  },
  CRITICAL: {
    color: '#991B1B',
    gradient: 'from-red-100 to-rose-100',
    borderGradient: 'from-red-600 to-rose-700',
    textColor: 'text-red-950',
    badgeBg: 'bg-gradient-to-r from-red-600 to-rose-700',
    iconBg: 'bg-red-200',
    iconColor: 'text-red-700',
    shadow: 'shadow-red-600/40',
    icon: AlertOctagon
  }
};

export default function AlertCard({
  alert,
  onAcknowledge,
  onDismiss,
  showActions = true
}) {
  const config = severityConfig[alert.severity] || severityConfig.MEDIUM;
  const Icon = config.icon;

  // Add pulse animation for CRITICAL and HIGH alerts
  const shouldPulse = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
  const pulseClass = shouldPulse && !alert.acknowledged ? 'animate-pulse-subtle' : '';

  return (
    <div
      className={`bg-gradient-to-r ${config.gradient} border-l-[6px] border-gradient-to-b ${config.borderGradient} p-6 rounded-2xl shadow-xl ${config.shadow} transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${pulseClass} backdrop-blur-sm border-t border-r border-b border-white/40`}
      style={{
        animation: shouldPulse && !alert.acknowledged ? 'pulse-border 2s ease-in-out infinite' : 'none',
        borderImage: shouldPulse && !alert.acknowledged ? 'linear-gradient(to bottom, var(--tw-gradient-stops)) 1' : 'none'
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1">
          {/* Icon with modern styling */}
          <div className={`${config.iconBg} ${config.iconColor} p-3 rounded-xl shadow-lg transition-all duration-300 hover:scale-110 hover:rotate-6`}>
            <Icon size={26} strokeWidth={2.5} />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className={`font-bold text-lg ${config.textColor}`}>
                {alert.ruleName}
              </h3>
              <span className={`${config.badgeBg} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg uppercase tracking-wide`}>
                {alert.severity}
              </span>
            </div>

            <p className={`text-sm ${config.textColor} mb-3 leading-relaxed font-medium`}>
              {alert.message}
            </p>

            <div className="flex items-center gap-3 text-xs text-slate-700 font-medium bg-white/50 backdrop-blur-sm px-3 py-2 rounded-lg inline-flex">
              <span className="font-bold">Job: {alert.jobId}</span>
              <span className="text-slate-400">•</span>
              <span>{formatTimestamp(alert.timestamp)}</span>
              {alert.acknowledged && (
                <>
                  <span className="text-slate-400">•</span>
                  <span className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-100 px-2 py-1 rounded-md">
                    <Check size={14} strokeWidth={3} />
                    <span>Acknowledged</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && !alert.acknowledged && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onAcknowledge(alert.id)}
              className="bg-white/80 backdrop-blur-sm p-3 rounded-xl hover:bg-emerald-500 hover:text-white transition-all duration-300 text-emerald-700 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl border border-emerald-200 hover:border-emerald-500 group"
              title="Acknowledge"
              aria-label="Acknowledge alert"
            >
              <Check size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={() => onDismiss(alert.id)}
              className="bg-white/80 backdrop-blur-sm p-3 rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 text-red-700 hover:scale-110 active:scale-95 shadow-lg hover:shadow-xl border border-red-200 hover:border-red-500 group"
              title="Dismiss"
              aria-label="Dismiss alert"
            >
              <X size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

