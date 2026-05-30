# Política de Privacidade

**Última atualização:** Maio de 2026

Orchid Git ("o Software") é um aplicativo desktop para interagir com repositórios Git. Esta política de privacidade explica como os dados do usuário são tratados.

## Coleta de Dados

**O Software não coleta, armazena ou transmite nenhum dado pessoal.**

Especificamente:

- **Sem telemetria** — O Software não envia estatísticas de uso, relatórios de erro ou analytics para nenhum servidor.
- **Sem contas de usuário** — O Software não exige registro, login ou qualquer forma de conta de usuário.
- **Sem informações pessoais** — O Software não solicita ou armazena nome, e-mail, endereço IP ou qualquer outra informação pessoal identificável.
- **Sem cookies** — O Software não utiliza cookies ou tecnologias similares de rastreamento.
- **Sem serviços de terceiros** — O Software não integra serviços terceiros de analytics, publicidade ou coleta de dados.

## Armazenamento Local

O Software armazena exclusivamente em sua máquina local, através da API `localStorage` do navegador:

- **Último diretório aberto** — Usado para reabrir seu último projeto na inicialização.
- **Lista de diretórios recentes** — Usado para mostrar repositórios acessados recentemente (máximo 8 entradas).
- **Preferência de tema** — Seleção de tema escuro ou claro.
- **Lista de autores mesclados** — Configuração para agrupamento de autores nas Métricas.
- **Preferências de ordenação** — Modo de ordenação para diretórios recentes e visualização de mudanças.
- **Confirmação de troca de repositório** — Se deve pular confirmação ao trocar de repositório.

Esses dados nunca saem da sua máquina. Você pode limpá-los a qualquer momento:

1. Acessando **Configurações > Limpar armazenamento local** no aplicativo, ou
2. Limpando o localStorage pelas ferramentas de desenvolvedor do Electron, ou
3. Removendo manualmente o diretório de dados do aplicativo.

## Operações Git

Ao realizar operações Git (push, pull, fetch, clone), o Software executa comandos via o CLI do `git` instalado no sistema em seu nome. Essas operações conectam-se diretamente aos remotos Git que você configurou. O Software não intercepta, registra ou transmite essas comunicações além do que o próprio comando `git` realiza.

## Código Fonte

O Software é open source. Qualquer pessoa pode inspecionar o código fonte no repositório do projeto para verificar que nenhuma coleta de dados ocorre.

## Riscos

Embora o Software não colete dados, o uso envolve riscos inerentes a ferramentas de desenvolvimento desktop:

- **Acesso local a arquivos** — O Software lê e escreve arquivos em seus repositórios Git. Agentes maliciosos com acesso à sua máquina poderiam usar o Software para acessar esses arquivos.
- **Credenciais Git** — O Git pode armazenar credenciais em cache (usuário/senha) ou usar chaves SSH para autenticação. Isso é gerenciado pelo CLI do `git`, não pelo Software.
- **Forwarding do agente SSH** — Se você usa SSH agent forwarding, servidores remotos conectados podem acessar suas chaves SSH locais. Isso é uma propriedade do Git e SSH, não do Software.
- **Dependências de terceiros** — O Software é construído sobre pacotes open-source (npm). Embora as dependências sejam atualizadas regularmente, vulnerabilidades em pacotes upstream podem representar risco.
- **Persistência do localStorage** — Preferências armazenadas no `localStorage` não são criptografadas e podem ser lidas por outros aplicativos executando na mesma máquina.
- **Servidores Git remotos** — Ao fazer push, pull ou fetch, seu código e metadados de commit (nome do autor, e-mail) são transmitidos para os servidores remotos configurados. Isso é uma propriedade inerente do Git.
- **Sem garantia** — O Software é fornecido "como está", sem garantia de qualquer tipo. Consulte a licença MIT para detalhes.

## Alterações nesta Política

Se esta política for alterada, a data de "Última atualização" acima será atualizada. Os usuários são incentivados a revisar esta política periodicamente.

## Contato

Para perguntas sobre esta política de privacidade, abra uma issue no repositório do projeto.
