import { Injectable } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PasswordService {
  private readonly SALT_ROUNDS: number;

  constructor(private readonly configService: ConfigService) {
    // Lấy salt rounds từ config, default là 10 nếu không có
    this.SALT_ROUNDS = this.configService.get<number>('auth.saltRounds', 10);
  }

  /**
   * Hash password sử dụng bcrypt
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  }

  /**
   * So sánh plain password với hashed password
   * @param password Plain text password
   * @param hashedPassword Hashed password
   * @returns true nếu password khớp
   */
  async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }
}
