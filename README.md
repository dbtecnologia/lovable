# Botzap

Central de atendimento WhatsApp multiempresa com automação, fila humana e conexão por Baileys. O projeto começa com um MVP navegável e uma base de produção separada em três processos: Next.js, API Node/TypeScript e worker persistente de WhatsApp.

## O que já está no MVP

- Inbox em três colunas, busca, filtros, status de conversa, etiquetas, setor, responsável, notas internas, respostas rápidas, assumir/finalizar e simulação de mensagem.
- Modal de pareamento por QR Code e indicação explícita do modo simulador.
- API com login, escopo por `companyId`, bloqueio de corrida para assumir conversa, deduplicação por `(connectionId, providerId)`, bot sem IA paga e WebSocket de eventos.
- Prisma/PostgreSQL com empresas, usuários, setores, contatos, conversas, mensagens, notas, eventos, configuração do bot e sessões de conexão.
- Worker Baileys persistente fora de serverless, com `creds.update`, backoff progressivo, tratamento de logout/sessão inválida, lock por conexão, filtro de grupos/status/próprias mensagens e volume persistente.

## Rodar localmente

Requer Node.js 20 ou superior (a documentação atual do Baileys exige Node 20+).

```bash
cp .env.example .env
npm install
docker compose up -d postgres
npx prisma migrate dev --name init
npm run dev
```

Abra `http://localhost:3000`. O frontend possui dados demonstrativos para que a operação possa ser avaliada sem parear um número real. O worker só conecta conexões criadas no banco e mantém os arquivos de sessão no volume configurado por `SESSION_ROOT`.

## Supabase + Vercel + GitHub

O projeto está preparado para usar o projeto Supabase `qikqeooekngjrhwajwut` (região `sa-east-1`). O Next.js já possui Supabase SSR/Auth com `@supabase/ssr`; coloque a URL e a chave publicável em `.env.local`. Nunca coloque `service_role` em `NEXT_PUBLIC_*`.

No Vercel, crie o projeto com Root Directory `apps/web`, conecte-o ao repositório GitHub e cadastre as variáveis `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_WS_URL`. A Vercel deve hospedar somente o frontend; o API e o worker Baileys ficam em VPS/Docker.

O workflow `.github/workflows/quality.yml` roda build do Next.js e testes da API em cada push/PR. Para conectar o repositório correto, use o GitHub `dbtecnologia` e escolha o destino antes do primeiro push.

Para o stack completo:

```bash
docker compose up --build
```

## Pareamento e operação

1. Crie uma conexão para a empresa pela API ou pelo painel.
2. O worker cria um processo lógico único para a conexão e atualiza `QR_PENDING`, `CONNECTED`, `RECONNECTING` e `DISCONNECTED`.
3. O QR deve ser entregue ao painel por um canal autenticado; o worker nunca grava credenciais no navegador nem em logs.
4. Em reinício, o volume `botzap-sessions` restaura a sessão. Em logout ou `badSession`, a sessão deve ser removida e um novo pareamento solicitado.

O `useMultiFileAuthState` é usado como adaptador inicial de persistência no worker, em diretório privado com permissão `0700`. Para produção com vários nós, substitua o adaptador por armazenamento criptografado em PostgreSQL/KMS e mantenha o lock distribuído por conexão.

## Segurança e isolamento

- Todas as consultas de domínio recebem `companyId` e os endpoints verificam o usuário antes de acessar dados.
- O worker usa uma chave interna separada (`WORKER_SECRET`) para publicar eventos.
- Credenciais de sessão não são retornadas por endpoints públicos.
- Troque `JWT_SECRET`, `WORKER_SECRET` e `ENCRYPTION_KEY` antes de qualquer implantação.
- O exemplo de login deixa o ponto de integração claro; em produção, use Argon2id para comparar `passwordHash`, rate limit e auditoria de login.

## Backup

```bash
docker compose exec postgres pg_dump -U botzap -d botzap > backup.sql
docker compose exec postgres psql -U botzap -d botzap < backup.sql
```

Faça backup do banco e do volume de sessões juntos. Restaurar somente o banco ou somente o volume pode invalidar o pareamento.

## Testes

```bash
npm test
```

Os testes iniciais cobrem isolamento entre empresas, transferência para humano e fallback do bot. A matriz de evolução recomendada inclui também replay do mesmo `providerId`, concorrência de claim, retomada após restart e fluxo de QR em um número de teste.

## Referência Baileys

A integração segue o quickstart e README oficiais do WhiskeySockets: `makeWASocket`, `connection.update`, `creds.update`, `DisconnectReason`, `useMultiFileAuthState` e `markOnlineOnConnect: false`. Baileys é uma biblioteca não oficial; valide os termos de uso do WhatsApp antes de operar em produção.
