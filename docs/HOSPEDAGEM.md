# Hospedagem

A aplicação entrega frontend e API no mesmo domínio. É necessário um serviço
Node.js 22.18+ (linha 22) ou 24, um banco MySQL/MariaDB persistente e HTTPS
no proxy da hospedagem. A raiz redireciona para `/login.html`.

## Configuração

Cadastre no painel de variáveis da hospedagem, sem versionar segredos:

```dotenv
NODE_ENV=production
DATABASE_URL=mysql://usuario:senha@host:3306/banco
JWT_SECRET=uma-chave-aleatoria-de-pelo-menos-32-bytes
PORT=3000
```

Gere a chave com `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`.
Codifique caracteres especiais do usuário e da senha na URL. O banco precisa
permitir conexão a partir da aplicação. Configure HTTPS no domínio público.
`PORT` pode ser fornecida automaticamente pelo provedor.

`FRONTEND_ORIGIN` é opcional no mesmo domínio; para desenvolvimento separado,
o padrão é `http://localhost:5173`. Em produção, se preenchida, informe a origem
HTTPS sem barra final. Isso configura CORS; não altera as URLs `/api` do frontend.

Se houver proxy reverso, configure `TRUST_PROXY` com os IPs/CIDRs confiáveis do
provedor. Sem isso, o limite de autenticação pode agrupar usuários pelo IP do
proxy. Não use confiança irrestrita: o cabeçalho de origem deve ser sobrescrito
pelo proxy. O limite atual fica na memória de cada processo; em múltiplas réplicas,
configure também limitação compartilhada no proxy.

## Implantação com Node

```bash
npm ci --include=dev
npm run build
npm run db:validate
npm run db:deploy
npm start
```

Configure `npm ci --include=dev && npm run build` como comando de build,
`npm run db:deploy` como etapa de release e `npm start` como inicialização.
O build gera o Prisma Client e `dist`; não modifica o banco. A CLI Prisma está
nas dependências de desenvolvimento, necessárias nas etapas de build e release.
Migrations devem rodar uma vez por implantação, antes de iniciar as réplicas.
Faça backup do banco antes de aplicar migrations em uma instalação existente.

Na primeira implantação, execute separadamente `npm run criar-admin`, fornecendo
`ADMIN_EMAIL`, `ADMIN_SENHA` e `ADMIN_NOME` apenas nesse comando. Se a conta já
existir, esse comando redefine senha e perfil. Não o execute automaticamente a
cada inicialização.

## Docker

```bash
docker build -t uoscc .
docker run --rm --env-file .env.production uoscc npm run db:deploy
docker run -d --name uoscc --restart unless-stopped --env-file .env.production -p 127.0.0.1:3000:3000 uoscc
```

Crie `.env.production` com as variáveis acima e use um banco externo/persistente.
Nesse arquivo, `localhost` aponta para o próprio contêiner; use o endereço real
do banco. O Docker não copia arquivos `.env`, credenciais ou diretórios locais
de trabalho. O processo roda como usuário sem privilégios. A imagem mantém a
CLI Prisma para permitir os comandos de release e criação do administrador.
Coloque um proxy HTTPS na frente da porta local 3000.

## Verificação

Confira `/login.html`, `/cadastro.html` e `/inicio/index.html`, depois login e
operações dos três perfis em homologação. `/api/health` verifica se o processo
responde; `/api/ready` retorna 503 se o banco estiver indisponível. Configure o
monitoramento de prontidão em `/api/ready`.

Após o build, execute `npm run test:hosting` para conferir páginas, arquivos
compilados, API e bloqueio de tentativas sem acessar o banco.
Execute `npm test` e `npm run test:integration` antes de liberar. Os testes de
integração criam e removem registros: use um banco exclusivo de testes e uma
`JWT_SECRET` de testes. Mantenha backups automáticos e valide a restauração.
