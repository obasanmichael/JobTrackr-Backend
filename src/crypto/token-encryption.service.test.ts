import { ConfigService } from '@nestjs/config';
import { TokenEncryptionService } from './token-encryption.service';

describe('TokenEncryptionService', () => {
  const key = Buffer.alloc(32, 7).toString('base64');

  function createService(): TokenEncryptionService {
    const config = {
      get: (name: string) => (name === 'ENCRYPTION_KEY' ? key : undefined),
    } as ConfigService;
    return new TokenEncryptionService(config);
  }

  it('encrypts and decrypts round-trip', () => {
    const service = createService();
    const encrypted = service.encrypt('refresh-token-value');
    expect(encrypted).not.toContain('refresh-token-value');
    expect(service.decrypt(encrypted)).toBe('refresh-token-value');
  });

  it('rejects invalid key length', () => {
    const config = {
      get: () => Buffer.alloc(16).toString('base64'),
    } as ConfigService;
    expect(() => new TokenEncryptionService(config)).toThrow(
      'ENCRYPTION_KEY must be 32 bytes',
    );
  });
});
