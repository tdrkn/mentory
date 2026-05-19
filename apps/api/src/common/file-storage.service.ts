import { Injectable, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

type StoreDataUrlOptions = {
  scope: string;
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
};

@Injectable()
export class FileStorageService {
  private readonly uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
  private readonly publicPrefix = process.env.PUBLIC_UPLOADS_URL || '/uploads';

  async storeDataUrlIfNeeded(fileUrl: string, options: StoreDataUrlOptions) {
    if (!fileUrl.startsWith('data:')) {
      return fileUrl;
    }

    const match = /^data:([^;]+);base64,(.+)$/s.exec(fileUrl);
    if (!match) {
      throw new BadRequestException('Invalid data URL payload');
    }

    const [, mimeType, base64Payload] = match;
    if (mimeType.toLowerCase() !== options.mimeType.toLowerCase()) {
      throw new BadRequestException('Data URL mime type does not match declared mime type');
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    if (buffer.length === 0) {
      throw new BadRequestException('Uploaded file is empty');
    }
    if (options.sizeBytes !== undefined && buffer.length !== options.sizeBytes) {
      throw new BadRequestException('Data URL size does not match declared file size');
    }

    const safeScope = this.safePathSegment(options.scope);
    const extension = this.safeExtension(options.fileName);
    const relativeName = `${randomUUID()}${extension}`;
    const relativePath = path.join(safeScope, relativeName);
    const absoluteDir = path.join(this.uploadsDir, safeScope);
    const absolutePath = path.join(absoluteDir, relativeName);

    await fs.mkdir(absoluteDir, { recursive: true });
    await fs.writeFile(absolutePath, buffer);

    return `${this.publicPrefix}/${relativePath.replace(/\\/g, '/')}`;
  }

  private safePathSegment(value: string) {
    const cleaned = value.replace(/[^a-zA-Z0-9_-]/g, '-');
    return cleaned || 'files';
  }

  private safeExtension(fileName: string) {
    const extension = path.extname(fileName).toLowerCase();
    if (!extension || extension.length > 12 || /[^a-z0-9.]/.test(extension)) {
      return '.bin';
    }
    return extension;
  }
}
