INSERT IGNORE INTO concess_entreprise (job, vehicle, price, category, liverytype)
VALUES 
    ('lspd', 'lspd41', 720000, 'car', 0),
    ('bcso', 'bcso41', 720000, 'car', 0);

INSERT IGNORE INTO vehicles (model, hash, name, price, category, dealership_id, required_licence, size, job_name, stock, radio, maxStock)
VALUES 
    ('lspd41', -94815178, 'LSPD Pariah', 720000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('bcso41', -1410284417, 'BCSO Ellie', 720000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0);

UPDATE concess_entreprise SET price=180000 WHERE vehicle='lspd10';
UPDATE concess_entreprise SET price=180000 WHERE vehicle='lspd11';
UPDATE concess_entreprise SET price=180000 WHERE vehicle='lspd12';
UPDATE concess_entreprise SET price=288000 WHERE vehicle='lspd20';
UPDATE concess_entreprise SET price=288000 WHERE vehicle='lspd21';
UPDATE concess_entreprise SET price=153000 WHERE vehicle='lspd30';
UPDATE concess_entreprise SET price=720000 WHERE vehicle='lspd40';
UPDATE concess_entreprise SET price=252000 WHERE vehicle='lspd50';
UPDATE concess_entreprise SET price=252000 WHERE vehicle='lspd51';
UPDATE concess_entreprise SET price=450000 WHERE vehicle='polmav' AND job='lspd';
UPDATE concess_entreprise SET price=54000 WHERE vehicle='predator';

UPDATE concess_entreprise SET price=180000 WHERE vehicle='bcso10';
UPDATE concess_entreprise SET price=180000 WHERE vehicle='bcso11';
UPDATE concess_entreprise SET price=180000 WHERE vehicle='bcso12';
UPDATE concess_entreprise SET price=288000 WHERE vehicle='bcso20';
UPDATE concess_entreprise SET price=288000 WHERE vehicle='bcso21';
UPDATE concess_entreprise SET price=153000 WHERE vehicle='bcso30';
UPDATE concess_entreprise SET price=720000 WHERE vehicle='bcso40';
UPDATE concess_entreprise SET price=252000 WHERE vehicle='bcso50';
UPDATE concess_entreprise SET price=252000 WHERE vehicle='bcso51';
UPDATE concess_entreprise SET price=450000 WHERE vehicle='maverick2';
UPDATE concess_entreprise SET price=54000 WHERE vehicle='predator';

UPDATE concess_entreprise SET price=180000 WHERE vehicle='sasp1';