# UOSCC - Sistema de Gestão de OSCs

Este repositório foi criado para documentar e preservar a solução original do projeto `anacarvalhoteixeira-ai/OSC`, que consiste em um painel administrativo para gestão de Organizações da Sociedade Civil (OSCs) na região de Camaçari.

## Visão geral

O sistema foi desenvolvido como uma aplicação web simples, com foco em centralizar e organizar dados relacionados a:

- OSCs cadastradas
- Projetos executados ou em andamento
- Demandas solicitadas
- Relatórios e indicadores gerais da rede

A interface oferece um painel inicial com cards de indicadores, navegação lateral e diversas páginas internas para cadastro e consulta de informações.

## Repositório original

- Repositório fonte: https://github.com/anacarvalhoteixeira-ai/OSC

## Stack tecnológica

Com base na análise do projeto original, a composição tecnológica é:

- HTML
- CSS
- JavaScript
- Vite
- Tailwind CSS

A arquitetura é estática e client-side, sem banco de dados e sem backend, utilizando armazenamento local em memória via JavaScript no navegador.

## Funcionalidades principais

### 1. Dashboard inicial
- Visão geral da rede
- Cards de indicadores:
  - pessoas atendidas
  - OSCs na rede
  - demandas abertas
- Acesso rápido para as principais áreas do sistema

### 2. Cadastro de OSCs
Permite registrar organizações com informações como:
- nome
- CNPJ
- categoria
- endereço
- bairro
- responsável
- telefone
- e-mail
- descrição

### 3. Gestão de projetos
Cada projeto está associado a uma OSC e pode conter:
- título
- responsável
- telefone
- e-mail
- status
- datas de início/fim
- quantidade de pessoas atendidas
- orçamento
- descrição, objetivos e resultados

### 4. Gestão de demandas
A plataforma também administra demandas, sendo possível:
- cadastrar demandas por OSC
- categorizar por tipo
- acompanhar status
- visualizar pendências e itens em andamento

### 5. Relatórios
A interface contempla uma seção de relatórios para consolidar os dados e facilitar a análise da rede e dos impactos das OSCs.

## Estrutura do projeto

O projeto original apresenta a seguinte estrutura básica:

```text
OSC/
├── index.html
├── style.css
├── script.js
├── package.json
├── package-lock.json
├── vite.config.js
├── .gitignore
├── README.md
```

## Como executar localmente

### Pré-requisitos

- Node.js
- npm

### Passos

1. Clone o repositório

```bash
git clone https://github.com/stephanyalmeidamds/OSC.git
cd OSC
```

2. Instale as dependências

```bash
npm install
```

3. Inicie o ambiente de desenvolvimento

```bash
npm run dev
```

4. Acesse localmente a aplicação no navegador, geralmente em:

```text
http://localhost:5173
```

## Build de produção

Para gerar a versão final do projeto:

```bash
npm run build
```

## Observações da solução

- O projeto foi concebido como uma aplicação front-end leve e funcional.
- A navegação entre páginas ocorre no próprio cliente, com renderização dinâmica em JavaScript.
- A lógica de dados é simples e voltada para dashboard administrativo.
- O foco principal está na organização, apresentação e acompanhamento do trabalho realizado pelas OSCs.

## Objetivo do sistema

O painel tem como propósito apoiar a gestão e a visibilidade da atuação de OSCs na rede local, permitindo:

- monitorar iniciativas
- organizar demandas
- controlar dados de projetos
- facilitar relatórios e acompanhamento estratégico

## Status do projeto

Projeto funcional e voltado à gestão administrativa de OSCs, com uma interface moderna e amigável para uso interno.

## Licença

Este repositório foi criado para documentação e preservação do projeto original. A licença do projeto original deve ser confirmada no repositório de origem.

## Contribuição

Se você quiser evoluir este projeto, pode:

- melhorar a documentação
- padronizar a estrutura dos arquivos
- adicionar persistência de dados
- criar backend e banco de dados
- desenvolver autenticação e regras de negócio

## Resumo

Este projeto representa um painel administrativo para a rede de OSCs de Camaçari, com foco em produtividade, organização e transparência da atuação das organizações na comunidade.