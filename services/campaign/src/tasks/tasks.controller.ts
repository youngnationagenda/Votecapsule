import { Controller, Get, Post, Put, Patch, Param, Body, Headers, Query, HttpCode, HttpStatus, BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { TasksService, CreateTaskDto } from './tasks.service';
import { TaskStatus } from './entities/campaign-task.entity';

@Controller('campaigns/:campaignId/tasks')
export class TasksController {
  constructor(private readonly service: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Param('campaignId', ParseUUIDPipe) c: string, @Body() dto: CreateTaskDto, @Headers('x-tenant-id') t: string, @Headers('x-user-id') u: string) {
    if (!t || !u) throw new BadRequestException('X-Tenant-Id and X-User-Id required');
    return this.service.create(c, dto, t, u);
  }

  @Get()
  findAll(@Param('campaignId', ParseUUIDPipe) c: string, @Headers('x-tenant-id') t: string, @Query('status') status?: string, @Query('assignedTo') assignedTo?: string, @Query('wardCode') wardCode?: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findAll(c, t, { status, assignedTo, wardCode });
  }

  @Get(':taskId')
  findOne(@Param('campaignId', ParseUUIDPipe) c: string, @Param('taskId', ParseUUIDPipe) id: string, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.findOne(id, c, t);
  }

  @Put(':taskId')
  update(@Param('campaignId', ParseUUIDPipe) c: string, @Param('taskId', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateTaskDto>, @Headers('x-tenant-id') t: string) {
    if (!t) throw new BadRequestException('X-Tenant-Id required');
    return this.service.update(id, c, dto, t);
  }

  @Patch(':taskId/status')
  updateStatus(@Param('campaignId', ParseUUIDPipe) c: string, @Param('taskId', ParseUUIDPipe) id: string, @Body('status') status: TaskStatus, @Body('notes') notes: string, @Headers('x-tenant-id') t: string) {
    if (!t || !status) throw new BadRequestException('X-Tenant-Id and status required');
    return this.service.updateStatus(id, c, status, t, notes);
  }
}
