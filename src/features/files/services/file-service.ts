import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';
import { FileConfig, S3BucketConfig } from 'src/configs/file';
import { Repository } from 'typeorm';
import { File } from '../entities/file.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as https from 'https';

@Injectable()
export class FileService {
  private logger = new Logger(FileService.name);
  private readonly publicS3Client: S3Client;
  private readonly privateS3Client: S3Client;
  private readonly publicConfig: S3BucketConfig;
  private readonly privateConfig: S3BucketConfig;

  // Sử dụng ConfigService để inject cấu hình
  constructor(
    private configService: ConfigService,
    @InjectRepository(File)
    private fileRepository: Repository<File>
  ) {
    // Ép kiểu để có gợi ý (IntelliSense)
    const fileConfig = this.configService.get<FileConfig>('file')!;

    // Lưu trữ tên bucket để sử dụng sau này
    this.publicConfig = fileConfig.public;
    this.privateConfig = fileConfig.private;

    // --- Khởi tạo Public S3 Client ---
    this.publicS3Client = this.initializeClient(this.publicConfig);
    this.privateS3Client = this.initializeClient(this.privateConfig);
  }

  /**
   * Phương thức chung để khởi tạo S3Client từ cấu hình bucket cụ thể
   * @param config Cấu hình bucket (Public hoặc Private)
   * @returns S3Client instance
   */
  private initializeClient(config: S3BucketConfig): S3Client {
    return new S3Client({
      // Endpoint và Region được tách biệt cho từng Client
      endpoint: config.endpoint,
      region: config.region,
      // Cấu hình ForcePathStyle rất quan trọng cho các dịch vụ tương thích S3 như MinIO
      forcePathStyle: config.forcePathStyle,

      // Credentials (Access Key ID và Secret Access Key) riêng biệt
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      requestHandler:
        this.configService.get('app.nodeEnv') !== 'production'
          ? new NodeHttpHandler({
              httpsAgent: new https.Agent({
                rejectUnauthorized: false,
              }),
            })
          : undefined,
      // Bạn có thể thêm các tùy chọn khác như maxAttempts, connectionTimeout... tại đây
    });
  }
  /**
   * Lấy URL công khai (public) cho một file cụ thể.
   * Hỗ trợ cả Path Style và Virtual Hosted Style dựa trên cấu hình publicForcePathStyle.
   * @param objectKey Key (đường dẫn) của object trong public bucket
   * @returns URL công khai của file
   */
  getPublicFileUrl(objectKey: string): string {
    // Đảm bảo objectKey không có dấu '/' ở đầu
    const key = objectKey.startsWith('/') ? objectKey.substring(1) : objectKey;

    // Kiểm tra cấu hình ForcePathStyle
    if (this.publicConfig.forcePathStyle) {
      // Path Style: <endpoint>/<bucketName>/<objectKey>
      return `${this.publicConfig.endpoint}/${this.publicConfig.bucketName}/${key}`;
    } else {
      // Virtual Hosted Style: <scheme>://<bucketName>.<endpoint host>/<objectKey>
      // Phân tích Endpoint để lấy scheme (http/https) và host
      const url = new URL(this.publicConfig.endpoint);
      const scheme = url.protocol.replace(/:$/, ''); // "http" hoặc "https"
      const host = url.hostname;
      const port = url.port ? `:${url.port}` : '';

      // Cấu trúc URL Hosted Style
      return `${scheme}://${this.publicConfig.bucketName}.${host}${port}/${key}`;
    }
  }

  /**
   * Upload the resource files (it's will public)
   * @param file
   * @param key
   * @param uploadedById
   * @returns
   */
  async uploadResource(
    file: Express.Multer.File,
    key: string,
    uploadedById: string
  ): Promise<File> {
    this.logger.debug({
      Bucket: this.publicConfig.bucketName,
      Key: key,
      ContentType: file.mimetype,
    });

    const command = new PutObjectCommand({
      Bucket: this.publicConfig.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.publicS3Client.send(command);

    const newFile = this.fileRepository.create({
      bucketName: this.publicConfig.bucketName,
      key,
      size: file.size,
      mimeType: file.mimetype,
      url: this.getPublicFileUrl(key),
      uploadedById,
    });

    return this.fileRepository.save(newFile);
  }

  /**
   * Upload the assets file (private)
   * @param file
   * @param key
   * @param uploadedById
   * @returns
   */
  async uploadAssets(
    file: Express.Multer.File,
    key: string,
    uploadedById: string
  ): Promise<File> {
    const command = new PutObjectCommand({
      Bucket: this.privateConfig.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.publicS3Client.send(command);
    const newFile = this.fileRepository.create({
      bucketName: this.privateConfig.bucketName,
      key,
      size: file.size,
      mimeType: file.mimetype,
      uploadedById,
    });

    return this.fileRepository.save(newFile);
  }
}
