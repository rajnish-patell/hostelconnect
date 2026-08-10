import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SchoolRecord {
  id: string;
  code: string;
  name: string;
  students: number;
  tablets: number;
  callsMonth: number;
  plan: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

@Injectable()
export class SchoolsService {
  private readonly logger = new Logger(SchoolsService.name);
  private memorySchools = new Map<string, SchoolRecord>();

  constructor(private readonly prisma: PrismaService) {
    this.seedInitialTenantsIfEmpty();
  }

  private async seedInitialTenantsIfEmpty() {
    try {
      const count = await this.prisma.school.count();
      if (count === 0) {
        // Seed default school tenant in database
        await this.prisma.school.create({
          data: {
            name: 'Delhi Public School (R.K. Puram)',
            code: 'SCH-DAP',
            subscriptionPlan: 'ENTERPRISE',
            isActive: true,
          },
        });
      }
    } catch (e) {
      // If DB is offline, initialize memory store with default school tenant
      if (this.memorySchools.size === 0) {
        this.memorySchools.set('1', {
          id: '1',
          code: 'SCH-DAP',
          name: 'Delhi Public School (R.K. Puram)',
          students: 0,
          tablets: 0,
          callsMonth: 0,
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
        });
      }
    }
  }

  async findAll(): Promise<SchoolRecord[]> {
    try {
      const dbSchools = await this.prisma.school.findMany({
        include: {
          _count: {
            select: { students: true, tablets: true, calls: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbSchools) {
        return dbSchools.map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          students: s._count.students,
          tablets: s._count.tablets,
          callsMonth: s._count.calls,
          plan: s.subscriptionPlan,
          status: s.isActive ? 'ACTIVE' : 'SUSPENDED',
        }));
      }
    } catch (e) {
      this.logger.debug(`Prisma findAll schools fallback: ${e}`);
    }

    return Array.from(this.memorySchools.values());
  }

  async findOne(idOrCode: string): Promise<SchoolRecord> {
    try {
      const dbSchool = await this.prisma.school.findFirst({
        where: {
          OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
        },
        include: {
          _count: {
            select: { students: true, tablets: true, calls: true },
          },
        },
      });

      if (dbSchool) {
        return {
          id: dbSchool.id,
          code: dbSchool.code,
          name: dbSchool.name,
          students: dbSchool._count.students,
          tablets: dbSchool._count.tablets,
          callsMonth: dbSchool._count.calls,
          plan: dbSchool.subscriptionPlan,
          status: dbSchool.isActive ? 'ACTIVE' : 'SUSPENDED',
        };
      }
    } catch (e) {
      // Fallback lookup
    }

    for (const s of this.memorySchools.values()) {
      if (s.id === idOrCode || s.code === idOrCode.toUpperCase()) {
        return s;
      }
    }

    throw new NotFoundException(`School tenant ${idOrCode} not found`);
  }

  async create(data: { name: string; code: string; plan?: string }): Promise<SchoolRecord> {
    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    const plan = data.plan || 'PRO';

    try {
      const existing = await this.prisma.school.findUnique({ where: { code } });
      if (existing) {
        throw new ConflictException(`School code ${code} is already registered`);
      }

      const dbSchool = await this.prisma.school.create({
        data: {
          name,
          code,
          subscriptionPlan: plan,
          isActive: true,
        },
        include: {
          _count: {
            select: { students: true, tablets: true, calls: true },
          },
        },
      });

      const record: SchoolRecord = {
        id: dbSchool.id,
        code: dbSchool.code,
        name: dbSchool.name,
        students: dbSchool._count.students,
        tablets: dbSchool._count.tablets,
        callsMonth: dbSchool._count.calls,
        plan: dbSchool.subscriptionPlan,
        status: dbSchool.isActive ? 'ACTIVE' : 'SUSPENDED',
      };
      this.memorySchools.set(record.id, record);
      return record;
    } catch (e: any) {
      if (e instanceof ConflictException) throw e;
      for (const s of this.memorySchools.values()) {
        if (s.code === code) {
          throw new ConflictException(`School code ${code} is already registered`);
        }
      }

      const record: SchoolRecord = {
        id: `school-${Date.now()}`,
        code,
        name,
        students: 0,
        tablets: 0,
        callsMonth: 0,
        plan,
        status: 'ACTIVE',
      };
      this.memorySchools.set(record.id, record);
      return record;
    }
  }

  async update(id: string, data: { name?: string; code?: string; plan?: string; status?: 'ACTIVE' | 'SUSPENDED' }): Promise<SchoolRecord> {
    try {
      const dbSchool = await this.prisma.school.update({
        where: { id },
        data: {
          ...(data.name && { name: data.name.trim() }),
          ...(data.code && { code: data.code.trim().toUpperCase() }),
          ...(data.plan && { subscriptionPlan: data.plan }),
          ...(data.status && { isActive: data.status === 'ACTIVE' }),
        },
        include: {
          _count: { select: { students: true, tablets: true, calls: true } },
        },
      });

      const record: SchoolRecord = {
        id: dbSchool.id,
        code: dbSchool.code,
        name: dbSchool.name,
        students: dbSchool._count.students,
        tablets: dbSchool._count.tablets,
        callsMonth: dbSchool._count.calls,
        plan: dbSchool.subscriptionPlan,
        status: dbSchool.isActive ? 'ACTIVE' : 'SUSPENDED',
      };
      this.memorySchools.set(record.id, record);
      return record;
    } catch (e) {
      const record = this.memorySchools.get(id);
      if (!record) throw new NotFoundException(`School ${id} not found`);

      if (data.name) record.name = data.name.trim();
      if (data.code) record.code = data.code.trim().toUpperCase();
      if (data.plan) record.plan = data.plan;
      if (data.status) record.status = data.status;

      this.memorySchools.set(id, record);
      return record;
    }
  }

  async updatePlan(id: string, plan: string): Promise<SchoolRecord> {
    return this.update(id, { plan });
  }

  async toggleStatus(id: string): Promise<SchoolRecord> {
    const current = await this.findOne(id);
    const newStatus = current.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    return this.update(id, { status: newStatus });
  }

  async delete(id: string): Promise<{ success: boolean; id: string }> {
    try {
      await this.prisma.school.delete({ where: { id } });
    } catch (e) {
      // Ignored for fallback
    }
    this.memorySchools.delete(id);
    return { success: true, id };
  }
}
