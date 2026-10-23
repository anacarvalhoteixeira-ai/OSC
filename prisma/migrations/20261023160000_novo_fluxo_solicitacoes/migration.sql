-- CreateTable
CREATE TABLE `SolicitacaoCadastro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('VINCULO_OSC', 'NOVA_OSC') NOT NULL,
    `status` ENUM('PENDENTE', 'APROVADA', 'RECUSADA') NOT NULL DEFAULT 'PENDENTE',
    `nomeUsuario` VARCHAR(120) NOT NULL,
    `emailUsuario` VARCHAR(191) NOT NULL,
    `senhaUsuario` VARCHAR(255) NOT NULL,
    `telefoneUsuario` VARCHAR(20) NULL,
    `organizacaoId` INTEGER NULL,
    `nomeOsc` VARCHAR(180) NULL,
    `cnpj` VARCHAR(18) NULL,
    `categoria` VARCHAR(30) NULL,
    `endereco` VARCHAR(255) NULL,
    `bairro` VARCHAR(120) NULL,
    `telefoneOsc` VARCHAR(20) NULL,
    `emailOsc` VARCHAR(191) NULL,
    `descricaoOsc` TEXT NULL,
    `motivoRecusa` TEXT NULL,
    `analisadoPorId` INTEGER NULL,
    `dataAnalise` DATETIME(3) NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `SolicitacaoCadastro_status_idx`(`status`),
    INDEX `SolicitacaoCadastro_tipo_idx`(`tipo`),
    INDEX `SolicitacaoCadastro_cnpj_idx`(`cnpj`),
    INDEX `SolicitacaoCadastro_emailUsuario_idx`(`emailUsuario`),
    INDEX `SolicitacaoCadastro_organizacaoId_idx`(`organizacaoId`),
    INDEX `SolicitacaoCadastro_analisadoPorId_idx`(`analisadoPorId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SolicitacaoCadastro` ADD CONSTRAINT `SolicitacaoCadastro_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SolicitacaoCadastro` ADD CONSTRAINT `SolicitacaoCadastro_analisadoPorId_fkey` FOREIGN KEY (`analisadoPorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
