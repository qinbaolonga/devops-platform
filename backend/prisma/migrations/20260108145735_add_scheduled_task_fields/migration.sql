/*
  Warnings:

  - You are about to drop the column `cronExpr` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `lastRunTime` on the `scheduled_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `nextRunTime` on the `scheduled_tasks` table. All the data in the column will be lost.
  - Added the required column `cronExpression` to the `scheduled_tasks` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `scheduled_tasks` DROP COLUMN `cronExpr`,
    DROP COLUMN `lastRunTime`,
    DROP COLUMN `nextRunTime`,
    ADD COLUMN `cronExpression` VARCHAR(191) NOT NULL,
    ADD COLUMN `description` VARCHAR(191) NULL,
    ADD COLUMN `lastExecutedAt` DATETIME(3) NULL,
    ADD COLUMN `nextExecuteAt` DATETIME(3) NULL,
    ADD COLUMN `variables` JSON NULL;

-- AlterTable
ALTER TABLE `tasks` ADD COLUMN `scheduledTaskId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `tasks_scheduledTaskId_idx` ON `tasks`(`scheduledTaskId`);

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_scheduledTaskId_fkey` FOREIGN KEY (`scheduledTaskId`) REFERENCES `scheduled_tasks`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_tasks` ADD CONSTRAINT `scheduled_tasks_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
