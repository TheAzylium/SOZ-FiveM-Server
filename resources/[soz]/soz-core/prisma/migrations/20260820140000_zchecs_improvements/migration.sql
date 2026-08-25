-- AlterTable
ALTER TABLE `phone_zchecs_game`
    ADD COLUMN `draw_offer_at` TIMESTAMP(0) NULL,
    ADD COLUMN `last_move_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN `hidden_by_white` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `hidden_by_black` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `white_elo_after` INTEGER NULL,
    ADD COLUMN `black_elo_after` INTEGER NULL;

-- Les parties existantes n'ont pas d'horodatage de dernier coup: on repart de updatedAt.
UPDATE `phone_zchecs_game` SET `last_move_at` = `updatedAt`;
