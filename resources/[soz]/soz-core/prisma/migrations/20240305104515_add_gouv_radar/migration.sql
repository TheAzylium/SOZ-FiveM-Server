DROP TABLE IF EXISTS `radar`;

DELETE FROM vandalism_props WHERE kind = 'radar';

CREATE TABLE  `radar`
(
    id           int auto_increment           primary key,
    speed_record int                          not null,
    citizenid    varchar(50)                  null,
    destroyed    tinyint(1)                   not null,
    enabled      tinyint(1)                   not null,
    position     longtext collate utf8mb4_bin not null check (json_valid(`position`)),
    speed        int                          not null
) collate = utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `radar` ADD CONSTRAINT `FK_radar_speed_record_player` FOREIGN KEY (`citizenid`) REFERENCES `player`(`citizenid`) ON DELETE SET NULL ON UPDATE CASCADE;

