import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdminMembershipStatus, AdminRole } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class AdminTeamUserSnapshotDto {
  @ApiProperty()
  email!: string;

  @ApiProperty()
  name!: string;
}

export class AdminTeamMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ enum: AdminRole })
  role!: AdminRole;

  @ApiProperty({ enum: AdminMembershipStatus })
  status!: AdminMembershipStatus;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  invitedById!: string | null;

  @ApiProperty({ type: AdminTeamUserSnapshotDto })
  user!: AdminTeamUserSnapshotDto;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class CreateTeamMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: AdminRole })
  @IsEnum(AdminRole)
  role!: AdminRole;
}

export class PatchTeamMemberDto {
  @ApiPropertyOptional({ enum: AdminRole })
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @ApiPropertyOptional({ enum: AdminMembershipStatus })
  @IsOptional()
  @IsEnum(AdminMembershipStatus)
  status?: AdminMembershipStatus;
}
