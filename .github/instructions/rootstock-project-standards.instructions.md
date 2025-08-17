---
applyTo: '**'
---
# RootStock Platform - Copilot Instructions

## Project Overview
You are working on RootStock, a multi-tenant SaaS platform for orchard management. Follow these architectural patterns and conventions strictly.

## Technology Stack & Framework Patterns

### Core Technologies
- **Backend**: Node.js with NestJS framework
- **Database**: MongoDB with Mongoose schemas
- **Authentication**: JWT with AWS Cognito
- **Containerization**: Docker containers for deployment
- **Testing**: Jest for unit tests, E2E tests with in-memory MongoDB replica set

### NestJS Architecture Patterns
- Use `@Global()` DatabaseModule for centralized model registration
- Apply global guards in AppModule: `JwtAuthGuard` and `PermissionsGuard`
- Configure global ValidationPipe with: `forbidNonWhitelisted: true`, `transform: true`, `transformOptions: { enableImplicitConversion: true }`
- Use global `MongoExceptionFilter` for database error handling

## Module Structure Standards

### Standard Module Organization
Each feature module must include these subdirectories:
```
feature-name/
├── feature-name.controller.ts
├── feature-name.service.ts
├── feature-name.module.ts
├── dto/
├── schemas/
├── validators/
├── builders/
└── decorators/
```

### Controller Patterns
- Use flat resource routes (e.g., `/users`, `/clients`)
- Use one level of nesting for direct children (e.g., `/clients/:clientId/users`)
- Always validate parent record access before fetching children in nested routes
- Use `@RequirePermission('Resource:Action')` decorator on all endpoints
- Return `404 Not Found` if parent record is not accessible to user

### Service Patterns
- Implement `findOne(id, user)` method that respects user's visibility scope
- Use Builder Pattern for complex queries, extending `BaseQueryBuilder`
- Inject `CountersService` for generating system-wide sequential `recordId` fields
- Use MongoDB transactions for operations affecting parent-child relationships

## Data Model Conventions

### Required Fields Pattern
All core entities must include:
```typescript
{
  _id: ObjectId;
  recordId: string;        // System-generated business key
  isActive: boolean;       // Default true
  isDeleted: boolean;      // Default false, soft delete pattern
}
```

### Relationship Patterns
- Use immutable `_id` ObjectId for all record-to-record references
- Store arrays of ObjectIds for many-to-many relationships (e.g., `clientIds: ObjectId[]`)
- Use embedded documents for composition relationships
- Reference master data collections by ObjectId

### Schema Naming
- Use PascalCase for schema names (e.g., `UserSchema`, `ClientSchema`)
- Use camelCase for field names
- Include timestamps: `timestamps: true` in schema options

## Security Implementation Patterns

### Two-Layer Security Model
1. **Visibility Scope**: Controls which data records user can see (`Global`, `Subsidiary`, `Client`)
2. **Action Permissions**: Controls what actions user can perform (format: `'Resource:Action'`)

### Permission Patterns
- Store permissions as string array: `['User:Create', 'Client:Edit', 'Orchard:View']`
- Use `@RequirePermission()` decorator on controller methods
- Implement permissions checking in guards, not in business logic

### User Assignment Model
- Users have `clientIds: ObjectId[]` array for access assignments
- User's role determines how `clientIds` is interpreted based on `visibilityScope`
- Validate role assignment with custom validators like `@IsExistingRole()`

## Query Builder Pattern

### Base Query Builder Usage
```typescript
// Extend BaseQueryBuilder for resource-specific filtering
export class ResourceQueryBuilder extends BaseQueryBuilder {
  constructor(
    @Inject('CLIENT_RESOLVER_SERVICE') 
    clientResolverService: ClientResolverService
  ) {
    super(clientResolverService);
  }
  
  // Add resource-specific query methods
  filterBySpecificField(value: string): this {
    // Implementation
    return this;
  }
}
```

### Visibility Scope Application
- Always apply user's visibility scope through BaseQueryBuilder
- Use ClientResolverService for complex subsidiary/client scope resolution
- Apply scope filtering before any other query conditions

## Validation Patterns

### DTO Validation
- Use class-validator decorators extensively
- Create custom validators for relational integrity (e.g., `@IsExistingRole()`)
- Transform query parameters with validation pipe configuration
- Use `@Type()` decorator for proper type transformation

### Business Rule Validation
- Prevent parent inactivation if active children exist (return `409 Conflict`)
- Use database transactions for operations affecting multiple collections
- Implement soft delete with proper cascade handling

## Testing Patterns

### E2E Test Organization
Structure E2E tests in three files per resource:
- `*.crud.e2e-spec.ts`: Basic CRUD operations, validation, happy paths
- `*.auth.e2e-spec.ts`: Authorization, permissions, visibility scope testing
- `*.advanced.e2e-spec.ts`: Complex business rules, transactional behavior

### Test Setup
- Use `MongoMemoryReplSet` for reliable transaction testing
- Centralize test utilities in `test/test-utils.ts`
- Create clean, isolated test environments for each test suite
- Mock external services (AWS Cognito, S3, SES)

## API Design Conventions

### Response Patterns
- Use consistent HTTP status codes
- Return appropriate error responses with clear messages
- Include pagination metadata for list endpoints
- Follow REST conventions for endpoint naming

### Error Handling
- Transform MongoDB errors to user-friendly HTTP responses
- Use global exception filters for consistent error formatting
- Return `409 Conflict` for business rule violations
- Return `404 Not Found` for inaccessible records

## Code Quality Standards

### TypeScript Usage
- Use strict TypeScript configuration
- Define proper interfaces for all data structures
- Use generic types where appropriate
- Avoid `any` type usage

### Dependency Injection
- Use constructor injection consistently
- Inject services through interfaces when possible
- Use `@Inject()` tokens for service resolution
- Implement proper service decoupling

### Async Patterns
- Use `async/await` over promises
- Handle errors appropriately in async functions
- Use proper transaction handling for database operations

## Business Logic Patterns

### System-Generated IDs
- Use CountersService for sequential recordId generation
- Format: `[PREFIX][PADDED_NUMBER]` (e.g., "CLI001", "USR042")
- Make prefixes configurable through counters collection
- Ensure atomic ID generation under high concurrency

### Soft Delete Implementation
- Set `isDeleted: true` and `isActive: false` for deletions
- Filter out deleted records in all queries by default
- Provide admin endpoints for permanent deletion if needed
- Handle cascade logic properly during soft deletes

### Multi-Tenancy Patterns
- Always filter data by user's allowed clients/subsidiaries
- Never expose data across tenant boundaries
- Use visibility scope consistently across all data access
- Validate tenant access at the service layer

Remember: All code must be consistent with these patterns. When in doubt, follow the principle of secure-by-default and data-driven behavior.
