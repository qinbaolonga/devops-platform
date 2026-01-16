-- AlterTable
ALTER TABLE `system_configs` ADD COLUMN `encrypted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `type` VARCHAR(191) NOT NULL DEFAULT 'string',
    MODIFY `value` TEXT NOT NULL;
