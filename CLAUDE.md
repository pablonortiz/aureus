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
| Navegación | React Navigation v7 (Stack, Bottom Tabs) |
| Estado global | Zustand |
| Base de datos | SQLite via `@op-engineering/op-sqlite` |
| Iconos | Material Symbols via `react-native-vector-icons` |
| UI | Custom components con StyleSheet (sin librerías de UI externas) |
| Fuente | Manrope (6 pesos: 300-800) |
| Notificaciones | Locales via `notifee` |

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

### Estructura de carpetas (Feature Folders)

```
src/
├── app/                        # Entry point, providers, navegación raíz
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # Stack principal
│   │   ├── MainTabNavigator.tsx # Bottom tabs + FAB
│   │   └── types.ts
│   └── providers/
│       └── AppProviders.tsx
│
├── core/                       # Código compartido entre módulos
│   ├── components/             # Button, Card, Chip, EmptyState, FAB, Header, Icon, Input, PinLock, SectionTitle
│   ├── theme/                  # colors, typography, spacing, borderRadius
│   ├── database/               # Setup SQLite, migrations, helpers
│   ├── hooks/                  # useAppPin
│   ├── utils/                  # Utilidades generales
│   └── types/                  # Tipos globales (index.ts)
│
├── features/                   # MÓDULOS - Cada feature es auto-contenida
│   ├── home/                   # Dashboard principal
│   ├── gmail-accounts/         # Gestor de Cuentas Gmail
│   ├── clipboard/              # Clipboard Inteligente
│   ├── focus/                  # Productividad / Deep Work
│   ├── finance/                # Finanzas
│   ├── gallery/                # Galería Oculta (vault)
│   ├── source-finder/          # Búsqueda inversa de imágenes
│   ├── radar/                  # Generador de queries IA
│   ├── calculator/             # Calculadora / camuflaje de galería
│   ├── modules/                # Pantalla de listado de módulos
│   └── profile/                # Perfil / Configuración
│
└── assets/                     # Fuentes, imágenes, iconos
```

### Patrón por módulo

Cada módulo en `features/` sigue esta estructura (carpetas opcionales según necesidad):
1. **screens/** - Pantallas del módulo
2. **components/** - Componentes propios del módulo
3. **hooks/** - Custom hooks del módulo
4. **store/** - Zustand store slice
5. **services/** - Integraciones con APIs externas
6. **database/** - Queries SQLite propios
7. **types/** - TypeScript interfaces/types

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
│   ├── GmailAccounts
│   ├── AddGmail
│   └── AddPlatform
│
├── ClipboardStack
│   ├── Clipboard
│   ├── AddItem / EditItem
│   ├── FolderView
│   ├── ManageFolders / ManageTags
│   └── PinLock
│
├── FocusStack
│   ├── Focus
│   └── FocusSettings
│
├── FinanceStack
│   ├── Finance
│   ├── AddTransaction
│   ├── ManageRecurring
│   └── AddRecurring
│
├── GalleryStack
│   ├── Gallery
│   ├── GalleryFolder
│   ├── MediaViewer
│   ├── ManageGalleryCategories
│   └── GalleryTrash
│
├── SourceFinderStack
│   ├── SourceFinder
│   └── SearchResult
│
├── RadarStack
│   ├── Radar
│   ├── RadarResults
│   └── RadarSaved
│
└── Calculator
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
- Toggle entre pendiente/completado al tocar
- Card con ícono de mail (rojo), email, subtítulo de estado, menú de 3 puntos

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
  is_registered INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(gmail_id, platform_id)
);
```

---

### 2. Clipboard Inteligente (`clipboard`)

**Propósito:** Guardar y organizar links y notas. Sección pública y privada (con PIN).

**Funcionalidad:**
- Toggle Public/Private en el header (privado requiere PIN de 4 dígitos)
- Organización por carpetas y tags (ambos con soporte público/privado)
- Items tipo `link` o `note` con título, URL/contenido, carpeta, notas
- Acciones: Copiar, Compartir, Visitar, Editar, Eliminar
- Secure Vault con pantalla de candado y desbloqueo por PIN

**Schema SQLite:**
```sql
CREATE TABLE clipboard_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  icon TEXT, color TEXT,
  is_private INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE clipboard_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL, url TEXT NOT NULL,
  type TEXT DEFAULT 'link',  -- 'link' | 'note'
  content TEXT,
  folder_id INTEGER REFERENCES clipboard_folders(id),
  is_private INTEGER DEFAULT 0,
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE clipboard_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_private INTEGER DEFAULT 0
);

CREATE TABLE clipboard_link_tags (
  link_id INTEGER NOT NULL REFERENCES clipboard_links(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES clipboard_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (link_id, tag_id)
);
```

---

### 3. Productividad / Deep Work (`focus`)

**Propósito:** Sesiones de trabajo profundo con timer Pomodoro y lista de tareas de enfoque.

**Funcionalidad:**
- Timer circular grande (25:00 por defecto), configurable
- Controles: Reset, Play/Pause, Skip
- Lista "Enfoque de Hoy" con checkboxes y strikethrough
- Configuración de duración de sesiones y descansos
- Notificaciones locales al terminar sesión
- Tracking de sesiones completadas por día

**Schema SQLite:**
```sql
CREATE TABLE focus_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  is_completed INTEGER DEFAULT 0,
  date TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE focus_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  duration_minutes INTEGER NOT NULL DEFAULT 25,
  completed INTEGER DEFAULT 0,
  date TEXT DEFAULT (date('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
```

---

### 4. Finanzas (`finance`)

**Propósito:** Controlar balance, gastos e ingresos personales.

**Funcionalidad:**
- Balance total en ARS con conversión automática de USD (dólar blue)
- Chip de pagos recurrentes pendientes con lookahead configurable al mes siguiente
- Gráfico de barras de gastos por día, navegable por mes
- Transacciones con categorías múltiples, moneda ARS/USD, tipo ingreso/gasto
- Búsqueda de transacciones por título (normalizada, sin acentos)
- Edición de transacciones existentes (press para editar)
- Gastos recurrentes con 3 frecuencias:
  - **Mensual:** Se genera como pendiente cada mes, usa último monto confirmado para ARS
  - **Cuotas:** Se genera como confirmado automáticamente con título "(X/Y)", auto-elimina al completar
  - **Anual:** Se genera como pendiente solo en el mes configurado
- Tabs Mensuales/Anuales en la gestión de recurrentes con badges de tipo
- Categorías: Comida, Amors, Suscripciones, Prestamos, Salud, Transporte, Supermercado, Partido, Compras, Otro

**Schema SQLite:**
```sql
CREATE TABLE finance_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, icon TEXT, color TEXT
);

CREATE TABLE finance_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
  currency TEXT DEFAULT 'ARS',
  status TEXT DEFAULT 'confirmed',  -- 'confirmed' | 'pending'
  recurring_id INTEGER,
  exchange_rate REAL,
  date TEXT DEFAULT (datetime('now')),
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE finance_transaction_categories (
  transaction_id INTEGER NOT NULL REFERENCES finance_transactions(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, category_id)
);

CREATE TABLE finance_recurring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  type TEXT NOT NULL DEFAULT 'expense',
  day_of_month INTEGER NOT NULL,
  frequency TEXT DEFAULT 'monthly',  -- 'monthly' | 'installment' | 'annual'
  total_installments INTEGER,
  start_month INTEGER,
  start_year INTEGER,
  month_of_year INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE finance_recurring_categories (
  recurring_id INTEGER NOT NULL REFERENCES finance_recurring(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (recurring_id, category_id)
);
```

**Servicios externos:**
- Dólar Blue API para cotización USD → ARS (con cache por fecha)

---

### 5. Galería Oculta (`gallery`)

**Propósito:** Vault seguro de fotos y videos protegido por PIN, camuflado detrás de la calculadora.

**Funcionalidad:**
- Acceso mediante código secreto ingresado en la Calculadora (default: "1234", configurable)
- FLAG_SECURE activo (no aparece en screenshots ni recientes)
- Importar fotos/videos desde galería del dispositivo o cámara, con eliminación del original
- Almacenamiento en directorio interno del vault (no accesible por file managers)
- Organización por carpetas jerárquicas con covers
- Categorías con colores e íconos (General, Capturas, Personales, Memes)
- Favoritos, búsqueda por notas (normalizada sin acentos), orden por fecha o tamaño
- Drag-select para selección múltiple
- Media viewer con zoom, swipe entre medios, overlay de metadata
- Papelera con retención de 30 días y auto-limpieza
- Operaciones bulk: mover, favorito, eliminar, exportar
- Share target nativo de Android (recibir imágenes compartidas)

**Schema SQLite:**
```sql
CREATE TABLE gallery_folders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  parent_id INTEGER REFERENCES gallery_folders(id) ON DELETE CASCADE,
  cover_media_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE gallery_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT, icon TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE gallery_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  vault_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK(media_type IN ('image', 'video')),
  file_size INTEGER DEFAULT 0,
  width INTEGER, height INTEGER, duration INTEGER,
  folder_id INTEGER REFERENCES gallery_folders(id) ON DELETE SET NULL,
  is_favorite INTEGER DEFAULT 0,
  notes TEXT, notes_normalized TEXT,
  trashed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE gallery_media_categories (
  media_id INTEGER NOT NULL REFERENCES gallery_media(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES gallery_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (media_id, category_id)
);
```

**Servicios:**
- `vaultService.ts` — import/export de media, thumbnails de video, gestión del vault path
- `react-native-image-picker` — selección de fotos/cámara
- `react-native-create-thumbnail` — thumbnails de video
- `@dr.pogodin/react-native-fs` — operaciones de filesystem

---

### 6. Source Finder (`source-finder`)

**Propósito:** Buscar la fuente original de imágenes desde tweets de Twitter/X.

**Funcionalidad:**
- Pegar URL de tweet → extrae imágenes vía FxTwitter API
- Cada imagen se busca en SauceNAO (reverse image search)
- Resultados filtrados por similaridad > 50% (máx 3 por imagen)
- Muestra: similaridad %, nombre de fuente, título, creadores, base de datos
- Historial de búsquedas con metadata del tweet
- API key de SauceNAO configurable desde modal
- Rate limiting de 5 segundos entre búsquedas

**Schema SQLite:**
```sql
CREATE TABLE source_finder_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tweet_url TEXT NOT NULL, tweet_id TEXT NOT NULL,
  tweet_text TEXT, tweet_author TEXT, tweet_author_avatar TEXT,
  image_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE source_finder_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL REFERENCES source_finder_searches(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  source_name TEXT, source_title TEXT, similarity REAL,
  source_url TEXT, thumbnail_url TEXT, index_name TEXT, creators TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Servicios externos:**
- FxTwitter API (`api.fxtwitter.com`) — metadata y fotos del tweet
- SauceNAO API (`saucenao.com`) — búsqueda inversa de imágenes

---

### 7. Radar (`radar`)

**Propósito:** Generador de queries de búsqueda OSINT usando IA.

**Funcionalidad:**
- Input de descripción en lenguaje natural
- IA (Groq, LLaMA 3.3 70B) genera 5-10 queries optimizados para múltiples plataformas
- Plataformas: Twitter/X, Google News, Reddit, Instagram, Google
- Cada query incluye sintaxis específica de plataforma (hashtags, subreddits, operadores)
- Launch URL directo a cada plataforma con query pre-cargado
- Guardar búsquedas importantes con notas editables (auto-save debounced)
- Keywords y tip extraídos de cada búsqueda
- Historial con opción de limpiar no-guardados
- API key de Groq configurable

**Schema SQLite:**
```sql
CREATE TABLE radar_searches (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  keywords TEXT, tip TEXT,
  is_saved INTEGER DEFAULT 0,
  notes TEXT,
  query_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE radar_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  search_id INTEGER NOT NULL REFERENCES radar_searches(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  query_text TEXT NOT NULL,
  description TEXT,
  launch_url TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

**Servicios externos:**
- Groq API (`api.groq.com`) — LLaMA 3.3 70B para generación de queries

---

### 8. Calculadora (`calculator`)

**Propósito:** Calculadora básica que funciona como pantalla de camuflaje para la Galería Oculta.

**Funcionalidad:**
- Operaciones estándar: +, −, ×, ÷, %
- Clear (C), Backspace (⌫), decimales
- Formato numérico con separadores
- Display de expresión y resultado con font sizing dinámico
- **Desbloqueo secreto:** si el resultado coincide con el código secreto (default "1234"), navega a la Galería
- Código configurable desde settings de la Galería, guardado en `app_settings`

---

## Dashboard / Home

- Saludo: "Bienvenido de vuelta, **Pablo**"
- Subtítulo: "Todo está en orden para tu día."
- Grid 2 columnas con cards de módulos activos:
  - Cada card muestra: ícono, nombre del módulo, mini resumen, flecha ↗
  - Borde dorado sutil, hover/press aumenta opacidad del borde
- Banner "Dato del Día" (card dorada full-width con gradiente)
- Sección "Actividad Reciente" con items de los distintos módulos

---

## Convenciones de Desarrollo

### Git
- Commits en inglés, convención conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`
- Branch principal: `master`

### Diseño UI — Regla de Stitch
Antes de crear una **pantalla nueva** o hacer un **cambio significativo en el layout** de una pantalla existente, **preguntar al usuario** si quiere generar un mockup en Stitch para usar como referencia de diseño. No asumir que se puede proceder directamente con la implementación visual.

### Reglas importantes
- **NO** usar Expo SDK global. Solo módulos individuales si son necesarios.
- **NO** agregar backend ni autenticación de usuario. Todo es local.
- **NO** hacer over-engineering. Mantener las cosas simples.
- **SÍ** usar TypeScript estricto en todo el proyecto.
- **SÍ** mantener cada módulo auto-contenido en su feature folder.
- **SÍ** toda la interfaz en español, código en inglés.

### Settings compartidos
La tabla `app_settings` almacena configuraciones globales como key-value:
- `app_pin` — PIN de 4 dígitos para Clipboard privado y Galería
- `gallery_secret_code` — Código numérico para desbloquear galería desde calculadora
- `saucenao_api_key` — API key de SauceNAO (Source Finder)
- `groq_api_key` — API key de Groq (Radar)
- `pending_lookahead_day` — Día del mes siguiente hasta el cual se cuentan pagos pendientes (default: 5)
