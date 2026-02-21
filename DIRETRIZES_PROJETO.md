# Diretrizes do Projeto - Escala de Horários

Este documento serve como guia para agentes de IA e desenvolvedores, garantindo consistência visual e segurança no desenvolvimento.

## 🎨 1. Diretrizes Visuais (Design System)

O sistema deve manter uma estética **Premium, Moderna e Limpa**.

### ✨ Estilo Visual
- **Glassmorphism**: Uso de transparências com desfoque (`backdrop-filter: blur`) em elementos flutuantes (Header, Modais, Footer).
- **Cores**:
  - Respeitar a paleta definida em `:root` (`MobileEscala.css` e `App.css`).
  - **Fundo**: Escuro (`#121212`, `#1e1e1e`) com gradientes sutis para profundidade.
  - **Acentos**: Roxo (`#bb86fc`), Verde Água (`#03dac6`) e Laranja para destaques.
  - **Texto**: Branco (`#ffffff`) e Cinza Claro (`#e0e0e0`) para leitura confortável.
- **Tipografia**: Fontes modernas (`Inter`, `Roboto`, `Roboto Condensed`). Títulos em caixa alta com espaçamento (`letter-spacing`) para elegância.

### 📱 Experiência Mobile (UX)
- **Toque**: Elementos clicáveis devem ter tamanho adequado para dedos (mínimo 44px).
- **Sem Barreiras**: Evitar scrolls desnecessários. O conteúdo deve se ajustar fluidamente.
- **Feedback**: Botões e itens interativos devem ter estados de `:active` e `:hover` (transform, shadow).

## 🛡️ 2. Regras de Desenvolvimento (Segurança)

### 🚫 "Não Quebre o Código"
- **Escopo Limitado**: Ao atender uma solicitação, altere **APENAS** o trecho necessário. Não refatore arquivos inteiros sem necessidade explícita.
- **Respeito à Lógica Existente**: Entenda como o estado (React State) e os Hooks funcionam antes de mexer.
- **Preservação de Funcionalidades**: Garantir que funcionalidades críticas (Sincronização Supabase, Cálculos de Data) permaneçam intactas.

### 🧪 Boas Práticas
- **Clean Code**: Nomes de variáveis claros, funções pequenas.
- **CSS**: Preferir variáveis CSS (`var(--cor)`) a cores hardcoded.
- **Comentários**: Explicar trechos complexos, especialmente lógica de data e banco de dados.

---
*Este documento deve ser consultado antes de qualquer alteração significativa.*
