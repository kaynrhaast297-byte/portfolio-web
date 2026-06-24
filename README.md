# portfolio-web

Portfólio profissional estático de Jonathan Medeiros, feito em HTML, CSS e JavaScript puro.

## Estrutura

- `index.html`: marcação semântica, SEO e conteúdo principal.
- `style.css`: layout responsivo e design visual.
- `script.js`: carregamento seguro dos projetos, enriquecimento via GitHub e formulário por email.
- `data/projetos.json`: fonte local dos projetos exibidos no portfólio.
- `vercel.json` e `netlify.toml`: headers de segurança e cache para deploy estático.
- `robots.txt` e `sitemap.xml`: descoberta básica por buscadores.

## Como executar

Abra `index.html` no navegador ou publique a pasta em um host estático. O site tem fallback local para os projetos caso o navegador bloqueie `fetch` ao abrir por `file://`.

## Melhorias atuais

- Texto revisado para candidatura em LinkedIn/currículo.
- Projetos apresentados com stack, tipo, impacto e links de demo.
- Formulário sem envio falso: ele abre o aplicativo de email com a mensagem preenchida.
- SEO básico com canonical, Open Graph, Twitter Card, robots e sitemap.
- Acessibilidade com landmarks, skip link, labels, foco visível e suporte a movimento reduzido.
- Headers de segurança: CSP, `nosniff`, `Referrer-Policy`, `X-Frame-Options` e `Permissions-Policy`.
