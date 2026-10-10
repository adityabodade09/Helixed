import { hashPassword, verifyPassword } from '../src/modules/auth/password.service.js';

describe('password service', () => {
  it('hashes with argon2id and verifies without retaining the password', async () => {
    const password = 'correct horse battery staple';
    const hash = await hashPassword(password);

    expect(hash).not.toContain(password);
    await expect(verifyPassword(hash, password)).resolves.toBe(true);
    await expect(verifyPassword(hash, 'wrong password')).resolves.toBe(false);
  });
});
