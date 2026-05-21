import { InternalServerErrorException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrl: string;
  endpoint: string;
};

export function getR2Config(configService: ConfigService): R2Config {
  const accountId = configService.get<string>('R2_ACCOUNT_ID')?.trim();
  const accessKeyId = configService.get<string>('R2_ACCESS_KEY_ID')?.trim();
  const secretAccessKey = configService
    .get<string>('R2_SECRET_ACCESS_KEY')
    ?.trim();
  const bucketName = configService.get<string>('R2_BUCKET_NAME')?.trim();
  const publicUrl = configService.get<string>('R2_PUBLIC_URL')?.trim();

  const missing: string[] = [];
  if (!accountId) missing.push('R2_ACCOUNT_ID');
  if (!accessKeyId) missing.push('R2_ACCESS_KEY_ID');
  if (!secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');
  if (!bucketName) missing.push('R2_BUCKET_NAME');
  if (!publicUrl) missing.push('R2_PUBLIC_URL');

  if (missing.length > 0) {
    throw new InternalServerErrorException(
      `Avatar storage is not configured. Missing: ${missing.join(', ')}.`,
    );
  }

  return {
    accountId: accountId!,
    accessKeyId: accessKeyId!,
    secretAccessKey: secretAccessKey!,
    bucketName: bucketName!,
    publicUrl: publicUrl!,
    endpoint: `https://${accountId!}.r2.cloudflarestorage.com`,
  };
}

export function buildR2PublicObjectUrl(
  configService: ConfigService,
  storageKey: string,
  updatedAt?: Date | null,
): string {
  const { publicUrl } = getR2Config(configService);
  const base = publicUrl.replace(/\/$/, '');
  const cacheKey = updatedAt?.getTime() ?? Date.now();
  return `${base}/${storageKey}?v=${cacheKey}`;
}
