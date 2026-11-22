# CNC Copilot — evidências sanitizadas de software

Data da revisão: 21/11/2026. Estado: protótipo privado de validação nominal, em desenvolvimento e sem homologação para fabricação ou operação de máquina.

## Origem e escopo

A inspeção utilizou a versão local indicada pelo titular como a mais recente, incluindo alterações ainda não commitadas. Uma cópia isolada foi preparada para testar o software; a fonte original permaneceu preservada. A versão encontrada no GitHub foi consultada inicialmente, mas não foi usada como substituta do desenvolvimento local atual.

O gate `npm run devcheck` do próprio projeto executou políticas estáticas, verificação TypeScript, testes automatizados e build. A reprodução ocorreu em Windows, com Node.js 24.16.0. Não houve conexão com máquina, abertura de VM, execução de programa CNC, exportação operacional ou chamada a API de IA.

## Resultados efetivamente reproduzidos

| Verificação | Resultado e limite |
| --- | --- |
| Testes de software | 1.300 testes aprovados; zero falhas, cancelamentos e skips |
| TypeScript | Verificação de tipos aprovada |
| Políticas estáticas | Gate aprovado; restringe SDKs/chaves de IA, parser legado e blocos de programa CNC no frontend |
| Build Vite | Concluído, com aviso de chunk acima de 500 kB; desempenho em produção não foi homologado |
| Comportamentos examinados | Dados ausentes, unidades, vínculo de contexto, origem dos fatos, divergência nominal/documental, preservação da entrada e invalidação de avaliação anterior |
| Autoridade operacional | Os contratos testados mantêm sete permissões falsas, mesmo quando os dados nominais coincidem |

Os números acima pertencem à reprodução de software desta revisão. Não são uma contagem retirada apenas do histórico do README e não constituem aprovação de processo industrial.

## Decisões verificadas

- A extração atual é determinística e limitada; o frontend não chama uma API de IA.
- Propostas extraídas, declarações humanas e referências documentais são tratadas como origens distintas.
- As referências da comparação documental são fictícias e precisam corresponder ao contexto e à dimensão específica.
- Ausências, ambiguidades e contradições permanecem explícitas. Uma tolerância apresentada como contexto não elimina uma divergência nominal.
- Alterações nos dados, na referência ou no escopo invalidam a reutilização da avaliação anterior.
- Revisão nominal e confirmação de campos não liberam planejamento operacional, pós-processamento, exportação ou execução.

## Limitações e riscos

Os testes de software não comprovam segurança física, fixação, dinâmica, validade de ferramentas, ausência de colisões 3D, estado efetivo de máquina ou um procedimento de fabricação. Os ensaios históricos da documentação privada não foram repetidos. Não houve avaliação de hardware, homing, movimentação, simulação física nova ou liberação operacional.

O build apresentou aviso de tamanho de chunk. A interface continua em evolução; esta revisão não é homologação de uso em produção nem auditoria completa de acessibilidade do CNC Copilot.

A fonte, os logs brutos, identificadores de trabalho e os demais registros privados não são distribuídos. Este documento é um resumo sanitizado da verificação, não uma auditoria pública independente integral. O portfólio não oferece código-fonte público, demonstração interativa, programas CNC ou arquivos NC deste projeto.

## Participação

Idealizei e conduzi o desenvolvimento com o Codex, utilizando IA em todas as etapas da implementação, conforme declaração do titular. Esses resultados não comprovam autoria manual integral nem domínio individual de todo o código.

O projeto conecta experiência industrial a decisões de engenharia de software: contratos, rastreabilidade, testes, invalidação de estado e limites de autoridade. As permissões operacionais continuam bloqueadas no recorte apresentado.
