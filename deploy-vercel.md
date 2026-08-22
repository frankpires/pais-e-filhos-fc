# Como publicar os dois apps (Pais & Filhos FC e Calangada)

Este repositório tem dois apps independentes, cada um em seu próprio
arquivo HTML na raiz:

- `paisfilhos.html` — Pais & Filhos FC
- `calangada.html` — Calangada

Nenhum dos dois se chama `index.html` de propósito: cada app vira o
`index.html` só na hora do build, dentro do próprio projeto Vercel, para
que os dois times possam evoluir sem um pisar no arquivo do outro.

## 1. Criar os dois projetos no Vercel

No [dashboard da Vercel](https://vercel.com/new), importe este mesmo
repositório **duas vezes**, uma para cada projeto (ex: `pais-e-filhos-fc` e
`calangada-fc`). Os dois vão apontar pro mesmo repo e pra mesma branch.

## 2. Configurar o Build Command de cada projeto

Em **Project Settings → Build & Development Settings**, desative
"Override" apenas se necessário e defina, para cada projeto:

**Projeto Pais & Filhos FC**
- Framework Preset: `Other`
- Build Command: `cp paisfilhos.html index.html`
- Output Directory: deixe em branco (raiz do repo)

**Projeto Calangada**
- Framework Preset: `Other`
- Build Command: `cp calangada.html index.html`
- Output Directory: deixe em branco (raiz do repo)

O `sw.js` é compartilhado pelos dois (não precisa copiar nada pra ele) —
como cada projeto tem seu próprio domínio, o cache do service worker de um
não interfere no do outro.

## 3. Domínios

Configure um domínio (ou subdomínio) diferente para cada projeto em
**Project Settings → Domains** — por exemplo `paisfilhos.vercel.app` e
`calangada.vercel.app`, ou domínios próprios se preferir.

## 4. Firebase

Os dois apps usam o mesmo banco Firebase, mas gravam em nós separados
(`paisfilhos/state` e `calangada/state`) — veja [firebase-setup.md](firebase-setup.md)
para configurar as chaves, se ainda não estiver feito.

## Testando localmente sem Vercel

Basta abrir o arquivo direto no navegador ou rodar um servidor estático na
raiz do repo:

```bash
python3 -m http.server 8000
```

E acessar `http://localhost:8000/paisfilhos.html` ou
`http://localhost:8000/calangada.html`.
