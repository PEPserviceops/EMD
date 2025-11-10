# Exception Management Dashboard (EMD)
## Real-Time Operational Intelligence for PepMove Logistics

---

## 🎯 Project Mission

Transform PepMove's dispatch operations from reactive reporting to proactive exception handling by surfacing only actionable intelligence that requires immediate intervention.

**Core Philosophy**: *"Alert only when action is needed, silence when all is well."*

---

## 📊 Project Overview

The Exception Management Dashboard (EMD) is a lightweight, focused operational tool that:
- **Eliminates false alerts** - No more "removed job" notifications when comparing different days
- **Focuses on NOW** - Surfaces only issues requiring immediate dispatcher action
- **Measures profitability** - Real-time margin analysis on every delivery
- **Tracks efficiency** - Identifies waste in routing and scheduling
- **Prevents failures** - Catches service issues before customers complain

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Access to FileMaker API credentials
- Windows development environment

### Installation
```bash
# Clone the repository
cd C:\Projects\EMD

# Install dependencies
npm install

# Configure environment
copy .env.example .env.local
# Edit .env.local with your API credentials

# Start development server
npm run dev

# Open dashboard
start http://localhost:3000
```

### First Time Setup
See [QUICK_START.md](./QUICK_START.md) for detailed Day 1 instructions.

---

## 📁 Project Documentation

| Document | Purpose | When to Read |
|----------|---------|--------------|
| [PROJECT_ROADMAP.md](./PROJECT_ROADMAP.md) | Complete implementation strategy, phases, and ROI projections | Project planning and stakeholder communication |
| [QUICK_START.md](./QUICK_START.md) | Day-by-day implementation guide for Week 1 | Starting development |
| [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md) | Detailed technical architecture and code specifications | During implementation |
| [README.md](./README.md) | This file - Project overview and navigation | First introduction |

---

## 🏗️ System Architecture

```
EMD Dashboard
    │
    ├── Alert Engine (Core)
    │   ├── Schedule Integrity Monitor
    │   ├── Service Failure Prevention
    │   └── Smart Deduplication
    │
    ├── Data Integration
    │   ├── FileMaker API (30-second polling)
    │   ├── Samsara Fleet API (GPS tracking)
    │   └── Google Maps (Geocoding)
    │
    └── Intelligence Layers
        ├── Profitability Calculator
        ├── Efficiency Analyzer
        └── Predictive Analytics (Phase 4)
```

---

## 🎨 Key Features

### Phase 1: Exception Management (Weeks 1-3)
✅ **Zero false alerts** - Intelligent change detection  
✅ **Schedule integrity** - Flag timing discrepancies  
✅ **Service failure prevention** - Catch issues before they happen  
✅ **Real-time updates** - 30-second refresh cycle  

### Phase 2: Profitability Tracking (Weeks 4-6)
📊 **Margin analysis** - Per-job profitability scoring  
📊 **Cost breakdown** - Mileage, time, fuel, overhead  
📊 **Unprofitable patterns** - Identify money-losing routes  
📊 **Revenue optimization** - Suggestions for improvement  

### Phase 3: Efficiency Monitoring (Weeks 7-9)
🚚 **Proximity waste** - Detect missed nearby deliveries  
🚚 **Route grading** - A/B/C efficiency scores  
🚚 **Backtrack detection** - Eliminate redundant travel  
🚚 **Clustering opportunities** - Group nearby jobs  

### Phase 4: Predictive Intelligence (Weeks 10-12)
🔮 **Failure prediction** - ML-based risk assessment  
🔮 **Capacity planning** - Tomorrow's truck needs  
🔮 **Customer patterns** - Delivery preference learning  
🔮 **Optimization suggestions** - AI-powered routing  

---

## 💻 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | Next.js 14 + React 18 | Modern, responsive UI |
| **Styling** | Tailwind CSS | PepMove green/grey theme |
| **Backend** | Next.js API Routes | RESTful endpoints |
| **Database** | SQLite | Local caching layer |
| **Integration** | FileMaker Data API | Job data source |
| **Fleet Tracking** | Samsara API | Vehicle GPS data |
| **Geocoding** | Google Maps API | Address to coordinates |
| **Deployment** | Vercel | Auto-scaling hosting |

---

## 🎯 Success Metrics

### Operational Impact
- **False Alert Rate**: <5% (from 40%)
- **On-Time Delivery**: 95% (from 87%)
- **Response Time**: <5 minutes to alerts
- **Prevention Rate**: 80% issues caught early

### Financial Impact
- **ROI Year 1**: 353%
- **Annual Savings**: $370,000
- **Margin Improvement**: 8%
- **Miles Reduction**: 15%

---

## 🔐 Environment Configuration

### Required API Credentials
```env
# FileMaker Configuration
FILEMAKER_HOST=modd.mainspringhost.com
FILEMAKER_DATABASE=PEP2_1
FILEMAKER_LAYOUT=jobs_api
FILEMAKER_USER=trevor_api
FILEMAKER_PASSWORD=XcScS2yRoTtMo7

# Samsara Fleet API
SAMSARA_API_TOKEN=your_token_here

# Google Maps
GOOGLE_MAPS_API_KEY=your_key_here

# Application Settings
POLLING_INTERVAL=30000
TIMEZONE=America/Denver
```

---

## 📈 Development Workflow

### Branch Strategy
```
main
  ├── develop
  │     ├── feature/alert-engine
  │     ├── feature/profitability
  │     └── feature/efficiency
  └── hotfix/critical-issues
```

### Commit Convention
```
feat: Add profitability calculator
fix: Resolve false positive alerts
docs: Update API documentation
perf: Optimize polling performance
test: Add alert engine unit tests
```

---

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Load testing
npm run test:load

# Full test suite
npm run test:all
```

### Coverage Requirements
- Unit Tests: >80%
- Integration: >60%
- End-to-End: Critical paths

---

## 🚨 Alert Severity Levels

| Level | Color | Auto-Dismiss | Action Required |
|-------|-------|--------------|-----------------|
| **LOW** | 🟢 Green | Yes (1 hour) | Monitor only |
| **MEDIUM** | 🟡 Yellow | No | Review when possible |
| **HIGH** | 🟠 Orange | No | Address within hour |
| **CRITICAL** | 🔴 Red | No | Immediate action |

---

## 👥 Team Contacts

| Role | Responsibility | Contact |
|------|---------------|---------|
| **Lead Developer** | Technical implementation | Baboo |
| **FileMaker Admin** | Database field access | IT Department |
| **Dispatch Manager** | Business requirements | Operations |
| **DevOps** | Deployment & monitoring | Infrastructure Team |

---

## 🗓️ Project Timeline

| Phase | Dates | Status | Deliverables |
|-------|-------|--------|--------------|
| **Phase 1** | Weeks 1-3 | 🟡 In Progress | Core alerts, dashboard |
| **Phase 2** | Weeks 4-6 | ⏳ Planned | Profitability metrics |
| **Phase 3** | Weeks 7-9 | ⏳ Planned | Efficiency tracking |
| **Phase 4** | Weeks 10-12 | ⏳ Planned | Predictive analytics |

---

## 📝 License

Proprietary - PepMove Logistics  
© 2024 All Rights Reserved

---

## 🆘 Support

For technical issues or questions:
1. Check documentation in `/docs` folder
2. Review [TECHNICAL_SPEC.md](./TECHNICAL_SPEC.md)
3. Contact development team
4. Submit issue in project tracker

---

## 🎉 Acknowledgments

Built with focus on:
- **Simplicity** over complexity
- **Reliability** over features
- **Action** over information
- **Today** over history

---

*"The best dashboard is the one that stays quiet when everything is running smoothly."*

---

**Project Status**: 🟢 Active Development  
**Last Updated**: November 2024  
**Version**: 0.1.0-alpha