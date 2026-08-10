import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/common/email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let prisma: { user: { findUnique: jest.Mock; findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }; student: { findUnique: jest.Mock; create: jest.Mock }; parent: { create: jest.Mock }; $disconnect: jest.Mock };
  let emailService: EmailService;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
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

    emailService = {
      sendEmail: jest.fn().mockResolvedValue(true),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    } as any;

    service = new AuthService(prisma as unknown as PrismaService, new JwtService({ secret: 'test-secret' }), emailService);
  });

  it('registers a new user with a hashed password and returns a token', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.findUnique.mockResolvedValue(null);
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
    prisma.user.findFirst.mockResolvedValue(null);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.login({ identifier: 'nonexistent@example.com', password: 'wrong' })).rejects.toThrow('Invalid credentials');
  });

  it('generates a 6-digit password reset token and dispatches email', async () => {
    const result = await service.forgotPassword({ email: 'patelrajnish47@gmail.com' });
    expect(result.success).toBe(true);
    expect(result.expiresInMinutes).toBe(15);
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('verifies valid reset token and completes password reset', async () => {
    await service.forgotPassword({ email: 'user@example.com' });
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();

    // Extract the reset token passed to the email service
    const emailCallArgs = (emailService.sendPasswordResetEmail as jest.Mock).mock.calls[0];
    const token = emailCallArgs[1]; // 2nd parameter is resetToken
    expect(token).toBeDefined();

    const verifyRes = await service.verifyResetToken({ token });
    expect(verifyRes.valid).toBe(true);

    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    const resetRes = await service.resetPassword({ token, newPassword: 'NewSecurePassword123!' });
    expect(resetRes.success).toBe(true);

    // Reusing the same token should fail
    await expect(service.resetPassword({ token, newPassword: 'AnotherPassword' })).rejects.toThrow();
  });

});
