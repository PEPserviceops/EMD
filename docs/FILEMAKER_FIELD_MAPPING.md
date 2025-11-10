# FileMaker Field Mapping Documentation

## Overview

This document maps the actual FileMaker database fields from the `jobs_api` layout to the fields used in the EMD Dashboard application.

**Last Updated**: 2025-11-10  
**Database**: PEP2_1  
**Layout**: jobs_api  
**Total Fields**: 24

---

## Field Mapping Table

| Category | Application Field | FileMaker Field | Type | Usage % | Notes |
|----------|------------------|-----------------|------|---------|-------|
| **Job Identification** |
| Job ID | `job_id` | `_kp_job_id` | Number | 100% | Primary key for job records |
| Record ID | `recordId` | `recordId` | String | 100% | FileMaker internal record ID |
| **Status & Type** |
| Job Status | `status` | `job_status` | String | 100% | Values: Completed, Canceled, Re-scheduled, Attempted, Entered, DELETED |
| Job Type | `job_type` | `job_type` | String | 100% | Values: Delivery, Pickup, Out, *PRECALL*, Recover |
| Driver Status | `driver_status` | `job_status_driver` | String | 63% | Driver-reported status |
| **Dates & Times** |
| Job Date | `job_date` | `job_date` | Date | 100% | Format: MM/DD/YYYY |
| Due Date | `due_date` | `due_date` | Date | 2% | ⚠️ Rarely populated |
| Arrival Time | `time_arrival` | `time_arival` | Time | 81% | Format: HH:MM:SS (note: typo in FM field) |
| Completion Time | `completion_time` | `time_complete` | Time | 79% | Format: HH:MM:SS |
| **Assignments** |
| Truck ID | `truck_id` | `_kf_trucks_id` | String | 81% | Truck identifier |
| Driver ID | `driver_id` | `_kf_driver_id` | String | 31% | Driver name (not always populated) |
| Route ID | `route_id` | `_kf_route_id` | String | 81% | Route number |
| Lead ID | `lead_id` | `_kf_lead_id` | String | 83% | Lead/supervisor name |
| **Customer Information** |
| Customer Name | `customer_name` | `Customer_C1` | String | 100% | Primary customer name |
| Customer Name 2 | `customer_name_2` | `Customer_C2` | String | 19% | Secondary customer (rarely used) |
| Contact | `contact` | `contact_C1` | String | 81% | Contact person and phone |
| **Addresses** |
| Address 1 | `pickup_address` | `address_C1` | String | 100% | Primary address |
| Address 2 | `delivery_address` | `address_C2` | String | 13% | Secondary address (rarely used) |
| **Order & Sequence** |
| Order 1 | `order_1` | `order_C1` | Mixed | 65% | Order/sequence number |
| Order 2 | `order_2` | `order_C2` | Mixed | 0% | Rarely used |
| **Client & Disposition** |
| Client Code | `client_code` | `_kf_client_code_id` | String | 100% | Client identifier (e.g., Ricoh-C, TTR-c) |
| Disposition | `disposition` | `_kf_disposition` | String | 100% | Job disposition type |
| **Notifications & Notes** |
| Notification Status | `notification_id` | `_kf_notification_id` | String | 100% | Values: Yes, Done |
| Call Ahead Notes | `notes_call_ahead` | `notes_call_ahead` | String | 58% | Call ahead instructions |
| Driver Notes | `notes_driver` | `notes_driver` | String | 2% | Driver-specific notes |

---

## Field Usage Statistics

Based on analysis of 48 active job records:

### High Usage Fields (>80%)
- `_kp_job_id` - 100%
- `job_date` - 100%
- `job_status` - 100%
- `job_type` - 100%
- `_kf_notification_id` - 100%
- `_kf_client_code_id` - 100%
- `_kf_disposition` - 100%
- `address_C1` - 100%
- `Customer_C1` - 100%
- `_kf_lead_id` - 83%
- `_kf_trucks_id` - 81%
- `time_arival` - 81%
- `_kf_route_id` - 81%
- `contact_C1` - 81%

### Medium Usage Fields (50-80%)
- `time_complete` - 79%
- `order_C1` - 65%
- `job_status_driver` - 63%
- `notes_call_ahead` - 58%

### Low Usage Fields (<50%)
- `_kf_driver_id` - 31%
- `Customer_C2` - 19%
- `address_C2` - 13%
- `notes_driver` - 2%
- `due_date` - 2% ⚠️

---

## Status Values

### Job Status (`job_status`)
- `Completed` - Job successfully completed
- `Canceled` - Job was canceled
- `Re-scheduled` - Job rescheduled to different time
- `Attempted` - Delivery/pickup attempted but not completed
- `Entered` - Job entered but not yet started
- `DELETED` - Soft-deleted record (excluded from active queries)

### Driver Status (`job_status_driver`)
- `Attempted` - Driver attempted but couldn't complete
- (Other values may exist)

---

## Critical Findings for Alert System

### ⚠️ Missing/Rare Fields

1. **Due Date (`due_date`)** - Only 2% populated
   - **Impact**: Cannot reliably use for "overdue" or "due soon" alerts
   - **Recommendation**: Use `job_date` + time windows instead
   - **Alternative**: May need to add this field to FileMaker or use different logic

2. **Driver ID (`_kf_driver_id`)** - Only 31% populated
   - **Impact**: "Missing driver" alerts may not be accurate
   - **Note**: Some jobs may not require driver assignment
   - **Recommendation**: Only alert if truck is assigned but driver is not

3. **Financial Fields** - NOT PRESENT
   - No `revenue`, `cost`, or `price` fields found
   - **Impact**: Cannot calculate profitability alerts
   - **Recommendation**: These may be in a different layout or need to be added

### ✓ Available for Alerts

1. **Status Tracking** - Fully available
   - `job_status` - 100% populated
   - Can track Completed, Canceled, Attempted, etc.

2. **Time Tracking** - Good availability
   - `time_arival` - 81% populated
   - `time_complete` - 79% populated
   - Can detect "arrival without completion"

3. **Assignment Tracking** - Partial
   - `_kf_trucks_id` - 81% populated
   - `_kf_driver_id` - 31% populated
   - Can detect missing truck assignments

---

## Recommended Alert Rules (Updated)

Based on actual field availability:

### 1. Arrival Without Completion ✓
```javascript
{
  condition: time_arival != null AND time_complete == null AND job_status != 'Completed'
  severity: HIGH
  fields: time_arival, time_complete, job_status
}
```

### 2. Missing Truck Assignment ✓
```javascript
{
  condition: job_status == 'Entered' AND _kf_trucks_id == null
  severity: MEDIUM
  fields: job_status, _kf_trucks_id
}
```

### 3. Truck Without Driver ✓
```javascript
{
  condition: _kf_trucks_id != null AND _kf_driver_id == null AND job_status == 'Entered'
  severity: MEDIUM
  fields: _kf_trucks_id, _kf_driver_id, job_status
}
```

### 4. Long In Progress ✓
```javascript
{
  condition: time_arival != null AND time_complete == null AND (NOW - time_arival) > 4 hours
  severity: MEDIUM
  fields: time_arival, time_complete
}
```

### 5. Attempted Status ✓
```javascript
{
  condition: job_status == 'Attempted' OR job_status_driver == 'Attempted'
  severity: HIGH
  fields: job_status, job_status_driver
}
```

---

## Data Quality Notes

1. **Time Format**: Times are in HH:MM:SS format (24-hour)
2. **Date Format**: Dates are in MM/DD/YYYY format
3. **Typo Alert**: `time_arival` has a typo (should be "arrival")
4. **Empty vs Null**: Empty strings ("") are used instead of null
5. **Mixed Types**: Some fields like `order_C1` can be string or number

---

## Next Steps

1. ✓ Update alert rules to use correct field names
2. ✓ Remove alerts that depend on unavailable fields (due_date, revenue, cost)
3. [ ] Consider requesting additional fields from FileMaker admin:
   - Proper `due_date` population
   - Financial fields (revenue, cost)
   - Estimated duration field
4. [ ] Test alerts with real data
5. [ ] Document any additional fields discovered during testing

---

## Contact

For FileMaker field additions or modifications, contact:
- **FileMaker Admin**: Database field access requests
- **Database**: PEP2_1
- **Layout**: jobs_api

