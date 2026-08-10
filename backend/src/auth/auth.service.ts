import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  passwordHash: string;
  role: 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT';
  isVerified: boolean;
}

export interface RegisterDto {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  role: 'SCHOOL_ADMIN' | 'SUPER_ADMIN' | 'STUDENT' | 'PARENT';
  schoolCode?: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

@Injectable()
export class AuthService {
  private fallbackUsers = new Map<string, StoredUser>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) {
        throw new ConflictException('Email already registered');
      }

      const passwordHash = await bcrypt.hash(dto.password, 12);
      const user = await this.prisma.user.create({
        data: {
          fullName: dto.fullName,
          email: dto.email,
          phoneNumber: dto.phoneNumber,
          passwordHash,
          role: dto.role,
          isVerified: true,
        },
      });

      return this.buildAuthResponse(user.id, user.fullName, user.email, user.role);
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      return this.registerFallback(dto);
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.identifier },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
      if (!passwordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return this.buildAuthResponse(user.id, user.fullName, user.email, user.role);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      return this.loginFallback(dto);
    }
  }

  private async registerFallback(dto: RegisterDto) {
    const existing = this.fallbackUsers.get(dto.email.toLowerCase());
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const id = `fallback-${Date.now()}`;
    const user: StoredUser = {
      id,
      fullName: dto.fullName,
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      role: dto.role,
      isVerified: true,
    };
    this.fallbackUsers.set(dto.email.toLowerCase(), user);
    return this.buildAuthResponse(user.id, user.fullName, user.email, user.role);
  }

  private async loginFallback(dto: LoginDto) {
    const user = this.fallbackUsers.get(dto.identifier.toLowerCase());
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, user.fullName, user.email, user.role);
  }

  private async buildAuthResponse(id: string, fullName: string, email: string, role: string) {
    const payload = { sub: id, email, role };
    return {
      user: { id, fullName, email, role },
      accessToken: await this.jwtService.signAsync(payload),
    };
  }
}
