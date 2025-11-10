# Tests Directory

This directory contains all test files for the EMD Dashboard project.

## Test Structure

- `unit/` - Unit tests for individual modules
- `integration/` - Integration tests for API and database interactions
- `load/` - Load testing scripts (k6)
- `fixtures/` - Test data and mock responses

## Running Tests

```bash
# Run all unit tests
npm test

# Run integration tests
npm run test:integration

# Run load tests
npm run test:load

# Run all tests
npm run test:all
```

## Test Coverage Goals

- Unit tests: >80% coverage
- Integration tests: All API endpoints
- Load tests: 500+ concurrent jobs

