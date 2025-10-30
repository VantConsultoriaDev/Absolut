# Regras de Desenvolvimento para o Aplicativo MOBTAX

Este documento descreve a pilha de tecnologia utilizada no projeto MOBTAX e as diretrizes para o uso de bibliotecas e ferramentas.

## Pilha de Tecnologia

O aplicativo MOBTAX é construído com as seguintes tecnologias principais:

*   **React**: Biblioteca JavaScript para construção de interfaces de usuário interativas.
*   **TypeScript**: Superset do JavaScript que adiciona tipagem estática, melhorando a robustez e manutenibilidade do código.
*   **Tailwind CSS**: Framework CSS utilitário para estilização rápida e responsiva, com foco em classes de utilidade.
*   **Vite**: Ferramenta de build e servidor de desenvolvimento rápido, otimizado para projetos modernos de frontend.
*   **React Router DOM**: Biblioteca para gerenciamento de rotas e navegação na aplicação React.
*   **Lucide React**: Coleção de ícones leves e personalizáveis, utilizados para aprimorar a interface do usuário.
*   **date-fns**: Biblioteca modular para manipulação e formatação de datas, oferecendo uma alternativa leve ao Moment.js.
*   **axios**: Cliente HTTP baseado em Promises para fazer requisições a APIs externas.
*   **XLSX (SheetJS)**: Biblioteca para leitura e escrita de arquivos Excel e CSV, utilizada para funcionalidades de importação.
*   **Supabase Client**: Cliente JavaScript para interagir com serviços Supabase (autenticação, banco de dados, etc.).
*   **Context API (React)**: Utilizada para gerenciamento de estado global, como autenticação, tema e dados do "banco de dados" local.

## Regras de Uso de Bibliotecas e Ferramentas

Para garantir consistência, performance e manutenibilidade, siga as seguintes regras ao desenvolver:

1.  **Estilização**:
    *   **Tailwind CSS**: Utilize exclusivamente classes do Tailwind CSS para toda a estilização. Evite CSS inline ou arquivos CSS personalizados, a menos que seja estritamente necessário para overrides específicos e justificados.
    *   **shadcn/ui**: Para novos componentes de UI, **sempre** tente utilizar os componentes pré-construídos do shadcn/ui. Eles já vêm com estilização Tailwind e são acessíveis. Se um componente shadcn/ui não atender à necessidade, crie um novo componente customizado com Tailwind.

2.  **Ícones**:
    *   **Lucide React**: Todos os ícones devem ser importados e utilizados do pacote `lucide-react`.

3.  **Manipulação de Datas**:
    *   **date-fns**: Utilize `date-fns` para todas as operações de formatação, parseamento e cálculo com datas.

4.  **Requisições HTTP**:
    *   **axios**: Para todas as chamadas a APIs externas, utilize a biblioteca `axios`.

5.  **Roteamento**:
    *   **React Router DOM**: Gerencie todas as rotas da aplicação utilizando `react-router-dom`. As rotas principais devem permanecer em `src/App.tsx`.

6.  **Gerenciamento de Estado**:
    *   **React Context API**: Para estados globais (autenticação, tema, dados do "banco de dados" simulado), utilize os Contextos existentes (`AuthContext`, `ThemeContext`, `DatabaseContext`).
    *   **useState/useReducer**: Para estados locais de componentes, utilize `useState` ou `useReducer` do React.

7.  **Formulários**:
    *   Para formulários simples, o gerenciamento de estado com `useState` é aceitável.
    *   Para formulários mais complexos, considere utilizar `react-hook-form` (já instalado) para validação e gerenciamento de estado otimizados.

8.  **Persistência de Dados**:
    *   **DatabaseContext (localStorage)**: Atualmente, o `DatabaseContext` simula um banco de dados utilizando `localStorage`. Todas as operações CRUD para entidades da aplicação devem ser realizadas através das funções fornecidas por este contexto.
    *   **Supabase**: O cliente Supabase está configurado (`src/lib/supabaseClient.ts`) para autenticação e futuras integrações com um backend real.

9.  **Importação de Arquivos**:
    *   **XLSX (SheetJS)**: Para funcionalidades de importação de dados via arquivos CSV ou Excel, utilize a biblioteca `xlsx` conforme demonstrado em `src/services/importService.ts`.

10. **Componentes**:
    *   **Modularidade**: Crie um novo arquivo para cada novo componente ou hook, mantendo os arquivos pequenos e focados (idealmente, menos de 100 linhas de código por componente).
    *   **Localização**: Componentes reutilizáveis devem ser colocados em `src/components/`. Páginas devem ser colocadas em `src/pages/`.

11. **Undo/Redo**:
    *   **UndoService**: Utilize o `undoService` (`src/services/undoService.ts`) e o `UndoButton` (`src/components/UndoButton.tsx`) para implementar funcionalidades de desfazer operações críticas.