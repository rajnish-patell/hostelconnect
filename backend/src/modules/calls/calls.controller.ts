import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CallsService } from './calls.service';
import { Public } from '../../auth/public.decorator';

@Controller('calls')
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Public()
  @Get('active')
  async getActiveCalls(@Query('schoolCode') schoolCode?: string) {
    return this.callsService.getActiveCalls(schoolCode);
  }

  @Public()
  @Get('history')
  async getCallHistory(@Query('schoolCode') schoolCode?: string) {
    return this.callsService.getCallHistory(schoolCode);
  }

  @Public()
  @Post('initiate')
  async initiateCall(@Body() body: { studentId: string; parentId: string; tabletId?: string; schoolCode?: string }) {
    return this.callsService.initiateCall(body.studentId, body.parentId, body.tabletId, body.schoolCode);
  }

  @Public()
  @Post('end')
  async endCall(@Body() body: { callId: string; durationSeconds?: number; reason?: string }) {
    return this.callsService.endCall(body.callId, body.durationSeconds || 0, body.reason);
  }
}
