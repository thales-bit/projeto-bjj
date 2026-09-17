# Battlefield Jiu-Jitsu · Totem de patrocínio

Plataforma de patrocínio dos atletas juvenis do Battlefield Jiu-Jitsu (Balneário Camboriú, SC), no modelo de lista de presentes de casamento: o apoiador escolhe um item (quimono, inscrição, faixa...) ou um valor mensal para um atleta ou para a equipe, e o valor é repassado ao projeto.

## Estado atual

`index.html` é um esboço navegável, em arquivo único, com dados de exemplo. O fluxo é linear, pensado para o totem:

1. **Início:** entrada ("Coloque uma criança no tatame"), bloco emocional sobre o projeto com as garantias de transparência, "como funciona" em 3 passos com setas e um único botão "Ajudar a realizar um sonho".
2. **Como você quer apoiar?** Pontual (itens, pago uma vez) ou mensal (padrinho/madrinha com valor fixo).
3. **Quem você quer apoiar?** Um atleta ou a equipe inteira.
4. **Atletas / Perfil do atleta / Equipe:** história, conquistas, meta do mês e o catálogo já aberto no modo escolhido, com a opção de trocar.
5. **Sua escolha:** resumo, apoio com nome ou anônimo, WhatsApp e mensagem opcionais, bloco reservado para o pagamento.
6. **Obrigado:** confirmação e retorno automático ao início.

Um indicador de etapas no topo mostra em que passo a pessoa está. Ainda não há integração de pagamento. O bloco no checkout marca onde ela entra.

## Modo totem

A página foi pensada para rodar num totem de autoatendimento, em tela de toque, num lugar físico:

- Nada fica gravado entre uma pessoa e outra. "Sua escolha" é só a seleção atual, não um histórico.
- Depois de 60 segundos sem toque aparece a pergunta "Ainda está aí?" e, 20 segundos depois, tudo é limpo e a tela volta ao início.
- A tela de obrigado volta ao início sozinha em 20 segundos.
- Só o primeiro nome é obrigatório no fechamento. WhatsApp e mensagem são opcionais.
- Botões e alvos de toque têm no mínimo 44px.

Os tempos ficam nas constantes `INATIVIDADE_AVISO_S`, `INATIVIDADE_LIMITE_S` e `OBRIGADO_S` no início do bloco "MODO TOTEM" do script.

## Identidade visual

Segue o briefing do Battlefield Clube de Tiro: sempre em modo escuro, verde neon `#33EB01` e verde-limão `#B3F243` sobre preto `#0C0C0C`, títulos em Saira Extra Condensed em caixa alta, texto em Source Sans 3, hexágonos como elemento gráfico e ícones em círculo preto com anel verde. O hexágono da marca no topo e na capa é um desenho vetorial provisório até o PNG do logo em alta ser embutido.

## Como ver

Abra `index.html` no navegador. Não precisa de servidor.

## Publicar na Vercel

O projeto é estático, sem build. Na Vercel: **Add New → Project → Import** este repositório, preset **Other**, sem comando de build e sem pasta de saída. Cada push na branch de produção (Settings → Git → Production Branch) publica de novo automaticamente. O `vercel.json` só desliga o cache do HTML para as atualizações aparecerem na hora.

## Movimento

Transição entre telas, slideshow dos atletas na capa (troca a cada 5 s), faixa de fotos rolando sem parar, blocos que entram ao rolar, números da capa contando, brilho pulsando no botão principal, zoom lento nas fotos grandes e na galeria. Tudo é desligado automaticamente para quem tem "reduzir movimento" ativado no aparelho.

## Atletas e fotos

Os nove atletas em `ATLETAS` (no início do script) foram sintetizados dos portfólios da pasta "0. Projeto social - Jiu jitsu" do Drive. As fotos ficam em `fotos/<atleta>/01.jpg` a `05.jpg` (no máximo 5 por atleta), já reduzidas para 1400 px. O campo `fotos` diz quantas existem e `capa` qual delas é a principal.

Para trocar ou acrescentar fotos: coloque o JPEG em `fotos/<atleta>/NN.jpg` e ajuste `fotos`/`capa`. Os utilitários em `scripts/` decodificam arquivos vindos do Drive (`salvar_foto.py`) e extraem fotos de portfólios em PDF (`extrair_pdf.py`).

## Onde trocar os dados

No início do `<script>` em `index.html`, os blocos `EQUIPE`, `ATLETAS`, `ITENS_ATLETA`, `ITENS_EQUIPE` e `PLANOS` concentram todos os textos, valores e metas. As fotos hoje são espaços reservados com a inicial do nome.
