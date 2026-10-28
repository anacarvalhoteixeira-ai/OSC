CREATE TABLE `PessoaAtendida` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `nome` VARCHAR(120) NOT NULL,
  `tipo` VARCHAR(20) NOT NULL,
  `dataNascimento` DATE NULL,
  `telefone` VARCHAR(20) NULL,
  `responsavel` VARCHAR(120) NULL,
  `ativo` BOOLEAN NOT NULL DEFAULT true,
  `organizacaoId` INTEGER NOT NULL,
  `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `atualizadoEm` DATETIME(3) NOT NULL,
  INDEX `PessoaAtendida_organizacaoId_ativo_idx` (`organizacaoId`, `ativo`),
  PRIMARY KEY (`id`),
  CONSTRAINT `PessoaAtendida_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
