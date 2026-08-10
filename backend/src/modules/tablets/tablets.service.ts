import { Injectable, NotFoundException } from '@nestjs/common';
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
  private fallbackTablets: TabletItem[] = [
    { id: 't1', deviceId: 'TAB-A01', name: 'Hostel A Entry Tablet', block: 'Block A', status: 'BUSY', isLocked: true, schoolCode: 'SCH-DAP' },
    { id: 't2', deviceId: 'TAB-A02', name: 'Hostel A Common Room', block: 'Block A', status: 'ONLINE', isLocked: true, schoolCode: 'SCH-DAP' },
    { id: 't3', deviceId: 'TAB-C04', name: 'Girls Hostel Main Kiosk', block: 'Block C', status: 'BUSY', isLocked: true, schoolCode: 'SCH-DAP' },
    { id: 't4', deviceId: 'TAB-B01', name: 'Hostel B Study Hall', block: 'Block B', status: 'OFFLINE', isLocked: false, schoolCode: 'SCH-DAP' },
    { id: 't5', deviceId: 'TAB-D01', name: 'Doon Main Dorm Kiosk', block: 'Main Wing', status: 'ONLINE', isLocked: true, schoolCode: 'SCH-DHA' },
    { id: 't6', deviceId: 'TAB-M01', name: 'Mayo Junior Wing Tablet', block: 'Junior Block', status: 'ONLINE', isLocked: true, schoolCode: 'SCH-MAYO' },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async findAll(schoolCode?: string): Promise<TabletItem[]> {
    if (schoolCode) {
      return this.fallbackTablets.filter((t) => t.schoolCode.toUpperCase() === schoolCode.toUpperCase());
    }
    return this.fallbackTablets;
  }

  async create(data: { deviceId: string; name: string; block: string; schoolCode?: string }): Promise<TabletItem> {
    const newTablet: TabletItem = {
      id: `t-${Date.now()}`,
      deviceId: data.deviceId.toUpperCase(),
      name: data.name,
      block: data.block,
      status: 'ONLINE',
      isLocked: true,
      schoolCode: (data.schoolCode || 'SCH-DAP').toUpperCase(),
    };
    this.fallbackTablets.unshift(newTablet);
    return newTablet;
  }

  async toggleLock(id: string): Promise<TabletItem> {
    const tablet = this.fallbackTablets.find((t) => t.id === id || t.deviceId === id);
    if (!tablet) {
      throw new NotFoundException('Tablet device not found');
    }
    tablet.isLocked = !tablet.isLocked;
    return tablet;
  }
}
