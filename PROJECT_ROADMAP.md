# Exception Management Dashboard (EMD) - Project Roadmap
## PepMove Logistics Operational Intelligence Platform

---

## Executive Summary

The Exception Management Dashboard (EMD) is a real-time operational intelligence system designed to replace reactive reporting with proactive exception handling. By focusing on actionable alerts rather than historical data, EMD will reduce false positives by 90% and enable dispatchers to prevent service failures before they occur.

**Project Vision**: Transform PepMove's operations from historical reporting to predictive intervention, focusing exclusively on issues requiring immediate action.

---

## Project Phases

### Phase 1: Foundation & Core Alerts (Weeks 1-3)
**Objective**: Establish FileMaker API integration and implement critical exception detection

#### Technical Deliverables
- [ ] FileMaker API connection module with automatic token refresh
- [ ] Real-time data polling service (30-second intervals)
- [ ] Core exception detection engine
- [ ] Basic web dashboard with alert display

#### Alert Categories
1. **Schedule Integrity Violations**
   - Jobs with arrival_time but status still "Scheduled"
   - Completed jobs missing time stamps
   - Jobs <1 hour from due_date with no truck assigned

2. **Critical Service Failures**
   - Priority deliveries unassigned <2 hours from due
   - Jobs past due_date with active status
   - Multi-attempt failures requiring intervention

#### Required FileMaker Fields
```
ESSENTIAL:
- _kp_job_id (primary key)
- job_status
- job_date
- time_arrival
- time_complete
- due_date
- *kf*trucks_id
- priority_flag (if available)
```

#### Success Metrics
- Zero false "job removed" alerts
- <200ms dashboard refresh time
- 95% uptime for API connection

---

### Phase 2: Profitability Analytics (Weeks 4-6)
**Objective**: Layer profitability scoring onto exception system

#### Technical Deliverables
- [ ] Profitability calculation engine
- [ ] Route density analyzer
- [ ] Margin threshold alerting
- [ ] Cost factor configuration interface

#### Profitability Metrics
1. **Per-Job Margin Analysis**
   ```
   Margin = Revenue - (Mileage × $0.65/mile) - (Duration × $25/hour) - Fuel
   Alert if Margin < 15% or negative
   ```

2. **Route Efficiency Scoring**
   - Jobs per mile indicator
   - Deadhead mileage percentage
   - Revenue per route hour

3. **Unprofitable Pattern Detection**
   - Single delivery runs >30 miles
   - Jobs with revenue <$50 but distance >25 miles
   - Routes with >40% deadhead mileage

#### Additional FileMaker Fields Needed
```
PROFITABILITY:
- job_revenue
- total_miles
- address_C1 (pickup)
- address_C2 (delivery)
- customer_id
- fuel_surcharge
```

#### Success Metrics
- Identify bottom 10% profitable jobs daily
- Reduce unprofitable routes by 25%
- Increase average margin by 5%

---

### Phase 3: Travel Efficiency Intelligence (Weeks 7-9)
**Objective**: Implement proximity-based efficiency monitoring

#### Technical Deliverables
- [ ] GPS coordinate extraction from addresses
- [ ] Haversine distance calculation module
- [ ] Proximity waste detection algorithm
- [ ] Route optimization suggestions

#### Efficiency Indicators
1. **Proximity Waste Detection**
   - Alert when truck passes within 2 miles of pending delivery
   - Flag backtracking to previously visited zones
   - Identify clusterable jobs for consolidation

2. **Real-Time Efficiency Grades**
   ```
   Grade A (Green):  <10% excess mileage vs optimal
   Grade B (Yellow): 10-25% excess mileage
   Grade C (Red):    >25% excess mileage
   ```

3. **Optimization Opportunities**
   - "Bundle these 3 jobs to save 15 miles"
   - "Swap trucks 45 & 62 routes for 20% efficiency gain"
   - "Hold job #604521 for tomorrow's cluster"

#### Integration Requirements
```
GPS/MAPPING:
- Google Maps Geocoding API
- Real-time vehicle GPS (via Samsara)
- Route optimization library
```

#### Success Metrics
- Reduce average miles per job by 15%
- Decrease backtracking incidents by 50%
- Improve on-time delivery by 10%

---

### Phase 4: Predictive Intelligence (Weeks 10-12)
**Objective**: Evolve from reactive alerts to predictive interventions

#### Advanced Capabilities
- [ ] Machine learning for delivery time predictions
- [ ] Customer behavior pattern analysis
- [ ] Seasonal demand forecasting
- [ ] Driver performance optimization

#### Predictive Features
1. **Service Failure Prevention**
   - "Job #604521 has 85% chance of missing window based on current traffic"
   - "Customer X typically refuses delivery after 3pm - reassign"
   - "Driver 45 averaging 20 min behind - adjust remaining schedule"

2. **Capacity Planning**
   - "Tomorrow needs 3 additional trucks based on booking velocity"
   - "Zone 4 will be over-capacity by noon - pre-emptive routing needed"

3. **Customer Intelligence**
   - "Customer requires signature - driver must have device"
   - "Location has 40% first-attempt failure rate - schedule accordingly"

---

## Technical Architecture

### Technology Stack
```yaml
Frontend:
  - Framework: Next.js 14
  - UI Library: React 18
  - Styling: Tailwind CSS
  - State Management: Zustand
  - Real-time: WebSockets

Backend:
  - Runtime: Node.js 20
  - API Framework: Next.js API Routes
  - Database: SQLite (local cache)
  - Queue: Bull (job processing)

Integrations:
  - FileMaker Data API
  - Samsara Fleet API
  - Google Maps Geocoding
  - Twilio (SMS alerts)

Infrastructure:
  - Hosting: Vercel
  - Monitoring: Datadog
  - CI/CD: GitHub Actions
```

### Data Flow Architecture
```
FileMaker DB → API Gateway → Processing Engine → Alert Evaluator → Dashboard
                    ↓                                    ↓
              Cache Layer                          Notification Service
```

### Performance Requirements
- API response time: <200ms
- Dashboard refresh: 30 seconds
- Alert latency: <5 seconds from detection
- Uptime SLA: 99.5%

---

## Implementation Timeline

### Month 1: Core Foundation
- **Week 1**: Environment setup, FileMaker API integration
- **Week 2**: Exception detection engine, basic alerting
- **Week 3**: Dashboard UI, real-time updates
- **Week 4**: Profitability calculations, margin analysis

### Month 2: Intelligence Layer
- **Week 5**: Route efficiency scoring
- **Week 6**: GPS integration, proximity detection
- **Week 7**: Optimization algorithms
- **Week 8**: Testing and refinement

### Month 3: Advanced Features
- **Week 9**: Predictive models
- **Week 10**: Customer intelligence
- **Week 11**: Mobile app for field supervisors
- **Week 12**: Launch preparation

---

## Risk Mitigation

### Technical Risks
| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| FileMaker API field access denial | High | Maintain Excel import fallback |
| GPS coordinate accuracy | Medium | Implement address validation layer |
| Real-time performance at scale | High | Use caching and queue management |
| Samsara API rate limits | Medium | Implement intelligent polling |

### Operational Risks
| Risk | Impact | Mitigation Strategy |
|------|--------|-------------------|
| User adoption resistance | High | Phased rollout with training |
| Alert fatigue | High | Strict false-positive monitoring |
| Data quality issues | Medium | Validation rules and cleaning |

---

## Success Metrics & KPIs

### Operational Metrics
- **False Alert Rate**: Target <5% (from current ~40%)
- **Response Time**: Dispatcher action within 5 minutes of alert
- **Prevention Rate**: 80% of flagged issues resolved before failure
- **System Uptime**: 99.5% availability during business hours

### Business Impact
- **On-Time Delivery**: Improve from 87% to 95%
- **Profit Margin**: Increase average job margin by 8%
- **Miles per Job**: Reduce by 15% through efficiency
- **Customer Satisfaction**: Reduce complaints by 30%

### Technical Performance
- **API Response**: <200ms for 95th percentile
- **Dashboard Load**: <2 seconds initial load
- **Alert Latency**: <5 seconds from trigger to display
- **Concurrent Users**: Support 50+ simultaneous users

---

## Budget Estimate

### Development Costs (3 Months)
- Lead Developer (full-time): $45,000
- UI/UX Designer (part-time): $12,000
- QA Testing: $8,000
- **Total Development**: $65,000

### Infrastructure & Tools
- Vercel Hosting: $20/month
- Google Maps API: $200/month (estimate)
- Monitoring Tools: $100/month
- **Total Monthly**: $320/month

### Annual TCO
- Development (one-time): $65,000
- Operations (annual): $3,840
- Maintenance (20% of dev): $13,000
- **Year 1 Total**: $81,840
- **Year 2+ Annual**: $16,840

### ROI Projection
- Efficiency gains (15% reduction in miles): $125,000/year
- Reduced failed deliveries: $45,000/year
- Improved margins (8%): $200,000/year
- **Annual Benefit**: $370,000
- **ROI**: 353% Year 1, 2,096% Year 2

---

## Stakeholder Communications

### Weekly Updates
- Dashboard of current sprint progress
- Alert accuracy metrics
- User feedback summary
- Next week priorities

### Monthly Reviews
- KPI performance vs targets
- ROI tracking
- Feature roadmap updates
- Risk assessment

### Stakeholder Matrix
| Stakeholder | Interest | Influence | Engagement Strategy |
|------------|----------|-----------|-------------------|
| Dispatch Team | High | High | Daily standups, feedback sessions |
| Operations Manager | High | High | Weekly reports, approval gates |
| IT Administrator | Medium | High | Technical reviews, security audits |
| Drivers | Medium | Low | Training materials, mobile app |
| Finance | Medium | Medium | ROI reports, cost tracking |

---

## Project Dependencies

### External Dependencies
- FileMaker administrator approval for field access
- Samsara API continued availability
- Google Maps API key procurement
- Internet connectivity at dispatch center

### Internal Dependencies
- Dispatcher availability for requirements gathering
- Historical job data for testing
- Operations team for validation
- IT support for deployment

---

## Definition of Done

### Phase 1 Complete When:
- [ ] FileMaker API successfully polling every 30 seconds
- [ ] Zero false "job removed" alerts for 5 consecutive days
- [ ] All critical alerts displaying within 5 seconds
- [ ] Dashboard accessible to all dispatchers

### Phase 2 Complete When:
- [ ] Profitability scores calculating for 100% of jobs
- [ ] Margin alerts configured and validated
- [ ] Historical profitability trends visible
- [ ] Cost factors configurable by management

### Phase 3 Complete When:
- [ ] GPS coordinates available for 95% of addresses
- [ ] Proximity waste detected and reported
- [ ] Efficiency grades assigned to all routes
- [ ] Optimization suggestions generating daily

### Full Project Success Criteria:
- [ ] 90% reduction in false alerts achieved
- [ ] Dispatcher satisfaction score >8/10
- [ ] Measurable improvement in all KPIs
- [ ] System operating at 99.5% uptime
- [ ] ROI targets validated with finance

---

## Appendix A: FileMaker Field Mapping

```json
{
  "jobs_api_layout": {
    "current_access": [
      "_kp_job_id",
      "job_date", 
      "job_status",
      "job_type",
      "*kf*trucks_id"
    ],
    "requested_access": [
      "time_arrival",
      "time_complete",
      "address_C1",
      "address_C2",
      "due_date",
      "customer_id",
      "job_revenue",
      "priority_flag",
      "attempt_count",
      "driver_notes"
    ]
  }
}
```

## Appendix B: Alert Configuration Schema

```yaml
alerts:
  schedule_integrity:
    - type: arrival_without_completion
      condition: "time_arrival IS NOT NULL AND status = 'Scheduled'"
      severity: HIGH
      action: immediate_dispatcher_notification
    
  service_failure:
    - type: approaching_due_time
      condition: "DATEDIFF(minute, NOW(), due_date) < 60 AND truck_id IS NULL"
      severity: CRITICAL
      action: escalate_to_manager
    
  profitability:
    - type: negative_margin
      condition: "calculated_margin < 0"
      severity: MEDIUM
      action: flag_for_review
```

---

*Document Version: 1.0*  
*Last Updated: November 2024*  
*Next Review: December 2024*  
*Owner: PepMove Development Team*

---

**For questions or updates to this roadmap, contact the development team or review the live project board in the EMD GitHub repository.**