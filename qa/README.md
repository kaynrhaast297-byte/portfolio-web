# Executores de QA

Execute os comandos a partir da raiz do projeto; consulte [HOMOLOGACAO.md](../HOMOLOGACAO.md).

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run qa:browser -- --channel=chrome
npm run qa:contrast -- --channel=chrome
```

Sem `--channel`, os executores procuram o Chromium instalado pelo Playwright. `--executable=<arquivo>` permite selecionar outro executável compatível. Use `--help` para as opções disponíveis. Todos os caminhos internos são relativos à localização dos executores.

`browser.cjs` cobre 21 verificações de fluxos essenciais, DOM, teclado, mobile, ausência de JavaScript, limites/falhas da API, preparação do email e análise axe. Inclui a ordem ImovelSP → DevCheck → CNC Copilot, os estudos de caso, recursos sanitizados, captura fictícia e retorno à página inicial. O conteúdo das fixtures é uma referência histórica, não a aplicação atual. `contrast.cjs` mede a página inicial e os dois estudos de caso em 1440, 390 e 320 pixels, totalizando nove cenários; usa pngjs, sem biblioteca nativa de edição de imagem, para ler os pixels das capturas de fundo. `common.cjs` concentra configuração, temporários, servidor local, navegação e identificação das fontes testadas.

Os executores escrevem somente na pasta de saída escolhida e não alteram os arquivos do site. Resultados parciais ou indisponibilidade de navegador precisam ser distinguidos de aprovação integral.
