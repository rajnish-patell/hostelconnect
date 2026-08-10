import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private connected = false;

  async onModuleInit() {
    if (this.connected) {
      return;
    }

    try {
      await this.$connect();
      this.connected = true;
    } catch (error) {
      console.warn('Prisma could not connect to the database; continuing without DB-backed services.', error);
    }
  }

  async onModuleDestroy() {
    if (!this.connected) {
      return;
    }

    await this.$disconnect();
    this.connected = false;
  }
}
