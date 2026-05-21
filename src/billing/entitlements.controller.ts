import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUserDecorator } from '../common/decorators/current-user.decorator';
import type { CurrentUser } from '../common/types/current-user.type';
import { EntitlementsMeResponseDto } from './dto/billing-response.dto';
import { EntitlementsService } from './entitlements.service';
import { SubscriptionProvisioningService } from './subscription-provisioning.service';

@ApiTags('entitlements')
@Controller('entitlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
export class EntitlementsController {
  constructor(
    private readonly entitlements: EntitlementsService,
    private readonly provisioning: SubscriptionProvisioningService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Effective feature entitlements for current user' })
  @ApiOkResponse({ type: EntitlementsMeResponseDto })
  async me(
    @CurrentUserDecorator() user: CurrentUser,
  ): Promise<EntitlementsMeResponseDto> {
    await this.provisioning.ensureBetaSubscription(user.userId);
    const list = await this.entitlements.listEffectiveEntitlements(user.userId);
    return {
      entitlements: list.map((e) => ({
        featureKey: e.featureKey,
        isEnabled: e.isEnabled,
        limitValue: e.limitValue,
      })),
    };
  }
}
