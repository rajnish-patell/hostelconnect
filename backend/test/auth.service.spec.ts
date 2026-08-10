import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/common/email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, HttpException } from '@nestjs/common';

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

  it('registers a new user with password complexity and returns a token', async () => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'user-1', email: 'admin@example.com', phoneNumber: '999', fullName: 'Admin', role: 'SCHOOL_ADMIN' });

    const result = await service.register({
      fullName: 'Admin',
      email: 'admin@example.com',
      phoneNumber: '999',
      password: 'SecurePassword@2026',
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

  it('generates a 6-digit OTP, sends it ONLY via email, and never exposes it in API response', async () => {
    const result = await service.forgotPassword({ email: 'patelrajnish47@gmail.com' });
    expect(result.success).toBe(true);
    expect((result as any).otp).toBeUndefined();
    expect((result as any).devToken).toBeUndefined();
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();
  });

  it('verifies valid OTP, issues a single-use resetToken, and resets password securely', async () => {
    const testEmail = 'user@example.com';
    await service.forgotPassword({ email: testEmail });
    expect(emailService.sendPasswordResetEmail).toHaveBeenCalled();

    // Extract the raw OTP from email call arguments
    const emailCallArgs = (emailService.sendPasswordResetEmail as jest.Mock).mock.calls[0];
    const rawOtp = emailCallArgs[1];
    expect(rawOtp).toHaveLength(6);

    // Verify OTP
    const verifyRes = await service.verifyOtp({ email: testEmail, otp: rawOtp });
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.resetToken).toBeDefined();

    // Reset Password with valid complexity
    (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');
    const resetRes = await service.resetPassword({
      email: testEmail,
      resetToken: verifyRes.resetToken,
      newPassword: 'NewSecurePassword@2026',
    });
    expect(resetRes.success).toBe(true);

    // Reusing the same resetToken should fail (single-use protection)
    await expect(service.resetPassword({
      email: testEmail,
      resetToken: verifyRes.resetToken,
      newPassword: 'AnotherPassword@2026',
    })).rejects.toThrow();
  });

  it('enforces brute-force lockout after 5 incorrect OTP attempts', async () => {
    const testEmail = 'bruteforce@example.com';
    await service.forgotPassword({ email: testEmail });

    // 4 wrong attempts
    for (let i = 0; i < 4; i++) {
      await expect(service.verifyOtp({ email: testEmail, otp: '000000' })).rejects.toThrow('attempt(s) remaining');
    }

    // 5th wrong attempt triggers lockout
    await expect(service.verifyOtp({ email: testEmail, otp: '000000' })).rejects.toThrow();

    // Even correct OTP should now be rejected
    const emailCallArgs = (emailService.sendPasswordResetEmail as jest.Mock).mock.calls.find(c => c[0] === testEmail);
    const correctOtp = emailCallArgs[1];
    await expect(service.verifyOtp({ email: testEmail, otp: correctOtp })).rejects.toThrow();
  });

  it('enforces rate limiting on forgot-password requests (max 3 in 15 mins)', async () => {
    const testEmail = 'ratelimit@example.com';
    await service.forgotPassword({ email: testEmail });
    await service.forgotPassword({ email: testEmail });
    await service.forgotPassword({ email: testEmail });

    // 4th request should be rejected with 429 Too Many Requests
    await expect(service.forgotPassword({ email: testEmail })).rejects.toThrow(HttpException);
  });
});
