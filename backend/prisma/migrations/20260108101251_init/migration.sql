-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `role` ENUM('SUPER_ADMIN', 'ADMIN', 'OPERATOR', 'VIEWER') NOT NULL DEFAULT 'OPERATOR',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `lastLoginIp` VARCHAR(191) NULL,
    `failedAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockedUntil` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_username_idx`(`username`),
    INDEX `users_email_idx`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `project_members` (
    `id` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MEMBER', 'VIEWER') NOT NULL,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_members_projectId_idx`(`projectId`),
    INDEX `project_members_userId_idx`(`userId`),
    UNIQUE INDEX `project_members_projectId_userId_key`(`projectId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `hosts` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ip` VARCHAR(191) NOT NULL,
    `port` INTEGER NOT NULL DEFAULT 22,
    `username` VARCHAR(191) NOT NULL DEFAULT 'root',
    `authType` ENUM('PASSWORD', 'SSH_KEY', 'CREDENTIAL') NOT NULL,
    `password` VARCHAR(191) NULL,
    `credentialId` VARCHAR(191) NULL,
    `status` ENUM('ONLINE', 'OFFLINE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `osType` VARCHAR(191) NULL,
    `osVersion` VARCHAR(191) NULL,
    `cpuCores` INTEGER NULL,
    `memoryTotal` BIGINT NULL,
    `diskTotal` BIGINT NULL,
    `lastCheckTime` DATETIME(3) NULL,
    `tags` JSON NULL,
    `groupId` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `customFields` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `hosts_projectId_idx`(`projectId`),
    INDEX `hosts_status_idx`(`status`),
    INDEX `hosts_ip_idx`(`ip`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `host_groups` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `host_groups_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `credentials` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('SSH_PASSWORD', 'SSH_KEY', 'API_TOKEN') NOT NULL,
    `username` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `privateKey` TEXT NULL,
    `passphrase` VARCHAR(191) NULL,
    `description` VARCHAR(191) NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `credentials_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `playbooks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `content` TEXT NOT NULL,
    `version` INTEGER NOT NULL DEFAULT 1,
    `variables` JSON NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `playbooks_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `playbook_versions` (
    `id` VARCHAR(191) NOT NULL,
    `playbookId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `content` TEXT NOT NULL,
    `changelog` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `playbook_versions_playbookId_idx`(`playbookId`),
    UNIQUE INDEX `playbook_versions_playbookId_version_key`(`playbookId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tasks` (
    `id` VARCHAR(191) NOT NULL,
    `type` ENUM('COMMAND', 'PLAYBOOK', 'SCRIPT') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `command` TEXT NULL,
    `playbookId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `hostIds` JSON NOT NULL,
    `result` JSON NULL,
    `output` LONGTEXT NULL,
    `startTime` DATETIME(3) NULL,
    `endTime` DATETIME(3) NULL,
    `duration` INTEGER NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `tasks_projectId_idx`(`projectId`),
    INDEX `tasks_status_idx`(`status`),
    INDEX `tasks_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scheduled_tasks` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('COMMAND', 'PLAYBOOK', 'SCRIPT') NOT NULL,
    `cronExpr` VARCHAR(191) NOT NULL,
    `command` TEXT NULL,
    `playbookId` VARCHAR(191) NULL,
    `hostIds` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastRunTime` DATETIME(3) NULL,
    `nextRunTime` DATETIME(3) NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `scheduled_tasks_projectId_idx`(`projectId`),
    INDEX `scheduled_tasks_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `host_metrics` (
    `id` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `cpuUsage` DOUBLE NOT NULL,
    `memoryUsage` DOUBLE NOT NULL,
    `diskUsage` DOUBLE NOT NULL,
    `networkIn` DOUBLE NOT NULL,
    `networkOut` DOUBLE NOT NULL,
    `loadAvg` DOUBLE NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `host_metrics_hostId_timestamp_idx`(`hostId`, `timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alert_rules` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `metric` ENUM('CPU', 'MEMORY', 'DISK', 'NETWORK_IN', 'NETWORK_OUT', 'LOAD') NOT NULL,
    `operator` ENUM('GT', 'LT', 'GTE', 'LTE', 'EQ') NOT NULL,
    `threshold` DOUBLE NOT NULL,
    `duration` INTEGER NOT NULL,
    `level` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `hostIds` JSON NOT NULL,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `alert_rules_projectId_idx`(`projectId`),
    INDEX `alert_rules_enabled_idx`(`enabled`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `alerts` (
    `id` VARCHAR(191) NOT NULL,
    `ruleId` VARCHAR(191) NOT NULL,
    `hostId` VARCHAR(191) NOT NULL,
    `level` ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') NOT NULL,
    `message` TEXT NOT NULL,
    `value` DOUBLE NOT NULL,
    `status` ENUM('FIRING', 'RESOLVED', 'ACKNOWLEDGED') NOT NULL DEFAULT 'FIRING',
    `firedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolvedAt` DATETIME(3) NULL,
    `acknowledgedAt` DATETIME(3) NULL,
    `acknowledgedBy` VARCHAR(191) NULL,

    INDEX `alerts_ruleId_idx`(`ruleId`),
    INDEX `alerts_hostId_idx`(`hostId`),
    INDEX `alerts_status_idx`(`status`),
    INDEX `alerts_firedAt_idx`(`firedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification_channels` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` ENUM('EMAIL', 'DINGTALK', 'WECHAT', 'SLACK', 'WEBHOOK') NOT NULL,
    `config` JSON NOT NULL,
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `projectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `notification_channels_projectId_idx`(`projectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `resource` VARCHAR(191) NOT NULL,
    `resourceId` VARCHAR(191) NULL,
    `details` JSON NULL,
    `ip` VARCHAR(191) NOT NULL,
    `userAgent` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_action_idx`(`action`),
    INDEX `audit_logs_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `system_configs` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `description` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `system_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hosts` ADD CONSTRAINT `hosts_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hosts` ADD CONSTRAINT `hosts_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `host_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `hosts` ADD CONSTRAINT `hosts_credentialId_fkey` FOREIGN KEY (`credentialId`) REFERENCES `credentials`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `host_groups` ADD CONSTRAINT `host_groups_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `credentials` ADD CONSTRAINT `credentials_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playbooks` ADD CONSTRAINT `playbooks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playbooks` ADD CONSTRAINT `playbooks_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `playbook_versions` ADD CONSTRAINT `playbook_versions_playbookId_fkey` FOREIGN KEY (`playbookId`) REFERENCES `playbooks`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_tasks` ADD CONSTRAINT `scheduled_tasks_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `host_metrics` ADD CONSTRAINT `host_metrics_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `hosts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alert_rules` ADD CONSTRAINT `alert_rules_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_ruleId_fkey` FOREIGN KEY (`ruleId`) REFERENCES `alert_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `alerts` ADD CONSTRAINT `alerts_hostId_fkey` FOREIGN KEY (`hostId`) REFERENCES `hosts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notification_channels` ADD CONSTRAINT `notification_channels_projectId_fkey` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
