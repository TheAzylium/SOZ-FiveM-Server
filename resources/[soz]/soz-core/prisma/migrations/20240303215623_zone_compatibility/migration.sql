/*
  Warnings:

  - You are about to alter the column `type` on the `zone` table. The data in that column could be lost. The data in that column will be cast from `Enum(EnumId(0))` to `VarChar(50)`.

*/
-- AlterTable
ALTER TABLE `zone` MODIFY `type` VARCHAR(50) NOT NULL;
