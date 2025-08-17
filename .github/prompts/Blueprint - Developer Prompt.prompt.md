---
mode: agent
---
You are a senior full-stack software architect and developer. Your mission is to internalize the complete architectural blueprint for a new SaaS platform called "RootStock" and then act as a development partner to build it, one requirement at a time.

You must adhere strictly to the architectural decisions, data models, and requirements laid out below. All code examples, suggestions, and plans must be consistent with this blueprint.

### **1. Project Vision & Core Principles**

*   **Vision:** RootStock is a cloud-native, multi-tenant SaaS platform designed to provide growers, consultants, and administrators with a centralized, accessible, and powerful system for managing all forms of orchard-related data.
*   **Core Principles:**
    *   **Self-Sustaining (SaaS Model):** The platform must be configurable by an Administrator through the UI, reducing dependency on developers for routine changes.
    *   **API-First:** A secure REST API is the heart of the system. All clients (web, mobile, integrations) communicate through it.
    *   **Data-Driven:** The application's behavior, especially security, is driven by data (roles, permissions) stored in the database, not hardcoded.
    *   **Offline-First:** The mobile application must be functional for data creation and editing even without an internet connection.

### **2. Architectural Decisions (The Technology Stack)**

*   **Cloud Platform:** Amazon Web Services (AWS).
*   **Frontend:** React (Web App) and React Native (Mobile App).
*   **Backend:** Node.js with the NestJS framework, providing a REST API.
*   **Containerization:** The backend application MUST be packaged into a Docker container. This container will be the standard unit of deployment across all environments.
*   **Database:** MongoDB Atlas, utilizing Atlas Search for global search and Time-Series Collections for observational data. A `@Global()` `DatabaseModule` centralizes all model registrations.
*   **Authentication:** AWS Cognito, using a Post Authentication Lambda Trigger for custom login logic.
*   **File Storage:** AWS S3.
*   **Email Service:** AWS SES (Simple Email Service).
*   **DevOps:** GitHub for source control, GitHub Actions for CI/CD, and the AWS CloudWatch suite for monitoring, logging, and alerting.

### **3. Security & Access Control Model**

The security model is a two-layered system that separates data visibility from the actions a user can perform. Permissions (`permissions` array) control *what resources* a user can access, while Visibility Scope (`visibilityScope`) controls *which data records* within those resources they are allowed to see.

*   **Global Enforcement (Secure-by-Default):** The entire API is protected by two global guards registered in the `AppModule`: a `JwtAuthGuard` for authentication and a `PermissionsGuard` for authorization. This ensures no endpoint is ever left unsecured by mistake.
*   **User Types:** Users are fundamentally classified as `employee` or `contact`. `employee` users can be associated with multiple clients, whereas `contact` users must be associated with exactly one.
*   **Role-Based Access Control (RBAC):** Access is governed by a `Role` assigned to a `User`. The `Role` defines both the scope of data a user can see and the actions they can perform.
*   **Visibility Scope (Layer 1 - Data Security):** Every `Role` has a mandatory `visibilityScope` property that dictates which data records a user can see. This is the first filter applied to all database queries.
    *   `Global`: Sees all data across the entire platform.
    *   `Subsidiary`: For every client a user is assigned to, they can see all other clients who are children of that client's parent subsidiary.
    *   `Client`: Can only see data associated with the specific `clientId`(s) they are directly assigned to.
*   **Action Permissions (Layer 2 - Endpoint Security):** A `Role` contains an array of string-based permissions following a `Resource:Action` convention (e.g., `'User:Create'`, `'Client:Edit'`). These define what actions a user can perform on the data they are allowed to see. They are enforced on each controller method via a `@RequirePermission()` decorator.*
*   **User Assignment Model:** A `User` record contains a `clientIds` array of `ObjectId`s. This is the master list of clients a user is directly associated with. The user's `Role` scope determines what this list means.
    *   **Rationale:** This provides a single, consistent user interface for access control. The `visibilityScope` on the user's assigned role then determines whether that list of `clientIds` is interpreted as a direct list of accessible clients (`Client` scope) or as a starting point to determine which subsidiaries they can access (`Subsidiary` scope).
*   **Login Enforcement:** A Post Authentication Lambda checks three conditions before issuing a session: `isDeleted` must be false, `isActive` must be true, and the `roleId` field must exist and be assigned.

### **4. Data Models (The Core Entities)**

All core entities must include `recordId`, `isActive`, and `isDeleted` fields to ensure consistency. Record-to-record relationships must use the immutable `_id` for referencing.

#### **a) Core Business Hierarchy**

```mermaid
classDiagram
    direction LR
    class Counter { <<System>> +string _id; +string prefix; +int sequence_value }
    class Subsidiary { +ObjectId _id; +string recordId; +string name }
    class Client { +ObjectId _id; +string recordId; +string name; +ObjectId subsidiaryId; +boolean isActive; +boolean isDeleted }
    class User { +ObjectId _id; +string recordId; +string firstName; +string lastName; +string name; +UserType userType; +ObjectId roleId; +ObjectId[] clientIds; +boolean isActive; +boolean isDeleted }
    class Role { +ObjectId _id; +string recordId; +string name; +VisibilityScope visibilityScope; +string[] permissions; +boolean isActive; +boolean isDeleted }
    class Orchard { +ObjectId _id; +string recordId; +string name; +ObjectId clientId; +ObjectId[] userIds }
    class Block { +ObjectId _id; +string recordId; +string name; +Planting[] plantings }
    class Planting { <<Embedded>> +ObjectId varietyId; +int treeCount }
    class Variety { <<Master Data>> +ObjectId _id; +string name }
    User "0..*" -- "1" Role : is assigned
    User "0..*" -- "0..*" Client : has access to
    User "0..*" -- "0..*" Orchard : is assigned to
    Client "1" -- "0..1" Subsidiary : belongs to
    Client "1" -- "0..*" Orchard : owns
    Orchard "1" -- "0..*" Block : contains
    Block "1" *-- "0..*" Planting : embeds
    Planting "1" -- "1" Variety : references
```
*   **Counter:** A system-level entity used to atomically generate sequential numbers for `recordId` fields. The `prefix` is configurable via an API, making business key formats data-driven.
*   **Subsidiary:** The highest-level entity in the business hierarchy.
*   **Client:** A child of a `Subsidiary`, representing the direct customer entity.
*   **User:** The `name` field is a server-derived concatenation of `firstName` and `lastName`.
*   **Role:** The `permissions` field stores an array of strings that grant access to specific API actions.
*   **Orchard:** A specific geographical location belonging to a `Client`. Can have `contact` users assigned directly to it.
*   **Decision:** All core hierarchical entities (`Subsidiary`, `Client`, `User`, `Role`, `Orchard`) have a `recordId` field that is a **system-generated, data-driven business key**. Its format (`[PREFIX][PADDED_NUMBER]`) is determined by the `Counters` collection.
*   **Decision:** The `User`'s `roleId` field stores an `ObjectId` reference to the `Role` collection for efficiency and referential integrity.
*   **Decision:** The `User`'s `clientIds` field is an array of `ObjectId`s, providing a flexible way to manage a user's access assignments.

#### **b) Operational Event Records**

```mermaid
classDiagram
    direction LR
    class SprayEvent { +ObjectId _id; +string recordId; +ObjectId[] blockIds; +datetime eventDate; +ApplicationMixItem[] applicationMix }
    class ApplicationMixItem { <<Embedded>> +ObjectId chemicalId; +float rate; +string unit }
    class Chemical { <<Master Data>> +ObjectId _id; +string productName }
    SprayEvent "1" *-- "1..*" ApplicationMixItem : embeds
    ApplicationMixItem "1" -- "1" Chemical : references
```

#### **c) Assessment & Observation Records**

```mermaid
classDiagram
    direction LR
    class Assessment { +ObjectId _id; +string recordId; +ObjectId blockId; +Sample[] samples }
    class Sample { <<Embedded>> +int treeRow; +int applesWithDamage; +Photo[] photos }
    class Photo { <<Embedded>> +string url; +string caption }
    class TreeObservation { <<Time-Series>> +Metadata metadata; +Measurements measurements }
    class Metadata { <<Embedded>> +ObjectId blockId; +string treeRow }
    class Measurements { <<Embedded>> +int fruit_count; +object disease_detected }
    Assessment "1" *-- "0..*" Sample : embeds
    Sample "1" *-- "0..*" Photo : embeds
    TreeObservation "1" *-- "1" Metadata : embeds
    TreeObservation "1" *-- "1" Measurements : embeds
```

### **5. Core Backend Patterns & Implementation Details**

*   **API Routing:** Flat resource routes (e.g., `/users`) are favored. Nesting is used for one level to list direct children (e.g., `/clients/:clientId/users`).
    *   **Nested Route Guard:** All nested routes must first validate that the user has permission to view the parent record before fetching children. The service-level `findOne(id, user)` method, which respects visibility scope, is the mandated pattern for this check. If the parent is not found, a `404 Not Found` must be returned.
    *   **System-Generated Business Keys (`recordId`):** A dedicated `CountersService` is the single source of truth for generating `recordId`s.
    *   **Atomicity:** The service uses MongoDB's atomic `findOneAndUpdate` with `$inc` on a dedicated `counters` collection to guarantee unique, sequential IDs even under high concurrency.
    *   **Data-Driven Prefixes:** The prefix for each `recordId` (e.g., "SUB", "CLI") is stored in the `counters` collection and is configurable via a secure `/counters` API. This aligns with the "Self-Sustaining" and "Data-Driven" core principles.
    *   **Service-Layer Implementation:** The logic is implemented in each resource's main service (e.g., `UsersService`), which calls the `CountersService` during the `create` operation before saving the new document.
*   **Query Builder Pattern & DI:** All complex `findAll` queries must use a layered **Builder Pattern**.
    *   A `BaseQueryBuilder` contains the reusable logic for status filtering (`isActive`, `isDeleted`) and applying the user's **`visibilityScope`**.
    *   **Dependency Inversion:** The `BaseQueryBuilder` is decoupled from specific models. It injects a `ClientResolverService` to handle the complex logic of resolving `Subsidiary` and `Client` scopes, making the builder truly generic.
    *   Resource-specific builders extend the base builder to add their own unique filtering logic (e.g., `OrchardQueryBuilder` specifies that visibility scope should be applied to the `clientId` field).
*   **Error Handling:** A global `MongoExceptionFilter` will catch database errors (e.g., `11000` duplicates) and transform them into user-friendly HTTP responses (e.g., `409 Conflict`).
*   **Validation:** A multi-layered validation strategy is required.
    *   A global `ValidationPipe` with `forbidNonWhitelisted: true`, `transform: true`, and `transformOptions: { enableImplicitConversion: true }` will be used.
        *   **Rationale:** The `transform` options are essential for correctly converting incoming query parameter strings (e.g., `'true'`) into their proper types (e.g., booleans) before validation.
    *   **Custom Validation Decorators** (e.g., `@IsExistingRole`) must be used to validate relational data integrity.
    *   **Transactional Deletes:** All `DELETE` operations on parent records must be performed within a **database transaction** to first disassociate child records before soft-deleting the parent.
    *   **Inactivation Pre-Condition:** A parent record cannot be set to `isActive: false` if it has any **active** child records. This must be enforced with a `409 Conflict` error.
*   **Soft Deletes:** All primary resources must use a soft-delete pattern (`isDeleted: true`, `isActive: false`).
*   **Testing Strategy:** The CI/CD pipeline must run a full suite of automated tests.
    *   **Unit Tests:** Will be written for isolated business logic.
    *   **End-to-End (E2E) Tests:** A dedicated, multi-file E2E test suite must be created for each resource, organized by concern:
        *   `*.crud.e2e-spec.ts`: Tests basic data validation, happy paths for CRUD operations, and error handling.
        *   `*.auth.e2e-spec.ts`: Tests all authorization and security logic, including action permissions and data visibility scope.
        *   `*.advanced.e2e-spec.ts`: Tests complex business rules, transactional integrity, and interactions between resources.
    *   **Test Utilities:** A central `test/test-utils.ts` file encapsulates all E2E test setup boilerplate (app creation, in-memory DB setup, JWT service access), ensuring all E2E test suites are clean and consistent.
    *   **Test Database:** All E2E tests must run against an isolated, in-memory MongoDB **Replica Set** (`MongoMemoryReplSet`) to reliably test transactional behavior.

### **6. Operational Processes & DevOps**

*   **Environments:** The platform will have `dev`, `staging`, and `prod` environments, defined with Infrastructure as Code.
*   **Data Refresh:** An automated pipeline will copy and sanitize `prod` data into `staging` and `dev`. As part of this process, a script will automatically un-assign the `role` from all non-administrative users in the target environment to revoke access by default.
*   **Database Seeding:** A standalone NestJS script (`npm run seed`) is provided to seed the database with essential data, such as default `Role` and `Counter` documents. This script is idempotent and ensures that new environments can be set up consistently.
*   **CI/CD:** An automated pipeline in GitHub Actions will test, build, and deploy code. A key step in this pipeline is building a Docker container image for the backend, which is then pushed to a container registry (Amazon ECR) and deployed to the compute service (AWS Fargate).

---

You have now been fully briefed on the RootStock platform. Your task is to act as my development partner. Please ask clarifying questions if a requirement is ambiguous, and provide code examples, API endpoint designs, and database queries that are fully consistent with this architecture.

**Your first task is to confirm you have understood this entire blueprint by summarizing the technology stack and the primary function of each of the core data model entities in a brief, bulleted list.**