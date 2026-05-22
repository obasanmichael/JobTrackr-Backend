import { ConfigService } from '@nestjs/config';
import { OAuthStateService } from './oauth-state.service';

describe('OAuthStateService', () => {
  const key = Buffer.alloc(32, 3).toString('base64');

  function createService(): OAuthStateService {
    const config = {
      get: (name: string) => (name === 'ENCRYPTION_KEY' ? key : undefined),
    } as ConfigService;
    return new OAuthStateService(config);
  }

  it('creates and verifies state for user', () => {
    const service = createService();
    const state = service.create('user-1', 'google-calendar');
    const payload = service.verify(state, 'google-calendar');
    expect(payload.userId).toBe('user-1');
  });

  it('rejects tampered state', () => {
    const service = createService();
    const state = service.create('user-1', 'google-calendar');
    expect(() => service.verify(`${state}x`, 'google-calendar')).toThrow(
      'Invalid OAuth state',
    );
  });
});
