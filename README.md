# portfolio-web

Portfólio estático de Jonathan Medeiros para oportunidades de estágio e desenvolvedor júnior. A apresentação conecta experiência industrial e formação em Análise e Desenvolvimento de Sistemas a desenvolvimento web, Python, backend, automação e qualidade de software.

## Executar e verificar

O site usa HTML, CSS e JavaScript sem dependências de aplicação. Abra `index.html` diretamente ou sirva a raiz do projeto com um servidor estático. Os projetos e seus detalhes funcionam mesmo sem JavaScript ou acesso ao GitHub.

Para editar os dados e executar as verificações locais, use Node.js 20 ou superior:

```powershell
npm run build
npm run check
```

`build` valida `data/projetos.json` e atualiza apenas o trecho demarcado de projetos e seu contador em `index.html`. O HTML gerado fica versionado, portanto o conteúdo principal não depende de um build em tempo de navegação. Depois de alterar o JSON ou o gerador, execute `build` e revise o diff.

`check` verifica sintaxe, sincronização entre JSON e HTML, UTF-8, integridade dos JSONs, IDs, referências ARIA, âncoras, recursos locais, proteção de links externos e a suíte de regressão do gerador. Não depende de rede. `npm test` executa somente essa suíte.

A comparação de conteúdo aceita LF e CRLF. A função de atualização preserva o padrão de quebras de linha recebido, e a suíte cobre o checkout no Windows. Os campos de contato têm bordas próprias de maior contraste e placeholders com a cor de texto secundário.

## Estrutura

- `index.html`: conteúdo, metadados, navegação e seis cards gerados, com ImovelSP em primeiro, DevCheck em segundo e CNC Copilot em terceiro.
- `projetos/devcheck.html`: estudo de caso estático com apresentação, decisões, evidências, participação assistida por IA e limitações.
- `evidencias/devcheck/relatorio-evidencias.md` e `assets/devcheck-demonstracao.png`: resumo sanitizado e captura original com dados fictícios.
- `projetos/cnc-copilot.html` e `evidencias/cnc-copilot/relatorio-evidencias.md`: estudo de caso e resumo sanitizado de testes de software do protótipo CNC privado.
- `style.css`: identidade visual, layout responsivo, foco e suporte a movimento reduzido.
- `script.js`: menu mobile, datas opcionais do GitHub e preparação do email.
- `data/projetos.json`: fonte dos quatro projetos web e dos estudos de caso privados DevCheck e CNC Copilot, com problema, solução, decisões, limitações e evidências.
- `scripts/generate-projects.mjs`: geração determinística de HTML, validação de dados e escape do conteúdo editorial.
- `scripts/check-integrity.mjs` e `tests/projects.test.mjs`: verificações locais reproduzíveis.
- `vercel.json` e `netlify.toml`: cabeçalhos e cache de hospedagem estática.
- `robots.txt`, `sitemap.xml` e `portfolio.html`: descoberta e compatibilidade com o endereço antigo.

## Comportamentos importantes

Os cards já fazem parte da resposta HTML. O navegador consulta cada repositório em segundo plano apenas para atualizar a data do código. Cada consulta tem limite de 2,5 segundos, inclusive durante a leitura da resposta. Falhas de rede, limites da API ou respostas inválidas preservam os projetos, os links, o foco e os detalhes abertos. Não há token do GitHub no navegador.

O menu mobile usa um botão com `aria-controls` e `aria-expanded`. Enter ou espaço alternam seu estado; Escape fecha e devolve o foco ao botão. Ele fecha ao selecionar uma seção ou ao sair da navegação. Sem JavaScript, os links permanecem visíveis. O cabeçalho fixo tem compensação de rolagem para as âncoras.

Cada projeto tem ações independentes para demonstração, código ou estudo de caso, quando disponíveis. Os detalhes usam `details` e `summary` nativos e funcionam com teclado e sem JavaScript. Novos projetos devem registrar limitações e fontes; o gerador rejeita projetos sem evidências ou acesso ao conteúdo, IDs duplicados, URLs externas sem HTTPS ou com credenciais e caminhos locais fora do formato permitido. Os links locais de estudo de caso e evidências são relativos e não abrem outra aba.

O formulário valida e prepara um link de email. Só a ação posterior “Continuar no email” solicita a abertura do aplicativo externo. A página não afirma que o aplicativo abriu nem que uma mensagem foi enviada. Alterar os campos invalida o rascunho anterior. Sem JavaScript, os links diretos de contato continuam disponíveis e o formulário fica oculto.

## Evidências e limites de conteúdo

O DevCheck é apresentado como candidata alpha privada `3.0.0a6`, idealizada e conduzida pelo titular com IA em todas as etapas da implementação. O estudo de caso adapta a apresentação editorial validada e distingue resultados históricos de testes do produto das verificações atuais do portfólio. Os 196 testes contabilizados, os cinco registros de skip e os aproximadamente 83% de cobertura têm ambiente, origem e limites explícitos. Os comprovantes completos de CI continuam privados; não há link presumido de código público, CI privada ou demonstração interativa.

A captura do dashboard usa dados e identificadores fictícios e foi copiada sem edição. O resumo sanitizado é uma evidência documental, não uma auditoria externa nem comprovação de domínio individual. O conteúdo dos projetos Star e GrowthLens foi preservado; os repositórios de todos os projetos permanecem fora desta integração.

O CNC Copilot é apresentado como protótipo privado em desenvolvimento, sem homologação para fabricação. A revisão usou a versão local atual indicada pelo titular, incluindo alterações em trabalho, em uma cópia isolada. O gate de software teve 1.300 testes aprovados, tipos/políticas aprovados e build com aviso de chunk acima de 500 kB. Os bloqueios e limites operacionais estão explícitos. Não são distribuídos código privado, programas CNC, referências de oficina ou logs brutos. A IA foi usada em toda a implementação, sob idealização e condução do titular.

ImovelSP aponta para a documentação pública, sem reproduzir números de testes como se tivessem sido medidos nesta revisão. Star e GrowthLens são identificados como protótipo/demonstração, com limitações explícitas. Os cinco projetos anteriormente apresentados e o estudo DevCheck permaneceram preservados nesta integração.

A experiência industrial e a formação em ADS seguem as informações autorizadas pelo titular; não foram acrescentados instituição, semestre, cargo ou datas. O uso de IA aparece de maneira transparente, com responsabilidade pela revisão e validação.

## Validação de interface

As verificações de navegador complementam `npm run check`: testar desktop e mobile, menu por teclado, detalhes, ausência de JavaScript, respostas lentas/offline/limitadas/malformadas da API e preparação do contato sem abrir aplicativos externos. Conferir também o console, o foco, a ausência de rolagem horizontal e os achados de acessibilidade automática. Aprovação automática não equivale a conformidade completa nem substitui testes com tecnologias assistivas.

Os executores de navegador e contraste ficam em `qa/`, com versões de dependências fixadas em `package-lock.json`. Consulte [HOMOLOGACAO.md](HOMOLOGACAO.md) para reproduzir as verificações e interpretar os resultados. Os relatórios gerados ficam em `output/homologacao/`; o pacote de revisão inclui evidências e hashes. Nenhum relatório ou teste desta etapa autoriza push, merge ou deploy.
