# Política de seguridad

## Reportar una vulnerabilidad

Reportá las vulnerabilidades en privado por GitHub: abrí la pestaña **Security** del repositorio y elegí **Report a vulnerability**. No abras un issue público.

Contá qué encontraste, cómo reproducirlo y qué podría hacer un atacante con eso. Los reportes que podrían exponer la identidad de los usuarios (la IP, la cuenta o el dispositivo detrás de un vox, un comentario o una denuncia) tienen la máxima prioridad, porque el anonimato es la promesa central del producto.

Vas a recibir una respuesta dentro de una semana. Te pedimos un tiempo razonable para publicar el arreglo antes de divulgarlo.

## Versiones con soporte

Solo la última versión de la rama `main` y la última versión de la app Android.

## Alcance

Dentro del alcance: la web, la API, el Worker de tiempo real y la app Android de este repositorio.

Fuera del alcance: denegación de servicio por volumen, reportes que requieren un dispositivo o navegador ya comprometido, cabeceras de endurecimiento faltantes sin un impacto concreto, y los servicios de terceros en sí.

## Diseño

Cómo protege la app a sus usuarios está en [docs/security-design.md](docs/security-design.md).
