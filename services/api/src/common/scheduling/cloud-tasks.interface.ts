export interface EnqueueTaskOptions {
  taskName: string;
  targetType: 'SCHEDULED_ORDER' | 'SCHEDULED_HIRE_DRIVER' | 'EXPIRATION_CHECK';
  targetId: string;
  scheduledFor: Date;
  payload?: Record<string, any>;
}

export interface CloudTaskExecutionResult {
  success: boolean;
  taskId: string;
  executedAt: string;
  targetType: string;
  targetId: string;
}

export interface ICloudTasksGateway {
  scheduleTask(options: EnqueueTaskOptions): Promise<{ taskName: string; scheduledFor: string }>;
  cancelTask(taskName: string): Promise<boolean>;
}
