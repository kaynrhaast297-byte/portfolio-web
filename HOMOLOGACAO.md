# Homologação local

Esta etapa integra o estudo de caso do CNC Copilot ao portfólio local, partindo de `9b1414c` e preservando o estudo DevCheck, as melhorias anteriores e o bloqueio de `27d8e4b`. ImovelSP abre a seleção, seguido do DevCheck alpha privado e do CNC Copilot como protótipo privado. Executar os comandos abaixo não publica o site.

## Verificações sem dependências externas

Extraia o pacote, entre na pasta `portfolio-web` e use Node.js 20 ou superior:

```sh
npm run check
```

O comando verifica sintaxe, sincronização entre JSON e HTML, arquivos UTF-8, referências e âncoras entre as três páginas, PNG, configurações, preservação do bloqueio de deploy e 19 testes de regressão. Não precisa de `node_modules` nem de acesso à rede. Todos os arquivos necessários, incluindo `vercel.json`, `netlify.toml`, `portfolio.html`, `robots.txt` e `sitemap.xml`, fazem parte do pacote.

Os títulos são comparados como HTML escapado na suíte básica. Há casos explícitos com `&`, sinais de menor/maior, aspas, apóstrofos, entidades literais e acentos. A suíte de navegador também usa o DOM para verificar o texto interpretado e a ausência de elementos injetados.

## Instalar somente as ferramentas de QA

As dependências de desenvolvimento estão fixadas no lockfile: Playwright 1.62.1, axe-core 4.12.0 e pngjs 7.0.0. Nenhuma dependência foi adicionada à aplicação entregue ao navegador.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npx playwright install chromium
npm run qa:browser
npm run qa:contrast
```

O download do navegador é separado da instalação npm. Se já houver Google Chrome ou Microsoft Edge instalado, é possível usar os comandos seguintes sem baixar o Chromium:

```sh
npm run qa:browser -- --channel=chrome
npm run qa:contrast -- --channel=chrome
```

Use `--channel=msedge` para Edge. Não há caminho absoluto de navegador ou runtime no código. A instalação padrão do Chromium e os canais instalados são suportados pelo [Playwright](https://playwright.dev/docs/browsers). No Linux, bibliotecas do sistema podem ser necessárias; o comando oficial `npx playwright install --with-deps chromium` pode exigir privilégios administrativos e não é executado automaticamente pelos testes.

## Resultados e evidências

Os executores abrem um servidor apenas em loopback, usam respostas simuladas da API GitHub e encerram o servidor e os contextos ao terminar. Não enviam mensagens, não abrem aplicativos de email e não acessam credenciais pessoais. Os cabeçalhos de `vercel.json`, incluindo CSP, são aplicados pelo servidor de teste.

- `output/homologacao/browser/qa-results.json`: resultado de cada verificação, versões, erros de JavaScript e hashes das fontes testadas.
- `output/homologacao/browser/`: capturas numeradas e resultados axe em JSON.
- `output/homologacao/contrast/contrast-rendered.json`: amostragem dos textos e limites dos campos sobre os fundos renderizados.
- `output/homologacao/contrast/contrast-background-*.png`: imagens de fundo usadas pela medição na página inicial e nos dois estudos de caso; o texto fica transparente somente durante essa medição no navegador de teste.

`--output=<pasta-relativa>` muda a saída. Os temporários do navegador ficam no subdiretório `tmp` dessa saída e não fazem parte do pacote de evidências. `--filter=<trecho>` executa apenas verificações de navegador cujo nome contenha o trecho; o JSON marca a execução como parcial. `completeSuite` deve ser verdadeiro para confirmar a suíte completa.

As fontes Google são consultadas por leitura de rede. Em ambiente sem rede, é possível executar uma variante com fontes de fallback:

```sh
npm run qa:browser -- --channel=chrome --offline-fonts
npm run qa:contrast -- --channel=chrome --offline-fonts
```

Essa variante é identificada nos resultados e não confirma a tipografia Google Fonts. Falha ao iniciar o navegador gera erro e não conta como teste aprovado. O método de contraste amostra fragmentos a cada dois pixels e não substitui revisão completa de acessibilidade.

## Conteúdo do pacote de revisão

`portfolio-web/` contém a árvore completa de fontes, testes, configurações, lockfile e estes executores, sem `.git`, `.vercel`, credenciais, dependências instaladas ou perfis de navegador. As fixtures de referência estão em `qa/fixtures/baseline/`, dispensando acesso ao Git ou ao computador de origem para os testes de captura.

`evidencias/atual/` contém os resultados efetivamente reproduzidos para esta integração. `evidencias/pacote-limpo/` contém a execução feita após extrair somente os arquivos distribuídos. As métricas históricas do DevCheck ficam identificadas dentro do estudo de caso e não contam como novas execuções. A validação de 1.300 testes do CNC Copilot foi reproduzida em uma cópia privada isolada; somente seu resumo sanitizado é distribuído. O pacote público não contém as fontes necessárias para repetir a suíte privada. O relatório técnico informa navegador/canal, comandos, limitações e o commit avaliado.

O inventário externo ao projeto lista o tamanho e SHA-256 de cada arquivo do pacote. O verificador distribuído junto ao inventário usa apenas Node.js. Extraia o ZIP antes de executar a verificação; os arquivos do manifesto e do verificador são informados como metadados, sem incluir o próprio hash dentro de si.

## Limitações

Os binários do Chrome/Edge/Chromium e `node_modules` não são redistribuídos. Use a instalação npm e o navegador disponível no ambiente. O lockfile permite repetir a instalação de ferramentas públicas; os dados de teste e executores estão distribuídos. O pacote registra separadamente o que foi reproduzido e o que ficou apenas documentado.

Leitor de tela, dispositivos móveis físicos, outros motores de navegador, confirmação humana do LinkedIn e envio real de email permanecem fora das verificações automatizadas. A integração não reexecuta testes do DevCheck nem acessa sua CI privada. O gate CNC verifica software, sem máquina, VM, API de IA ou autorização operacional; não é uma homologação física. Push, merge, deploy e alterações remotas permanecem bloqueados. A configuração local da branch é preservada; a ausência de qualquer registro de deployment no primeiro push continua sem confirmação operacional.
