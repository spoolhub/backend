import {
  Entity,
  Column,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  BeforeInsert,
} from 'typeorm';
import { User } from 'src/features/users/entities/user.entity';
import { EntityAbstract } from 'src/base/entity/entity.abstract';
import { v7 as uuidv7 } from 'uuid';

@Entity('files')
export class File extends EntityAbstract {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'bucket_name' })
  bucketName: string;

  @Column()
  key: string;

  @Column({ nullable: true })
  url: string; // file with no url mean private file

  @Column({ name: 'mime_type' })
  mimeType: string;

  @Column('bigint')
  size: number;

  @Column({ type: 'uuid', nullable: true, name: 'uploaded_by_id' })
  uploadedById: string;

  @ManyToOne(() => User, (user) => user.uploadedFiles)
  @JoinColumn({ name: 'uploaded_by_id' })
  uploadedBy: User;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }
}
