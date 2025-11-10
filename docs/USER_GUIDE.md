# Exception Management Dashboard - User Guide

**For PepMove Dispatchers**  
**Version 1.0**  
**Last Updated**: November 10, 2025

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Overview](#dashboard-overview)
4. [Understanding Alerts](#understanding-alerts)
5. [Managing Alerts](#managing-alerts)
6. [Filtering and Sorting](#filtering-and-sorting)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

---

## Introduction

### What is the Exception Management Dashboard?

The Exception Management Dashboard (EMD) is a real-time monitoring system that helps you identify and resolve operational issues before they become problems. Instead of reviewing historical reports, EMD proactively alerts you to jobs that need immediate attention.

### Key Benefits

- **Proactive Problem Detection**: Catch issues before they impact service
- **Zero False Positives**: Only see alerts that require action
- **Real-Time Updates**: Dashboard refreshes every 30 seconds
- **Priority-Based**: Critical issues are highlighted for immediate attention
- **Time Savings**: Focus on exceptions, not routine operations

---

## Getting Started

### Accessing the Dashboard

1. Open your web browser (Chrome, Firefox, or Edge recommended)
2. Navigate to: `http://localhost:3000` (or your deployed URL)
3. The dashboard will load automatically and begin monitoring

### System Requirements

- **Browser**: Modern web browser (Chrome 90+, Firefox 88+, Edge 90+)
- **Internet**: Stable connection for real-time updates
- **Screen**: Minimum 1280x720 resolution (1920x1080 recommended)

---

## Dashboard Overview

### Main Components

#### 1. Header Section
- **Dashboard Title**: "Exception Management Dashboard"
- **Last Update**: Shows when data was last refreshed
- **Connection Status**: Green (Connected) or Red (Disconnected)
- **Refresh Button**: Manual refresh option

#### 2. Statistics Cards
Four color-coded cards showing alert counts by severity:

- **Critical** (Dark Red): Immediate action required
- **High** (Red): Urgent attention needed
- **Medium** (Yellow): Should be addressed soon
- **Low** (Green): Informational only

**Click any card to filter alerts by that severity level**

#### 3. Alert List
Displays all active alerts with:
- Severity indicator (colored left border)
- Alert title and description
- Job ID and timestamp
- Action buttons (Acknowledge/Dismiss)

---

## Understanding Alerts

### Alert Severity Levels

#### CRITICAL (Dark Red)
**Response Time**: Immediate (within 5 minutes)

These alerts indicate service failures or situations that will definitely impact customers:
- Jobs past due date with no completion
- Priority deliveries unassigned near due time
- System failures requiring immediate intervention

**Action**: Stop what you're doing and address immediately

#### HIGH (Red)
**Response Time**: Within 15 minutes

These alerts indicate likely problems that need quick resolution:
- **Arrival Without Completion**: Driver arrived but job not completed
- **Job Attempted But Not Completed**: Delivery was attempted but failed
- **Missing Truck Assignment**: Job is "Entered" but has no truck assigned

**Action**: Investigate and resolve as soon as possible

#### MEDIUM (Yellow)
**Response Time**: Within 1 hour

These alerts indicate potential issues or inefficiencies:
- **Job Rescheduled**: Job has been rescheduled - verify new schedule
- **Truck Without Driver**: Truck assigned but no driver assigned
- **Job In Progress Too Long**: Job has been in progress for over 4 hours

**Action**: Review and address when convenient

#### LOW (Green)
**Response Time**: End of day

Informational alerts for awareness:
- Routine status changes
- Completed jobs with minor discrepancies

**Action**: Review during daily wrap-up

---

## Managing Alerts

### Acknowledging Alerts

**When to Acknowledge**:
- You've seen the alert and are working on it
- You want to track which alerts you've reviewed
- You need to prevent duplicate notifications

**How to Acknowledge**:
1. Locate the alert in the list
2. Click the **"Acknowledge"** button
3. The alert will be marked as acknowledged but remain visible

**Note**: Acknowledged alerts stay in the system until the underlying issue is resolved

### Dismissing Alerts

**When to Dismiss**:
- The issue has been resolved
- The alert is no longer relevant
- You've taken corrective action in FileMaker

**How to Dismiss**:
1. Locate the alert in the list
2. Click the **"Dismiss"** button
3. The alert will be removed from the dashboard

**Important**: Only dismiss alerts after resolving the underlying issue

### Alert Lifecycle

```
New Alert → Acknowledged → Issue Resolved → Dismissed
     ↓           ↓              ↓              ↓
  (Red)      (Yellow)       (Green)      (Removed)
```

---

## Filtering and Sorting

### Filter by Severity

**Method 1: Click Statistics Cards**
- Click the "Critical" card to see only critical alerts
- Click the "High" card to see only high-priority alerts
- Click "All" to see all alerts

**Method 2: Use Filter Dropdown** (if available)
- Select severity level from dropdown menu
- Choose "All" to clear filter

### Understanding the Alert Count

- **Total**: All active alerts across all severity levels
- **By Severity**: Count of alerts at each level
- **New Alerts**: Alerts generated in the last 30 seconds (shown with animation)

---

## Best Practices

### Daily Workflow

#### Morning Routine (Start of Shift)
1. Open the dashboard
2. Review all CRITICAL and HIGH alerts
3. Acknowledge alerts you're working on
4. Address urgent issues first

#### During Shift
1. Keep dashboard open in a browser tab
2. Check for new alerts every 15-30 minutes
3. Respond to sound notifications for critical alerts
4. Dismiss alerts as you resolve issues

#### End of Shift
1. Review all remaining alerts
2. Hand off unresolved alerts to next shift
3. Dismiss resolved alerts
4. Document any ongoing issues

### Response Priorities

**Priority 1: CRITICAL Alerts**
- Drop everything and address immediately
- Notify supervisor if needed
- Document resolution

**Priority 2: HIGH Alerts**
- Address within 15 minutes
- May require driver contact
- Update FileMaker status

**Priority 3: MEDIUM Alerts**
- Address within 1 hour
- Can be batched with similar issues
- Verify and update as needed

**Priority 4: LOW Alerts**
- Review at end of day
- Informational only
- No immediate action required

### Common Alert Resolutions

#### "Arrival Without Completion"
1. Contact driver to verify status
2. If completed: Update FileMaker with completion time
3. If not completed: Determine reason and reschedule

#### "Missing Truck Assignment"
1. Review job details in FileMaker
2. Assign appropriate truck based on:
   - Job location and route
   - Truck availability
   - Driver schedule
3. Update FileMaker with truck assignment

#### "Job Attempted But Not Completed"
1. Contact driver for details
2. Determine reason for failure:
   - Customer not available
   - Access issues
   - Equipment problems
3. Reschedule or escalate as needed

#### "Job Rescheduled"
1. Verify new schedule in FileMaker
2. Confirm truck and driver assignment
3. Notify customer if required

---

## Troubleshooting

### Dashboard Not Loading

**Symptoms**: Blank page or error message

**Solutions**:
1. Refresh the browser (F5 or Ctrl+R)
2. Clear browser cache
3. Check internet connection
4. Try a different browser
5. Contact IT support

### No Alerts Showing

**Symptoms**: Dashboard shows "0" alerts across all categories

**Possible Causes**:
- All jobs are running smoothly (good!)
- Connection to FileMaker is down
- Polling service is stopped

**Solutions**:
1. Check connection status indicator
2. Wait 30 seconds for next refresh
3. Click manual refresh button
4. Contact IT if issue persists

### Alerts Not Updating

**Symptoms**: Same alerts showing for extended period

**Solutions**:
1. Check "Last Update" timestamp
2. Verify connection status is green
3. Click manual refresh button
4. Check if FileMaker has been updated
5. Contact IT support

### Sound Notifications Not Working

**Symptoms**: No sound for critical alerts

**Solutions**:
1. Check browser sound settings
2. Unmute browser tab
3. Check system volume
4. Allow audio in browser permissions
5. Refresh the page

---

## FAQ

### Q: How often does the dashboard update?
**A**: The dashboard automatically refreshes every 30 seconds. You can also manually refresh at any time.

### Q: Will I see alerts for jobs from previous days?
**A**: No. The system only shows alerts for current active jobs. Historical jobs are excluded.

### Q: What happens if I dismiss an alert by mistake?
**A**: If the underlying issue still exists, the alert will reappear on the next polling cycle (within 30 seconds).

### Q: Can I customize which alerts I see?
**A**: Currently, all dispatchers see the same alerts. Custom filtering may be added in future versions.

### Q: Why don't I see alerts for completed jobs?
**A**: The system is designed to show only actionable exceptions. Completed jobs are excluded unless they have specific issues.

### Q: How do I know if an alert is new?
**A**: New alerts appear with a bounce animation and increment the "new alerts" counter in the header.

### Q: Can I access the dashboard on my phone?
**A**: Yes! The dashboard is mobile-responsive and works on smartphones and tablets.

### Q: What if I see an alert I don't understand?
**A**: Contact your supervisor or refer to this guide. Each alert type is documented in the "Understanding Alerts" section.

### Q: How do I report a bug or suggest a feature?
**A**: Contact the development team or your IT support with details about the issue or suggestion.

---

## Quick Reference Card

### Alert Severity Guide
| Severity | Color | Response Time | Action |
|----------|-------|---------------|--------|
| CRITICAL | Dark Red | 5 minutes | Immediate action |
| HIGH | Red | 15 minutes | Urgent attention |
| MEDIUM | Yellow | 1 hour | Address soon |
| LOW | Green | End of day | Informational |

### Common Actions
| Task | How To |
|------|--------|
| Filter alerts | Click severity card |
| Acknowledge | Click "Acknowledge" button |
| Dismiss | Click "Dismiss" button |
| Refresh | Click refresh icon or wait 30s |
| View details | Click alert card |

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| F5 | Refresh page |
| Ctrl+R | Refresh page |
| Esc | Clear filter |

---

## Support

### Getting Help

**Technical Issues**:
- Email: it-support@pepmove.com
- Phone: (555) 123-4567
- Hours: 24/7

**Operational Questions**:
- Contact your supervisor
- Refer to this user guide
- Check the FAQ section

### Training Resources

- **Video Tutorials**: Available on company intranet
- **Live Training**: Scheduled monthly
- **Quick Start Guide**: Available in dashboard

---

## Appendix

### Glossary

- **Alert**: A notification about a job that requires attention
- **Acknowledge**: Mark an alert as seen/being worked on
- **Dismiss**: Remove an alert from the dashboard
- **Polling**: Automatic checking for new data every 30 seconds
- **Severity**: The urgency level of an alert (Critical, High, Medium, Low)

### Version History

- **v1.0** (Nov 10, 2025): Initial release
  - 6 alert rules implemented
  - Real-time polling
  - Severity-based filtering
  - Acknowledge/dismiss functionality

---

**End of User Guide**

*For the latest version of this guide, visit the company intranet or contact IT support.*

