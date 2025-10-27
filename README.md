# MOBTAX - Sistema de Gestão de Transportes

Sistema completo de gestão para empresas de transporte, desenvolvido com React, TypeScript e Tailwind CSS.

## 🚀 Funcionalidades

### 📊 Dashboard
- Visão geral financeira com receitas, despesas e lucro
- Estatísticas de cargas ativas e pendentes
- Resumo de parceiros, veículos e motoristas
- Movimentações financeiras recentes
- Informações detalhadas de cargas

### 💰 Módulo Financeiro
- Gestão completa de receitas e despesas
- Categorização automática por tipo
- Filtros avançados por período, tipo e status
- Cálculos automáticos de totais e saldos
- Interface intuitiva para CRUD de movimentações

### 📦 Módulo de Cargas
- Controle completo de cargas de transporte
- Status detalhados (Pendente, Em Trânsito, Entregue, Cancelada)
- Integração com parceiros e informações financeiras
- Filtros por status, parceiro e período
- Gestão de origem, destino e valores

### 🤝 Módulo de Parceiros
- Gestão de pessoas físicas (PF) e jurídicas (PJ)
- Cadastro completo com documentos (CPF/CNPJ)
- Gerenciamento de motoristas vinculados
- Controle de veículos por parceiro
- Interface organizada por abas

### 👥 Módulo de Usuários
- Sistema hierárquico de permissões
- Três níveis: Administrador Global, Master e Usuário Comum
- Controle granular de acesso por funcionalidade
- Gestão completa de usuários com validações
- Interface segura com verificação de permissões

## 🛠️ Tecnologias Utilizadas

- **React 18** - Biblioteca principal
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Framework de estilos
- **Vite** - Build tool e dev server
- **Lucide React** - Ícones modernos
- **date-fns** - Manipulação de datas
- **React Router DOM** - Roteamento

## 🏗️ Arquitetura

### Estrutura de Pastas
```
src/
├── components/          # Componentes reutilizáveis
│   ├── Layout.tsx      # Layout principal da aplicação
│   └── ProtectedRoute.tsx # Proteção de rotas
├── contexts/           # Contextos React
│   ├── AuthContext.tsx # Autenticação
│   ├── DatabaseContext.tsx # Simulação de banco de dados
│   └── ThemeContext.tsx # Tema claro/escuro
├── pages/              # Páginas da aplicação
│   ├── Dashboard.tsx   # Página inicial
│   ├── Financeiro.tsx  # Gestão financeira
│   ├── Cargas.tsx      # Gestão de cargas
│   ├── Parceiros.tsx   # Gestão de parceiros
│   ├── Usuarios.tsx    # Gestão de usuários
│   └── Login.tsx       # Página de login
└── App.tsx             # Componente raiz
```

### Contextos Principais

#### DatabaseContext
- Simula operações de banco de dados usando localStorage
- Gerencia estado global de todas as entidades
- Fornece operações CRUD para cada módulo
- Mantém relacionamentos entre entidades

#### AuthContext
- Gerencia autenticação de usuários
- Controla sessões e permissões
- Fornece informações do usuário logado

#### ThemeContext
- Controla tema claro/escuro
- Persiste preferência do usuário
- Aplica classes CSS dinamicamente

## 🎨 Design System

### Cores Principais
- **Primary**: Azul (#2563eb)
- **Success**: Verde (#16a34a)
- **Danger**: Vermelho (#dc2626)
- **Warning**: Amarelo (#d97706)

### Componentes Estilizados
- Botões com estados (hover, focus, disabled)
- Campos de entrada com validação visual
- Cards com efeitos de hover
- Badges para status
- Tabelas responsivas
- Modais e formulários

## 🔐 Sistema de Permissões

### Níveis de Acesso

#### Administrador Global
- Acesso total ao sistema
- Pode criar/editar/excluir qualquer usuário
- Acesso a todas as funcionalidades

#### Master
- Acesso avançado com algumas restrições
- Não pode gerenciar administradores
- Pode criar usuários Master e Comum

#### Usuário Comum
- Acesso básico ao sistema
- Pode editar apenas seu próprio perfil
- Acesso limitado às funcionalidades

## 📱 Responsividade

- Design mobile-first
- Breakpoints otimizados para diferentes dispositivos
- Sidebar colapsível em telas menores
- Tabelas com scroll horizontal
- Modais adaptáveis

## 🌙 Tema Escuro

- Suporte completo a tema escuro
- Transições suaves entre temas
- Persistência da preferência do usuário
- Cores otimizadas para ambos os temas

## 🚀 Como Executar

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
# Clone o repositório
git clone [url-do-repositorio]

# Entre no diretório
cd mobtax

# Instale as dependências
npm install

# Execute o projeto
npm run dev
```

### Acesso
- URL: http://localhost:3000re
- Usuário demo: admin
- Senha demo: admin123

## 📊 Dados de Demonstração

O sistema inclui dados pré-carregados para demonstração:

### Usuários
- **admin** (Administrador Global)
- **master** (Master)
- **user** (Usuário Comum)

### Parceiros
- Empresas de transporte fictícias
- Motoristas associados
- Veículos cadastrados

### Movimentações Financeiras
- Receitas e despesas do mês atual
- Histórico de movimentações
- Categorias diversificadas

### Cargas
- Cargas em diferentes status
- Rotas variadas
- Valores realistas

## 🔧 Funcionalidades Técnicas

### Validações
- Validação de formulários em tempo real
- Verificação de permissões por ação
- Sanitização de dados de entrada

### Performance
- Memoização de cálculos complexos
- Lazy loading de componentes
- Otimização de re-renders

### UX/UI
- Feedback visual para ações
- Loading states
- Mensagens de erro claras
- Navegação intuitiva

## 📈 Próximas Funcionalidades

- [ ] Relatórios em PDF
- [ ] Integração com APIs externas
- [ ] Notificações push
- [ ] Backup automático
- [ ] Auditoria de ações
- [ ] Dashboard analytics avançado

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas, entre em contato através dos issues do GitHub.

---

**MOBTAX** - Transformando a gestão de transportes com tecnologia moderna e interface intuitiva.