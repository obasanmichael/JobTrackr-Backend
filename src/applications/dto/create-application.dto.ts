import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { ApplicationSource, ApplicationStatus, WorkMode } from './application.enums';
import { Transform, Type } from 'class-transformer';

@ValidatorConstraint({ name: 'SalaryRange', async: false })
class SalaryRangeConstraint implements ValidatorConstraintInterface {
  validate(salaryMax: unknown, args: ValidationArguments): boolean {
    if (salaryMax === null || salaryMax === undefined) {
      return true;
    }

    const value = Number(salaryMax);
    if (Number.isNaN(value)) {
      return false;
    }

    const target = args.object as CreateApplicationDto;
    if (target.salaryMin === null || target.salaryMin === undefined) {
      return true;
    }

    return value >= target.salaryMin;
  }

  defaultMessage(): string {
    return 'salaryMax must be greater than or equal to salaryMin.';
  }
}

export class CreateApplicationDto {
  @ApiProperty({ example: 'Backend Engineer', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  jobTitle!: string;

  @ApiProperty({ example: 'Acme Labs', maxLength: 150 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  companyName!: string;

  @ApiPropertyOptional({ example: 'https://jobs.example.com/123' })
  @IsOptional()
  @IsUrl()
  @Transform(({ value }: { value: string }) => value?.trim())
  jobUrl?: string;

  @ApiPropertyOptional({ example: 'Lagos, Nigeria', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @ApiPropertyOptional({ enum: WorkMode })
  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @ApiPropertyOptional({ example: 150000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({ example: 220000, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Validate(SalaryRangeConstraint)
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'USD', maxLength: 10 })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  currency?: string;

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ enum: ApplicationSource })
  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @ApiPropertyOptional({ example: 'Reached out to recruiter on LinkedIn.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;
}
