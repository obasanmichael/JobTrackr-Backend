import { ApiProperty } from '@nestjs/swagger';
import { ResumeReviewResponseDto } from './resume-review-response.dto';

/** Paginated review history (§6.2 — list + totals for UI). */
export class ResumeReviewListResponseDto {
  @ApiProperty({ type: [ResumeReviewResponseDto] })
  items!: ResumeReviewResponseDto[];

  @ApiProperty({
    description: 'Total rows matching filters (not just this page)',
  })
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
