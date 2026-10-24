# Entrega: perfis, OSCs, projetos e autenticação

## Implementado

- Três perfis: ADMIN, RESPONSAVEL_UOSCC e RESPONSAVEL_OSC, com autorização na API.
- Gestão de usuários pelo ADMIN: criação, edição, perfil, vínculo autorizado, redefinição de senha e estado de acesso; proteção do próprio perfil e do último ADMIN ativo.
- UOSCC edita/desativa OSCs, analisa solicitações e cria/edita/exclui projetos gerais, respeitando registros dependentes.
- Responsáveis de OSC consultam/editam somente a própria ficha e criam/editam somente projetos específicos vinculados à sua OSC.
- Projetos gerais visíveis para as OSCs, com seleção de participantes ou abrangência de toda a rede.
- Consultas e filtros mantidos, com filtros adicionais de situação da OSC e tipo de projeto.
- Exclusão lógica de OSCs, bloqueio dos usuários vinculados e preservação dos históricos.
- Cadastro existente reaproveitado, com pendência/recusa explicadas após conferir a senha no login e aprovação protegida contra concorrência.
- Login/cadastro com visual mais acolhedor, mantendo azul/laranja, formulários, navegação e responsividade.
- Demandas preservadas para o grupo responsável, sem exposição neste fluxo e sem dependência nas telas/relatórios refatorados.

## Arquivos alterados nesta refatoração

Interface e navegação:

- `login.html`, `cadastro.html`
- `assets/login.css`, `assets/cadastro.css`, `assets/equipe.js`
- `inicio.css`, `script.js`
- `public/inicio/index.html`
- `public/inicio/telas/inicio/index.html`
- `public/inicio/telas/oscs/index.html`
- `public/inicio/telas/ficha-osc/index.html`
- `public/inicio/telas/projetos/index.html`
- `public/inicio/telas/cadastro-projeto/index.html`

API e permissões:

- `server.js`, `src/utils/permissoes.js`, `src/middlewares/auth.middleware.js`
- `src/controllers/auth.controller.js`
- `src/controllers/acesso.controller.js`, `src/controllers/equipe.controller.js`
- `src/controllers/organizacao.controller.js`, `src/controllers/projeto.controller.js`
- `src/controllers/atendimento.controller.js`, `src/controllers/relatorio.controller.js`
- `src/models/usuario.model.js`, `src/models/organizacao.model.js`
- `src/models/projeto.model.js`, `src/models/atendimento.model.js`, `src/models/painel.model.js`
- `src/routes/acesso.routes.js`, `src/routes/organizacao.routes.js`
- `src/routes/projeto.routes.js`, `src/routes/atendimento.routes.js`
- `src/routes/relatorio.routes.js`, `src/routes/painel.routes.js`

Banco, execução, testes e documentação:

- `prisma/schema.prisma`
- `prisma/migrations/20261023200000_perfis_projetos_e_oscs_ativas/migration.sql`
- `scripts/criar-admin.js`, `package.json`
- `tests/equipe.test.js`, `tests/permissoes.integration.js`
- `README.md`, `docs/REFATORACAO.md`

Removidos `scripts/definir-dono.js` e `src/utils/equipe.js`, introduzidos na etapa
anterior e substituídos pela regra explícita de três perfis do anexo. Alterações
anteriores já presentes em outros arquivos foram preservadas.

## Banco

Migração aplicada no MySQL local e Prisma Client regenerado. Os papéis GESTOR e
MEMBRO foram convertidos para RESPONSAVEL_UOSCC. OSCs ganharam o estado `ativa`;
projetos ganharam tipo, abrangência e relação de participantes. Projetos anteriores
permaneceram específicos, vinculados à OSC original. Nenhum cadastro existente foi
apagado. O campo legado `dono` permanece no banco, sem conceder permissões.

A comparação do banco com o schema final retornou migração vazia, sem divergências.

## Validação

- `npm test`: matriz de permissões aprovada.
- `npm run test:integration`: sete testes aprovados, incluindo a suíte e seis cenários com rotas reais/MySQL. As verificações abrangem criação de usuários, proteção de dados operacionais, IDs de outras OSCs, projetos gerais/específicos, login pendente/recusado, aprovação concorrente, ausência de hashes nas respostas e desativação sem apagar histórico.
- `npm run build`: compilação de produção aprovada.
- `prisma validate`: schema válido.
- `prisma migrate diff`: banco e schema consistentes.
- `git diff --check`: sem erros de espaços.
- Chrome headless: login, cadastro em 390 px e painel dos três perfis verificados com respostas simuladas; consulta e criação de projetos funcionam, botões obedecem às permissões e não houve exceções JavaScript nem rolagem horizontal nas telas verificadas.

Os registros de teste foram removidos por seus IDs ao finalizar cada execução.

## Pendências e limites

- Reiniciar a API se houver um processo antigo ainda em execução e atualizar o navegador.
- Recuperação automática de senha por e-mail não foi adicionada; o ADMIN pode redefini-la na gestão de acessos.
- O e-mail `saulo01020201@gmail.com`, citado na etapa anterior, não tinha conta no banco. Esta refatoração não inventou senha nem criou uma conta com esse e-mail.
- Demandas permanecem a cargo do outro grupo.
