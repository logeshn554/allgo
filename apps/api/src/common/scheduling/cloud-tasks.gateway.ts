import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { EnqueueTaskOptions, ICloudTasksGateway } from './cloud-tasks.interface.js';

@Injectable()
export class CloudTasksGateway implements ICloudTasksGateway {
  private readonly logger = new Logger(CloudTasksGateway.name);

  constructor(private readonly db: DatabaseService) {}

  async scheduleTask(options: EnqueueTaskOptions): Promise<{ taskName: string; scheduledFor: string }> {
    const { taskName, targetType, targetId, scheduledFor, payload = {} } = options;

    await this.db.query(
      `INSERT INTO scheduled_cloud_tasks (task_name, target_type, target_id, scheduled_for, payload, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')
       ON CONFLICT (task_name) DO UPDATE SET
         scheduled_for = $4, payload = $5, status = 'PENDING';`,
      [taskName, targetType, targetId, scheduledFor, JSON.stringify(payload)]
    );

    this.logger.log(`Enqueued Cloud Task: ${taskName} for ${scheduledFor.toISOString()}`);
    return {
      taskName,
      scheduledFor: scheduledFor.toISOString(),
    };
  }

  async cancelTask(taskName: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE scheduled_cloud_tasks SET status = 'CANCELLED' WHERE task_name = $1 AND status = 'PENDING';`,
      [taskName]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getPendingTasksDue(now: Date = new Date()): Promise<any[]> {
    const res = await this.db.query(
      `SELECT * FROM scheduled_cloud_tasks
       WHERE status = 'PENDING' AND scheduled_for <= $1
       ORDER BY scheduled_for ASC LIMIT 50;`,
      [now]
    );
    return res.rows;
  }

  async markTaskExecuted(taskId: string, success: boolean, errorMessage?: string): Promise<void> {
    await this.db.query(
      `UPDATE scheduled_cloud_tasks
       SET status = $1, executed_at = NOW(), error_message = $2
       WHERE id = $3;`,
      [success ? 'EXECUTED' : 'FAILED', errorMessage || null, taskId]
    );
  }
}
