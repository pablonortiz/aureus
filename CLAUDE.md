# AUREUS - Super App Personal

## Descripción General
Aureus es una super app personal modular para Android. Funciona como un hub central con mini-apps (módulos) que se van agregando según necesidad. El usuario siempre es "Pablo" (hardcoded). **Toda la interfaz, textos y labels deben estar en español.**

---

## Stack Técnico

| Tecnología | Elección |
|---|---|
| Framework | React Native **bare** (sin Expo SDK global; se pueden instalar módulos individuales de Expo si es necesario) |
| Lenguaje | TypeScript (estricto) |
| Plataforma | Android only |
| Navegación | React Navigation v6+ (Stack, Bottom Tabs, Drawer si necesario) |
| Estado global | Zustand |
| Base de datos | SQLite via `react-native-sqlite-storage` |
| Iconos | Material Symbols (consistente con los mockups de Stitch) |
| UI | Custom components con StyleSheet (sin librerías de UI externas) |
| Testing | Jest + React Testing Library (básico) |
| Notificaciones | Locales básicas (react-native-push-notification o similar) |

---

## Design System

### Paleta de colores (Dark Mode Only)

```typescript
const colors = {
  primary: '#e8ba30',           // Dorado principal - acentos, botones, texto destacado
  primaryLight: 'rgba(232, 186, 48, 0.1)',  // Fondo sutil dorado (íconos, badges)
  primaryMuted: 'rgba(232, 186, 48, 0.3)',  // Bordes dorados
  primaryGlow: 'rgba(232, 186, 48, 0.4)',   // Sombra glow del FAB

  backgroundDark: '#1a1812',    // Fondo principal de la app
  surfaceDark: '#26241c',       // Cards principales, superficies elevadas
  cardDark: '#1e1e1e',          // Cards secundarias, nav bar
  neutralDark: '#2a2a2a',       // Chips completados, elementos neutros

  textPrimary: '#f1f5f9',       // slate-100 - Texto principal
  textSecondary: '#94a3b8',     // slate-400 - Texto secundario, subtítulos
  textMuted: '#64748b',         // slate-500 - Texto deshabilitado, placeholders
  textDanger: '#ef4444',        // Rojo para iconos de Gmail

  borderSubtle: 'rgba(255, 255, 255, 0.05)', // Bordes sutiles de cards
  borderGold: 'rgba(232, 186, 48, 0.3)',     // Bordes dorados
  successGreen: '#22c55e',      // Estado completado
};
```

### Tipografía

- **Fuente:** Manrope (pesos: 300, 400, 500, 600, 700, 800)
- **Título app:** extrabold, tracking tight, uppercase → "AUREUS"
- **Headings:** bold, tracking tight
- **Body:** regular/medium
- **Captions:** xs, bold, uppercase, tracking widest → Labels de sección
- **Tabs:** 10px, bold, uppercase, tracking wider

### Bordes y Radios

```typescript
const borderRadius = {
  sm: 8,    // 0.5rem - default
  md: 12,   // chips, inputs
  lg: 16,   // 1rem - cards
  xl: 24,   // 1.5rem - modals, sheets
  full: 9999, // botones pill, avatares
};
```

### Efectos

- **Glass effect:** `rgba(30, 30, 30, 0.8)` con backdrop blur 12px (headers sticky)
- **Card shadow:** `shadow-lg shadow-black/5`
- **FAB glow:** `shadow: 0 0 20px rgba(232, 186, 48, 0.4)`
- **Ambient blurs:** Círculos difuminados de `primary/5` en esquinas del fondo
- **Strikethrough:** `text-decoration: line-through; text-decoration-thickness: 1.5px`

---

## Arquitectura del Proyecto

### Estructura de carpetas (Feature Folders - Monorepo)

```
src/
├── app/                        # Entry point, providers, navegación raíz
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # Stack principal
│   │   ├── MainTabNavigator.tsx # Bottom tabs: Inicio, Módulos, +, Perfil, Más
│   │   └── types.ts
│   └── providers/
│       └── AppProviders.tsx     # Wraps: NavigationContainer, etc.
│
├── core/                       # Código compartido entre módulos
│   ├── components/             # Componentes reutilizables (Button, Card, Chip, FAB, etc.)
│   ├── theme/                  # Colores, tipografía, spacing, design tokens
│   ├── database/               # Setup SQLite, migrations, helpers
│   ├── hooks/                  # Hooks compartidos
│   ├── utils/                  # Utilidades generales
│   └── types/                  # Tipos globales
│
├── features/                   # MÓDULOS - Cada feature es auto-contenida
│   ├── home/                   # Dashboard principal
│   │   ├── screens/
│   │   ├── components/
│   │   └── hooks/
│   │
│   ├── gmail-accounts/         # Gestor de Cuentas Gmail
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/              # Zustand slice
│   │   ├── database/           # Queries SQLite del módulo
│   │   └── types/
│   │
│   ├── clipboard/              # Clipboard Inteligente
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── database/
│   │   └── types/
│   │
│   ├── focus/                  # Productividad / Deep Work
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── database/
│   │   └── types/
│   │
│   ├── finance/                # Finanzas
│   │   ├── screens/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── store/
│   │   ├── database/
│   │   └── types/
│   │
│   ├── modules/                # Pantalla de listado de módulos
│   │   └── screens/
│   │
│   └── profile/                # Perfil / Configuración
│       └── screens/
│
└── assets/                     # Imágenes, fuentes, logo
    ├── fonts/
    ├── images/
    └── icons/
```

### Patrón por módulo

Cada módulo en `features/` debe seguir esta estructura:
1. **screens/** - Pantallas del módulo (cada una es un componente de navegación)
2. **components/** - Componentes propios del módulo (no compartidos)
3. **hooks/** - Custom hooks del módulo
4. **store/** - Zustand store slice (estado del módulo)
5. **database/** - Queries y esquemas SQLite propios
6. **types/** - TypeScript interfaces/types del módulo

### Convenciones de código

- Nombres de archivos: `PascalCase` para componentes, `camelCase` para utils/hooks
- Hooks: prefijo `use` → `useGmailAccounts.ts`
- Stores Zustand: `use[Feature]Store.ts` → `useClipboardStore.ts`
- Screens: `[Nombre]Screen.tsx` → `AccountsScreen.tsx`
- Componentes: `[Nombre].tsx` → `GmailCard.tsx`
- Todo el código, comentarios y nombres de variables en **inglés**
- Toda la UI (textos, labels, placeholders) en **español**

---

## Navegación

### Estructura principal

```
RootStack
├── MainTabs (Bottom Tab Navigator)
│   ├── Inicio (HomeScreen - Dashboard)
│   ├── Módulos (ModulesListScreen)
│   ├── [FAB +] → Acción contextual según módulo activo
│   ├── Perfil (ProfileScreen)
│   └── Más (SettingsScreen)
│
├── GmailAccountsStack
│   ├── AccountsScreen (lista de Gmails)
│   ├── AddGmailScreen
│   └── AddPlatformScreen
│
├── ClipboardStack
│   ├── ClipboardScreen (público)
│   ├── VaultScreen (privado - requiere PIN)
│   ├── AddLinkScreen
│   └── ManageCategoriesScreen
│
├── FocusStack
│   ├── FocusTimerScreen
│   ├── FocusTasksScreen
│   └── FocusSettingsScreen
│
└── FinanceStack
    ├── FinanceOverviewScreen
    ├── TransactionsScreen
    ├── AddTransactionScreen
    └── InsightsScreen
```

### Bottom Tab Bar

- **Estilo:** Fondo `backgroundDark/80` con backdrop blur, borde superior `borderGold`
- **Ícono activo:** Color `primary`, filled
- **Ícono inactivo:** Color `slate-500`
- **FAB central:** Botón dorado elevado (-8px arriba del tab bar), con glow shadow, borde 4px del color de fondo

---

## Módulos - Especificación Detallada

### 1. Gestor de Cuentas Gmail (`gmail-accounts`)

**Propósito:** Trackear en qué plataformas/sitios está registrado cada Gmail.

**Funcionalidad:**
- Agregar cuentas Gmail (siempre terminan en `@gmail.com`, el usuario solo tipea el prefijo)
- Botón global **"Añadir Plataforma a Todos"**: agrega un chip/sitio a TODOS los Gmails existentes de una vez
- Cada Gmail muestra chips de plataformas con dos estados:
  - **Pendiente:** Borde dorado, texto dorado, ícono `sync`, fondo `primary/5`
  - **Completado (tachado):** Fondo `neutralDark`, opacidad 40%, texto con strikethrough, ícono `check_circle`
- Al tocar un chip pendiente → pasa a completado (tachado)
- Al tocar un chip completado → vuelve a pendiente
- Cuando TODOS los chips de un Gmail están completados:
  - El email se muestra con strikethrough
  - La card baja su opacidad (60%) y tiene un leve grayscale
  - Muestra subtítulo "Todos los registros sincronizados" en verde
- Card de Gmail muestra:
  - Ícono de mail (rojo)
  - Email address
  - Subtítulo: "X plataformas pendientes" / "Listo para configurar" / "Todos los registros sincronizados"
  - Botón menú (3 puntos) → editar, eliminar
- FAB + en esta pantalla → agrega nuevo Gmail

**Schema SQLite:**
```sql
CREATE TABLE gmail_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email_prefix TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE platforms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE gmail_platform_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gmail_id INTEGER NOT NULL REFERENCES gmail_accounts(id) ON DELETE CASCADE,
  platform_id INTEGER NOT NULL REFERENCES platforms(id) ON DELETE CASCADE,
  is_registered BOOLEAN DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(gmail_id, platform_id)
);
```

---

### 2. Clipboard Inteligente (`clipboard`)

**Propósito:** Guardar, catalogar y organizar links. Tiene sección pública y privada (con PIN).

**Funcionalidad:**
- **Toggle Public/Private** en el header
  - Public: acceso libre
  - Private: requiere PIN de 4 dígitos para acceder (Secure Vault)
- **Categorías:** Sistema de Tags + Carpetas
  - Chips de filtrado horizontal scrollable: "Todos", "Trabajo", "Inspiración", "Compras", etc.
  - El usuario puede crear nuevas categorías
- **Link cards muestran:**
  - Ícono/thumbnail del link
  - Título
  - URL truncada
  - Badge de categoría (uppercase, fondo dorado/10)
  - Acciones: Copiar, Compartir, Visitar, Opciones
- **Barra de pegar** fija arriba del tab bar: input "Pegar link aquí..." + botón + dorado
- **Secure Vault (Private):**
  - Pantalla con ícono de candado
  - Texto: "Bóveda Segura - Accedé a tus datos sensibles y links privados"
  - Botón "Desbloquear con PIN"
  - Misma funcionalidad que el público una vez desbloqueado
- FAB + en esta pantalla → abre formulario para agregar link

**Schema SQLite:**
```sql
CREATE TABLE clipboard_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE clipboard_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  category_id INTEGER REFERENCES clipboard_categories(id),
  is_private BOOLEAN DEFAULT 0,
  thumbnail_url TEXT,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE clipboard_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE clipboard_link_tags (
  link_id INTEGER NOT NULL REFERENCES clipboard_links(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES clipboard_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);

-- PIN se guarda hasheado en app_settings
CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

---

### 3. Productividad / Deep Work (`focus`)

**Propósito:** Sesiones de trabajo profundo con timer Pomodoro y lista de tareas de enfoque.

**Funcionalidad:**
- Timer circular grande (25:00 por defecto)
- Header: "DEEP WORK" / "Sesión X de Y"
- Controles: Reset, Play/Pause, Skip
- Lista "Enfoque de Hoy" con checkboxes (tareas con strikethrough al completar)
- Botón "+ Agregar tarea de enfoque"
- Configuración de duración de sesiones y descansos
- Notificaciones locales al terminar sesión
- FAB + en esta pantalla → agrega tarea de enfoque

---

### 4. Finanzas (`finance`)

**Propósito:** Controlar balance y gastos personales.

**Funcionalidad:**
- Balance total destacado con formato moneda
- Indicador de variación mensual (+/-%)
- Gráfico de tendencia de gastos (últimos 30 días)
- Lista de transacciones recientes con:
  - Ícono de categoría
  - Nombre, categoría, fecha/hora
  - Monto (negativo en rojo/blanco)
- Botón "Agregar Transacción"
- Categorías de gasto: Comida, Servicios, Compras, Transporte, Entretenimiento, etc.
- FAB + en esta pantalla → agrega transacción

---

## Dashboard / Home

- Saludo: "Bienvenido de vuelta, **Pablo**"
- Subtítulo: "Todo está en orden para tu día."
- Grid 2 columnas con cards de módulos activos:
  - Cada card muestra: ícono, nombre del módulo, mini resumen (ej: "Revisá tu balance"), flecha ↗
  - Borde dorado sutil, hover/press aumenta opacidad del borde
- Banner "Dato del Día" (card dorada full-width con gradiente `from-primary to-#b88d0d`)
- Sección "Actividad Reciente" con items de los distintos módulos

---

## Convenciones de Desarrollo

### Git
- Commits en inglés, convención conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Branch principal: `main`
- Feature branches: `feature/[modulo]-[descripcion]`

### Archivos de referencia de diseño
- Mockups de Stitch guardados en: `/Users/pablonortiz/Downloads/stitch_nexus_hub/`
  - `nexus_hub/` → Home/Dashboard
  - `finance_module/` → Módulo Finanzas
  - `focus_module/` → Módulo Productividad
  - `gestor_de_cuentas_gmail/` → Módulo Gmail
  - `clipboard_inteligente/` → Módulo Clipboard
- Cada carpeta tiene `screen.png` (mockup visual) y `code.html` (referencia de estilos)

### Prioridades
1. Estructura del proyecto y navegación base
2. Design system y componentes core
3. Módulo Gmail Accounts (más definido)
4. Módulo Clipboard
5. Módulo Focus
6. Módulo Finance
7. Dashboard con datos reales de los módulos
8. Pulido y testing

### Reglas importantes
- **NO** usar Expo SDK global. Solo módulos individuales si son necesarios.
- **NO** agregar backend ni autenticación de usuario. Todo es local.
- **NO** hacer over-engineering. Mantener las cosas simples.
- **SÍ** seguir los diseños de Stitch lo más fielmente posible.
- **SÍ** usar TypeScript estricto en todo el proyecto.
- **SÍ** mantener cada módulo auto-contenido en su feature folder.
- **SÍ** toda la interfaz en español, código en inglés.
