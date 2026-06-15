import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Client as MinioClient } from "minio";

/**
 * Thin wrapper over MinIO (S3-compatible). Holds call recordings; the bucket is
 * created on boot if missing. Reads return short-lived presigned GET URLs so the
 * app never needs the storage credentials.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: MinioClient;
  private readonly bucket: string;

  constructor() {
    this.bucket = process.env.MINIO_BUCKET ?? "call-recordings";
    this.client = new MinioClient({
      endPoint: process.env.MINIO_ENDPOINT ?? "localhost",
      port: Number(process.env.MINIO_PORT ?? 9000),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY ?? "yesboss",
      secretKey: process.env.MINIO_SECRET_KEY ?? "yesboss-secret",
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket);
        this.logger.log(`Created bucket "${this.bucket}"`);
      }
    } catch (err) {
      // Don't crash the app if MinIO is briefly down; uploads will surface it.
      this.logger.warn(`Bucket check failed: ${(err as Error).message}`);
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(this.bucket, key, body, body.length, {
      "Content-Type": contentType,
    });
  }

  /** Presigned GET, valid for `expirySec` (default 1h). */
  async getSignedUrl(key: string, expirySec = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySec);
  }
}
