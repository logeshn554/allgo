import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module.js';
import { CloudTasksGateway } from './cloud-tasks.gateway.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [CloudTasksGateway],
  exports: [CloudTasksGateway],
})
export class SchedulingModule {}
