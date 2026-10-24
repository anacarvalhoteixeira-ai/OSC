-- Expande antes de converter os perfis antigos, preservando usuários e vínculos.
ALTER TABLE `Usuario` MODIFY `papel` ENUM('ADMIN','GESTOR','MEMBRO','RESPONSAVEL_UOSCC','RESPONSAVEL_OSC') NOT NULL;
UPDATE `Usuario` SET `papel` = 'RESPONSAVEL_UOSCC' WHERE `papel` IN ('GESTOR','MEMBRO');
ALTER TABLE `Usuario` MODIFY `papel` ENUM('ADMIN','RESPONSAVEL_UOSCC','RESPONSAVEL_OSC') NOT NULL;
ALTER TABLE `Organizacao` ADD COLUMN `ativa` BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE `Projeto` ADD COLUMN `tipo` ENUM('GERAL','ESPECIFICO') NOT NULL DEFAULT 'ESPECIFICO',
 ADD COLUMN `todasOscs` BOOLEAN NOT NULL DEFAULT false, MODIFY `organizacaoId` INTEGER NULL;
CREATE TABLE `_ParticipantesProjeto` (
 `A` INTEGER NOT NULL, `B` INTEGER NOT NULL,
 UNIQUE INDEX `_ParticipantesProjeto_AB_unique` (`A`,`B`),
 INDEX `_ParticipantesProjeto_B_index` (`B`),
 CONSTRAINT `_ParticipantesProjeto_A_fkey` FOREIGN KEY (`A`) REFERENCES `Organizacao` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT `_ParticipantesProjeto_B_fkey` FOREIGN KEY (`B`) REFERENCES `Projeto` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
