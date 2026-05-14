describe('Auth (e2e)', () => {
  it.todo('register success returns user and accessToken');
  it.todo('register fails for duplicate email');
  it.todo('login success returns user and accessToken');
  it.todo('login fails for wrong password with generic error');
  it.todo('/api/v1/auth/me returns 401 without token');
  it.todo('/api/v1/auth/me returns safe profile with valid token');
  it.todo('auth responses never include passwordHash');
});
