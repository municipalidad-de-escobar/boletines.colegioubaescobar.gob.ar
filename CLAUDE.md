# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Proyecto: App Boletines Cereijo

Aplicación web para gestionar boletines escolares del **Colegio Preuniversitario Dr. Ramón A. Cereijo (UBA Escobar)**. ~720 alumnos, 24 cursos, 130 docentes.

## Comandos

```bash
npm run dev       # Servidor de desarrollo (Vite HMR)
npm run build     # Build de producción
npm run preview   # Preview del build
```

## Stack tecnológico

- **Framework:** React 19 + Vite + TypeScript
- **UI:** Mantine (`@mantine/core`, `@mantine/hooks`, `@mantine/dates`) — componentes principales de UI
- **Backend / DB:** Firebase 12 (Firestore + Authentication)
- **Auth:** Google Sign-In restringido al dominio `@colegioubaescobar.gob.ar`
- **PDF / Impresión:** `react-to-print`
- **Router:** React Router v7
- **Forms:** react-hook-form + zod
- **CSV:** papaparse

## Estructura del proyecto

```
src/
  pages/           # Páginas de la app (una por ruta)
  layouts/         # DashboardLayout (sidebar + header responsive)
  routes/          # AppRoutes.tsx + PrivateRoute.tsx
  contexts/        # AuthContext.tsx (auth + ciclo lectivo activo)
  services/
    firebase/
      firebaseConfig.ts   # Inicialización Firebase (no tocar)
      auth.ts             # Google OAuth con validación de dominio
      firestore.ts        # 40+ funciones CRUD wrapping Firestore
  hooks/           # useCalificacionesRules.ts (habilitación de columnas)
  utils/           # grading.ts (cálculo de notas — puras, sin side effects)
  types/           # firestore.ts, grading.ts, roles.ts, ui.ts
public/
  logos/           # logo-blanco.png, logo-muni.png, logo-uba.png
```

## Roles de usuario

Los roles reales en el código difieren del diseño original:

| Rol | Acceso |
|-----|--------|
| `admin` | Acceso completo: ListadosPage, todas las páginas |
| `profesor` | CargaNotasPage (solo sus asignaciones) |
| `coordinador` | Boletines, calificadores, inasistencias |
| `jefe_coordinacion` | Coordinador + certificados + sanciones + carga notas |
| `regente` | Similar a jefe_coordinacion |
| `secretaria` | Certificados + listados |
| `directivo` | Solo lectura amplia |

La autorización por ruta se define en [src/routes/AppRoutes.tsx](src/routes/AppRoutes.tsx) con la prop `allowedRoles` de `PrivateRoute`.

## Páginas (src/pages/)

| Página | Ruta | Propósito |
|--------|------|-----------|
| `LoginPage` | `/login` | Autenticación Google OAuth |
| `InicioPage` | `/` | Landing pública con logos |
| `CargaNotasPage` | `/dashboard/notas` | Carga de calificaciones por docente |
| `BoletinesPage` | `/dashboard/boletines` | Ver e imprimir boletines por alumno |
| `CertificadosPage` | `/dashboard/certificados` | Certificados analíticos por año |
| `CalificadoresPage` | `/dashboard/calificadores` | Planillas de calificadores para imprimir |
| `ListadosPage` | `/dashboard/listados` | ABM de cursos, materias, alumnos, asignaciones |
| `InasistenciasPage` | `/dashboard/inasistencias` | Registro de inasistencias por trimestre |
| `SancionesPage` | `/dashboard/sanciones` | Registro de sanciones disciplinarias |

## Sistema de calificaciones (8 columnas)

**No modificar la lógica en `src/utils/grading.ts` ni `src/hooks/useCalificacionesRules.ts` sin confirmar.**

```
col1, col2, col3  → Notas trimestrales
col4              → Promedio de col1-3 (redondeo especial: incrementos 1/6, 1/3, 2/3)
col5              → Diciembre (examen)
col6              → Febrero (examen)
col7              → Adicional (solo si ≥2 aplazos en dic/feb)
col8              → Nota final (calculada automáticamente con lógica de prioridad)
```

**Lógica col8:** si col4 ≥7 y col3 ≥7 → usa col4; sino si col5 ≥4 → col5; sino si col6 ≥4 → col6; sino col7.

**Habilitación de columnas:** controlada por el estado del `cicloLectivoActivo` (activo/cerrado) y el período habilitado (trimestres/diciembre/febrero/adicional/cerrado). Ver `useCalificacionesRules`.

**Promoción:**
- Años 1-5: `aprobado` (0 aplazos), `asignatura_previa` (1 aplazo), `no_promociona` (2+)
- Año 6: `aprobado` o `pendiente_6to`
- Puede sobreescribirse con `notaFinalManual`

## Colecciones Firestore

Las colecciones reales difieren de la documentación anterior:

- `users/{uid}` — roles y permisos (no `usuarios`)
- `cursos/{id}` → subcol `materias/{id}`
- `alumnos/{id}` → subcol `historialCursos/{anioLectivo}`
- `asignaciones/{id}` — relación profesor↔curso↔materia
- `calificaciones/{id}` — notas (no `notas`) con 8 columnas
- `inasistencias/{id}` — por trimestre (no `asistencias`)
- `sanciones/{id}`
- `ciclosLectivos/{anio}` — ciclo activo; controla qué columnas son editables
- `profesoresPendientes/{id}` — docentes en espera de activación
- `config/institucional` — configuración global

## Flujo de autenticación

1. Google OAuth en `auth.ts` valida dominio institucional
2. Si el usuario está en `profesoresPendientes`, se auto-registra en `users`
3. `AuthContext` carga `userData` (Firestore) + `cicloLectivoActivo` al montar
4. `PrivateRoute` valida rol antes de renderizar cada página

## Convenciones de código

- Componentes funcionales con hooks; estilos mayormente inline
- Comentarios en español con bloques `/* SECCIÓN */`
- Todas las llamadas a Firestore pasan por las funciones de `services/firebase/firestore.ts` (no llamar SDK directamente desde páginas)
- Emulador de Firebase disponible para desarrollo local (ver `auth.ts`)

## Cosas a NO tocar sin consultar

- `src/utils/grading.ts` y `src/hooks/useCalificacionesRules.ts` — lógica de notas
- `src/services/firebase/firebaseConfig.ts` — configuración Firebase
- Estructura de colecciones Firestore — puede romper datos existentes
- Layout de impresión de boletines — frágil

## Contexto institucional

- **Institución:** Colegio Preuniversitario Dr. Ramón A. Cereijo — UBA Escobar
- **CUE:** N° 62396000
- **Dominio:** @colegioubaescobar.gob.ar
