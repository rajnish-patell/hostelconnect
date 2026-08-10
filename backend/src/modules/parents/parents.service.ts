import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface ParentItem {
  id: string;
  name: string;
  phone: string;
  student: string;
  relationship: string;
  status: 'VERIFIED' | 'PENDING_APPROVAL';
  schoolCode: string;
}

@Injectable()
export class ParentsService {
  private readonly logger = new Logger(ParentsService.name);
  private memoryParents = new Map<string, ParentItem>();

  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolCode?: string): Promise<ParentItem[]> {
    try {
      const dbParents = await this.prisma.parent.findMany({
        include: {
          user: true,
          students: {
            include: {
              student: {
                include: { user: true, school: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (dbParents && dbParents.length > 0) {
        return dbParents.map((p) => ({
          id: p.id,
          name: p.user.fullName,
          phone: p.user.phoneNumber,
          student: p.students[0]?.student.user.fullName || 'Enrolled Student',
          relationship: p.relationship.toString(),
          status: p.isApproved ? 'VERIFIED' : 'PENDING_APPROVAL',
          schoolCode: p.students[0]?.student.school.code || schoolCode || 'SCH-DAP',
        }));
      }
    } catch (e) {
      this.logger.debug(`Prisma findAll parents fallback: ${e}`);
    }

    const list = Array.from(this.memoryParents.values());
    if (schoolCode) {
      return list.filter((p) => p.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    return list;
  }

  async create(data: { name: string; phone: string; student: string; relationship?: string; schoolCode?: string }): Promise<ParentItem> {
    const schoolCode = (data.schoolCode || 'SCH-DAP').toUpperCase();
    const email = `parent-${Date.now()}@guardian.hostelconnect.io`;
    const passwordHash = await bcrypt.hash('HostelConnect@2026', 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          fullName: data.name.trim(),
          email,
          phoneNumber: data.phone.trim(),
          passwordHash,
          role: 'PARENT',
          isVerified: true,
        },
      });

      const dbParent = await this.prisma.parent.create({
        data: {
          userId: user.id,
          isApproved: true,
        },
      });

      const item: ParentItem = {
        id: dbParent.id,
        name: data.name.trim(),
        phone: data.phone.trim(),
        student: data.student.trim(),
        relationship: data.relationship || 'Father',
        status: 'VERIFIED',
        schoolCode,
      };
      this.memoryParents.set(item.id, item);
      return item;
    } catch (e) {
      const item: ParentItem = {
        id: `p-${Date.now()}`,
        name: data.name.trim(),
        phone: data.phone.trim(),
        student: data.student.trim(),
        relationship: data.relationship || 'Guardian',
        status: 'VERIFIED',
        schoolCode,
      };
      this.memoryParents.set(item.id, item);
      return item;
    }
  }

  async approve(id: string): Promise<ParentItem> {
    try {
      const dbParent = await this.prisma.parent.update({
        where: { id },
        data: { isApproved: true },
        include: { user: true },
      });
      return {
        id: dbParent.id,
        name: dbParent.user.fullName,
        phone: dbParent.user.phoneNumber,
        student: 'Enrolled Student',
        relationship: 'Guardian',
        status: 'VERIFIED',
        schoolCode: 'SCH-DAP',
      };
    } catch (e) {
      const parent = this.memoryParents.get(id);
      if (!parent) {
        throw new NotFoundException('Parent not found');
      }
      parent.status = 'VERIFIED';
      this.memoryParents.set(id, parent);
      return parent;
    }
  }
}
