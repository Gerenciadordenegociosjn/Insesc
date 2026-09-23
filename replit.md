# INCESC — Doe e Transforme Vidas

Uma página de doações do INCESC que apresenta sua missão, áreas de impacto e seleção de valor; o pagamento ainda não está conectado.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

- O portal administrativo usa contas locais (usuário, senha e TOTP compatível com Google Authenticator), sem Clerk. A primeira conta só pode ser criada manualmente para operador cuja identidade o instituto verificou; veja `artifacts/api-server/STAFF_BOOTSTRAP.md`. Não há cadastro público de equipe nem senha padrão.
- Sem contas de doadores, “Minha jornada” não oferece histórico individual. Não vincular doações públicas a contas administrativas nem apresentar histórico fictício.

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

- A comunicação visual deve seguir a marca oficial em https://www.incesc.org.br/ e usar a logo fornecida, sem recoloração ou distorção.
- Fotos de projetos, relatos, resultados e dados de arrecadação só podem aparecer como fatos quando validados pelo INCESC; não usar imagens geradas como evidência de ações reais.
- O cabeçalho deve mostrar apenas a logo e os acessos “Portal da transparência” e “Minha jornada”, com os acessos agrupados à direita no desktop e legíveis no celular; “Doe agora” pertence ao corpo da página, não ao topo.

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
