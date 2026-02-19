# AUREUS

Super app personal modular para Android. Un hub central con mini-apps que se van agregando segun necesidad. Todo local, sin backend, sin autenticacion.

## Stack

| | |
|---|---|
| Framework | React Native bare (sin Expo) |
| Lenguaje | TypeScript estricto |
| Plataforma | Android only |
| Navegacion | React Navigation v7 (Stack + Bottom Tabs) |
| Estado | Zustand |
| Base de datos | SQLite (op-sqlite) |
| Iconos | Material Symbols |
| UI | Componentes custom, dark mode only |
| Fuente | Manrope (6 pesos) |

## Modulos

### Finanzas
Balance total en ARS con conversion USD blue automatica. Transacciones con categorias multiples, gastos recurrentes mensuales/cuotas/anuales, graficos de tendencia por mes, busqueda de transacciones, edicion de registros existentes. Chip de pagos pendientes con lookahead configurable al mes siguiente.

### Galeria Oculta
Galeria privada protegida por PIN disfrazada como calculadora. Importa fotos/videos del dispositivo a un vault interno. Soporte para carpetas, categorias, favoritos, papelera, zoom, swipe entre medios, drag-select, busqueda por notas, y share target nativo de Android.

### Clipboard Inteligente
Gestor de links y notas con seccion publica y boveda privada (PIN). Organizado por carpetas y tags. Soporte para copiar, compartir y visitar links.

### Gmail Accounts
Tracker de en que plataformas esta registrado cada Gmail. Chips de estado pendiente/completado por plataforma, boton de agregar plataforma a todos los Gmails de una vez.

### Focus / Deep Work
Timer Pomodoro con sesiones configurables. Lista de tareas de enfoque diarias con checkboxes. Tracking de sesiones completadas.

### Source Finder
Busqueda inversa de imagenes desde tweets. Integracion con FxTwitter para extraer imagenes y SauceNAO para encontrar fuentes originales.

### Radar
Generador de queries de busqueda potenciado por IA (Groq). Genera queries optimizados para multiples plataformas a partir de una descripcion. Busquedas guardables con notas.

### Calculadora
Calculadora basica que tambien funciona como pantalla de camuflaje para la galeria oculta.

## Arquitectura

```
src/
├── app/                    # Entry point, navegacion, providers
│   └── navigation/         # RootNavigator, MainTabNavigator, types
├── core/                   # Codigo compartido
│   ├── components/         # 11 componentes reutilizables
│   ├── theme/              # Colores, tipografia, spacing, radios
│   ├── database/           # SQLite setup y migraciones
│   ├── hooks/              # useAppPin
│   └── types/              # Interfaces globales
├── features/               # Modulos auto-contenidos
│   ├── finance/            # Finanzas
│   ├── gallery/            # Galeria oculta
│   ├── clipboard/          # Clipboard inteligente
│   ├── gmail-accounts/     # Gestor Gmail
│   ├── focus/              # Pomodoro / Deep Work
│   ├── source-finder/      # Busqueda inversa de imagenes
│   ├── radar/              # Generador de queries IA
│   ├── calculator/         # Calculadora / camuflaje
│   ├── home/               # Dashboard
│   ├── modules/            # Listado de modulos
│   └── profile/            # Perfil y configuracion
└── assets/                 # Fuentes, imagenes, iconos
```

Cada modulo sigue el patron:
```
feature/
├── screens/      # Pantallas de navegacion
├── components/   # Componentes propios
├── hooks/        # Custom hooks
├── store/        # Zustand slice
├── services/     # APIs externas
├── database/     # Queries SQLite
└── types/        # TypeScript interfaces
```

## Design System

- **Tema:** Dark mode exclusivo
- **Color primario:** `#e8ba30` (dorado)
- **Fondos:** `#1a1812` (principal), `#26241c` (superficies), `#1e1e1e` (cards)
- **Fuente:** Manrope (300-800)
- **Componentes:** Button, Card, Chip, EmptyState, FAB, Header, Icon, Input, PinLock, SectionTitle
- **Efectos:** Glass blur en headers, glow dorado en FAB, bordes sutiles

## Setup

**Requisitos:** Node >= 22, Android SDK, JDK 17

```bash
# Instalar dependencias
npm install

# Correr en desarrollo
npm start
npm run android

# Build release APK
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

## Base de Datos

SQLite local con ~20 tablas. Migraciones idempotentes en `src/core/database/database.ts`. Foreign keys habilitadas, CASCADE deletes, seeds automaticos para categorias y settings.

Tablas principales: `app_settings`, `gmail_accounts`, `platforms`, `clipboard_links`, `clipboard_folders`, `finance_transactions`, `finance_recurring`, `finance_categories`, `focus_tasks`, `focus_sessions`, `gallery_media`, `gallery_folders`, `source_finder_searches`, `radar_searches`.

## Servicios Externos

| Servicio | Uso |
|----------|-----|
| Dolar Blue API | Cotizacion USD para finanzas |
| SauceNAO | Busqueda inversa de imagenes |
| FxTwitter | Extraccion de imagenes de tweets |
| Groq API | Generacion de queries IA (Radar) |

## Convenciones

- UI en **espanol**, codigo en **ingles**
- Commits: conventional commits en ingles (`feat:`, `fix:`, `chore:`)
- Archivos: PascalCase para componentes, camelCase para hooks/utils
- Screens: `[Nombre]Screen.tsx`
- Stores: `use[Feature]Store.ts`
- Hooks: `use[Nombre].ts`
- Todo es local, sin backend ni autenticacion
