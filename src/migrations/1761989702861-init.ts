import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1761989702861 implements MigrationInterface {
  name = 'Init1761989702861';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "user_sessions" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "user_id" uuid NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                "invoked_at" TIMESTAMP,
                CONSTRAINT "PK_e93e031a5fed190d4789b6bfd83" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "files" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "bucket_name" character varying NOT NULL,
                "key" character varying NOT NULL,
                "url" character varying,
                "mime_type" character varying NOT NULL,
                "size" bigint NOT NULL,
                "uploaded_by_id" uuid,
                CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "users" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "name" character varying,
                "username" character varying,
                "password_hash" character varying NOT NULL,
                "avatar_file_id" uuid,
                "password_updated_at" TIMESTAMP,
                "verificated_at" TIMESTAMP,
                "suspended_at" TIMESTAMP,
                CONSTRAINT "REL_65eb1fa7df7811daaec973798c" UNIQUE ("avatar_file_id"),
                CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
            )
        `);
    await queryRunner.query(`
            CREATE TYPE "public"."user_verification_tokens_type_enum" AS ENUM(
                'email_verification',
                'recovery_account',
                'change_password',
                'change_email'
            )
        `);
    await queryRunner.query(`
            CREATE TABLE "user_verification_tokens" (
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "token" character varying NOT NULL,
                "user_id" uuid NOT NULL,
                "type" "public"."user_verification_tokens_type_enum" NOT NULL,
                "expires_at" TIMESTAMP NOT NULL,
                CONSTRAINT "PK_609aad3a7b3f0862d184941a9e7" PRIMARY KEY ("token")
            )
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sessions"
            ADD CONSTRAINT "FK_e9658e959c490b0a634dfc54783" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "files"
            ADD CONSTRAINT "FK_b25b4b9c85b6e6ffa2789dc5da5" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "FK_65eb1fa7df7811daaec973798ce" FOREIGN KEY ("avatar_file_id") REFERENCES "files"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
    await queryRunner.query(`
            ALTER TABLE "user_verification_tokens"
            ADD CONSTRAINT "FK_0dbaa0aceff08b07a06e3a472d1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "user_verification_tokens" DROP CONSTRAINT "FK_0dbaa0aceff08b07a06e3a472d1"
        `);
    await queryRunner.query(`
            ALTER TABLE "users" DROP CONSTRAINT "FK_65eb1fa7df7811daaec973798ce"
        `);
    await queryRunner.query(`
            ALTER TABLE "files" DROP CONSTRAINT "FK_b25b4b9c85b6e6ffa2789dc5da5"
        `);
    await queryRunner.query(`
            ALTER TABLE "user_sessions" DROP CONSTRAINT "FK_e9658e959c490b0a634dfc54783"
        `);
    await queryRunner.query(`
            DROP TABLE "user_verification_tokens"
        `);
    await queryRunner.query(`
            DROP TYPE "public"."user_verification_tokens_type_enum"
        `);
    await queryRunner.query(`
            DROP TABLE "users"
        `);
    await queryRunner.query(`
            DROP TABLE "files"
        `);
    await queryRunner.query(`
            DROP TABLE "user_sessions"
        `);
  }
}
