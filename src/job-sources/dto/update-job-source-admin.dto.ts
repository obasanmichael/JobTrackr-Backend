import { PartialType } from '@nestjs/swagger';
import { CreateJobSourceAdminDto } from './create-job-source-admin.dto';

/** All fields optional — send only what you wish to change. */
export class UpdateJobSourceAdminDto extends PartialType(
  CreateJobSourceAdminDto,
) {}
