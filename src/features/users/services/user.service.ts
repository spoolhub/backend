import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { ConflictException } from 'src/base/errors/conflict.exception';
import { NotFoundException } from 'src/base/errors/not-found.exception';
import { UnprocessableEntityException } from 'src/base/errors/unprocessable-entity.exception';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>
  ) {}

  withManager(manager: EntityManager): UserService {
    const newInstance = new UserService(manager.withRepository(this.userRepo));
    return newInstance;
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { email },
    });
  }

  async findByUsername(username: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { username },
    });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepo.findOne({
      where: { id },
    });
  }

  async register(data: Pick<User, 'email' | 'passwordHash'>): Promise<User> {
    const existingUser = await this.userRepo.findOne({
      where: { email: data.email },
    });
    if (existingUser) {
      throw new ConflictException(undefined, {
        email: 'Email address has been used to register another account',
      });
    }
    const user = this.userRepo.create(data);
    return await this.userRepo.save(user);
  }

  async setupAccount(
    data: Pick<User, 'id' | 'name' | 'username'>
  ): Promise<User> {
    const user = await this.findById(data.id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!data.username) {
      throw new UnprocessableEntityException(undefined, {
        details: {
          username: 'Username is required',
        },
      });
    }

    if (!data.name) {
      throw new UnprocessableEntityException(undefined, {
        details: {
          name: 'Name is required',
        },
      });
    }

    const existingUsername = await this.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictException(undefined, {
        details: {
          username: 'Username already exists',
        },
      });
    }

    user.name = data.name;
    user.username = data.username;
    return await this.userRepo.save(user);
  }

  async verify(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.verificatedAt = new Date();
    return await this.userRepo.save(user);
  }

  async suspend(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.suspendedAt = new Date();
    return await this.userRepo.save(user);
  }

  async unsuspend(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.suspendedAt = null;
    return await this.userRepo.save(user);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.passwordHash = passwordHash;
    user.passwordUpdatedAt = new Date();
    return await this.userRepo.save(user);
  }
}
