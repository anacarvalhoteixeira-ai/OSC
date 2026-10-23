-- AlterTable
ALTER TABLE `Demanda` ADD COLUMN `categoria` ENUM('MATERIAIS', 'VOLUNTARIOS', 'FINANCEIRO', 'SERVICOS', 'OUTROS') NOT NULL DEFAULT 'OUTROS',
    ADD COLUMN `dataConclusao` DATETIME(3) NULL,
    ADD COLUMN `prazo` DATETIME(3) NULL,
    ADD COLUMN `resultado` TEXT NULL;

-- AlterTable
ALTER TABLE `Projeto` ADD COLUMN `email` VARCHAR(191) NULL,
    ADD COLUMN `objetivo` TEXT NULL,
    ADD COLUMN `orcamento` DECIMAL(12, 2) NULL,
    ADD COLUMN `responsavel` VARCHAR(120) NULL,
    ADD COLUMN `resultados` TEXT NULL,
    ADD COLUMN `telefone` VARCHAR(20) NULL;

-- CreateIndex
CREATE INDEX `Demanda_categoria_idx` ON `Demanda`(`categoria`);
