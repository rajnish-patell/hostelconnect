import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  async onModuleInit() {
    if (this.connected) {
      return;
    }

    try {
      await this.$connect();
      this.connected = true;
      this.logger.log('Successfully connected to PostgreSQL database via Prisma');
    } catch (error) {
      this.connected = false;
      this.logger.warn('PostgreSQL database server not reachable; running with memory resilience.');
    }
  }

  async onModuleDestroy() {
    if (!this.connected) {
      return;
    }

    try {
      await this.$disconnect();
    } catch (e) {
      // Ignore disconnect errors on shutdown
    }
    this.connected = false;
  }
}
