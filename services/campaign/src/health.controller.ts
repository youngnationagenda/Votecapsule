import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  @HttpCode(HttpStatus.OK)
  check() {
    return { status: 'ok', service: 'campaign', port: 3016, timestamp: new Date().toISOString() };
  }
}
