import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class ResumeLocalStorageService {
  private readonly rootAbsolute: string;

  constructor(private readonly configService: ConfigService) {
    const configuredRoot = this.configService.get<string>(
      'RESUME_STORAGE_ROOT',
    );
    const fallback = path.join(process.cwd(), 'var', 'jobtrackr-resumes');
    this.rootAbsolute = path.resolve(configuredRoot?.trim() || fallback);
  }

  resolvePath(storageKey: string): string {
    const normalizedKey = storageKey.replace(/\\/g, '/');
    const absolute = path.resolve(this.rootAbsolute, normalizedKey);

    const rootPrefix = `${this.rootAbsolute}${path.sep}`;
    if (!absolute.startsWith(rootPrefix) && absolute !== this.rootAbsolute) {
      throw new Error('Invalid storage key');
    }

    return absolute;
  }

  async save(storageKey: string, body: Buffer): Promise<void> {
    const target = this.resolvePath(storageKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, body);
  }

  async read(storageKey: string): Promise<Buffer> {
    return readFile(this.resolvePath(storageKey));
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolvePath(storageKey));
    } catch {
      // ignore missing file cleanup
    }
  }
}
