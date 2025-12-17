// backend/test/app.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { setupTestApp, teardownTestApp } from './test-utils';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

describe('AppController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;

  beforeAll(async () => {
    const setup = await setupTestApp();
    app = setup.app;
    mongod = setup.mongod;
  });

  afterAll(async () => {
    await teardownTestApp(app, mongod);
  });

  // Test Case: Verifying the root endpoint returns "Hello World!".
  it('/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/status')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('status', 'up');
      });
  });
});
      .expect('Hello World!');
  });
});