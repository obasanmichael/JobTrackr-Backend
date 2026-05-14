import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let healthController: HealthController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService],
    }).compile();

    healthController = app.get<HealthController>(HealthController);
  });

  it('should return health payload', () => {
    const health = healthController.getHealth();

    expect(health.status).toBe('ok');
    expect(new Date(health.timestamp).toString()).not.toBe('Invalid Date');
    expect(typeof health.uptime).toBe('number');
  });
});
