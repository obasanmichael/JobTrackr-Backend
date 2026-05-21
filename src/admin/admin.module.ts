import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminUsersController],
  providers: [AdminUsersService, AuditLogService],
  exports: [AuditLogService],
})
export class AdminModule {}
