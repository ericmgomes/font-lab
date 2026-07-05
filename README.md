# Font Lab

Webapp simples para experimentar fontes em texto editorial, dashboard e specimen.

## Rodar local

```bash
npm start
```

Abra `http://127.0.0.1:4173` ou a porta mostrada no terminal.

O servidor local permite carregar URLs do Dafont dinamicamente, baixando o ZIP e extraindo a fonte.

## GitHub Pages

O app também funciona como site estático no GitHub Pages. Google Fonts, upload local, URLs diretas de arquivos de fonte e as fontes Dafont padrão empacotadas em `assets/fonts` funcionam no Pages.

URLs novas do Dafont precisam do servidor local, porque GitHub Pages não executa o endpoint Node usado para baixar e extrair ZIPs.
