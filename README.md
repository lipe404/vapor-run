# Vapor Run // Sunset Circuit

Corrida arcade vaporwave em Canvas 2D. Três rotas, quatro carros originais, rádio sintetizada no navegador e nenhum serviço externo.

- **Passeio:** estrada sem fim, tráfego e nitro extra em ultrapassagens próximas.
- **Racha:** seis carros, cinco rivais e linha de chegada.
- **Contrarrelógio:** tente baixar seu recorde por rota, guardado no navegador.
- **Controles:** setas ou WASD; Shift para nitro; Espaço para drift; Esc para pausar. No toque, acelere e freie enquanto vira para fazer drift.
- **Áudio:** o navegador permite tocar a rádio após interação. O botão de som silencia tanto a rádio quanto os efeitos.

Para testar localmente, rode `python3 -m http.server 8080` na raiz e abra `http://localhost:8080`. A página publicada usa o GitHub Pages. O código e os recursos anteriores permanecem no histórico e nas pastas originais.

A física de contato usa detecção contínua. Para rodar os testes de colisão: `node --test contact.test.mjs`.
