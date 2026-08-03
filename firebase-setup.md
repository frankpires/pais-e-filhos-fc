# Como ligar a sincronização entre celulares (Firebase Realtime Database)

Isso é gratuito e leva uns 5 minutos. Depois de feito, todo mundo que abrir o
link vai ver a mesma fila, em tempo real, sem precisar recarregar a página.

## 1. Criar o projeto no Firebase

1. Acesse https://console.firebase.google.com e entre com sua conta Google
   (pode ser a mesma do Gmail).
2. Clique em **"Adicionar projeto"**, dê um nome (ex: `pais-e-filhos-fc`) e
   siga os passos (pode desativar o Google Analytics, não é necessário).

## 2. Criar o Realtime Database

1. No menu à esquerda, vá em **Build > Realtime Database**.
2. Clique em **"Criar banco de dados"**.
3. Escolha a localização (qualquer uma serve, ex: `us-central1`).
4. Em "Regras de segurança", escolha **"Iniciar no modo de teste"**.
   - Isso deixa leitura/escrita abertas para qualquer um com o link do banco.
     Como é uma fila de futebol entre amigos, sem dados sensíveis, isso é
     aceitável — mas não coloque informação sensível nesse banco.

## 3. Pegar as chaves de configuração

1. Clique no ícone de engrenagem (⚙️) ao lado de "Visão geral do projeto" >
   **Configurações do projeto**.
2. Role até "Seus apps" e clique no ícone **"</>"** (Web) para registrar um
   app. Dê qualquer apelido (ex: "fila-quadra") e clique em "Registrar app".
3. Vai aparecer um bloco `firebaseConfig = { ... }` com várias chaves
   (`apiKey`, `authDomain`, `databaseURL`, etc). Copie esses valores.

## 4. Colar as chaves no index.html

Abra o `index.html` deste projeto, procure por `firebaseConfig` (perto do
início da tag `<script>`, função `loadState`) e substitua os valores
`"COLE_AQUI..."` pelos valores reais que você copiou no passo 3.

## 5. Publicar

Faça commit e push da alteração — o Vercel vai publicar automaticamente.
Se o rodapé do app mostrar "⚠️ Sincronização não configurada", é sinal de
que ainda sobrou algum `COLE_AQUI` no arquivo.

## Pronto

Abra o link em dois celulares diferentes e teste: adicione um jogador em um
e veja aparecer no outro na hora.
