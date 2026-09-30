# Voxer para Android

Una app nativa que muestra el sitio en un WebView a pantalla completa. La interfaz **es** la de la web, así que cada función nueva de la web llega a la app sin publicar una versión. Lo nativo suma lo que una pestaña del navegador no puede: notificaciones con la app cerrada, el selector de archivos y la cámara del sistema, App Links verificados, deslizar para recargar, una pantalla sin conexión, video a pantalla completa que respeta la orientación del archivo y el manejo del ciclo de vida.

## Herramientas

| Pieza                  | Versión                                     | Por qué                                                                                   |
| ---------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| JDK                    | 17 o más (sirve el JBR de Android Studio)   | Lo exige AGP 9.                                                                           |
| Gradle                 | 9.7.1 (wrapper)                             | AGP 9.4 necesita Gradle 9.6 o más.                                                        |
| AGP                    | 9.4.1                                       | Soporta hasta la API 37 y exige Build Tools 36.                                           |
| compileSdk / targetSdk | 37 / 36                                     | targetSdk queda un paso atrás hasta revisar los cambios de comportamiento de la API 37.   |

Dos cambios de AGP 9 que rompen builds copiados de proyectos viejos:

1. **No apliques `org.jetbrains.kotlin.android`.** El soporte de Kotlin viene incorporado (`android.builtInKotlin=true`) y AGP rechaza el plugin separado. `jvmTarget` sale de `compileOptions`.
2. **`firebase-messaging-ktx` ya no existe** en el BOM 34 de Firebase; usá `com.google.firebase:firebase-messaging`.

## Versiones (flavors)

| Flavor   | Push                                                                                                          | Para                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `gms`    | Firebase Cloud Messaging                                                                                      | Descarga directa del APK y Play                        |
| `fdroid` | [UnifiedPush](https://unifiedpush.org), por el distribuidor que haya instalado el usuario (ntfy, NextPush…)    | F-Droid: solo software libre, sin servicios de Google  |

Todo lo demás se comparte en `src/main`: `FlavorPush` elige el `PushProvider` en cada versión, y `PushNotifier` arma la notificación en los dos casos. El servidor les manda los mismos datos, así que las notificaciones se ven idénticas. Sin un distribuidor instalado, la versión `fdroid` no tiene push, y la campana le avisa al usuario que instale uno.

## Compilar

```bash
cd android
./gradlew :app:testFdroidDebugUnitTest :app:assembleFdroidDebug   # no necesita credenciales
./gradlew :app:testGmsDebugUnitTest :app:assembleGmsDebug         # necesita app/src/gms/google-services.json
./gradlew :app:installFdroidDebug                                 # con un dispositivo conectado
```

Abrí la carpeta `android/` en Android Studio (no la raíz del repositorio).

La versión `gms` necesita `app/src/gms/google-services.json` de tu propio proyecto de Firebase (git lo ignora), con apps para `pro.voxer.app` y `pro.voxer.app.debug`. Las variantes `fdroid` nunca lo procesan.

Para cargar otro origen en vez de producción, definilo en `~/.gradle/gradle.properties`. Si ese origen está detrás de un login en otro dominio (por ejemplo, Cloudflare Access), listá esos hosts en `VOXER_TRUSTED_HOSTS`, separados por comas: si no, la app bloquea la redirección, como hace con cualquier navegación a otro dominio que el usuario no pidió.

```properties
VOXER_SITE_URL=https://staging.example.com
VOXER_TRUSTED_HOSTS=equipo.cloudflareaccess.com
```

## Firma de release

Guardá los secretos en `~/.gradle/gradle.properties`, nunca en el repositorio:

```properties
VOXER_KEYSTORE_FILE=/ruta/a/release.jks
VOXER_KEYSTORE_PASSWORD=...
VOXER_KEY_ALIAS=...
VOXER_KEY_PASSWORD=...
```

```bash
./gradlew :app:assembleGmsRelease :app:assembleFdroidRelease   # APKs
./gradlew :app:bundleGmsRelease                                 # AAB
```

Sin `VOXER_KEYSTORE_FILE` la variante release se compila sin firmar y no se puede instalar.

## Contrato con la web

| Android                                 | Web                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `push/PushPayload.kt`                   | `server/push/payload.ts` (campo `v`, hoy `"1"`); UnifiedPush recibe el mismo mapa en JSON |
| `push/DeepLinkResolver.kt`              | `lib/notifications/links.ts`                                                               |
| `web/VoxerJsBridge.kt`                  | `features/native/androidBridge.ts`, `hooks/device/useNativePushRegistration.ts`            |
| `res/values/colors.xml`                 | `lib/theme/nativeSplashColor.ts` (lo fija su test)                                         |
| Intent filter de `AndroidManifest.xml`  | `app/.well-known/assetlinks.json/route.ts`                                                 |

`appInfo()` informa `packageName`, `pushProvider` (`fcm` o `unifiedpush`) y `pushAvailable` (si el push puede funcionar en el dispositivo). Con UnifiedPush, `getPushToken()` devuelve la suscripción de Web Push en JSON, y la página le pasa a la app la clave VAPID del servidor con `setPushVapidKey`.

La página, y no Kotlin, registra el token en el servidor: el pedido sale del WebView con su propio `Origin`, pasa el control de origen de la API sin falsificar cabeceras, y la cookie de sesión `httpOnly` nunca sale del WebView.

El puente es chico a propósito. La CSP del sitio permite scripts en línea, así que un XSS llegaría a él: ningún método toca el sistema de archivos, abre intents arbitrarios ni devuelve la sesión. `share` recibe un path del sitio y la app arma la URL.

## Trampas

Están documentadas junto al código, en `web/WebViewSetup.kt` y las clases que se nombran abajo:

- **R8 y el puente.** R8 borraría los métodos de `VoxerJsBridge` porque solo los llama JavaScript. La regla de `proguard-rules.pro` los conserva; sin ella el push y el selector de archivos fallan en silencio, y solo en release. Después de tocarla:

  ```bash
  ./gradlew :app:assembleFdroidRelease
  grep -A40 "VoxerJsBridge ->" app/build/outputs/mapping/fdroidRelease/mapping.txt | grep -c "appInfo\|getPushToken"
  ```

- **El oscurecimiento algorítmico** tiene que quedar apagado: el sitio tiene sus propios temas, y el WebView volvería a oscurecer el oscuro y arruinaría el claro.
- **`isForMainFrame`** en `shouldOverrideUrlLoading`: el embed de YouTube navega todo el tiempo dentro de su iframe, e interceptar los subframes lo manda al navegador externo.
- **Las ventanas nuevas** (`onCreateWindow`) nacen en un WebView descartable; los links al propio sitio hay que llevarlos a mano al WebView principal, o el toque no hace nada.
- **Selector de archivos.** `FileChooserController` usa el selector estándar y no el Photo Picker, que solo lista la galería del dispositivo y dejaba afuera a Archivos, Drive y los inputs que no son multimedia (importar un tema `.json`). Las cámaras van como intents iniciales. `FileChooserParams.createIntent()` solo declara el primer tipo del `accept`, así que el controlador pide un comodín y lista todos los tipos en `EXTRA_MIME_TYPES`.
- **Los archivos elegidos se copian primero** (`PickedFileStore`). Abrir un `InputStream` obliga a Google Fotos o Drive a descargar una foto que está solo en la nube; el WebView leyendo el URI directo falla con `NotReadableError`. Sacar la copia trae de vuelta ese error solo para quien tiene activado «liberar espacio», así que cuesta reproducirlo.
- **Kotlin anida los comentarios de bloque.** Un comodín MIME literal dentro de un `/** */` abre un comentario interno que se traga el resto del archivo.

## F-Droid

- F-Droid compila la versión `fdroid` desde el código fuente y la firma con su propia clave; la huella SHA-256 de esa clave se tiene que sumar a `ANDROID_APP_FINGERPRINTS` en el servidor para que se verifiquen los App Links.
- `dependenciesInfo` está desactivado: incrusta un blob que solo Google puede leer.
- Los textos y el ícono de la ficha de la tienda están en `fastlane/metadata/android/`; cada versión suma un `changelogs/<versionCode>.txt`. La versión sale de `VOXER_VERSION_NAME` y `VOXER_VERSION_CODE` en `gradle.properties`.
- Antes de enviarla, revisá el APK compilado con `fdroid scanner app/build/outputs/apk/fdroid/release/app-fdroid-release.apk` (de `fdroidserver`).
