INSERT IGNORE INTO vehicles (model, hash, name, price, category, dealership_id, required_licence, size, job_name, stock, radio, maxStock)
VALUES 
    ('sheriff', -1683328900, 'BCSO Prestige', 100000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('police', 2046537925, 'LSPD Prestige', 100000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0);

UPDATE vehicles SET name='BCSO Tailgater S' WHERE model='bcso12';
