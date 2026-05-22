import { BadRequestException } from '@nestjs/common';
import sharp from 'sharp';

const JPEG_MIME = 'image/jpeg';
const PNG_MIME = 'image/png';
const WEBP_MIME = 'image/webp';

export const ALLOWED_AVATAR_MIMES = new Set<string>([
  JPEG_MIME,
  PNG_MIME,
  WEBP_MIME,
]);

export const AVATAR_OUTPUT_MIME = WEBP_MIME;
export const AVATAR_OUTPUT_EXTENSION = 'webp';
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_DIMENSION_PX = 512;

export async function processAvatarImage(
  buffer: Buffer,
  mimeType: string,
): Promise<Buffer> {
  if (!ALLOWED_AVATAR_MIMES.has(mimeType)) {
    throw new BadRequestException('Avatar must be a JPEG, PNG, or WebP image.');
  }

  if (buffer.length > AVATAR_MAX_BYTES) {
    throw new BadRequestException(
      `Avatar must be ${AVATAR_MAX_BYTES / (1024 * 1024)}MB or smaller.`,
    );
  }

  return sharp(buffer)
    .rotate()
    .resize(AVATAR_DIMENSION_PX, AVATAR_DIMENSION_PX, {
      fit: 'cover',
      position: 'centre',
    })
    .webp({ quality: 85 })
    .toBuffer();
}
