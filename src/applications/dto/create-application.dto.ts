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
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  jobTitle!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }: { value: string }) => value?.trim())
  companyName!: string;

  @IsOptional()
  @IsUrl()
  @Transform(({ value }: { value: string }) => value?.trim())
  jobUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }: { value: string }) => value?.trim())
  location?: string;

  @IsOptional()
  @IsEnum(WorkMode)
  workMode?: WorkMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  salaryMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Validate(SalaryRangeConstraint)
  salaryMax?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Transform(({ value }: { value: string }) => value?.trim().toUpperCase())
  currency?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional()
  @IsEnum(ApplicationSource)
  source?: ApplicationSource;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deadline?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;
}
