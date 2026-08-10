import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { PrismaService } from './prisma/prisma.service';
import { EmailService } from './common/email/email.service';
import { HealthController } from './health.controller';

import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtStrategy } from './auth/jwt.strategy';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { PublicGuard } from './auth/public.guard';

import { SchoolsController } from './modules/schools/schools.controller';
import { SchoolsService } from './modules/schools/schools.service';

import { StudentsController } from './modules/students/students.controller';
import { StudentsService } from './modules/students/students.service';

import { ParentsController } from './modules/parents/parents.controller';
import { ParentsService } from './modules/parents/parents.service';

import { TabletsController } from './modules/tablets/tablets.controller';
import { TabletsService } from './modules/tablets/tablets.service';

import { CallsController } from './modules/calls/calls.controller';
import { CallsService } from './modules/calls/calls.service';
import { CallsGateway } from './modules/calls/calls.gateway';

import { StatsController } from './modules/stats/stats.controller';
import { StatsService } from './modules/stats/stats.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'dev-secret-key-12345'),
        signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d') },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(configService.get<string>('THROTTLE_TTL') ?? 60000),
            limit: Number(configService.get<string>('THROTTLE_LIMIT') ?? 120),
          },
        ],
      }),
    }),
  ],
  controllers: [
    HealthController,
    AuthController,
    SchoolsController,
    StudentsController,
    ParentsController,
    TabletsController,
    CallsController,
    StatsController,
  ],
  providers: [
    PrismaService,
    EmailService,
    AuthService,
    JwtStrategy,
    SchoolsService,
    StudentsService,
    ParentsService,
    TabletsService,
    CallsService,
    CallsGateway,
    StatsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PublicGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
