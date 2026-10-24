# Sistema de Gestão UOSCC

Aplicação Express, Prisma 7/MySQL e frontend HTML/CSS/JavaScript com Vite.

O sistema usa três perfis. As permissões são verificadas na API com o usuário
atual do banco; alterar o conteúdo do JWT ou do armazenamento do navegador não
muda o acesso.

| Ação | ADMIN | RESPONSAVEL_UOSCC | RESPONSAVEL_OSC |
| --- | --- | --- | --- |
| Consultar OSCs e fichas | Todas, inclusive histórico | Todas, inclusive histórico | Apenas a própria |
| Editar OSC | Não | OSCs ativas | Campos permitidos da própria |
| Desativar OSC | Não | Sim, preservando histórico | Não |
| Consultar projetos | Todos | Todos | Gerais e específicos da própria OSC |
| Criar/editar projeto geral | Não | Sim | Não |
| Criar/editar projeto específico | Não | Não | Apenas da própria OSC |
| Excluir projeto geral | Não | Sim, sem registros dependentes | Não |
| Gerenciar usuários e permissões | Sim | Não | Não |
| Aprovar/recusar solicitações | Não | Sim | Não |
| Relatórios gerais | Não | Sim | Não |
| Consultar demandas | Todas | Todas | Apenas da própria OSC |
| Criar/editar demandas | Não | Não | Criar para a própria OSC; editar somente ABERTA |
| Responder/alterar status de demandas | Não | Sim, com histórico | Não |
| Excluir demandas | Não | Não | Não |

## Execução

Configure `.env` com `DATABASE_URL`, `JWT_SECRET` e, opcionalmente, `PORT` e
`FRONTEND_ORIGIN`. Não versione credenciais.

```bash
npm install
npx prisma migrate deploy --config prisma7.config.ts
npx prisma generate --config prisma7.config.ts
npm start
```

Em outro terminal: `npm run dev`. Acesse `/login.html`. Para gerar os arquivos de
produção: `npm run build`. Reinicie a API ao atualizar schema ou permissões.

O primeiro administrador pode ser criado pelo comando existente `npm run criar-admin`,
com `ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` definidos no ambiente. Esse comando
redefine a senha se a conta já existir. Os demais usuários são gerenciados pelo
ADMIN em **Início → Pessoas e permissões**: criação, perfil, vínculo, edição,
redefinição de senha e ativação/desativação. O ADMIN não pode mudar seu próprio
perfil, vínculo ou estado, e o último administrador ativo não pode ser removido.

## Cadastro e solicitação

O formulário existente mantém as opções de vínculo e nova OSC. Nenhum desses
pedidos libera acesso automaticamente. A UOSCC analisa as solicitações na tela
inicial. A aprovação cria a conta RESPONSAVEL_OSC vinculada e, quando necessário,
a organização. A análise é protegida contra aprovação concorrente. Hashes de senha
não são enviados na listagem nem na resposta de aprovação.

No login, após verificar a senha enviada, solicitações pendentes e recusadas exibem
sua situação e, na recusa, o motivo. A busca pública expõe somente dados necessários
à identificação da OSC e lista apenas organizações ativas.

## Projetos e histórico

Projetos específicos permanecem vinculados a uma única OSC. Projetos gerais usam o
modelo Projeto existente, com tipo `GERAL`, vínculo opcional e participantes em uma
relação entre projetos e organizações; `todasOscs` inclui todas as organizações da
rede. O tipo e a organização de um projeto existente não podem ser transferidos.

Uma OSC excluída na interface recebe `ativa=false`. Seus usuários perdem acesso,
inclusive em sessões já abertas; projetos, solicitações e atendimentos permanecem
no banco. ADMIN e UOSCC podem consultar OSCs inativas pelo filtro de situação.
Relatórios anuais mantêm as OSCs inativas no histórico. Projetos específicos de OSCs
inativas ficam disponíveis para consulta pela rede, sem edição.

A migração `20261023200000_perfis_projetos_e_oscs_ativas` converte `GESTOR` e
`MEMBRO` para `RESPONSAVEL_UOSCC`, preserva vínculos e mantém os projetos anteriores
como `ESPECIFICO`. Acrescenta `Organizacao.ativa`, `Projeto.tipo`, `Projeto.todasOscs`
e a tabela de participantes, tornando `Projeto.organizacaoId` opcional. O campo
legado `Usuario.dono` foi preservado sem efeito sobre permissões; a regra anterior
de donos/equipes foi substituída pela matriz de três perfis.

## Demandas

O módulo existente foi integrado com cadastro pela OSC, consulta para os três
perfis e atendimento exclusivo da UOSCC. A listagem reúne os quatro status e
filtros de pesquisa, OSC, categoria e data. Respostas, observações e transições de
status ficam no histórico, visível à OSC correspondente. Não há exclusão.

A migração `20261023210000_historico_demandas` acrescenta a tabela
`DemandaHistorico` e `Demanda.versao`. Os registros anteriores e suas respostas
permanecem preservados; histórico anterior não é inventado. Toda atualização usa
`versao` e grava dados/histórico na mesma transação, retornando 409 em conflitos.
Os filtros `de` e `ate` usam dias UTC de criação, incluindo o dia final.

Detalhes de arquivos, API e validação em [docs/DEMANDAS.md](docs/DEMANDAS.md).

## Verificação

```bash
npm test
npm run test:integration
npm run build
npx prisma validate --config prisma7.config.ts
```

Os testes unitários verificam a matriz de permissões. Os testes de integração
precisam do MySQL configurado e da permissão para abrir uma porta local temporária.
Criam usuários, organizações, solicitações e projetos identificados como teste,
validam as rotas reais e removem apenas os IDs criados durante sua execução.
Cobrem manipulação de IDs, limites por perfil, cadastro, aprovação concorrente,
pendência/recusa, proteção de senhas e preservação de histórico na exclusão lógica.

A interface também foi conferida no Chrome headless com dados simulados: login,
cadastro móvel e painel de cada perfil, consulta/criação de projetos e ausência de
rolagem horizontal em 390 px.

A recuperação de senha por e-mail não faz parte desta entrega: o componente atual
orienta a procurar o administrador, que pode redefinir a senha no painel.
