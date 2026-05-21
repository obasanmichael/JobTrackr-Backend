import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getR2Config } from './r2.config';

@Injectable()
export class R2StorageService {
  private client: S3Client | null = null;
  private bucketName: string | null = null;

  constructor(private readonly configService: ConfigService) {}

  private ensureClient(): { client: S3Client; bucketName: string } {
    if (this.client && this.bucketName) {
      return { client: this.client, bucketName: this.bucketName };
    }

    const config = getR2Config(this.configService);
    this.bucketName = config.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: config.endpoint,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    return { client: this.client, bucketName: this.bucketName };
  }

  async putObject(
    storageKey: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    const { client, bucketName } = this.ensureClient();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: storageKey,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(storageKey: string): Promise<void> {
    const { client, bucketName } = this.ensureClient();
    try {
      await client.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        }),
      );
    } catch {
      // ignore missing object cleanup
    }
  }
}
