import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadSignatureResponse } from '@vidntec/shared';
import type { Env } from '../config/env';

/**
 * Images are uploaded straight from the browser to Cloudinary using a signed
 * payload minted here — the file never passes through our API. We only store
 * the resulting secure_url + public_id, and can delete the asset later.
 */
@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private readonly cloudName: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(config: ConfigService<Env, true>) {
    this.cloudName = config.getOrThrow('CLOUDINARY_CLOUD_NAME', { infer: true });
    this.apiKey = config.getOrThrow('CLOUDINARY_API_KEY', { infer: true });
    this.apiSecret = config.getOrThrow('CLOUDINARY_API_SECRET', { infer: true });
    cloudinary.config({
      cloud_name: this.cloudName,
      api_key: this.apiKey,
      api_secret: this.apiSecret,
      secure: true,
    });
  }

  signUpload(folder: string): UploadSignatureResponse {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      this.apiSecret,
    );
    return { cloudName: this.cloudName, apiKey: this.apiKey, timestamp, signature, folder };
  }

  async deleteAsset(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      // Non-fatal: log and continue so the DB row can still be removed.
      this.logger.warn(`Failed to delete Cloudinary asset ${publicId}: ${String(err)}`);
    }
  }
}
