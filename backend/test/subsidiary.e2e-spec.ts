import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { useContainer } from 'class-validator';

import { DatabaseModule } from '../src/database/database.module';

import { SubsidiariesModule } from '../src/subsidiaries/subsidiaries.module';
import { Subsidiary, SubsidiaryDocument } from '../src/subsidiaries/entities/subsidiary.schema';
import { CreateSubsidiaryDto } from '../src/subsidiaries/dto/create-subsidiary.dto';

import { ClientsModule } from '../src/clients/clients.module';
import { Client, ClientDocument } from '../src/clients/entities/client.schema';

describe('SubsidiariesController (e2e)', () => {
  let app: INestApplication;
  let mongod: MongoMemoryReplSet;
  let subsidiaryModel: Model<SubsidiaryDocument>;
  let clientModel: Model<ClientDocument>;
  let createdSubsidiaryId: string;

  // Increase timeout for initial MongoDB download
  jest.setTimeout(60000);

  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        dbName: 'jest'
      }
    });
    const uri = mongod.getUri();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        DatabaseModule,
        SubsidiariesModule,
        ClientsModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    useContainer(moduleFixture, { fallbackOnErrors: true });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();

    subsidiaryModel = moduleFixture.get<Model<SubsidiaryDocument>>(
      getModelToken(Subsidiary.name),
    );
    clientModel = moduleFixture.get<Model<ClientDocument>>(
      getModelToken(Client.name),
    );

    await subsidiaryModel.syncIndexes();
    await clientModel.syncIndexes();
  });

  afterAll(async () => {
    await app.close();
    await mongod.stop();
  });

  beforeEach(async () => {
    await subsidiaryModel.deleteMany({});
    await clientModel.deleteMany({});
  });

  describe('POST /subsidiaries', () => {
    it('should SUCCEED with 201 Created when creating a new subsidiary successfully', async () => {
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
    });

    it('should FAIL with 400 Bad Request if required fields are missing', () => {
      const incompleteDto = { name: 'Incomplete Subsidiary' };
      return request(app.getHttpServer())
        .post('/subsidiaries')
        .send(incompleteDto)
        .expect(400);
    });

    it('should FAIL with a 400 Bad Request if a non-whitelisted field is provided', () => {
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

    it('should SUCCEED with 200 OK when querying for a specific subsidiary by its ID', () => {
      return request(app.getHttpServer())
        .get(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(200)
        .then((response) => {
          expect(response.body._id).toEqual(createdSubsidiaryId);
          expect(response.body.name).toEqual('Find Me Subsidiary');
        });
    });

    it('should FAIL with a 404 Not Found for a non-existent subsidiary ID', () => {
      const fakeMongoId = '63b4c5d6e7f8a9b0c1d2e3f5';
      return request(app.getHttpServer())
        .get(`/subsidiaries/${fakeMongoId}`)
        .expect(404);
    });

    it('should SUCCEED with 200 OK when querying for all active, non-deleted subsidiaries by default', () => {
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
    it('should SUCCEED with 200 OK and return soft-deleted records when isDeleted=true is queried (Admin)', async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_004',
        name: 'Deleted Subsidiary',
      }).save();

      await request(app.getHttpServer()).delete(`/subsidiaries/${subsidiary._id}`);

      const response = await request(app.getHttpServer())
        .get('/subsidiaries?isDeleted=true')
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toEqual('Deleted Subsidiary');
    });

    it('should SUCCEED with 200 OK and return both active and inactive records when includeInactives=true is queried', async () => {
      await new subsidiaryModel({ recordId: 'SUB_E2E_005', name: 'Active Sub' }).save();
      await new subsidiaryModel({
        recordId: 'SUB_E2E_006',
        name: 'Inactive Sub',
        isActive: false,
      }).save();

      const response = await request(app.getHttpServer())
        .get('/subsidiaries?includeInactives=true')
        .expect(200);

      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /subsidiaries/:subsidiaryId/clients', () => {
    let sub1_id: string;
    let sub2_id: string;

    beforeEach(async () => {
      const sub1 = await new subsidiaryModel({ recordId: 'SUB1', name: 'Subsidiary One' }).save();
      const sub2 = await new subsidiaryModel({ recordId: 'SUB2', name: 'Subsidiary Two' }).save();
      sub1_id = sub1._id.toString();
      sub2_id = sub2._id.toString();

      await new clientModel({ recordId: 'C1', name: 'Client A (Sub 1)', subsidiaryId: sub1_id }).save();
      await new clientModel({ recordId: 'C2', name: 'Client B (Sub 1)', subsidiaryId: sub1_id }).save();
      await new clientModel({ recordId: 'C3', name: 'Client C (Sub 2)', subsidiaryId: sub2_id }).save();
    });

    it('should SUCCEED with 200 OK and return only the clients belonging to the specified subsidiary', async () => {
      const response = await request(app.getHttpServer())
        .get(`/subsidiaries/${sub1_id}/clients`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(2);

      const names = response.body.map(client => client.name);
      expect(names).toContain('Client A (Sub 1)');
      expect(names).toContain('Client B (Sub 1)');
      expect(names).not.toContain('Client C (Sub 2)');
    });

    it('should SUCCEED with 200 OK and return an empty array if the subsidiary exists but has no clients', async () => {
      const sub3 = await new subsidiaryModel({ recordId: 'SUB3', name: 'Subsidiary Three (No Clients)' }).save();

      const response = await request(app.getHttpServer())
        .get(`/subsidiaries/${sub3._id}/clients`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBe(0);
    });

    it('should SUCCEED with 200 OK when testing client related query parameters like ?name=', async () => {
      const response = await request(app.getHttpServer())
        .get(`/subsidiaries/${sub1_id}/clients?name=Client A`)
        .expect(200);

      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toEqual('Client A (Sub 1)');
    });
  });

  describe('GET /subsidiaries/:subsidiaryId/clients (Guard Logic)', () => {
    let activeSubId: string;
    let inactiveSubId: string;

    beforeEach(async () => {
      const activeSub = await new subsidiaryModel({ recordId: 'ACTIVE_SUB', name: 'Active Sub' }).save();
      activeSubId = activeSub._id.toString();
      await new clientModel({ recordId: 'C1', name: 'Client of Active Sub', subsidiaryId: activeSubId }).save();

      const inactiveSub = await new subsidiaryModel({ recordId: 'INACTIVE_SUB', name: 'Inactive Sub', isActive: false }).save();
      inactiveSubId = inactiveSub._id.toString();
      await new clientModel({ recordId: 'C2', name: 'Client of Inactive Sub', subsidiaryId: inactiveSubId }).save();
    });

    it('should SUCCEED with 200 OK when requesting clients for an ACTIVE subsidiary', () => {
      return request(app.getHttpServer())
        .get(`/subsidiaries/${activeSubId}/clients`)
        .expect(200)
        .then(res => {
          expect(res.body.length).toBe(1);
          expect(res.body[0].name).toBe('Client of Active Sub');
        });
    });

    it('should FAIL with 404 Not Found when requesting clients for an INACTIVE subsidiary', () => {
      return request(app.getHttpServer())
        .get(`/subsidiaries/${inactiveSubId}/clients`)
        .expect(404);
    });

    it('should FAIL with 404 Not Found when requesting clients for a non-existent subsidiary ID', () => {
      const fakeId = '60f8f1b3b5f9f1b3b5f9f1b5';
      return request(app.getHttpServer())
        .get(`/subsidiaries/${fakeId}/clients`)
        .expect(404);
    });
  });



  describe('PATCH /subsidiaries/:subsidiaryId', () => {
    let subsidiaryToUpdateId: string;

    beforeEach(async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({ recordId: 'SUB_E2E_007', name: 'Update Me Subsidiary', }).save();
      subsidiaryToUpdateId = subsidiary._id.toString();
    });

    it('should SUCCEED with 200 OK when updating a subsidiary successfully', () => {
      const updateDto = { name: 'Updated E2E Subsidiary' };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.name).toEqual('Updated E2E Subsidiary');
        });
    });

    it('should SUCCEED with 200 OK when allowing an admin to set isActive to false', () => {
      const updateDto = { isActive: false };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(200)
        .then((response) => {
          expect(response.body.isActive).toBe(false);
        });
    });

    it('should SUCCEED with 200 OK when updating a subsidiary successfully', () => {
      const updateDto = { name: 'Updated E2E Subsidiary' };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(200);
    });

    it('should update a subsidiary successfully', () => {
      const updateDto = { name: 'Updated E2E Subsidiary' };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(200);
    });

    it('should FAIL with 409 Conflict when trying to deactivate a subsidiary that has active clients', async () => {
      await new clientModel({ recordId: 'ACTIVE_CHILD', name: 'Active Child Client', subsidiaryId: subsidiaryToUpdateId }).save();
      const updateDto = { isActive: false };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(409)
        .then(res => {
          expect(res.body.message).toContain('This subsidiary cannot be deactivated because it has 1 active client(s) assigned to it.');
        });
    });

    it('should SUCCEED 200 OK when deactivating a subsidiary that has only inactive clients', async () => {
      await new clientModel({ recordId: 'INACTIVE_CHILD', name: 'Inactive Child Client', subsidiaryId: subsidiaryToUpdateId, isActive: false }).save();
      const updateDto = { isActive: false };
      return request(app.getHttpServer())
        .patch(`/subsidiaries/${subsidiaryToUpdateId}`)
        .send(updateDto)
        .expect(200)
        .then(res => {
          expect(res.body.isActive).toBe(false);
        });
    });
  });


  describe('DELETE /subsidiaries/:subsidiaryId', () => {
    beforeEach(async () => {
      const subsidiary: SubsidiaryDocument = await new subsidiaryModel({
        recordId: 'SUB_E2E_DELETE_001',
        name: 'To Be Deleted',
      }).save();
      createdSubsidiaryId = subsidiary._id.toString();
    });

    it('should SUCCEED with 200 OK when soft-deleting a subsidiary successfully', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(200);

      expect(response.body.isDeleted).toBe(true);
      expect(response.body.isActive).toBe(false);

      await request(app.getHttpServer())
        .get(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(404);
    });

    it('should SUCCEED with 200 OK when atomically disassociate all child clients when a subsidiary is deleted', async () => {
      // Use the subsidiary created in the beforeEach hook to link clients
      await new clientModel({ recordId: 'CLI-001', name: 'Client One', subsidiaryId: createdSubsidiaryId }).save();
      await new clientModel({ recordId: 'CLI-002', name: 'Client Two', subsidiaryId: createdSubsidiaryId }).save();
      await new clientModel({ recordId: 'CLI-003', name: 'Unaffiliated Client', subsidiaryId: null }).save();

      await request(app.getHttpServer())
        .delete(`/subsidiaries/${createdSubsidiaryId}`)
        .expect(200);

      const clientOne = await clientModel.findOne({ recordId: 'CLI-001' });
      const clientTwo = await clientModel.findOne({ recordId: 'CLI-002' });
      const unaffiliatedClient = await clientModel.findOne({ recordId: 'CLI-003' });

      // Check that the linked clients were disassociated
      expect(clientOne).not.toBeNull();
      expect(clientOne!.subsidiaryId).toBeNull();
      expect(clientTwo).not.toBeNull();
      expect(clientTwo!.subsidiaryId).toBeNull();

      // Check that the unaffiliated client was not affected
      expect(unaffiliatedClient).not.toBeNull();
      expect(unaffiliatedClient!.subsidiaryId).toBeNull();

      // Final check: ensure no clients are left pointing to the deleted subsidiary ID
      const orphanedCount = await clientModel.countDocuments({ subsidiaryId: createdSubsidiaryId });
      expect(orphanedCount).toBe(0);
    });
  });
});