-- AlterTable
ALTER TABLE `bank_accounts` MODIFY `account_type` ENUM('player', 'business', 'safestorages', 'offshore', 'bank-atm', 'gang') NOT NULL DEFAULT 'player';
