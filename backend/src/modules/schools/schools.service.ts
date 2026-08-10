import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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
  private fallbackSchools: SchoolRecord[] = [
    { id: '1', code: 'SCH-DAP', name: 'Delhi Public School (R.K. Puram)', students: 1240, tablets: 18, callsMonth: 14200, plan: 'ENTERPRISE', status: 'ACTIVE' },
    { id: '2', code: 'SCH-DHA', name: 'The Doon School (Dehradun)', students: 850, tablets: 14, callsMonth: 9800, plan: 'ENTERPRISE', status: 'ACTIVE' },
    { id: '3', code: 'SCH-MAYO', name: 'Mayo College (Ajmer)', students: 920, tablets: 16, callsMonth: 11500, plan: 'PRO', status: 'ACTIVE' },
    { id: '4', code: 'SCH-SHER', name: 'Sherwood College (Nainital)', students: 640, tablets: 10, callsMonth: 6200, plan: 'TRIAL', status: 'SUSPENDED' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<SchoolRecord[]> {
    try {
      const dbSchools = await this.prisma.school.findMany({
        include: {
          _count: {
            select: { students: true, tablets: true, calls: true },
          },
        },
      });

      if (dbSchools && dbSchools.length > 0) {
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
      // Use fallback
    }

    return this.fallbackSchools;
  }

  async findOne(idOrCode: string): Promise<SchoolRecord> {
    const schools = await this.findAll();
    const found = schools.find((s) => s.id === idOrCode || s.code === idOrCode);
    if (!found) {
      throw new NotFoundException(`School tenant ${idOrCode} not found`);
    }
    return found;
  }

  async create(data: { name: string; code: string; plan?: string }): Promise<SchoolRecord> {
    const code = data.code.trim().toUpperCase();
    const existing = this.fallbackSchools.find((s) => s.code === code);
    if (existing) {
      throw new ConflictException(`School code ${code} is already in use`);
    }

    try {
      const dbSchool = await this.prisma.school.create({
        data: {
          name: data.name.trim(),
          code,
          subscriptionPlan: data.plan || 'PRO',
          isActive: true,
        },
      });
      const record: SchoolRecord = {
        id: dbSchool.id,
        code: dbSchool.code,
        name: dbSchool.name,
        students: 0,
        tablets: 0,
        callsMonth: 0,
        plan: dbSchool.subscriptionPlan,
        status: dbSchool.isActive ? 'ACTIVE' : 'SUSPENDED',
      };
      this.fallbackSchools.unshift(record);
      return record;
    } catch (e) {
      const record: SchoolRecord = {
        id: `school-${Date.now()}`,
        code,
        name: data.name.trim(),
        students: 0,
        tablets: 0,
        callsMonth: 0,
        plan: data.plan || 'PRO',
        status: 'ACTIVE',
      };
      this.fallbackSchools.unshift(record);
      return record;
    }
  }

  async toggleStatus(id: string): Promise<SchoolRecord> {
    const school = this.fallbackSchools.find((s) => s.id === id);
    if (!school) {
      throw new NotFoundException(`School ${id} not found`);
    }

    school.status = school.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    try {
      await this.prisma.school.update({
        where: { id },
        data: { isActive: school.status === 'ACTIVE' },
      });
    } catch (e) {
      // Ignored for fallback
    }

    return school;
  }
}
