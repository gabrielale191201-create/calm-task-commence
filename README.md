# Focus On - Native App con Capacitor

## Tecnologías

- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- **Capacitor** para empaquetado nativo (Android/iOS)
- **Notificaciones Locales** (sin push, sin VAPID)

## Compilar APK/AAB para Android

### Requisitos previos

1. **Node.js** v18+ instalado
2. **Android Studio** instalado con:
   - Android SDK (API 33+)
   - Android SDK Build-Tools
   - Configurar `ANDROID_HOME` en variables de entorno
3. **Java JDK 17** (requerido por Gradle)

### Pasos para compilar

```bash
# 1. Clonar el repositorio
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# 2. Instalar dependencias
npm install

# 3. Agregar plataforma Android
npx cap add android

# 4. Construir la app web
npm run build

# 5. Sincronizar con proyecto nativo
npx cap sync android

# 6. Abrir en Android Studio (opcional, para debug)
npx cap open android

# 7. Compilar APK de debug (desde terminal)
cd android
./gradlew assembleDebug

# El APK estará en: android/app/build/outputs/apk/debug/app-debug.apk

# 8. Compilar AAB para Play Store
./gradlew bundleRelease

# El AAB estará en: android/app/build/outputs/bundle/release/app-release.aab
```

### Permisos Android requeridos

El plugin de notificaciones locales requiere estos permisos (ya configurados automáticamente):

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
<uses-permission android:name="android.permission.USE_EXACT_ALARM" />
```

Para **Android 12+** (API 31+), las alarmas exactas requieren permiso adicional. El plugin solicita esto automáticamente.

## Probar recordatorio a +2 minutos

1. Abre la app compilada en tu dispositivo Android
2. Ve a **Tareas** y crea una tarea nueva
3. Programa la tarea para **2 minutos en el futuro**:
   - Fecha: hoy
   - Hora: la hora actual + 2 minutos
4. Activa el toggle de **Recordatorio** (icono de campana)
5. Minimiza la app o cierra la pantalla
6. Espera 2 minutos
7. Deberías recibir la notificación local

## Probar alarma de Focus Time

1. Ve a **Enfoque**
2. Escribe una tarea y selecciona **2 min**
3. Inicia el Focus Time
4. Minimiza la app
5. Cuando termine, deberías recibir:
   - Sonido de alarma (si la app está en primer plano)
   - Notificación local (si la app está en background)

## Archivos añadidos/modificados

### Nuevos archivos
- `capacitor.config.ts` - Configuración de Capacitor
- `src/hooks/useLocalNotifications.ts` - Hook para notificaciones locales nativas

### Archivos modificados
- `src/hooks/useTimer.ts` - Integra notificaciones locales al finalizar Focus Time
- `src/components/TaskReminderToggle.tsx` - Usa notificaciones locales en lugar de push
- `package.json` - Dependencias de Capacitor

### Archivos eliminados
- `src/hooks/useFocusTimePush.ts` - Ya no se usa push web

## Desarrollo con hot-reload

Para desarrollo con hot-reload en dispositivo físico:

1. El `capacitor.config.ts` apunta al preview de Lovable
2. Ejecuta `npx cap run android` para instalar en dispositivo
3. Los cambios en Lovable se reflejan automáticamente

Para producción, comenta la sección `server` en `capacitor.config.ts`:

```typescript
// server: {
//   url: '...',
//   cleartext: true
// },
```

## Notas importantes

- **No usa push notifications (VAPID)** - Solo notificaciones locales
- **No requiere backend para notificaciones** - Todo es local
- **Android primero** - iOS requiere pasos adicionales (Xcode, certificados)
- El icono de notificación (`ic_stat_icon_config_sample`) debe personalizarse en `android/app/src/main/res/`
