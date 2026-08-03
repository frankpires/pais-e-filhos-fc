# Como ligar a sincronização entre celulares (banco do Vercel)

Diferente do Firebase, aqui você não precisa copiar nenhuma chave manualmente
— o Vercel conecta tudo sozinho. Leva uns 2 minutos.

## 1. Criar o banco

1. Acesse https://vercel.com/dashboard e entre no projeto deste app.
2. Clique na aba **"Storage"** (no menu do projeto).
3. Clique em **"Create Database"**.
4. Escolha a opção de **Redis** (aparece como um integração, ex: "Upstash" —
   é o mesmo banco que o Vercel usa por baixo dos panos). Dê um nome
   qualquer e confirme.

## 2. Conectar ao projeto

1. Depois de criado, o Vercel vai perguntar em qual(is) projeto(s) conectar
   esse banco — selecione este projeto (`pais-e-filhos-fc` ou o nome que
   você deu).
2. Isso já adiciona sozinho as variáveis de ambiente necessárias
   (`KV_REST_API_URL` / `UPSTASH_REDIS_REST_URL` etc.) — não precisa copiar
   nada.

## 3. Reimplantar (redeploy)

As variáveis de ambiente só entram em vigor em um novo deploy. Vá na aba
**"Deployments"**, abra o último deploy e clique em **"Redeploy"** — ou
simplesmente dê um novo `git push` (o Vercel já faz isso automaticamente a
cada push no repositório).

## 4. Testar

Abra o site publicado. Se o rodapé mostrar a mensagem normal (sem o aviso
"⚠️ Sem conexão"), está funcionando. Abra em dois celulares (ou duas abas),
adicione um jogador em um e espere até 3 segundos — ele deve aparecer no
outro automaticamente.
