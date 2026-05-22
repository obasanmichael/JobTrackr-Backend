import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';
import { THEME_PREFERENCES } from '../../common/utils/theme-preference.util';

export class UpdateUserProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    nullable: true,
    example: 'America/New_York',
    description: 'IANA timezone identifier. Pass null to clear.',
  })
  @IsOptional()
  @ValidateIf((_obj, value) => value !== null)
  @IsString()
  @MaxLength(64)
  timezone?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    enum: THEME_PREFERENCES,
    example: 'system',
    description: 'UI theme preference. Pass null to reset to system.',
  })
  @IsOptional()
  @ValidateIf((_obj, value) => value !== null)
  @IsString()
  @IsIn([...THEME_PREFERENCES])
  themePreference?: string | null;
}
