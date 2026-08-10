import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TabletItem {
  id: string;
  deviceId: string;
  name: string;
  block: string;
  status: 'ONLINE' | 'BUSY' | 'OFFLINE';
  isLocked: boolean;
  schoolCode: string;
}

@Injectable()
export class TabletsService {
  private readonly logger = new Logger(TabletsService.name);
  private memoryTablets = new Map<string, TabletItem>();

  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolCode?: string): Promise<TabletItem[]> {
    try {
      const dbTablets = await this.prisma.hostelTablet.findMany({
        where: {
          ...(schoolCode && { school: { code: schoolCode.toUpperCase() } }),
        },
        include: { school: true },
        orderBy: { createdAt: 'desc' },
      });

      if (dbTablets && dbTablets.length > 0) {
        return dbTablets.map((t) => ({
          id: t.id,
          deviceId: t.deviceId,
          name: t.deviceName,
          block: t.hostelBlock || 'Main Block',
          status: (t.status === 'ONLINE' ? 'ONLINE' : t.status === 'BUSY' ? 'BUSY' : 'OFFLINE') as any,
          isLocked: t.isLockedKiosk,
          schoolCode: t.school.code,
        }));
      }
    } catch (e) {
      this.logger.debug(`Prisma findAll tablets fallback: ${e}`);
    }

    const list = Array.from(this.memoryTablets.values());
    if (schoolCode) {
      return list.filter((t) => t.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    return list;
  }

  async create(data: { deviceId: string; name: string; block: string; schoolCode?: string }): Promise<TabletItem> {
    const deviceId = data.deviceId.toUpperCase();
    const schoolCode = (data.schoolCode || 'SCH-DAP').toUpperCase();

    try {
      const school = await this.prisma.school.findUnique({ where: { code: schoolCode } });
      if (!school) {
        throw new NotFoundException(`School ${schoolCode} not found`);
      }

      const dbTablet = await this.prisma.hostelTablet.create({
        data: {
          schoolId: school.id,
          deviceId,
          deviceName: data.name,
          hostelBlock: data.block,
          status: 'ONLINE',
          isLockedKiosk: true,
        },
      });

      const item: TabletItem = {
        id: dbTablet.id,
        deviceId: dbTablet.deviceId,
        name: dbTablet.deviceName,
        block: dbTablet.hostelBlock || 'Main Block',
        status: 'ONLINE',
        isLocked: dbTablet.isLockedKiosk,
        schoolCode,
      };
      this.memoryTablets.set(item.id, item);
      return item;
    } catch (e) {
      const item: TabletItem = {
        id: `t-${Date.now()}`,
        deviceId,
        name: data.name,
        block: data.block,
        status: 'ONLINE',
        isLocked: true,
        schoolCode,
      };
      this.memoryTablets.set(item.id, item);
      return item;
    }
  }

  async toggleLock(id: string): Promise<TabletItem> {
    try {
      const current = await this.prisma.hostelTablet.findFirst({
        where: { OR: [{ id }, { deviceId: id }] },
        include: { school: true },
      });
      if (current) {
        const updated = await this.prisma.hostelTablet.update({
          where: { id: current.id },
          data: { isLockedKiosk: !current.isLockedKiosk },
          include: { school: true },
        });
        return {
          id: updated.id,
          deviceId: updated.deviceId,
          name: updated.deviceName,
          block: updated.hostelBlock || 'Main Block',
          status: 'ONLINE',
          isLocked: updated.isLockedKiosk,
          schoolCode: updated.school.code,
        };
      }
    } catch (e) {
      // Fallback
    }

    const tablet = this.memoryTablets.get(id);
    if (!tablet) {
      throw new NotFoundException('Tablet device not found');
    }
    tablet.isLocked = !tablet.isLocked;
    this.memoryTablets.set(id, tablet);
    return tablet;
  }
}
