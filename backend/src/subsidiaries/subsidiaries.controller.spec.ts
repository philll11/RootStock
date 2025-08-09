import { Test, TestingModule } from '@nestjs/testing';
import { SubsidiariesController } from './subsidiaries.controller';
import { SubsidiariesService } from './subsidiaries.service';

describe('SubsidiariesController', () => {
  let controller: SubsidiariesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubsidiariesController],
      providers: [SubsidiariesService],
    }).compile();

    controller = module.get<SubsidiariesController>(SubsidiariesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
