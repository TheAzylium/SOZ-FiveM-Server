-- CreateTable
CREATE TABLE `phone_zchecs_game` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `white_id` VARCHAR(48) NOT NULL,
    `black_id` VARCHAR(48) NOT NULL,
    `creator_id` VARCHAR(48) NOT NULL,
    `white_number` VARCHAR(10) NOT NULL,
    `black_number` VARCHAR(10) NOT NULL,
    `ranked` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    `result` VARCHAR(16) NULL,
    `end_reason` VARCHAR(24) NULL,
    `fen` VARCHAR(100) NOT NULL,
    `pgn` LONGTEXT NOT NULL,
    `draw_offer_by` VARCHAR(48) NULL,
    `white_elo_delta` INTEGER NULL,
    `black_elo_delta` INTEGER NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX `white_id`(`white_id`),
    INDEX `black_id`(`black_id`),
    INDEX `status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phone_zchecs_elo` (
    `identifier` VARCHAR(48) NOT NULL,
    `elo` INTEGER NOT NULL DEFAULT 1000,
    `wins` INTEGER NOT NULL DEFAULT 0,
    `losses` INTEGER NOT NULL DEFAULT 0,
    `draws` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`identifier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `phone_zchecs_queue` (
    `identifier` VARCHAR(48) NOT NULL,
    `number` VARCHAR(10) NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`identifier`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
