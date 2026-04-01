---
description: Como fazer push do código para o repositório escala-premium
---

Para enviar o código para o repositório remoto ("escala-premium") sem erro de sintaxe no PowerShell, execute cada comando separadamente.

Execute o comando para rastrear as modificações:
// turbo
git add .

Execute o comando para gerar o commit:
// turbo
git commit -m "update: melhorias automáticas na ui"

Por fim, envie o código para a branch principal:
// turbo
git push origin main
