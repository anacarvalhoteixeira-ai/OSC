-- CreateTable
CREATE TABLE `Usuario` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(120) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `papel` ENUM('ADMIN', 'GESTOR', 'MEMBRO', 'RESPONSAVEL_OSC') NOT NULL,
    `telefone` VARCHAR(20) NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT true,
    `organizacaoId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Usuario_email_key`(`email`),
    INDEX `Usuario_organizacaoId_idx`(`organizacaoId`),
    INDEX `Usuario_papel_idx`(`papel`),
    INDEX `Usuario_ativo_idx`(`ativo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organizacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(180) NOT NULL,
    `sigla` VARCHAR(30) NULL,
    `cnpj` VARCHAR(18) NULL,
    `email` VARCHAR(191) NULL,
    `telefone` VARCHAR(20) NULL,
    `endereco` VARCHAR(255) NULL,
    `descricao` TEXT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Organizacao_cnpj_key`(`cnpj`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Projeto` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(180) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('PLANEJAMENTO', 'EM_ANDAMENTO', 'CONCLUIDO', 'PAUSADO') NOT NULL DEFAULT 'PLANEJAMENTO',
    `dataInicio` DATETIME(3) NULL,
    `dataFim` DATETIME(3) NULL,
    `organizacaoId` INTEGER NOT NULL,
    `criadorId` INTEGER NOT NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Projeto_organizacaoId_idx`(`organizacaoId`),
    INDEX `Projeto_criadorId_idx`(`criadorId`),
    INDEX `Projeto_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Acao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(180) NOT NULL,
    `descricao` TEXT NULL,
    `status` ENUM('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',
    `dataInicio` DATETIME(3) NULL,
    `dataFim` DATETIME(3) NULL,
    `projetoId` INTEGER NOT NULL,
    `responsavelId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Acao_projetoId_idx`(`projetoId`),
    INDEX `Acao_responsavelId_idx`(`responsavelId`),
    INDEX `Acao_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Demanda` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `titulo` VARCHAR(180) NOT NULL,
    `descricao` TEXT NOT NULL,
    `status` ENUM('ABERTA', 'EM_ANALISE', 'ATENDIDA', 'RECUSADA') NOT NULL DEFAULT 'ABERTA',
    `organizacaoId` INTEGER NULL,
    `solicitanteId` INTEGER NOT NULL,
    `responsavelId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizadoEm` DATETIME(3) NOT NULL,

    INDEX `Demanda_organizacaoId_idx`(`organizacaoId`),
    INDEX `Demanda_solicitanteId_idx`(`solicitanteId`),
    INDEX `Demanda_responsavelId_idx`(`responsavelId`),
    INDEX `Demanda_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RegistroAtendimento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `quantidade` INTEGER NOT NULL,
    `descricao` VARCHAR(255) NULL,
    `data` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `periodoInicio` DATETIME(3) NULL,
    `periodoFim` DATETIME(3) NULL,
    `organizacaoId` INTEGER NOT NULL,
    `projetoId` INTEGER NULL,
    `criadoEm` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `RegistroAtendimento_organizacaoId_idx`(`organizacaoId`),
    INDEX `RegistroAtendimento_projetoId_idx`(`projetoId`),
    INDEX `RegistroAtendimento_data_idx`(`data`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Usuario` ADD CONSTRAINT `Usuario_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Projeto` ADD CONSTRAINT `Projeto_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Projeto` ADD CONSTRAINT `Projeto_criadorId_fkey` FOREIGN KEY (`criadorId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Acao` ADD CONSTRAINT `Acao_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `Projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Acao` ADD CONSTRAINT `Acao_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Demanda` ADD CONSTRAINT `Demanda_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Demanda` ADD CONSTRAINT `Demanda_solicitanteId_fkey` FOREIGN KEY (`solicitanteId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Demanda` ADD CONSTRAINT `Demanda_responsavelId_fkey` FOREIGN KEY (`responsavelId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroAtendimento` ADD CONSTRAINT `RegistroAtendimento_organizacaoId_fkey` FOREIGN KEY (`organizacaoId`) REFERENCES `Organizacao`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RegistroAtendimento` ADD CONSTRAINT `RegistroAtendimento_projetoId_fkey` FOREIGN KEY (`projetoId`) REFERENCES `Projeto`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
