# 📅 Sistema de Gestão de Escalas de Horários

Bem-vindo ao **Sistema de Gestão de Escalas**, uma aplicação web moderna, robusta e responsiva desenvolvida para facilitar a criação, edição e distribuição de escalas de trabalho. Este sistema foi projetado para substituir planilhas complexas por uma interface visual intuitiva, permitindo que gestores organizem turnos com eficiência e que colaboradores acessem suas escalas de qualquer lugar.

---

## 🚀 Visão Geral

O sistema resolve o problema da organização de horários de equipes, oferecendo ferramentas para visualizar o mês inteiro, gerenciar períodos parciais (ex: quinzenais), detectar feriados automaticamente e exportar os dados para diversos formatos. Ele opera principalmente no navegador (Client-Side), utilizando `localStorage` para persistência rápida, com suporte opcional a **Supabase** para compartilhamento em nuvem.

### ✨ Principais Destaques
- **Interface Intuitiva:** Edição de horários com poucos cliques.
- **Flexibilidade:** Suporte a Escala Mensal completa e Escala Parcial (períodos customizados).
- **Inteligência:** Detecção automática de Feriados Nacionais (incluindo móveis como Páscoa e Carnaval) e Finais de Semana.
- **Portabilidade:** Exportação profissional para PDF, Excel e integração direta (Copiar/Colar) com Google Sheets.
- **Compartilhamento:** Geração de links únicos para compartilhar a escala via WhatsApp sem necessidade de login.

---

## 🛠️ Tecnologias Utilizadas

O projeto foi construído utilizando as melhores práticas do ecossistema React moderno.

### Core
- **[React 18](https://reactjs.org/):** Biblioteca principal para construção da interface do usuário.
- **[TypeScript](https://www.typescriptlang.org/):** Superset do JavaScript que adiciona tipagem estática, garantindo maior segurança e manutenibilidade ao código.
- **[Create React App](https://create-react-app.dev/):** Base para configuração do ambiente de desenvolvimento (Webpack/Babel).

### Estilização & UI
- **CSS3 Moderno (Vanilla):** Estilização customizada utilizando Variáveis CSS (Custom Properties) para theming (Modo Claro/Escuro).
- **Design Responsivo:** Layout adaptativo que funciona em Desktops, Tablets e Dispositivos Móveis.
- **Ícones e Emojis:** Interface rica visualmente com uso de emojis para semântica rápida (✅, ⚠️, 📅).

### Manipulação de Dados & Bibliotecas Auxiliares
- **[XLSX (SheetJS)](https://sheetjs.com/):** Para geração e exportação de planilhas Excel (.xlsx).
- **[jsPDF](https://github.com/parallax/jsPDF):** Geração de documentos PDF vetoriais diretamente no navegador.
- **[html2canvas](https://html2canvas.hertzen.com/):** Captura de telas para renderização em PDF.
- **[React Router DOM](https://reactrouter.com/):** Gerenciamento de rotas (Navegação entre Escala Mensal e Parcial).

### Backend & Persistência
- **Local Storage:** O sistema é "Local-First". Todos os dados são salvos instantaneamente no navegador do usuário.
- **[Supabase](https://supabase.com/) (Opcional):** Utilizado como Backend-as-a-Service (BaaS) para persistir escalas quando o usuário deseja gerar um link de compartilhamento permanente.
- **Sharable URLs (State in URL):** Fallback inteligente que codifica os dados da escala em Base64 diretamente na URL se o Supabase não estiver configurado, permitindo compartilhamento "serverless".

---

## � Funcionalidades Detalhadas

### 1. Gestão de Escala Mensal
- **Grade Visual:** Tabela completa com dias do mês (linhas) e funcionários (colunas).
- **Estados Visuais:** Cores distintas para **FOLGA** (Amarelo), **FERIADO** (Vermelho) e dias úteis.
- **Histórico Local:** O sistema lembra as últimas edições, funcionários cadastrados e horários frequentes.

### 2. Escala Parcial (Nova Funcionalidade)
- Permite selecionar um período específico (ex: 15/01 a 20/01).
- Ideal para escalas de cobertura, eventos específicos ou planejamentos semanais.
- Interface dedicada com os mesmos recursos de exportação da escala mensal.

### 3. Modos de Exportação
O sistema brilha na hora de tirar o dado da tela e entregar para a equipe:
- **📄 PDF:** Gera um arquivo A4 paisagem, formatado profissionalmente, pronto para impressão ou envio.
- **📊 Excel:** Cria uma planilha estruturada `.xlsx` editável.
- **📑 Google Sheets:** Recurso exclusivo de "Copiar para Sheets" que formata os dados em HTML/Texto Rico na área de transferência, permitindo colar diretamente no Google Sheets mantendo cores e estrutura.

### 4. Customização
- **Gerenciamento de Funcionários:** Adicione, remova, renomeie e defina cores.
- **Turnos Personalizados:** O sistema aprende os horários que você mais usa e os sugere no dropdown de seleção.
- **Temas:** Alternância fácil entre **Modo Claro** ☀️ e **Modo Escuro** 🌙.

### 5. 🔗 Compartilhamento Inteligente (Link para Funcionários)
Esta é uma das funcionalidades mais poderosas do sistema. O gestor não precisa tirar prints ou mandar arquivos pesados:
1.  O sistema gera um **Link Único** contendo a versão atual da escala.
2.  O gestor copia e envia via WhatsApp/Email.
3.  **Para o Funcionário:** Ao clicar, ele abre uma **versão Mobile otimizada** (somente leitura), leve e rápida, onde pode consultar seus horários instantaneamente sem instalar nada.
    *   *Nota:* Se configurado com Supabase, o link é curto e permanente. Sem backend, o sistema cria um "Link Mágico" com os dados embutidos na própria URL.

### 6. Destaque / Gamificação
- Funcionalidade para destacar um funcionário (ex: "Colaborador do Mês"), salvando essa preferência visualmente.

---

## 📂 Estrutura do Projeto

```
escala-horarios/
├── public/              # Arquivos estáticos (index.html, manifest)
├── src/
│   ├── components/      # (Estrutura interna)
│   ├── utils/           # Funções utilitárias (share.ts, optimization.ts)
│   ├── App.tsx          # Componente Principal (Lógica da Escala Mensal)
│   ├── App.css          # Estilos Globais e do App
│   ├── EscalaParcial.tsx # Lógica da Escala Parcial
│   ├── MobileEscala.tsx  # Versão otimizada para visualização Mobile
│   ├── supabaseClient.ts # Configuração do cliente Supabase
│   ├── types.ts         # Definições de Tipos TypeScript
│   └── index.tsx        # Ponto de entrada
├── .env                 # Variáveis de ambiente
├── package.json         # Dependências e scripts
└── README.md            # Documentação
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- **Node.js** (Versão 14 ou superior)
- **NPM** ou **Yarn**

### Passo a Passo

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/SEU_USUARIO/escala-horarios.git
   cd escala-horarios
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   # ou
   yarn install
   ```

3. **Configure as Variáveis de Ambiente (Opcional):**
   Crie um arquivo `.env` na raiz se desejar usar o recurso de link encurtado via Supabase:
   ```env
   REACT_APP_SUPABASE_URL=sua_url_supabase
   REACT_APP_SUPABASE_ANON_KEY=sua_chave_anonima
   ```
   *Se não configurar, o sistema usará o modo de compartilhamento via URL Base64.*

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm start
   ```
   Acesse `http://localhost:3000` no seu navegador.

---

## � Deploy e Produção

Para gerar a versão otimizada para produção:

```bash
npm run build
```

Isso criará a pasta `build/` com os arquivos estáticos prontos para serem hospedados em plataformas como **Vercel**, **Netlify** ou servidores Apache/Nginx.

---

## 📞 Suporte e Contato

Desenvolvido com foco em produtividade e simplicidade.
Se tiver dúvidas ou sugestões, entre em contato ou abra uma Issue no repositório.

**Armando Linares** - *Desenvolvedor Principal* 