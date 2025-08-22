import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';

import { SubsidiariesController } from './subsidiaries.controller';
import { SubsidiariesService } from './subsidiaries.service';
import { ClientsService } from '../clients/clients.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';
import { QueryClientDto } from '../clients/dto/query-client.dto';
import { User, UserType } from '../users/schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// Mock request object with user context 
const createMockRequest = (userRole: any = null) => ({
  user: {
    _id: new Types.ObjectId(),
    recordId: 'USR001',
    firstName: 'Controller',
    lastName: 'User',
    name: 'Controller User',
    email: 'controller@example.com',
    userType: UserType.EMPLOYEE,
    clientIds: [new Types.ObjectId()],
    isActive: true,
    isDeleted: false,
    roleId: userRole || {
      _id: new Types.ObjectId(),
      recordId: 'ROL001',
      name: 'Controller Role',
      visibilityScope: VisibilityScope.GLOBAL,
      permissions: [
        PERMISSIONS.SUBSIDIARY_VIEW, 
        PERMISSIONS.SUBSIDIARY_CREATE, 
        PERMISSIONS.SUBSIDIARY_EDIT,
        PERMISSIONS.SUBSIDIARY_DELETE
      ],
      isActive: true,
      isDeleted: false,
    }
  }
});

describe('SubsidiariesController', () => {
  let controller: SubsidiariesController;
  let subsidiariesService: jest.Mocked<SubsidiariesService>;
  let clientsService: jest.Mocked<ClientsService>;

  beforeEach(async () => {
    // Mock all SubsidiariesService methods
    const mockSubsidiariesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    // Mock ClientsService for nested route
    const mockClientsService = {
      findAllBySubsidiaryId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubsidiariesController],
      providers: [
        { provide: SubsidiariesService, useValue: mockSubsidiariesService },
        { provide: ClientsService, useValue: mockClientsService },
      ],
    }).compile();

    controller = module.get<SubsidiariesController>(SubsidiariesController);
    subsidiariesService = module.get(SubsidiariesService);
    clientsService = module.get(ClientsService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Subsidiary Creation Endpoint', () => {
    it('should delegate to service for subsidiary creation', async () => {
      // Arrange: Create subsidiary request
      const createDto: CreateSubsidiaryDto = {
        name: 'TechCorp Agriculture'
      };

      const expectedSubsidiary = {
        _id: new Types.ObjectId(),
        recordId: 'SUB001',
        ...createDto,
        isActive: true,
        isDeleted: false
      };

      subsidiariesService.create.mockResolvedValue(expectedSubsidiary as any);

      // Act: Create subsidiary through controller
      const result = await controller.create(createDto);

      // Assert: Service called correctly
      expect(subsidiariesService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedSubsidiary);
    });
  });

  describe('Subsidiary Query Endpoint', () => {
    it('should delegate query to service with user context', async () => {
      // Arrange: Query subsidiaries request
      const mockRequest = createMockRequest();
      const queryDto: QuerySubsidiaryDto = { isActive: true };
      const mockSubsidiaries = [
        { _id: new Types.ObjectId(), name: 'Agriculture Co', recordId: 'SUB001' },
        { _id: new Types.ObjectId(), name: 'FarmTech Ltd', recordId: 'SUB002' }
      ];
      
      subsidiariesService.findAll.mockResolvedValue(mockSubsidiaries as any);

      // Act: Query through controller
      const result = await controller.findAll(queryDto, mockRequest as any);

      // Assert: Service called with proper parameters
      expect(subsidiariesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(mockSubsidiaries);
    });
  });

  describe('Individual Subsidiary Access Endpoint', () => {
    it('should delegate findOne to service with security context', async () => {
      // Arrange: Get subsidiary by ID request
      const mockRequest = createMockRequest();
      const subsidiaryId = new Types.ObjectId().toHexString();
      const mockSubsidiary = {
        _id: subsidiaryId,
        recordId: 'SUB001',
        name: 'Agriculture Solutions Inc',
        isActive: true,
        isDeleted: false
      };
      
      subsidiariesService.findOne.mockResolvedValue(mockSubsidiary as any);

      // Act: Find subsidiary through controller
      const result = await controller.findOne(subsidiaryId, mockRequest as any);

      // Assert: Service called with proper parameters
      expect(subsidiariesService.findOne).toHaveBeenCalledWith(subsidiaryId, mockRequest.user);
      expect(result).toEqual(mockSubsidiary);
    });
  });

  describe('Subsidiary Update Endpoint', () => {
    it('should delegate update to service with user context', async () => {
      // Arrange: Update subsidiary request
      const mockRequest = createMockRequest();
      const subsidiaryId = new Types.ObjectId().toHexString();
      const updateDto: UpdateSubsidiaryDto = {
        name: 'Updated Agriculture Corp',
        isActive: true
      };

      const updatedSubsidiary = {
        _id: subsidiaryId,
        recordId: 'SUB001',
        ...updateDto,
        isDeleted: false
      };
      
      subsidiariesService.update.mockResolvedValue(updatedSubsidiary as any);

      // Act: Update subsidiary through controller
      const result = await controller.update(subsidiaryId, updateDto, mockRequest as any);

      // Assert: Service called with proper parameters
      expect(subsidiariesService.update).toHaveBeenCalledWith(subsidiaryId, updateDto, mockRequest.user);
      expect(result).toEqual(updatedSubsidiary);
    });
  });

  describe('Subsidiary Deletion Endpoint', () => {
    it('should delegate remove to service with user context', async () => {
      // Arrange: Remove subsidiary request
      const mockRequest = createMockRequest();
      const subsidiaryId = new Types.ObjectId().toHexString();
      
      const deletedSubsidiary = {
        _id: subsidiaryId,
        recordId: 'SUB001',
        name: 'Deleted Subsidiary',
        isActive: false,
        isDeleted: true
      };

      subsidiariesService.remove.mockResolvedValue(deletedSubsidiary as any);

      // Act: Remove subsidiary through controller
      const result = await controller.remove(subsidiaryId, mockRequest as any);

      // Assert: Service called with proper parameters
      expect(subsidiariesService.remove).toHaveBeenCalledWith(subsidiaryId, mockRequest.user);
      expect(result).toEqual(deletedSubsidiary);
    });
  });

  describe('Nested Client Listing Endpoint', () => {
    it('should validate subsidiary access then delegate to clients service', async () => {
      // Arrange: Get clients for specific subsidiary
      const mockRequest = createMockRequest();
      const subsidiaryId = new Types.ObjectId().toHexString();
      const queryDto: QueryClientDto = {}; // Empty query to get all active clients by default

      const mockSubsidiary = {
        _id: subsidiaryId,
        recordId: 'SUB001',
        name: 'Parent Subsidiary',
        isActive: true,
        isDeleted: false
      };

      const mockClients = [
        { _id: new Types.ObjectId(), name: 'Client A', subsidiaryId, recordId: 'CLI001' },
        { _id: new Types.ObjectId(), name: 'Client B', subsidiaryId, recordId: 'CLI002' }
      ];

      subsidiariesService.findOne.mockResolvedValue(mockSubsidiary as any);
      clientsService.findAllBySubsidiaryId.mockResolvedValue(mockClients as any);

      // Act: Get clients for subsidiary
      const result = await controller.findAllClientsForSubsidiary(subsidiaryId, queryDto, mockRequest as any);

      // Assert: Both services called properly
      expect(subsidiariesService.findOne).toHaveBeenCalledWith(subsidiaryId, mockRequest.user);
      expect(clientsService.findAllBySubsidiaryId).toHaveBeenCalledWith(subsidiaryId, queryDto, mockRequest.user);
      expect(result).toEqual(mockClients);
    });
  });
});
