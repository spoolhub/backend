import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import { EntityAbstract } from 'src/base/entity/entity.abstract';

@Entity('user_sessions')
export class UserSession extends EntityAbstract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, (user) => user.id)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'expires_at', type: 'timestamp' })
  expiresAt: Date;

  @Column({ name: 'invoked_at', type: 'timestamp', nullable: true })
  invokedAt: Date;
}
