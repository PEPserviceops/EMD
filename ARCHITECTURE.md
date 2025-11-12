# EMD System Architecture

Technical design and service relationships for the Exception Management Dashboard.

## System Overview

EMD is a streamlined Next.js application providing real-time fleet management and operational intelligence. The system integrates with FileMaker (data source), Samsara (GPS tracking), and OpenRouter (AI analytics).

## Core Architecture

### Frontend Layer
```
Next.js Application (React)
├── Dashboard Component
├── Alert Management
├── GPS Fleet Tracking
├── Predictive Analytics
└── Route Optimization
```

### API Layer
```
Next.js API Routes (/api/*)
├── /api/alerts/*          # Alert management
├── /api/fleet/*           # GPS fleet data
├── /api/analytics/*       # System analytics
└── /api/route-optimization # Route optimization
```

### Service Layer (10 Core Services)
```
Business Logic Services
├── OnDemandDataService     # FileMaker data fetching
├── SamsaraIntegrationService # GPS fleet tracking
├── AlertEngine            # Intelligent alerts
├── PredictiveAnalyticsService # AI optimization
├── CacheService           # Unified caching
├── GeocodingService       # Address conversion
├── RouteOptimizationService # Route algorithms
├── OpenRouterService      # AI API client
├── SupabaseService        # Database operations
└── ChangeDetectionService # Field monitoring
```

### Data Layer
```
External Integrations
├── FileMaker API          # Primary data source
├── Samsara Fleet API      # GPS tracking
├── OpenRouter AI API      # Predictive analytics
└── Supabase PostgreSQL    # Historical storage
```

## Data Flow Architecture

### Alert Generation Flow
```
FileMaker Jobs → OnDemandDataService → AlertEngine → Active Alerts → Frontend
     ↓                    ↓                     ↓             ↓
  Raw Data → Filtered/Cached → Rule Evaluation → Priority Queue → Dashboard
```

### GPS Tracking Flow
```
Samsara API → SamsaraIntegrationService → GPS Status → Fleet Dashboard
     ↓                    ↓                        ↓             ↓
Real-time Data → Location Processing → Status Aggregation → Live Tracking
```

### Analytics Flow
```
Historical Data → PredictiveAnalyticsService → AI Models → Optimization
     ↓                    ↓                          ↓             ↓
Supabase Storage → Feature Engineering → Predictions → Route Suggestions
```

## Service Relationships

### OnDemandDataService
- **Purpose**: Fetch and cache FileMaker job data
- **Dependencies**: FileMakerAPI, CacheService
- **Consumers**: AlertEngine, Dashboard
- **Cache TTL**: 30 seconds

### SamsaraIntegrationService
- **Purpose**: GPS fleet tracking and location data
- **Dependencies**: Samsara API, CacheService
- **Consumers**: GPS Status API, Route Optimization
- **Coverage**: 87.5% of fleet (14/16 trucks)

### AlertEngine
- **Purpose**: Intelligent alert generation and management
- **Dependencies**: Job data, GPS verification
- **Consumers**: Alerts API, Dashboard
- **Rules**: 8 active alert rules with deduplication

### PredictiveAnalyticsService
- **Purpose**: AI-powered route and efficiency optimization
- **Dependencies**: OpenRouter API, Historical data
- **Consumers**: Route optimization, Analytics dashboard
- **Models**: Simple ML with feature engineering

## Performance Characteristics

### Response Times
- **API Endpoints**: <20ms average
- **FileMaker Queries**: <50ms with caching
- **GPS Updates**: <200ms API calls
- **AI Predictions**: <100ms inference

### Scalability
- **Concurrent Users**: Supports 100+ simultaneous users
- **Data Volume**: Handles 500+ active jobs
- **GPS Tracking**: 16 truck fleet with 60s updates
- **Caching**: In-memory cache with configurable TTL

### Reliability
- **Uptime Target**: 99.9%
- **Error Handling**: Circuit breakers on external APIs
- **Fallbacks**: Cached data when services unavailable
- **Monitoring**: Health checks and performance tracking

## Security Architecture

### Authentication
- **FileMaker**: Username/password with session tokens
- **Samsara**: Bearer token authentication
- **OpenRouter**: API key authentication
- **Supabase**: Anonymous key with RLS policies

### Data Protection
- **Encryption**: TLS 1.3 for all external communications
- **API Keys**: Environment variable storage
- **Session Management**: Secure token handling
- **Input Validation**: Sanitized user inputs

## Deployment Architecture

### Development
```
Local Development
├── Next.js dev server (port 3001)
├── SQLite cache database
├── Environment variables
└── Hot reload enabled
```

### Production
```
Vercel Deployment
├── Serverless functions
├── Edge network CDN
├── Automatic SSL
└── Environment secrets
```

### Docker (Alternative)
```
Containerized Deployment
├── Node.js runtime
├── Multi-stage build
├── Non-root user
└── Health checks
```

## Monitoring & Observability

### Health Checks
- **System Health**: `/api/health` endpoint
- **Service Status**: Individual service health checks
- **External APIs**: Connectivity validation
- **Database**: Connection pool monitoring

### Performance Monitoring
- **Response Times**: API endpoint latency tracking
- **Error Rates**: Exception tracking and alerting
- **Resource Usage**: Memory and CPU monitoring
- **GPS Coverage**: Fleet tracking completeness

### Logging
- **Application Logs**: Structured logging with Winston
- **API Calls**: Request/response logging
- **Errors**: Comprehensive error tracking
- **Performance**: Slow query identification

## Future Extensibility

### Service Addition
- **Plugin Architecture**: Modular service loading
- **Configuration**: Environment-based service enablement
- **Dependencies**: Clear service contracts
- **Testing**: Isolated service testing

### API Expansion
- **RESTful Design**: Consistent endpoint patterns
- **Versioning**: API version management
- **Documentation**: Auto-generated API docs
- **Rate Limiting**: Configurable limits per endpoint

### Data Sources
- **Multi-Source**: Support for additional ERP systems
- **Standardization**: Common data models
- **Transformation**: ETL pipeline for data normalization
- **Quality**: Data validation and cleansing
