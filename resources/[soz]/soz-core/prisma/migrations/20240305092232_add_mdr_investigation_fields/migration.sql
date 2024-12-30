-- AlterTable
ALTER TABLE `investigation` MODIFY `type` ENUM('investigation', 'report', 'complaint', 'appeal') NOT NULL DEFAULT 'investigation';

-- AlterTable
ALTER TABLE `investigation_revision` ADD COLUMN `prosecutor_note` LONGTEXT NOT NULL DEFAULT '';
