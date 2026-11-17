import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and dependency health status' })
  @ApiResponse({ status: 200, description: 'Service is healthy or degraded' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async getHealth(@Res() res: Response) {
    const report = await this.healthService.checkHealth();
    const httpStatus = HttpStatus.OK;
    return res.status(httpStatus).json(report);
  }
}

