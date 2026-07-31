// ============================================================
// VoteCapsule — Workflow Module
// services/workflow/src/workflow.module.ts
// ============================================================
import { Module }          from '@nestjs/common';
import { TypeOrmModule }   from '@nestjs/typeorm';
import { ConfigModule }    from '@nestjs/config';

import { WorkflowExecution }  from './entities/workflow-execution.entity';
import { WorkflowStepEvent }  from './entities/workflow-step-event.entity';
import { WorkflowEscalation } from './entities/workflow-escalation.entity';
import { WorkflowService }    from './workflow.service';
import { WorkflowController } from './workflow.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WorkflowExecution,
      WorkflowStepEvent,
      WorkflowEscalation,
    ]),
    ConfigModule,
  ],
  controllers: [WorkflowController],
  providers:   [WorkflowService],
  exports:     [WorkflowService],
})
export class WorkflowModule {}
