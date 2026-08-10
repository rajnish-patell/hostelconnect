import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock }; student: { findUnique: jest.Mock; create: jest.Mock }; parent: { create: jest.Mock }; $disconnect: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      student: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      parent: {
        create: jest.fn(),
      },
      $disconnect: jest.fn(),
    } as any;

    service = new AuthService(prisma as unknown as PrismaService, new JwtService({ secret: 'test-secret' }));
  });

  it('registers a new user with a hashed password and returns a token', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'admin@example.com', phoneNumber: '999', fullName: 'Admin', role: 'SCHOOL_ADMIN' });

    const result = await service.register({
      fullName: 'Admin',
      email: 'admin@example.com',
      phoneNumber: '999',
      password: 'secret123',
      role: 'SCHOOL_ADMIN',
      schoolCode: 'SCH-01',
    });

    expect(result.accessToken).toBeDefined();
    expect(bcrypt.hash).toHaveBeenCalled();
  });

  it('rejects invalid login credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ identifier: 'missing@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
  });
});
