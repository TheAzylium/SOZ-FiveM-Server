-- CreateTable
CREATE TABLE `player_damage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `citizenid` VARCHAR(50) NOT NULL,
    `attackerId` VARCHAR(50) NOT NULL,
    `bone` INTEGER NOT NULL,
    `damageType` INTEGER NOT NULL,
    `weapon` VARCHAR(50) NOT NULL,
    `damageQty` INTEGER NOT NULL,
    `isFatal` BOOLEAN NOT NULL,
    `date` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`, `citizenid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `player_damage` ADD CONSTRAINT `FK_damages_player` FOREIGN KEY (`citizenid`) REFERENCES `player`(`citizenid`) ON DELETE CASCADE ON UPDATE CASCADE;


INSERT IGNORE INTO concess_entreprise (job, vehicle, price, category, liverytype)
VALUES 
    ('lsmc', 'seashark2', 10000, 'boat', 0),
    ('lsmc', 'lguard', 177030, 'car', 0),
    ('lsmc', 'blazer2', 7000, 'car', 0);

UPDATE concess_entreprise SET vehicle='ambulance2' WHERE vehicle='ambulance';
UPDATE player_vehicles SET vehicle='ambulance2', hash=-794924083 WHERE vehicle='ambulance';

INSERT IGNORE INTO vehicles (model, hash, name, price, category, dealership_id, required_licence, size, job_name, stock, radio, maxStock)
VALUES 
    ('ambulance2', -794924083, 'Ambulance', 150000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('seashark2', -616331036, 'Seashark Lifeguard', 10000, 'Boats', null, 'boat', 1, NULL, 0, 1, 0),
    ('lguard', 469291905, 'Granger Lifeguard', 177030, 'Suvs', null, 'car', 1, NULL, 0, 1, 0),
    ('blazer2', -48031959, 'Blazer Lifeguard', 7000, 'Off-road', NULL, 'car', 1, NULL, 0, 1, 0);
