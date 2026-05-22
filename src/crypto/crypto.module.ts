import { Global, Module } from '@nestjs/common';
import { OAuthStateService } from './oauth-state.service';
import { TokenEncryptionService } from './token-encryption.service';

@Global()
@Module({
  providers: [TokenEncryptionService, OAuthStateService],
  exports: [TokenEncryptionService, OAuthStateService],
})
export class CryptoModule {}
