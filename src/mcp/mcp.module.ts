import { Module } from '@nestjs/common';
import { ApiTokensModule } from '../api-tokens/api-tokens.module';
import { ApplicationEventsModule } from '../application-events/application-events.module';
import { ApplicationsModule } from '../applications/applications.module';
import { InterviewsModule } from '../interviews/interviews.module';
import { McpController } from './mcp.controller';
import { McpServerFactory } from './mcp-server.factory';
import { McpToolsService } from './mcp-tools.service';

@Module({
  imports: [
    ApiTokensModule,
    ApplicationsModule,
    ApplicationEventsModule,
    InterviewsModule,
  ],
  controllers: [McpController],
  providers: [McpToolsService, McpServerFactory],
})
export class McpModule {}
