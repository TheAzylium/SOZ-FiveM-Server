INSERT IGNORE INTO concess_entreprise (job, vehicle, price, category, liverytype)
VALUES 
    ('lspd', 'lspd21', 160000, 'car', 0),
    ('bcso', 'bcso21', 160000, 'car', 0);

INSERT IGNORE INTO vehicles (model, hash, name, price, category, dealership_id, required_licence, size, job_name, stock, radio, maxStock)
VALUES 
    ('lspd21', 1629751234, 'LSPD Rebla', 160000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0),
    ('bcso21', -1488693162, 'BCSO Aleutian', 160000, 'Emergency', null, 'car', 1, NULL, 0, 1, 0);