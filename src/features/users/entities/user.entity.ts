import { UserSession } from 'src/features/auth/entities/user-session.entity';
import { File } from 'src/features/files/entities/file.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
  BeforeInsert,
} from 'typeorm';
import { EntityAbstract } from 'src/base/entity/entity.abstract';
import { v7 as uuidv7 } from 'uuid';

@Entity('users')
export class User extends EntityAbstract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  name: string | null;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'avatar_file_id', type: 'uuid', nullable: true })
  avatarFileId: string;

  @Column({ type: 'timestamp', name: 'password_updated_at', nullable: true })
  passwordUpdatedAt: Date;

  @Column({
    type: 'timestamp',
    name: 'verificated_at',
    nullable: true,
    default: null,
  })
  verificatedAt: Date | null;

  @Column({
    type: 'timestamp',
    name: 'suspended_at',
    nullable: true,
    default: null,
  })
  suspendedAt: Date | null;

  @OneToMany(() => UserSession, (session) => session.userId)
  sessions: UserSession[];

  @OneToOne(() => File)
  @JoinColumn({ name: 'avatar_file_id' })
  avatar: File;

  @OneToMany(() => File, (file) => file.uploadedById)
  uploadedFiles: File[];

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
