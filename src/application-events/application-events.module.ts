import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ApplicationEventsController } from './application-events.controller';
import { ApplicationEventsService } from './application-events.service';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationEventsController],
  providers: [ApplicationEventsService],
  exports: [ApplicationEventsService],
})
export class ApplicationEventsModule {}
