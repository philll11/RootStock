import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { SubsidiariesModule } from '../src/subsidiaries/subsidiaries.module';
import { Subsidiary, SubsidiaryDocument } from '../src/subsidiaries/entities/subsidiary.schema';
import { CreateSubsidiaryDto } from '../src/subsidiaries/dto/create-subsidiary.dto';

describe('SubsidiariesController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryServer;
  let subsidiaryModel: Model<SubsidiaryDocument>;
  let createdSubsidiaryId: string;

  // Increase timeout for initial MongoDB download
  jest.setTimeout(60000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        SubsidiariesModule
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // This is required for custom validators to use DI
    useContainer(moduleFixture, { fallbackOnErrors: true });

    // Use the same validation pipe setup as in main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));

    await app.init();

    subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(getModelToken(Subsidiary.name));

    // Ensure indexes are built before running tests
    await subsidiaryModel.syncIndexes();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  // Clean up the database before each test
  beforeEach(async () => {
    await subsidiaryModel.deleteMany({});
  });

  describe('POST /subsidiaries', () => {
    it('should create a new subsidiary successfully', async () => {
      const createSubsidiaryDto: CreateSubsidiaryDto = {
        recordId: 'SUB_E2E_001',
        name: 'E2E Test Subsidiary',
      };

      const response = await request(app.getHttpServer())
        .post('/subsidiaries')
        .send(createSubsidiaryDto)
        .expect(201);

      expect(response.body).toHaveProperty('_id');
      expect(response.body.name).toEqual(createSubsidiaryDto.name);
      expect(response.body.recordId).toEqual(createSubsidiaryDto.recordId);
      expect(response.body.isActive).toBe(true);
      expect(response.body.isDeleted).toBe(false);
      createdSubsidiaryId = response.body._id;
    });

    it('should fail with a 400 Bad Request if required fields are missing', () => {
      const incompleteDto = { name: 'Incomplete Subsidiary' }; // Missing recordId
      return request(app.getHttpServer())
        .post('/subsidiaries')
        .send(incompleteDto)
        .expect(400);
    });

    it('should fail with a 400 Bad Request if a non-whitelisted field is provided', () => {
      const extraFieldDto = {
        name: 'Extra Field Sub',
        recordId: 'SUB_E2E_002',
        someUnexpectedField: 'danger',
      };
      return request(app.getHttpServer())
        .post('/subsidiaries')
        .send(extraFieldDto)
        .expect(400);
    });
  });

  describe('GET /subsidiaries', () => {
    beforeEach(async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_003',
        name: 'Find Me Subsidiary',
      }).save();
      createdSubsidiaryId = subsidiary._id.toString();
    });

    it('should find a specific subsidiary by its ID', () => {
      return request(app.getHttpServer())
        .get(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(200)
        .then((response) => {
          expect(response.body._id).toEqual(createdSubsidiaryId);
          expect(response.body.name).toEqual('Find Me Subsidiary');
        });
    });

    it('should return a 404 Not Found for a non-existent subsidiary ID', () => {
      const fakeMongoId = '63b4c5d6e7f8a9b0c1d2e3f5';
      return request(app.getHttpServer())
        .get(`/subsidiaries/${fakeMongoId}`)
        .expect(404);
    });

    it('should find all active, non-deleted subsidiaries by default', () => {
      return request(app.getHttpServer())
        .get('/subsidiaries')
        .expect(200)
        .then((response) => {
          expect(Array.isArray(response.body)).toBe(true);
          expect(response.body.length).toBe(1);
          expect(response.body[0].name).toEqual('Find Me Subsidiary');
        });
    });
  });

  describe('GET /subsidiaries (Advanced Queries)', () => {
    it('should return soft-deleted records when isDeleted=true is queried (Admin)', async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_004',
        name: 'Deleted Subsidiary',
      }).save();
      await request(app.getHttpServer()).delete(`/subsidiaries/${subsidiary._id}`);

      // This relies on the controller's fake user role being 'Administrator'
      const response = await request(app.getHttpServer())
        .get('/subsidiaries?isDeleted=true')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toEqual('Deleted Subsidiary');
    });

    it('should return both active and inactive records when includeInactives=true is queried', async () => {
      await new subsidiaryModel({ recordId: 'SUB_E2E_005', name: 'Active Sub' }).save();
      await new subsidiaryModel({ recordId: 'SUB_E2E_006', name: 'Inactive Sub', isActive: false }).save();

      const response = await request(app.getHttpServer())
        .get('/subsidiaries?includeInactives=true')
        .expect(200);

      expect(response.body.length).toBe(2);
    });
  });

  describe('PATCH /subsidiaries/:subsidiaryId', () => {
    beforeEach(async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_007',
        name: 'Update Me Subsidiary',
      }).save();
      createdSubsidiaryId = subsidiary._id.toString();
    });

    it('should update a subsidiary successfully', () => {
      const updateDto = { name: 'Updated E2E Subsidiary' };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${createdSubsidiaryId}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.name).toEqual('Updated E2E Subsidiary');
        });
    });

    it('should allow an admin to set isActive to false', () => {
      const updateDto = { isActive: false };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${createdSubsidiaryId}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.isActive).toBe(false);
        });
    });
  });

  describe('DELETE /subsidiaries/:subsidiaryId', () => {
    beforeEach(async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_008',
        name: 'Delete Me Subsidiary',
      }).save();
      createdSubsidiaryId = subsidiary._id.toString();
    });

    it('should soft-delete a subsidiary successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(200);

      expect(response.body.isDeleted).toBe(true);
      expect(response.body.isActive).toBe(false);

      // Verify it no longer appears in a standard search
      await request(app.getHttpServer())
        .get(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(404);
    });
  });
});