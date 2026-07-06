# Orchid Git

Uma interface gráfica para Git construída com Electron, React, MUI 6 e Node.js.

## Funcionalidades

- **Grafo de commits** — Visualização SVG com 7 estilos de conexão, 12 ramos coloridos, chips de branch/tag
- **Gerenciamento de branches** — Criar, deletar, trocar, merge (com seleção de estratégia), rebase interativo (pick/reword/squash/fixup/drop com reordenação por arrasto), cherry-pick
- **Stage/Unstage/Commit** — Interface completa para gerenciar mudanças, stage/unstage por arquivo e por hunk, amend
- **Push/Pull/Fetch** — Sincronização remota com configuração automática de upstream, force-with-lease, auto-fetch a cada 5 min
- **Stash** — Push, pop, drop, visualizar alterações, com suporte a mensagem personalizada
- **Tags** — Criar e deletar tags leves e anotadas
- **Diff e Blame** — Diff unified/split com rolagem sincronizada, blame com coloração por autor do commit
- **File Explorer** — Navegação em árvore/plana/compacta com busca/filtro, visualizar/editar com diff ao vivo
- **Conflict Resolver** — Resolvedor interativo de 3 painéis (nosso/deles/ambos por bloco), resolução com um clique, continuar/abortar
- **Métricas** — Gráficos de commits ao longo do tempo, distribuição por autor, top committers, top arquivos, histograma por hora, linhas adicionadas/removidas
- **Pull Request** — Detecção automática de GitHub, GitLab, Bitbucket, Azure DevOps, Gitea e abertura de PR no navegador
- **File History** — Diálogo de histórico de arquivo por commit
- **Discard** — Descartar alterações por arquivo, hunks ou tudo
- **Reset** — Reset soft, mixed ou hard para qualquer commit
- **Gerenciamento .gitignore** — Adicionar/remover entradas via clique direito
- **Tema escuro/claro** — Alternância com persistência em localStorage
- **Atalhos de teclado** — F5 (atualizar), F12 (dev tools), Ctrl+F (buscar commits)
- **Múltiplas abas** — Graph, Changes, Metrics, Files

## Tecnologias

| Camada | Stack |
|---|---|
| Frontend | React 18 + MUI 6 + Emotion + Recharts |
| Desktop | Electron 33 + Electron Forge + Webpack |
| Testes unitários | Jest + Testing Library (96 testes, 11 suites) |
| Testes E2E | Playwright + Jest (46 testes) |
| Git | `spawnSync` via IPC, `git blame --line-porcelain`, `git diff -U0` |

## Estrutura do projeto

```
src/
├── main.js               # Processo principal Electron (~50 IPC handlers)
├── preload.js            # Ponte entre renderer e main (45+ métodos)
├── renderer.js           # Entry point do React
├── app/
│   ├── Orchid.jsx        # Componente raiz (tema, estado global, refresh)
│   ├── OrchidContext.jsx # Contexto React (diretório, tema, dados do repo)
│   └── components/       # Componentes da UI
│       ├── Repository.jsx        # Container de abas (Graph/Changes/Metrics/Files)
│       ├── CommitTable.jsx       # Tabela de commits
│       ├── ChangesPanel.jsx      # Stage/unstage, Diff, Blame, Discard
│       ├── LeftMenu.jsx          # Menu lateral (branches, tags, stash, recentes)
│       ├── AppMenu.jsx           # Barra de ferramentas superior
│       ├── CodeEditor.jsx        # Editor de texto com gutter e highlights
│       ├── DiffViewer.jsx        # Visualização unified/split de diffs
│       ├── BlameViewer.jsx       # Visualizador de blame
│       ├── FileExplorer.jsx      # Explorador árvore/plano/compacto
│       ├── MetricsPanel.jsx      # Gráficos e estatísticas
│       ├── ConflictResolver.jsx  # Interface de resolução de conflitos
│       └── ... (diálogos: Commit, Merge, Rebase, Settings, Clone, etc.)
└── assets/
    └── icon.png           # Ícone da aplicação
```

## Pré-requisitos

- Node.js 18+ (testado no 24.15.0)
- Git 2.30+
- npm 9+ ou yarn

## Instalação

```bash
git clone https://github.com/seu-usuario/orchid-git.git
cd orchid-git
npm install
npm start
```

## Comandos disponíveis

```bash
npm start           # Inicia em modo desenvolvimento (hot reload)
npm test            # Executa testes unitários (96 testes)
npm run test:e2e    # Executa testes end-to-end (46 testes)
npm run package     # Empacota para a plataforma atual
npm run make        # Gera instaladores (Squirrel/Windows, DMG/macOS, DEB/Linux)
```

## Testes

### Testes unitários

```bash
npm test
```

Usa Jest + Testing Library. Testam componentes React, parsers (git status, stash list) e diálogos isoladamente sem Electron.

### Testes E2E

```bash
# Executar tudo (setup + testes)
npm run test:e2e

# Ou passo a passo:
npm run test:e2e:setup                                    # Criar repositório de teste
npx jest --config test/e2e/jest.e2e.config.js --runInBand  # Executar apenas os testes
```

Os testes E2E usam Playwright para controlar a janela Electron:
1. Iniciam um servidor HTTP estático para o bundle webpack (porta 3000)
2. Lançam o Electron
3. Interagem com a UI (cliques, navegação, verificação de conteúdo)
4. Também executam comandos git diretamente para verificar o estado do repositório

## Build

```bash
# Empacota para a plataforma atual
npm run package

# Gera instalador
npm run make
```

Os artefatos são gerados em `out/`:
- Windows: `out/orchid-win32-x64/` (ou .exe com `npm run make`)
- macOS: `out/orchid-darwin-x64/`
- Linux: `out/orchid-linux-x64/`

## Repositório de teste E2E

O script `test/e2e/global-setup.js` cria um repositório Git de teste em `test/test-fixture-repo/` com:

- **9+ commits** com histórico de merges
- **7 branches**: `feature/one`, `feature/two`, `feature/validation`, `feature/api`, `feature/database`, `feature/export`, `feature/conflict-side`
- **5+ tags**: `v0.1.0`, `v1.0.0`, `v1.1.0`, `v2.0.0-rc`
- **3 stashes**
- **4 autores**: Alice Silva, Bob Santos, Carol Oliveira, Dave Pereira
- **Arquivos renomeados**: `string_ops.py → text_ops.py`
- **Arquivos movidos**: `validators.py → src/utils/`
- **Cenário de conflito**: `feature/conflict-side` com mudanças conflitantes em `src/main.py`

## LGPD (Lei Geral de Proteção de Dados)

O OrchidGit é uma aplicação desktop totalmente local. Ele:
- **Não** coleta dados pessoais
- **Não** envia informações para servidores externos
- **Não** possui cadastro de usuários ou analytics
- Armazena apenas preferências locais (tema, diretórios recentes) no `localStorage`
- Todas as operações Git remotas são iniciadas e controladas pelo usuário

## Licença

MIT
