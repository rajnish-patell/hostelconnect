import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { CallsService } from './modules/calls/calls.service';
import { CallsGateway } from './modules/calls/calls.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [],
  providers: [PrismaService, CallsService, CallsGateway],
})
export class AppModule {}
