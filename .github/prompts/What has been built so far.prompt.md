---
mode: agent
---
Based on the updated architectural blueprint, here is a detailed list of the features and architectural patterns that have been successfully implemented for the RootStock backend so far.

### Implemented Features & Patterns

#### **1. Core Resource APIs & Hierarchy Management**

We have built the complete, foundational APIs for our five core hierarchical entities: `Subsidiary`, `Client`, `User`, `Role`, `Orchard` and `Counter`. These APIs are fully integrated with our advanced security and data visibility model.

Key features implemented for these resources include:
*   **Full CRUD Functionality:** All core resources have complete and secure Create, Read, Update, and Delete endpoints that respect the requesting user's permissions and data visibility scope.
*   **System-Generated Business Keys (`recordId`):** The `recordId` field on all five core hierarchical entities is now a **server-generated, data-driven business key** (e.g., `SUB0001`). The generation is handled by a robust, atomic `CountersService`, and the prefixes are fully configurable by an administrator via the secure `/counters` API, fulfilling our "Self-Sustaining" core principle.
*   **Soft Deletes & Transactional Integrity:** The `DELETE` endpoint for every parent resource (`Subsidiary`, `Client`, `Role`) uses an atomic database transaction. This transaction first disassociates all child records (e.g., nullifying foreign keys) before performing a soft delete (`isDeleted: true`, `isActive: false`), guaranteeing data consistency and preserving data history.
*   **Secure, Visibility-Aware Queries (`findAll`, `findOne`):** All resource list and single-item endpoints are fully secured. They automatically filter records based on the user's `visibilityScope` (`Global`, `Subsidiary`, `Client`), ensuring users only see the data they are permitted to access.
*   **Secure Nested Child Routes:** The API provides intuitive, RESTful nested routes (e.g., `GET /subsidiaries/:subsidiaryId/clients`). These routes are now fully secure, first verifying that the user has permission to view the parent record before attempting to fetch the children.
*   **Server-Derived Fields:** The `User` resource automatically calculates and maintains a full `name` field from the `firstName` and `lastName` for efficient searching.

#### **2. Platform-Wide Architectural Patterns**

We have established core, reusable patterns that govern all future development.
*   **Centralized Database Module:** A single, `@Global()` `DatabaseModule` now manages all Mongoose model registrations, eliminating module-level circular dependencies and simplifying the architecture.
*   **The Query Builder Pattern with Dependency Injection:** A robust, inheritable `BaseQueryBuilder` centralizes all complex query logic. It is now the single source of truth for both status filtering (`isActive`, `isDeleted`) and our critical, role-based **Visibility Scope filtering**.
    *   **Decoupled & Generic:** The `BaseQueryBuilder` is now fully decoupled from any specific resource model. It injects a dedicated `ClientResolverService` to handle the complex logic of resolving `Subsidiary` and `Client` scopes, making the builder pattern truly generic and reusable for all current and future resources.
*   **DRY DTOs:** We are using `@nestjs/mapped-types` (`PartialType`) to automatically generate `Update...Dto` files from `Create...Dto` files, reducing code duplication.
*   **Standardized Query DTOs:** All query DTOs (e.g., `QueryClientDto`) are equipped with `class-transformer` decorators (`@Type(() => Boolean)`) to ensure robust transformation of query parameter strings into their correct types.

#### **3. Data Integrity & Lifecycle Management**

We have implemented a multi-layered defense to ensure data is always clean, valid, and consistent.
*   **Global Validation Pipe:** A global `ValidationPipe` with strict rules (`forbidNonWhitelisted: true`, `transform: true`) enforces the API contract defined by our DTOs.
*   **Custom Relational Validation:** A suite of custom validation decorators (`@IsExistingRole`, `@IsExistingClients`, etc.) connects to our services to verify that all incoming entity relationships point to real, active documents in the database.
*   **Pre-Condition on Inactivation:** An administrator is now prevented from deactivating a parent record (`Subsidiary`, `Client`, `Role`) if it has any active child records, enforced with a `409 Conflict` error.

#### **4. Security & Authorization**

We have implemented a robust, multi-layered, and data-driven access control system that is **secure by default**.

*   **Globally Enforced Authentication & Authorization:** A `JwtAuthGuard` and `PermissionsGuard` are registered as **global `APP_GUARD`s**. This ensures every single endpoint in the application is automatically protected, and access must be explicitly granted.
*   **Endpoint-Level Action Permissions:** A flexible `PermissionsGuard` reads custom decorator metadata (`@RequirePermission('User:Create')`) to control which actions a user can perform, providing granular, endpoint-level security.
*   **Data-Level Visibility Scope:** The `BaseQueryBuilder` automatically and transparently filters all database queries based on the user's assigned `visibilityScope`, ensuring true data segregation in our multi-tenant environment.
*   **Secure Service-Level Authorization:** Our services now use a consistent pattern of calling a secure `findOne(id, user)` method—which combines the visibility scope filter with the ID check—as an authorization check before any `update` or `delete` operation.
*   **Standardized Error Handling (`MongoExceptionFilter`):** A global filter transforms specific database errors (like duplicate key violations) into user-friendly `409 Conflict` HTTP responses.

#### **5. Automated Testing**

We have established a comprehensive, automated testing strategy that guarantees the stability and correctness of our platform.
*   **Unit Tests:** A suite of isolated unit tests has been created to verify the business logic of our custom validators and complex services like the `ClientResolverService`.
*   **Modular, Multi-File E2E Suites:** We have built a full E2E test suite for **every core resource, including `Counters`**, organized into three distinct files for maintainability:
    *   `*.crud.e2e-spec.ts` (Validations and basic operations)
    *   `*.auth.e2e-spec.ts` (Permissions and visibility scope)
    *   `*.advanced.e2e-spec.ts` (Business logic and interactions)
*   **Standardized Test Utilities:** A central `test/test-utils.ts` file now encapsulates all E2E test setup boilerplate (app creation, in-memory DB setup, JWT service access). This has been refactored into all existing E2E tests, making them significantly cleaner and easier to maintain.
*   **Transaction-Aware E2E Testing:** These tests run against an isolated, in-memory MongoDB **Replica Set** (`MongoMemoryReplSet`), enabling them to reliably validate our complex, multi-document ACID transaction logic.

**Again, your task is to confirm you have understood what has already been built**