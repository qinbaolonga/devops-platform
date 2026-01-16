-- AlterTable
ALTER TABLE `hosts` ADD COLUMN `privateIp` VARCHAR(191) NULL,
    ADD COLUMN `publicIp` VARCHAR(191) NULL;
