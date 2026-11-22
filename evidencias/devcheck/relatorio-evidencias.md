# DevCheck — resumo de evidências

Referência: candidata alpha `3.0.0a6`; documentação técnica de origem preparada em 18/11/2026. Este documento acompanha o estudo de caso e reúne resultados registrados, com seus limites.

## Origem e alcance

Este resumo deriva de uma validação técnica local assistida pelo Codex e de consultas de leitura a uma CI privada existente. Ele não constitui auditoria externa do código. A revisão editorial dos documentos de origem conferiu os textos apresentados, sem executar a suíte nem consultar os logs originais.

Os comprovantes completos e a identificação exata das fontes permanecem no conjunto privado de revisão. Este documento não oferece verificação pública independente da CI nem comprova domínio técnico individual do autor. A integração deste estudo ao portfólio não executou novamente a suíte do DevCheck.

## Resultados registrados

| Verificação | Resultado e limite |
| --- | --- |
| Suíte Python em Windows / Python 3.12.14 | 196 testes contabilizados, sem falhas na execução final; cinco registros de skip por falta de privilégio de symlink |
| Cobertura agregada | 83,0147%; statements 85,02%; branches 78,13%. Os denominadores são diferentes |
| Contratos da CLI | Sete cenários em processos separados aprovados |
| Ruff | Verificação aprovada |
| Dashboard | Roteiro existente concluído com Chrome em 320, 390 e 1440 pixels |
| CI privada consultada | Seis jobs de validação e um agregador com `status: completed` e `conclusion: success`; consulta de resultados existentes, sem execução nova |

A suíte inicial teve duas falhas ao usar temporários dentro de outra árvore Git: o resolvedor de ferramentas externas recusou essa origem. A execução final usou temporários fora dessa árvore e a pasta das ferramentas no PATH. O produto e as expectativas dos testes permaneceram inalterados; as duas tentativas foram preservadas no conjunto privado.

Os cinco skips são três subcasos de um teste e dois outros testes. Todos registraram `WinError 1314`, falta de privilégio para criar symlinks. Não foram contados como aprovações, e não se deve inferir uma contagem de métodos aprovados subtraindo cinco de 196.

O ensaio local usou um ambiente de ferramentas existente e a árvore-fonte. Não houve nova instalação limpa do produto, reconstrução do wheel ou auditoria online completa de dependências nessa revisão. A CI de fontes também não prova que um mesmo binário específico foi testado em todos os ambientes.

## Demonstração visual

A captura `../../assets/devcheck-demonstracao.png` veio do executor de navegador do projeto e foi conferida visualmente. Mostra um projeto fictício, criado para os testes, com aprovação local com ressalvas. Os identificadores exibidos pertencem à demonstração, não às fontes privadas do produto.

Trata-se de captura estática. Não há demonstração interativa pública incluída neste material. Os testes de navegador não equivalem a uma auditoria completa de acessibilidade ou a validação em dispositivos físicos.

## Participação e maturidade

Idealizei o projeto e conduzi o desenvolvimento com o Codex, usando IA em todas as etapas da implementação. A demonstração de domínio individual do código não decorre dos resultados técnicos registrados.

Não foram comprovados uso comercial, adoção por equipes, redução quantitativa de bugs, backend multiusuário em produção ou deploy contínuo. O projeto permanece uma candidata em avaliação, com código e comprovantes completos privados.

Os resultados apresentados não autorizam publicação. A decisão de disponibilizar o produto e seu código exige revisão própria.
