import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { CampaignTask, TaskStatus, TaskPriority } from './entities/campaign-task.entity';

export class CreateTaskDto {
  title: string; description?: string; priority?: TaskPriority;
  assignedTo?: string; assignedToName?: string; dueDate?: string;
  eventId?: string; wardCode?: string; countyCode?: string; constituencyCode?: string;
  dependencies?: string[];
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectRepository(CampaignTask)
    private readonly repo: Repository<CampaignTask>,
  ) {}

  async create(campaignId: string, dto: CreateTaskDto, tenantId: string, userId: string): Promise<CampaignTask> {
    const entity = this.repo.create({
      ...dto,
      campaignId,
      tenantId,
      createdBy: userId,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
    });
    return this.repo.save(entity);
  }

  async findAll(campaignId: string, tenantId: string, filters?: { status?: string; assignedTo?: string; wardCode?: string }): Promise<CampaignTask[]> {
    const qb = this.repo.createQueryBuilder('t')
      .where('t.campaign_id = :campaignId', { campaignId })
      .andWhere('t.tenant_id = :tenantId', { tenantId });
    if (filters?.status)     qb.andWhere('t.status = :status', { status: filters.status });
    if (filters?.assignedTo) qb.andWhere('t.assigned_to = :uid', { uid: filters.assignedTo });
    if (filters?.wardCode)   qb.andWhere('t.ward_code = :ward', { ward: filters.wardCode });
    return qb.orderBy('t.due_date', 'ASC').getMany();
  }

  async findOne(id: string, campaignId: string, tenantId: string): Promise<CampaignTask> {
    const t = await this.repo.findOne({ where: { id, campaignId, tenantId } });
    if (!t) throw new NotFoundException(`Task ${id} not found`);
    return t;
  }

  async update(id: string, campaignId: string, dto: Partial<CreateTaskDto>, tenantId: string): Promise<CampaignTask> {
    const t = await this.findOne(id, campaignId, tenantId);
    Object.assign(t, dto);
    if (dto.dueDate) t.dueDate = new Date(dto.dueDate);
    return this.repo.save(t);
  }

  async updateStatus(id: string, campaignId: string, status: TaskStatus, tenantId: string, notes?: string): Promise<CampaignTask> {
    const t = await this.findOne(id, campaignId, tenantId);
    t.status = status;
    if (status === TaskStatus.DONE) t.completedAt = new Date();
    if (notes) t.completionNotes = notes;
    return this.repo.save(t);
  }
}
