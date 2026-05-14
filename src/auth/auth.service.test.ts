import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  describe('register', () => {
    it.todo('registers a new user and returns safe profile with access token');
    it.todo('rejects duplicate email with a safe conflict response');
    it.todo('stores password hash only and never plaintext password');
  });

  describe('login', () => {
    it.todo('logs in with valid credentials and returns access token');
    it.todo('rejects invalid password with generic invalid credentials message');
    it.todo('returns generic invalid credentials when user email is not found');
  });

  describe('me', () => {
    it.todo('returns safe current user profile without passwordHash');
  });

  describe('password helpers', () => {
    it('hashes and verifies password with argon2', async () => {
      const plainText = 'StrongPassword123';
      const hash = await service['hashPassword'](plainText);

      expect(hash).not.toBe(plainText);
      await expect(service['verifyPassword'](hash, plainText)).resolves.toBe(
        true,
      );
      await expect(service['verifyPassword'](hash, 'wrong-password')).resolves.toBe(
        false,
      );
    });
  });
});
