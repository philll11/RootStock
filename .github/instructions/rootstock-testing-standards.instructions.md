---
applyTo: '**/*.spec.ts,**/*.e2e-spec.ts,**/test/**'
---
# RootStock Platform - Testing Standards

## Testing Philosophy
Follow comprehensive testing patterns with clear structure, thorough coverage, and consistent organization. All tests must be reliable, maintainable, and follow the project's architectural patterns.

**Critical**: Negative testing is equally important as positive testing. Every success scenario must have corresponding failure scenarios to ensure the system "fails correctly."

## Negative Testing Requirements (Critical)

### "Fail Correctly" Philosophy
Every endpoint and method must be tested to ensure it fails gracefully and securely. Security-first testing is mandatory for this multi-tenant platform:

- **Authentication failures**: Unauthenticated requests return 401
- **Authorization failures**: Insufficient permissions return 403  
- **Validation failures**: Invalid data returns 400 with clear messages
- **Not found scenarios**: Non-existent resources return 404
- **Business rule violations**: Return 409 with descriptive errors
- **Visibility scope violations**: Users cannot access data outside their scope
- **Concurrent operation conflicts**: Handle race conditions properly

### Required Negative Test Coverage
For every positive test case, create corresponding negative tests:
```typescript
describe('update', () => {
  // Positive cases
  it('should SUCCEED with 200 when updating valid data', () => {});
  
  // Negative cases - equally important
  it('should FAIL with 400 for invalid input data', () => {});
  it('should FAIL with 401 for unauthenticated request', () => {});
  it('should FAIL with 403 for insufficient permissions', () => {});
  it('should FAIL with 404 for non-existent resource', () => {});
  it('should FAIL with 409 for business rule violation', () => {});
});
```

### Security-First Negative Testing
Test these security boundaries rigorously:
- Users cannot access data outside their visibility scope
- Permission decorators properly block unauthorized actions
- Malicious inputs are rejected with proper validation
- System boundaries are enforced (tenant isolation)
- Soft-deleted records are properly filtered from results

## Test File Organization

### Unit Test Structure (*.spec.ts)
```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let mockDependency: any;

  // Mock setup with all required methods
  const mockDependency = {
    method1: jest.fn(),
    method2: jest.fn().mockReturnValue({ exec: jest.fn() }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: DependencyName, useValue: mockDependency },
        { provide: getModelToken(Model.name), useValue: mockModel },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Group tests by method
  describe('methodName', () => {
    // Test structure with Arrange/Act/Assert pattern
  });
});
```

### E2E Test Structure (Three-File Pattern)
1. **`*.crud.e2e-spec.ts`**: Basic CRUD operations, validation, happy paths, input validation failures
2. **`*.auth.e2e-spec.ts`**: Authorization, permissions, visibility scope testing, security failures  
3. **`*.advanced.e2e-spec.ts`**: Complex business rules, transactional behavior, edge case failures

## Test Patterns & Standards

### Arrange/Act/Assert Pattern
Always use clear AAA structure:
```typescript
it('should do something when condition is met', async () => {
  // Arrange
  const inputData = { field: 'value' };
  mockService.method.mockResolvedValue(expectedResult);

  // Act  
  const result = await service.methodUnderTest(inputData);

  // Assert
  expect(mockService.method).toHaveBeenCalledWith(inputData);
  expect(result).toEqual(expectedResult);
});
```

### Test Case Coverage Requirements

#### Happy Path Tests
- Basic functionality with valid inputs
- Expected return values and method calls
- Proper parameter passing

#### Edge Cases & Boundary Testing
- Empty arrays/strings
- Null/undefined values
- Special characters in strings
- Very high/low numeric values
- Concurrent operations (for atomic operations)
- Maximum/minimum field lengths
- Boundary values for numeric fields

#### Error Handling (Critical)
- Service errors propagation
- Database errors (connection failures, constraint violations)
- Not found scenarios (404 responses)
- Validation failures (400 responses with specific error messages)
- Business rule violations (409 conflicts)
- Authentication failures (401 unauthorized)
- Authorization failures (403 forbidden)
- Malformed requests (400 bad request)

#### Integration Tests
- Service dependency injection
- Method existence verification
- Instance type checking
- Async behavior validation

### Mock Patterns

#### Service Mocking
```typescript
const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
```

#### Mongoose Model Mocking
```typescript
const mockModel = {
  find: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findById: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  findOneAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn() }),
  create: jest.fn(),
  save: jest.fn(),
};
```

#### Chained Method Mocking
```typescript
mockModel.find.mockReturnValue({
  exec: jest.fn().mockResolvedValue(expectedData),
});
```

## E2E Testing Patterns

### Test Setup
- Use `setupTestApp` and `teardownTestApp` from test utilities
- Set timeout to 60000ms for E2E tests: `jest.setTimeout(60000);`
- Use `MongoMemoryReplSet` for reliable transaction testing
- Create test users with specific permissions for each test scenario

### Authentication Patterns
```typescript
// Create test users with different permission levels
const adminRole = await new roleModel({
  recordId: 'ROLE_TEST_ADMIN',
  name: 'Test Admin',
  permissions: [PERMISSIONS.RESOURCE_VIEW, PERMISSIONS.RESOURCE_EDIT],
  visibilityScope: VisibilityScope.GLOBAL
}).save();

const adminUser = await new userModel({
  recordId: 'USER_TEST_ADMIN',
  name: 'Test Admin',
  firstName: 'Test',
  lastName: 'Admin',
  userType: UserType.EMPLOYEE,
  roleId: adminRole._id
}).save();

const adminToken = jwtService.sign({ sub: adminUser.recordId });
```

### Request Testing Patterns
```typescript
// Success case
const response = await request(app.getHttpServer())
  .get('/resource')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);

expect(response.body).toHaveProperty('field');
expect(Array.isArray(response.body)).toBe(true);

// Error case - testing failure scenarios
return request(app.getHttpServer())
  .post('/resource')
  .send(invalidDto)
  .set('Authorization', `Bearer ${token}`)
  .expect(400);
```

### CRUD E2E Test Structure
```typescript
describe('Resource CRUD (e2e)', () => {
  describe('GET /resource', () => {
    it('should SUCCEED with 200 and return list of resources', async () => {});
    it('should handle empty results correctly', async () => {});
  });

  describe('POST /resource', () => {
    it('should SUCCEED with 201 when creating valid resource', async () => {});
    it('should FAIL with 400 for invalid data', async () => {});
    it('should FAIL with 400 for non-whitelisted fields', async () => {});
    it('should FAIL with 400 for missing required fields', async () => {});
    it('should FAIL with 409 for duplicate business keys', async () => {});
  });

  describe('PATCH /resource/:id', () => {
    it('should SUCCEED with 200 when updating with valid data', async () => {});
    it('should FAIL with 404 for non-existent resource', async () => {});
    it('should FAIL with 400 for invalid update data', async () => {});
    it('should FAIL with 409 for business rule violations', async () => {});
  });

  describe('DELETE /resource/:id', () => {
    it('should SUCCEED with 200 for soft delete', async () => {});
    it('should FAIL with 404 for non-existent resource', async () => {});
    it('should FAIL with 409 when parent has active children', async () => {});
  });
});
```

### Auth E2E Test Structure
```typescript
describe('Resource Auth (e2e)', () => {
  describe('Authentication Tests', () => {
    it('should FAIL with 401 for missing token', () => {});
    it('should FAIL with 401 for invalid token', () => {});
    it('should FAIL with 401 for expired token', () => {});
  });
  
  describe('Authorization Tests', () => {
    it('should FAIL with 403 for insufficient permissions', () => {});
    it('should SUCCEED with 200 for authorized user', () => {});
    it('should FAIL with 403 when accessing data outside visibility scope', () => {});
  });
  
  describe('Permission-Specific Tests', () => {
    // Test each permission level (view-only vs edit)
    // Test different visibility scopes (Global, Subsidiary, Client)
  });
});
```

### Advanced E2E Test Structure
```typescript
describe('Resource Advanced (e2e)', () => {
  describe('Business Rule Enforcement', () => {
    it('should FAIL when violating parent-child constraints', () => {});
    it('should SUCCEED with proper transactional behavior', () => {});
  });
  
  describe('Concurrency & Race Conditions', () => {
    it('should handle concurrent operations correctly', () => {});
    it('should FAIL gracefully under high load', () => {});
  });
  
  describe('Data Integrity', () => {
    it('should maintain referential integrity across operations', () => {});
    it('should FAIL when attempting to create orphaned records', () => {});
  });
});
```

## Test Data Patterns

### Consistent Test Data Structure
```typescript
const expectedResource = {
  _id: expect.any(String),
  recordId: expect.stringMatching(/^PREFIX\d{4,}$/),
  name: 'Expected Name',
  isActive: true,
  isDeleted: false,
};
```

### Error Response Testing
```typescript
// Test specific error messages
await expect(service.method('invalid')).rejects.toThrow('Resource with ID "invalid" not found.');

// Test error propagation
const serviceError = new Error('Database connection failed');
mockService.method.mockRejectedValue(serviceError);
await expect(controller.method()).rejects.toThrow('Database connection failed');
```

### Input Validation Testing
```typescript
// Test malicious inputs
const maliciousDto = {
  name: '<script>alert("xss")</script>',
  email: 'not-an-email',
  unexpectedField: 'should be rejected'
};

return request(app.getHttpServer())
  .post('/resource')
  .send(maliciousDto)
  .set('Authorization', `Bearer ${token}`)
  .expect(400)
  .expect(res => {
    expect(res.body.message).toContain('validation failed');
  });
```

## Assertion Patterns

### Method Call Verification
```typescript
expect(mockService.method).toHaveBeenCalledTimes(1);
expect(mockService.method).toHaveBeenCalledWith(expectedParam);
expect(mockService.method).toHaveBeenCalledWith();
```

### Response Structure Validation
```typescript
expect(result).toEqual(expectedObject);
expect(Array.isArray(result)).toBe(true);
expect(result.length).toBeGreaterThanOrEqual(1);
expect(result).toHaveProperty('field');
```

### Error Response Validation
```typescript
// Validate error structure
expect(response.body).toHaveProperty('message');
expect(response.body).toHaveProperty('statusCode');
expect(response.body.statusCode).toBe(400);

// Validate specific error messages
expect(response.body.message).toContain('validation failed');
expect(response.body.message).toEqual(expect.arrayContaining([
  expect.stringContaining('field is required')
]));
```

### Async Behavior Testing
```typescript
it('should handle async operations correctly', async () => {
  const promise = Promise.resolve(expectedData);
  mockService.method.mockReturnValue(promise);
  
  const result = service.methodUnderTest();
  
  expect(result).toBeInstanceOf(Promise);
  await expect(result).resolves.toEqual(expectedData);
});
```

## Special Testing Scenarios

### Atomic Operations Testing
```typescript
it('should handle concurrent calls correctly (atomic operation)', async () => {
  // Setup multiple concurrent calls
  const [result1, result2] = await Promise.all([
    service.getNextSequence('resource'),
    service.getNextSequence('resource'),
  ]);
  
  // Assert different sequence values
  expect(result1.sequence_value).not.toEqual(result2.sequence_value);
});
```

### Validation Testing
```typescript
describe('Input Validation', () => {
  it('should FAIL with 400 for invalid DTO', () => {
    const invalidDto = { invalidField: 'value' };
    
    return request(app.getHttpServer())
      .post('/resource')
      .send(invalidDto)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('should FAIL with 400 for missing required fields', () => {
    const incompleteDto = { name: 'Test' }; // missing other required fields
    
    return request(app.getHttpServer())
      .post('/resource')
      .send(incompleteDto)
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });
});
```

### Database State Verification
```typescript
it('should persist changes to database', async () => {
  await controller.update(id, updateDto);
  
  // Verify database state
  const dbRecord = await model.findById(id).exec();
  expect(dbRecord.field).toEqual(updateDto.field);
});

it('should NOT persist invalid changes to database', async () => {
  const invalidDto = { invalidField: 'value' };
  
  await expect(controller.update(id, invalidDto)).rejects.toThrow();
  
  // Verify database state unchanged
  const dbRecord = await model.findById(id).exec();
  expect(dbRecord.field).toEqual(originalValue);
});
```

### Visibility Scope Testing
```typescript
describe('Visibility Scope Enforcement', () => {
  it('should SUCCEED when user has access to resource', async () => {
    const response = await request(app.getHttpServer())
      .get(`/resource/${resourceInUserScope}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });

  it('should FAIL with 404 when resource is outside user scope', async () => {
    return request(app.getHttpServer())
      .get(`/resource/${resourceOutsideUserScope}`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(404);
  });
});
```

## Test Naming Conventions

### Describe Blocks
- Use resource/method name: `'ResourceService'`, `'methodName'`
- Use meaningful groupings: `'CRUD operations'`, `'validation'`, `'error handling'`
- Group negative tests: `'Authentication failures'`, `'Authorization failures'`

### Test Cases
- Use descriptive names starting with 'should': `'should return all resources when called'`
- Include condition and expected outcome: `'should throw NotFoundException when resource not found'`
- Use SUCCESS/FAIL prefixes for E2E: `'should SUCCEED with 201'`, `'should FAIL with 400'`
- Be specific about failure conditions: `'should FAIL with 403 when user lacks edit permissions'`

### HTTP Status Testing
Always test the complete HTTP interaction including failures:
```typescript
it('should SUCCEED with 200 and return updated resource', async () => {
  const response = await request(app.getHttpServer())
    .patch('/resource/id')
    .send(updateDto)
    .set('Authorization', `Bearer ${token}`)
    .expect(200);
    
  expect(response.body).toMatchObject(expectedResponse);
});

it('should FAIL with 400 and return validation errors', async () => {
  const response = await request(app.getHttpServer())
    .patch('/resource/id')
    .send(invalidDto)
    .set('Authorization', `Bearer ${token}`)
    .expect(400);
    
  expect(response.body.message).toContain('validation failed');
});
```

## Test Coverage Requirements

### Minimum Coverage Expectations
- **Unit Tests**: Test all public methods with positive and negative cases
- **Integration Tests**: Test all controller endpoints with success and failure scenarios  
- **E2E Tests**: Test complete user workflows including security boundaries
- **Security Tests**: Test all permission checks and visibility scope enforcement

### Critical Test Scenarios (Must Cover)
1. **Authentication**: Valid tokens, invalid tokens, missing tokens, expired tokens
2. **Authorization**: Sufficient permissions, insufficient permissions, role boundaries
3. **Validation**: Valid input, invalid input, malformed input, injection attempts
4. **Business Rules**: Valid operations, constraint violations, state transitions
5. **Data Scope**: Accessible data, inaccessible data, tenant isolation
6. **Concurrency**: Atomic operations, race conditions, transaction integrity

Remember: **Negative testing is not optional**. Every success path must have corresponding failure paths. Security-first testing ensures our multi-tenant platform maintains data integrity and proper access controls.