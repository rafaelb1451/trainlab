# TrainLab — Frontend

SPA de treinamento personalizado multiesporte (corrida, ciclismo e natação) construída com
React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router e dnd-kit.

## Rodando

```bash
npm install
npm run dev
```

O app fica em `http://localhost:5173` e o proxy do Vite encaminha `/api` para
`http://localhost:8080`. O backend precisa estar em execução para login e dados.

## Build

```bash
npm run build
```

O comando executa `tsc -b` (TypeScript estrito) e `vite build`.

## Credenciais de demonstração

| Perfil     | E-mail                 | Senha       |
| ---------- | ---------------------- | ----------- |
| Treinador  | `coach@trainlab.app`   | `coach1234` |
| Atleta     | `marina@trainlab.app`  | `atleta1234`|

## Estrutura

```
src/
  api/          cliente axios, tipos do contrato e endpoints
  auth/         AuthProvider (JWT em localStorage)
  components/   layout, componentes de UI e construtor (DnD)
  lib/          formatação, rótulos e métricas do treino
  pages/        Login, Cadastro, Dashboard, Atletas, Treinos, Construtor, Planejamento
```

## Decisões de UI

- Tema azul/amarelo/branco: tokens `brand` (azul), `accent` (amarelo) e `ink` (azul-escuro)
  definidos no `@theme` de `src/index.css`; sidebar `ink-900`, item ativo `accent-400` e
  botão primário `brand-600`.
- Tipografia `system-ui`, cartões arredondados, bordas suaves e sombras discretas.
- Interface 100% em pt-BR, com estados de carregamento, vazio e erro em todas as telas.
- Ficha 360 do atleta com abas Visão geral, Limiares & Zonas, Planejamento e Métricas
  (sono, VFC, FC de repouso, Body Battery, estresse, humor, RPE e peso).
- PWA via `public/manifest.webmanifest` e ícones SVG, sem plugin adicional.
