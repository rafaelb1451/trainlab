# Referência TrainingPeaks (extraída da conta real, atleta)

Fonte: app.trainingpeaks.com (conta logada, idioma pt-BR), extração de DOM em 18/11/2026.
Usar como referência de informação — NÃO copiar marca, textos ou layout literalmente.

## Navegação (atleta)
`Início` · `Calendário` · `Painel` · `ATP`

## Início (home do atleta)
- Cartão do próximo treino: nome, `1:00:00`, `12.5 km`, `56 TSS`, comentários pré-atividade.
- Estrutura do treino do dia: `Warm up 15 min @ 116-133 bpm — Zone 1: Recovery`,
  `Repetir 8 vezes: FIRME 3 min @ 149-166 bpm — Zone 3: Tempo–Zone 5A`,
  `2 min @ 125-141 bpm — Zone 1–2`, `Cool Down 5 min`.
- "Zonas de Treino de Hoje": FC corrida limite `166 bpm` com zonas
  `5C 177-255`, `5B 170-176`, `5A 166-169`, `4 157-165`, `3 149-156`, `2 141-148`, `1 0-140`;
  ritmo com limite `04:03 min/km` e zonas `5c 03:38-00:01` … `1 00:00-05:14`.
- Métricas do dia com fonte `Garmin Health`: Horas de sono, sono profundo/leve/REM/acordado,
  VFC (ms), Body Battery (low–high), nível de estresse médio, FC de repouso.
- Eventos (ex.: `5k Hoka`, `DEZ 05`, "2 semanas até o evento") e Objetivos/metas.

## Calendário (mês)
- Cabeçalho: `Biblioteca de Treinos` · `Planos de Treinamento` · `Biblioteca de Rotas`.
- Cada dia: métricas resumidas (`Horas de Sono`, `Body Battery`, "+8 more"),
  treinos concluídos (nome, duração, distância, `rTSS`), treinos planejados
  (`P: 0:43:00`, `P: 8.12 km`, `P: 34 rTSS`) e indicador de conformidade (`Normal`).
- Resumo semanal: `Total Duração` (planejado/concluído), `Total TSS`,
  `Corrida Duração`, `Corrida Distância`, `Força Duração`, `Ganho El.`, `Trabalho (kJ)`.
- Cada semana exibe `Fitness CTL`, `Fadiga ATL`, `Formulário TSB`.

## Painel (análises)
- Biblioteca de gráficos com 30+ opções: Time in Heart Rate Zones, Performance Management
  Chart (PMC), Duration by Week, macronutrientes/calorias semanais, distribuição por esporte.
- Range de datas configurável; conversas/mensagens com o treinador.

## ATP (plano anual)
- Tabela por semana: `Semanas para o Evento`, `Evento`, `Prioridade`, `Período`
  (Preparação, Base 1…, Construir…), `Horas` planejadas e `Concluído`.

## Métricas e termos
- `TSS` (Training Stress Score), `rTSS` (run), `IF`, `CTL` (Condicionamento),
  `ATL` (Fadiga), `TSB` (Formulário/Forma), conformidade (Totalmente / Parcialmente / Não planejado).
- Unidades: bpm, min/km, m/100m, W, kcal, kJ, ms (VFC), h (sono).

## Implicações para a v2 do TrainLab (modo treinador)
O treinador precisa ver, por atleta, tudo que o atleta vê + controles de treinador:
1. Ficha 360: dados pessoais, objetivo/prova, disponibilidade semanal, limiares e zonas por esporte.
2. Carga: minutos/TSS planejados na semana, próximas sessões, aderência.
3. Métricas diárias: sono (total/profundo/leve/REM), VFC, FC repouso, Body Battery, estresse,
   humor, RPE, peso — com histórico e gráfico simples.
4. Biblioteca de treinos com TSS/distância estimados.
5. Planejamento semanal com realizado × planejado (fase 3, após importação FIT).
