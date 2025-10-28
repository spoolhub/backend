import { Entity, PrimaryColumn, Column, JoinColumn, ManyToOne } from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import { EntityAbstract } from 'src/base/entity/entity.abstract';

export enum UserVerificationTokenType {
  EMAIL_VERIFICATION = 'email_verification',
  RECOVERY_ACCOUNT = 'recovery_account',
  CHANGE_PASSWORD = 'change_password',
  CHANGE_EMAIL = 'change_email',
}

@Entity('user_verification_tokens')
export class UserVerificationToken extends EntityAbstract {
  @PrimaryColumn('varchar')
  token: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'type', type: 'enum', enum: UserVerificationTokenType })
  type: UserVerificationTokenType;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;
}
