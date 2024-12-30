INSERT IGNORE INTO concess_entreprise (job, vehicle, price, category, liverytype)
VALUES 
    ('lspd', 'lspd11', 100000, 'car', 0),
    ('lspd', 'lspd12', 100000, 'car', 0),
    ('bcso', 'bcso11', 100000, 'car', 0),
    ('bcso', 'bcso12', 100000, 'car', 0);

INSERT IGNORE INTO vehicles (model, hash, name, price, category, dealership_id, required_licence, size, job_name, stock, radio, maxStock)
VALUES 
    ('lspd11', -573606012, 'LSPD VSTR', 250000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('lspd12', -878390481, 'LSPD Cinquemilla', 250000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('bcso11', -1195802912, 'BCSO Buffalo', 250000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('bcso12', 1581795839, 'BCSO Washington', 250000, 'Emergency', NULL, 'car', 1, NULL, 0, 1, 0);

DELETE FROM concess_entreprise where vehicle IN ('sheriff3', 'sheriff4');

UPDATE concess_entreprise SET vehicle='lspd10' WHERE vehicle='police5';
UPDATE concess_entreprise SET vehicle='lspd20' WHERE vehicle='police6';
UPDATE concess_entreprise SET vehicle='lspd30' WHERE vehicle='policeb2';
UPDATE concess_entreprise SET vehicle='lspd40' WHERE vehicle='lspdgallardo';
UPDATE concess_entreprise SET vehicle='lspd50' WHERE vehicle='lspdbana1';
UPDATE concess_entreprise SET vehicle='lspd51' WHERE vehicle='lspdbana2';

UPDATE concess_entreprise SET vehicle='bcso10' WHERE vehicle='sheriffdodge';
UPDATE concess_entreprise SET vehicle='bcso20' WHERE vehicle='sheriffcara';
UPDATE concess_entreprise SET vehicle='bcso30' WHERE vehicle='bcsomanchez';
UPDATE concess_entreprise SET vehicle='bcso40' WHERE vehicle='bcsoc7';
UPDATE concess_entreprise SET vehicle='bcso50' WHERE vehicle='bcsobana1';
UPDATE concess_entreprise SET vehicle='bcso51' WHERE vehicle='bcsobana2';

UPDATE concess_entreprise SET vehicle='baller9' WHERE vehicle='baller8';

UPDATE player_vehicles SET vehicle='lspd10', hash=424965816 WHERE vehicle='police5';
UPDATE player_vehicles SET vehicle='lspd20', hash=-532576789 WHERE vehicle='police6';
UPDATE player_vehicles SET vehicle='lspd30', hash=-1159644141 WHERE vehicle='policeb2';
UPDATE player_vehicles SET vehicle='lspd40', hash=-430238662 WHERE vehicle='lspdgallardo';
UPDATE player_vehicles SET vehicle='lspd50', hash=284682971 WHERE vehicle='lspdbana1';
UPDATE player_vehicles SET vehicle='lspd51', hash=-208687093 WHERE vehicle='lspdbana2';

UPDATE player_vehicles SET vehicle='bcso10', hash=-1476862625 WHERE vehicle='sheriffdodge';
UPDATE player_vehicles SET vehicle='bcso20', hash=-1241090598 WHERE vehicle='sheriffcara';
UPDATE player_vehicles SET vehicle='bcso30', hash=-1261250141 WHERE vehicle='bcsomanchez';
UPDATE player_vehicles SET vehicle='bcso40', hash=-635002646 WHERE vehicle='bcsoc7';
UPDATE player_vehicles SET vehicle='bcso50', hash=-1320496941 WHERE vehicle='bcsobana1';
UPDATE player_vehicles SET vehicle='bcso51', hash=-1080496785 WHERE vehicle='bcsobana2';

UPDATE player_vehicles SET vehicle='baller9', hash=-1024713440 WHERE vehicle='baller8';

UPDATE vehicles SET model='lspd10', hash=424965816 WHERE model='police5';
UPDATE vehicles SET model='lspd20', hash=-532576789 WHERE model='police6';
UPDATE vehicles SET model='lspd30', hash=-1159644141 WHERE model='policeb2';
UPDATE vehicles SET model='lspd40', hash=-430238662 WHERE model='lspdgallardo';
UPDATE vehicles SET model='lspd50', hash=284682971 WHERE model='lspdbana1';
UPDATE vehicles SET model='lspd51', hash=-208687093 WHERE model='lspdbana2';

UPDATE vehicles SET model='bcso10', hash=-1476862625 WHERE model='sheriffdodge';
UPDATE vehicles SET model='bcso20', hash=-1241090598 WHERE model='sheriffcara';
UPDATE vehicles SET model='bcso30', hash=-1261250141 WHERE model='bcsomanchez';
UPDATE vehicles SET model='bcso40', hash=-635002646 WHERE model='bcsoc7';
UPDATE vehicles SET model='bcso50', hash=-1320496941 WHERE model='bcsobana1';
UPDATE vehicles SET model='bcso51', hash=-1080496785 WHERE model='bcsobana2';
