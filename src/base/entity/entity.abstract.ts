import { CreateDateColumn } from 'typeorm';

export abstract class EntityAbstract {
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
