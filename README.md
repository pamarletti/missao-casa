# Missão Casa

App web para a família marcar e confirmar tarefas domésticas remuneradas,
com sincronização em tempo real entre dispositivos (resolve o problema do
Artifact antigo, que travava numa versão fixa quando compartilhado por link
público).

## Stack

- Next.js 14 (App Router) + Tailwind
- Supabase: Postgres + Auth + Realtime, com Row Level Security isolando os
  dados de cada família (multi-tenant de verdade, pronto para outras
  famílias além da sua)
- Deploy: Vercel

## Passo a passo para colocar no ar

### 1. Banco de dados (Supabase)

1. Em supabase.com, crie um projeto novo.
2. Vá em **SQL Editor**, cole o conteúdo de `supabase/schema.sql` e rode.
3. Faça o mesmo com `supabase/seed_catalog_function.sql` (é a função que
   preenche o catálogo padrão de tarefas — baseado no `lista-de-tarefas.md`
   — para cada família nova).
4. Em **Authentication → Providers**, confirme que "Email" está ativado. Em
   **Authentication → Settings**, por enquanto pode desligar a confirmação
   por e-mail ("Confirm email") para testar mais rápido — é só religar
   depois se quiser esse passo extra de segurança.
5. Em **Project Settings → API**, copie a "Project URL", a chave
   `anon public` e a chave `service_role`.

### 2. Código (GitHub)

1. Crie um repositório novo (vazio) no GitHub, ex.: `missao-casa`.
2. Suba os arquivos deste projeto para lá (pelo `git`, ou arrastando a pasta
   na própria interface do GitHub, em "Add file → Upload files").

### 3. Publicar (Vercel)

1. Em vercel.com, clique em "Add New… → Project" e importe o repositório do
   GitHub que você acabou de criar.
2. Em "Environment Variables", adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `PROFILE_COOKIE_SECRET` (qualquer texto longo aleatório)
3. Clique em Deploy. Em alguns minutos você tem uma URL pública
   (`algumacoisa.vercel.app`) que funciona em qualquer celular ou
   computador, sem o problema de versão travada do Artifact.

### 4. Primeiro uso

1. Abra a URL publicada, clique em "Criar conta da família" e cadastre o
   e-mail/senha que a família vai compartilhar.
2. Na tela seguinte, cadastre os responsáveis (com PIN de 4 dígitos) e as
   crianças (sem senha).
3. Pronto — cada pessoa da família abre a mesma URL e escolhe o próprio
   perfil.

## O que já funciona (v1)

- Cadastro da família e dos perfis (responsáveis com PIN, crianças sem).
- Catálogo de tarefas (individual / individual-coletiva / coletiva) já
  semeado com os valores calibrados em `lista-de-tarefas.md`.
- Criança marca "Feito" (individual) ou "Quero fazer" (coletiva, precisa de
  liberação antes).
- Fila de confirmação dos responsáveis, **atualizando sozinha em tempo real**
  em qualquer dispositivo (via Supabase Realtime) — este é o problema que
  motivou a reconstrução.
- Saldo confirmado do mês por criança.

## O que ainda falta (próxima rodada, de propósito fora do escopo desta v1)

- Desconto automático por tarefa diária não feita até o fim do dia (hoje só
  existe a decisão manual "Não feito" pelo responsável).
- Painel de revisão com histórico completo, filtros e edição em lote.
- Fechamento mensal ("Fechar e pagar") com histórico de fechamentos.
- Tela de "Editar valores" do catálogo pelos responsáveis.
- Cobrança/assinatura (Stripe/Pix), política de privacidade e consentimento
  LGPD para dados de criança — necessários antes de vender para outras
  famílias, não antes de usar na sua.
