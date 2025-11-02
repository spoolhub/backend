import { registerAs } from '@nestjs/config';
import { IsBoolean, IsString, IsUrl } from 'class-validator';
import { validateConfig } from 'src/utils/validate-config';

// Định nghĩa cấu hình đầy đủ cho một S3/MinIO bucket,
// bao gồm cả endpoint và credentials riêng biệt.
export type S3BucketConfig = {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  bucketName: string;
  forcePathStyle: boolean;
};

// Định nghĩa cấu hình File tổng thể
export type FileConfig = {
  // Tách biệt cấu hình chi tiết cho Public và Private
  public: S3BucketConfig;
  private: S3BucketConfig;
};

// Lớp Validator cho các biến môi trường
class EnvironmentVariablesValidator {
  // --- Biến cho Public Bucket (resources) ---
  @IsUrl({ require_tld: false })
  PUBLIC_AWS_S3_ENDPOINT: string;

  @IsString()
  PUBLIC_AWS_S3_ACCESS_KEY_ID: string;

  @IsString()
  PUBLIC_AWS_S3_SECRET_ACCESS_KEY: string;

  @IsString()
  PUBLIC_AWS_S3_REGION: string;

  @IsString()
  PUBLIC_AWS_S3_BUCKET_NAME: string;

  // Lấy giá trị boolean từ chuỗi 'true'/'false'
  @IsBoolean({
    message:
      'PUBLIC_AWS_S3_FORCE_PATH_STYLE must be "true" or "false" (boolean string)',
  })
  PUBLIC_AWS_S3_FORCE_PATH_STYLE: boolean;

  // --- Biến cho Private Bucket (assets) ---
  @IsUrl({ require_tld: false })
  PRIVATE_AWS_S3_ENDPOINT: string;

  @IsString()
  PRIVATE_AWS_S3_ACCESS_KEY_ID: string;

  @IsString()
  PRIVATE_AWS_S3_SECRET_ACCESS_KEY: string;

  @IsString()
  PRIVATE_AWS_S3_REGION: string;

  @IsString()
  PRIVATE_AWS_S3_BUCKET_NAME: string;

  // Lấy giá trị boolean từ chuỗi 'true'/'false'
  @IsBoolean({
    message:
      'PRIVATE_AWS_S3_FORCE_PATH_STYLE must be "true" or "false" (boolean string)',
  })
  PRIVATE_AWS_S3_FORCE_PATH_STYLE: boolean;
}

// Hàm chuyển đổi chuỗi boolean 'true'/'false' thành boolean thực
const bool = (str: string | undefined) => str === 'true';

export const fileConfig = registerAs<FileConfig>('file', () => {
  // Bước 1: Validate tất cả biến môi trường
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    // Public Bucket Configuration (resources)
    public: {
      endpoint: process.env.PUBLIC_AWS_S3_ENDPOINT!,
      accessKeyId: process.env.PUBLIC_AWS_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.PUBLIC_AWS_S3_SECRET_ACCESS_KEY!,
      region: process.env.PUBLIC_AWS_S3_REGION!,
      bucketName: process.env.PUBLIC_AWS_S3_BUCKET_NAME!,
      forcePathStyle: bool(process.env.PUBLIC_AWS_S3_FORCE_PATH_STYLE),
    },

    // Private Bucket Configuration (assets)
    private: {
      endpoint: process.env.PRIVATE_AWS_S3_ENDPOINT!,
      accessKeyId: process.env.PRIVATE_AWS_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.PRIVATE_AWS_S3_SECRET_ACCESS_KEY!,
      region: process.env.PRIVATE_AWS_S3_REGION!,
      bucketName: process.env.PRIVATE_AWS_S3_BUCKET_NAME!,
      forcePathStyle: bool(process.env.PRIVATE_AWS_S3_FORCE_PATH_STYLE),
    },
  };
});
