# Módulo de demandas

O módulo anterior já tinha controller, model, rotas, formulários, categorias e os
quatro status. Essas estruturas foram reaproveitadas; não foram instaladas novas
bibliotecas nem alteradas as regras de usuários, OSCs ou projetos.

## Perfis

| Ação | ADMIN | RESPONSAVEL_UOSCC | RESPONSAVEL_OSC |
| --- | --- | --- | --- |
| Listar e consultar detalhes | Todas | Todas | Somente da própria OSC |
| Criar | Não | Não | Somente para sua OSC |
| Editar título/descrição/categoria/prazo | Não | Não | Somente enquanto ABERTA |
| Responder, observar, alterar status | Não | Sim | Não |
| Consultar histórico | Todas | Todas | Somente da própria OSC |
| Excluir | Não | Não | Não |

As permissões são verificadas nas rotas e no backend, usando o usuário autenticado
consultado do banco. IDs enviados pela URL não concedem acesso a outra OSC. Os
filtros não ampliam o escopo de um responsável de OSC. A listagem inclui demandas
abertas, em análise, atendidas e recusadas, sem esconder registros finalizados.

## API

- `GET /api/demandas`: consulta com `busca`, `status`, `categoria`, `organizacaoId`, `de` e `ate`.
- `GET /api/demandas/:id`: detalhes e histórico, após validar vínculo e perfil.
- `POST /api/demandas`: exclusivo da OSC; aceita título, descrição, categoria e prazo opcional. Organização, solicitante, data e status ABERTA são definidos pelo servidor.
- `PUT` ou `PATCH /api/demandas/:id`: a OSC envia `versao` e campos editáveis; a UOSCC envia `versao`, status, resposta e/ou observação. O servidor rejeita outros campos.
- `DELETE /api/demandas/:id`: retorna 403 para todos os perfis.

Título e descrição exigem ao menos três caracteres. A categoria padrão é OUTROS.
Os filtros de data usam `AAAA-MM-DD` e dias UTC de criação, incluindo o dia final.
Datas inexistentes, intervalos invertidos e enumerações inválidas são rejeitados.

Cada atualização exige a versão recebida nos detalhes e incrementa `versao` no banco.
Se outra pessoa já atualizou a demanda, a API retorna 409 e o frontend orienta a
reabrir os detalhes, preservando o texto não enviado. A comparação, gravação e
inserção no histórico são atômicas. Uma edição da OSC não é permitida se o status
deixar de ser ABERTA durante a operação.

O histórico registra data automática, usuário, tipo de operação, status anterior,
novo status, resposta e observação. Respostas e observações são visíveis à OSC e não
são notas privadas. Data de conclusão é automática ao mudar para ATENDIDA; sair
desse status limpa a data corrente, preservando a transição no histórico.

## Banco e preservação

Migração aplicada: `20261023210000_historico_demandas`.

- Acrescenta `Demanda.versao`, inicialmente zero.
- Cria `DemandaHistorico` relacionado à demanda e ao usuário, com índices e chaves estrangeiras que preservam os registros.
- Mantém os modelos e relacionamentos existentes, inclusive campos legados como `resultado`, `prazo` e demandas sem OSC.
- Respostas anteriores em `resultado` continuam visíveis nos detalhes. Novas respostas são acrescentadas ao histórico e não sobrescrevem esse campo legado.
- Histórico passa a ser registrado a partir desta atualização; eventos passados não foram inventados ou atribuídos a autores desconhecidos.

A comparação Prisma entre banco local e schema retornou migração vazia.

## Interface

O menu e o atalho de demandas foram reativados. As telas existentes usam as mesmas
cores, campos, botões e cartões do painel. A listagem inclui título, organização
quando autorizada, categoria, data e status. Ações seguem o perfil. Há estados de
carregamento, vazio, erro e repetição da consulta. Filtros de OSC incluem registros
de organizações inativas para consulta histórica pela rede.

O formulário da OSC não permite escolher outro vínculo ou status. A tela de
acompanhamento mostra respostas e histórico, além do formulário de atendimento
apenas para UOSCC. A versão de edição é mantida entre carregamento e envio. Respostas
atrasadas de consultas anteriores não substituem a consulta ou edição mais recente.

## Arquivos desta entrega

- `server.js`
- `src/controllers/demanda.controller.js`
- `src/models/demanda.model.js`
- `src/routes/demanda.routes.js`
- `src/utils/demanda.js`
- `prisma/schema.prisma`
- `prisma/migrations/20261023210000_historico_demandas/migration.sql`
- `assets/demandas.js`, `script.js`, `inicio.css`
- `public/inicio/index.html`
- `public/inicio/telas/inicio/index.html`
- `public/inicio/telas/demandas/index.html`
- `public/inicio/telas/cadastro-demanda/index.html`
- `tests/demanda.test.js`, `tests/demandas.integration.js`
- `tests/permissoes.integration.js` (a expectativa anterior de módulo desativado passa a esperar consulta autorizada)
- `package.json`, `README.md`, `docs/DEMANDAS.md`

As demais alterações já presentes no workspace foram preservadas.

## Testes e execução

- `npm test`: regras de demandas e regressão da matriz de permissões.
- `npm run test:integration`: 13 testes aprovados nas duas suítes; criação/validação, escopo por OSC, filtros, preservação de legados, restrições por perfil, ausência de exclusão, respostas, observações, transições e conflitos concorrentes. As verificações de OSCs, usuários e projetos também passaram.
- `npm run build`: geração de produção.
- `prisma validate`: schema válido.
- `prisma migrate diff`: banco consistente com o schema.
- `git diff --check`: sem erros de espaços.
- Chrome headless com dados simulados: três perfis, responsividade em 390 px, listagem, vazio/erro, detalhes, cadastro/edição OSC, resposta UOSCC e orientação em conflito de versão, sem exceções JavaScript.

Os testes de integração criam seus próprios registros e removem somente seus IDs
na limpeza. Nenhum cadastro real foi usado como fixture.

Não há pendência funcional conhecida no escopo solicitado. Para carregar o código
novo, reinicie a API e atualize o navegador. Em outro ambiente, execute a migração e
regenere o Prisma Client antes de iniciar a API. A automação de e-mail/notificações
não faz parte deste módulo.
