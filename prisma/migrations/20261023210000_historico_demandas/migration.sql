ALTER TABLE `Demanda` ADD COLUMN `versao` INTEGER NOT NULL DEFAULT 0;
CREATE TABLE `DemandaHistorico` (
 `id` INTEGER NOT NULL AUTO_INCREMENT,
 `demandaId` INTEGER NOT NULL,
 `usuarioId` INTEGER NOT NULL,
 `tipo` VARCHAR(20) NOT NULL,
 `statusAnterior` ENUM('ABERTA','EM_ANALISE','ATENDIDA','RECUSADA') NULL,
 `statusNovo` ENUM('ABERTA','EM_ANALISE','ATENDIDA','RECUSADA') NOT NULL,
 `resposta` TEXT NULL,
 `observacao` TEXT NULL,
 `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 PRIMARY KEY (`id`),
 INDEX `DemandaHistorico_demandaId_criadoEm_idx` (`demandaId`,`criadoEm`),
 INDEX `DemandaHistorico_usuarioId_idx` (`usuarioId`),
 CONSTRAINT `DemandaHistorico_demandaId_fkey` FOREIGN KEY (`demandaId`) REFERENCES `Demanda` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT `DemandaHistorico_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
