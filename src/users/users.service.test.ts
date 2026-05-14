import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(() => {
    service = new UsersService();
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentUserProfile', () => {
    it.todo('returns safe user profile for the authenticated user');
    it.todo('does not expose passwordHash in response payload');
  });
});
