import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminSubscriptionsService } from './admin-subscriptions.service';
import { AdminTeamController } from './admin-team.controller';
import { AdminTeamService } from './admin-team.service';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuditLogService } from './audit-log.service';
import { AdminRolesGuard } from './guards/admin-roles.guard';

@Module({
  imports: [AuthModule],
  controllers: [
    AdminUsersController,
    AdminSubscriptionsController,
    AdminTeamController,
  ],
  providers: [
    AdminUsersService,
    AdminSubscriptionsService,
    AdminTeamService,
    AuditLogService,
    AdminRolesGuard,
  ],
  exports: [AuditLogService],
})
export class AdminModule {}
