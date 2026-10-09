# Deploy

[Voltar ao README](../README.md)

---

A aplicação é totalmente estática. `npm run build` produz HTML, CSS, JS e
assets em `dist/projeto-gastos/browser`, publicáveis em qualquer host estático.

O ambiente ativo é a Vercel, em
<https://dashboard-gastos-flax.vercel.app/>. O repositório traz um
`vercel.json` pronto: basta importar o projeto na Vercel e publicar, sem
configurar nada no painel.

| Configuração | Valor (já em `vercel.json`) |
| --- | --- |
| Instalação | `npm ci` |
| Comando de build | `npm run build` |
| Diretório de publicação | `dist/projeto-gastos/browser` |
| Framework preset | `null` (estático puro; o arquivo define tudo) |
| Versão do Node | 20 ou superior (`engines` no `package.json`) |
| Fallback de SPA | Rewrite de qualquer caminho para `/index.html`; arquivos existentes têm prioridade |
| Cache | Assets com hash (`*-XXXXXXXX.js/css`) imutáveis por um ano; `index.html` sem cache |
| Cabeçalhos | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS |

O fallback de SPA é obrigatório: diferente de um site de página única com
âncoras, aqui existem rotas reais (`/transacoes`, `/calendario`). Sem ele,
recarregar a página em uma dessas URLs devolveria 404 do host. A Vercel serve
primeiro o que existe em disco (JS, CSS, favicon) e só então aplica o rewrite,
então os assets não são afetados; um caminho desconhecido cai no app, que
mostra a página 404 com o endereço digitado e atalhos para voltar.

Em outro host estático (Netlify, Cloudflare Pages), reproduza o mesmo
comportamento: Netlify aceita um `_redirects` com `/* /index.html 200`.

Para conferir um deploy:

```bash
curl -s -o /dev/null -w "%{http_code}
" https://dashboard-gastos-flax.vercel.app/calendario   # 200
curl -sI https://dashboard-gastos-flax.vercel.app/ | grep -i x-frame-options                    # DENY
```
