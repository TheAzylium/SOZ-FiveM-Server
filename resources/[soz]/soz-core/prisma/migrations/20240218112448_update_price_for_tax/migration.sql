-- This is an empty migration.

-- Update housing price
UPDATE housing_apartment SET price = price * 0.9;

-- Update vehicle price
UPDATE vehicles SET price = price * 0.9;
UPDATE concess_entreprise SET price = price * 0.9;

-- Update shop price
UPDATE shop_content SET price = price * 0.9;

-- Pitstop price
UPDATE pitstop_price SET price = price * 0.9;
