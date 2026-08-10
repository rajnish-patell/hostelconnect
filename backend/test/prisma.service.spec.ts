import { PrismaService } from '../src/prisma/prisma.service';

describe('PrismaService', () => {
  it('connects and disconnects without throwing when the client is available', async () => {
    const service = new PrismaService();

    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue();
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue();

    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
