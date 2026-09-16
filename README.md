# Padrinhos do Tatame

Plataforma de patrocínio de atletas juvenis de jiu-jitsu, no modelo de lista de presentes de casamento: o apoiador escolhe um item (quimono, inscrição, faixa...) ou um valor mensal para um atleta ou para a equipe, e o valor é repassado ao projeto.

## Estado atual

`index.html` é um esboço navegável, em arquivo único, com dados de exemplo. Todas as páginas já existem:

- Início: apresentação da equipe, "como funciona" em 3 passos, escolha entre atleta ou equipe, transparência.
- Atletas: grade com foto, idade, faixa e frase de cada atleta.
- Perfil do atleta: história, conquistas, meta do mês, catálogo de patrocínio único e apadrinhamento mensal.
- Equipe: mesma estrutura, com itens coletivos.
- Meu apoio: resumo das escolhas, dados do apoiador, mensagem para o atleta, bloco reservado para o pagamento.
- Obrigado: confirmação e compartilhamento.

Ainda não há integração de pagamento. O bloco no checkout marca onde ela entra.

## Como ver

Abra `index.html` no navegador. Não precisa de servidor.

## Onde trocar os dados

No início do `<script>` em `index.html`, os blocos `EQUIPE`, `ATLETAS`, `ITENS_ATLETA`, `ITENS_EQUIPE` e `PLANOS` concentram todos os textos, valores e metas. As fotos hoje são espaços reservados com a inicial do nome.
