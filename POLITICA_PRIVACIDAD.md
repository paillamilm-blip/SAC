# Política de Privacidad — Ómicrom

**Última actualización:** 6 de noviembre de 2026

> Esta versión describe la aplicación tal como funciona hoy. Está pendiente de revisión por un abogado.

---

## 1. QUIÉNES SOMOS

Ómicrom (en adelante, «Ómicrom», «nosotros») es operada por **[completar: nombre o razón social del responsable]**, con domicilio en Santiago, Chile, y es responsable de tus datos personales.

Esta Política explica qué datos recopilamos, para qué, dónde se guardan, con quién se comparten y qué puedes hacer con ellos.

---

## 2. QUÉ DATOS RECOPILAMOS

### 2.1 Si usas Ómicrom sin cuenta (modo invitado)

- **Tus análisis** se guardan **solo en tu navegador**. Nosotros no los recibimos ni los guardamos.
- El **texto de tu CV** viaja al servicio de inteligencia artificial cuando pides un análisis real (sección 4).
- **Registros técnicos y de uso** (secciones 2.3 y 2.4).

### 2.2 Si creas una cuenta

- **Cuenta:** tu correo, tu nombre de usuario y tu contraseña (guardada cifrada; nadie puede leerla).
- **Perfil:** tu nombre y el color que elijas.
- **Tus análisis:** además de en tu navegador, una copia en nuestra base de datos, para que los veas desde otro equipo (sección 3).
- **Tus exámenes:** tus respuestas, el puntaje y el resultado, como constancia de cada examen.
- **Tus habilidades aprobadas:** cuáles, con qué puntaje y cuándo.
- **Tu racha:** los días en que usaste la aplicación.

### 2.3 Registros técnicos

Para que el servicio funcione y para limitar abusos, nuestros proveedores registran tu **dirección IP** y datos de tu navegador al conectarte. Para aplicar los límites de uso guardamos por un tiempo corto tu IP o el identificador de tu cuenta.

### 2.4 Registros de uso

Registramos algunos eventos de uso (por ejemplo, abrir la aplicación o crear una cuenta) con un **identificador de sesión aleatorio**, el tipo de navegador y el tamaño de la pantalla. Estos registros **no se asocian a tu cuenta**. Los usamos para saber cómo se usa la aplicación y mejorarla.

### 2.5 Lo que NO recopilamos

- **El archivo de tu CV.** Se lee dentro de tu navegador; solo viaja su texto.
- **Datos de pago.** La Plataforma es gratuita.
- **Tu ubicación, tus contactos ni documentos de identidad.**

---

## 3. DÓNDE SE GUARDAN TUS ANÁLISIS

- **En tu dispositivo, siempre:** cada análisis se guarda en el almacenamiento local de tu navegador. Sin cuenta vive **solo ahí**: si borras los datos del navegador o cambias de equipo, pierdes ese historial.
- **En tu cuenta, si inicias sesión:** además se guarda una copia en nuestra base de datos. Sus reglas de seguridad hacen que, a través de la aplicación, **solo tú puedas leer, modificar o borrar tu copia**. Quienes administran la base de datos tienen acceso técnico a ella.
- **Qué contiene un análisis:** tu ocupación y nivel, un resumen, tus fortalezas y brechas (con **frases citadas de tu CV** como evidencia), el nombre y el tamaño del archivo, lo que decidiste sobre cada brecha y los exámenes que aprobaste. **No** contiene el texto completo de tu CV.
- Si inicias sesión después de usar el modo invitado, **te preguntamos** si quieres traer esos análisis a tu cuenta o descartarlos. Nunca los movemos sin preguntarte.
- Si cambias el mismo análisis en dos dispositivos a la vez, se conserva la versión guardada más recientemente.

---

## 4. CON QUIÉN SE COMPARTEN TUS DATOS

No vendemos tus datos. Los compartimos solo con los servicios que hacen funcionar la aplicación, y solo lo necesario:

| Servicio | Para qué | Qué recibe |
|---|---|---|
| **Supabase** | Base de datos, cuentas y funciones del servidor | Los datos de la sección 2.2 |
| **Vercel** | Alojamiento de la aplicación | Registros técnicos al visitarla |
| **Cloudflare (cdnjs)** | Entrega los programas que leen tu PDF o Word en tu navegador | Registros técnicos de esa descarga; **no** recibe tu archivo |
| **Google (Gemini) y OpenRouter** | Inteligencia artificial: analizar tu CV, calificar tus exámenes y responder en el asistente | El **texto de tu CV**, tus **respuestas a los exámenes** y tus **mensajes al asistente** (junto con tu nombre, el resumen y las fortalezas de tu último análisis). Si Gemini no está disponible, la consulta va a otro modelo del catálogo de OpenRouter |
| **OpenRouter y Fish Audio** | Leer en voz alta las respuestas del asistente, si lo activas | El texto de la respuesta |

**Dictado por voz:** si hablas con el asistente, el reconocimiento de voz lo hace **tu navegador**. Algunos navegadores (por ejemplo, Chrome) envían ese audio a sus propios servidores para transcribirlo.

### 4.1 Credencial que compartes

Si creas un enlace para compartir lo que demostraste, el enlace **contiene** (firmados) tu nombre, tu nombre de usuario, las habilidades que aprobaste, tu mejor puntaje en cada una y su fecha. **Cualquiera que tenga el enlace puede verlos, sin tener cuenta.** El enlace vence a los 12 meses. **Antes de eso no se puede revocar**, y sigue funcionando aunque borres tu cuenta, porque se verifica con la firma y no consulta tus datos. Compártelo solo con quien quieras que lo vea.

### 4.2 Autoridades

Podemos entregar datos si lo exige la ley chilena o una orden judicial.

---

## 5. SEGURIDAD

- La conexión con la aplicación va cifrada (HTTPS).
- Tu contraseña se guarda cifrada; nadie puede leerla.
- La base de datos aplica reglas de seguridad por fila: a través de la aplicación, cada persona accede solo a lo suyo.
- Las claves de los servicios de inteligencia artificial y de la base de datos viven solo en el servidor; nunca se envían a tu navegador.
- Nadie puede aprobar un examen desde el navegador: el resultado lo calcula y lo guarda el servidor.

Ningún sistema es completamente seguro. Mantén tu contraseña en reserva.

---

## 6. CUÁNTO TIEMPO GUARDAMOS TUS DATOS

Mientras tu cuenta exista. Si la borras (desde «Mi perfil» → «Borrar mi cuenta»), **se borran de inmediato**: tu cuenta, tu perfil, tu copia de los análisis en la nube, las constancias de tus exámenes, tus habilidades aprobadas y tu racha.

Lo que no se borra:

- **Los enlaces de credencial que ya compartiste** se siguen verificando hasta que vencen (sección 4.1).
- **Los registros de uso** (sección 2.4), que nunca estuvieron asociados a tu cuenta.
- **Lo guardado en el navegador de tus otros dispositivos.** Lo controlas tú: en cada uno, «Mi perfil» → «Borrar los datos de este dispositivo», o desde la configuración del navegador.
- Las **copias de seguridad** de nuestros proveedores pueden conservar datos por un tiempo limitado, según sus propias políticas.

---

## 7. ALMACENAMIENTO EN TU NAVEGADOR

No usamos cookies de publicidad ni de seguimiento, ni servicios de analítica de terceros. Usamos el **almacenamiento local de tu navegador** para:

- mantener tu sesión abierta;
- guardar tus análisis y, si lo activas, tu conversación con el asistente;
- recordar tus preferencias (color, voz).

Si borras los datos del sitio en tu navegador, se cierra tu sesión y se pierde lo que estaba guardado solo ahí.

---

## 8. TUS DERECHOS

Según la ley chilena de protección de datos personales tienes derecho a:

### 8.1 Acceso y portabilidad

Recibir una copia de tus datos en un formato legible por personas y programas. **Puedes descargarla tú mismo**, en cualquier momento, desde «Mi perfil» → «Descargar mis datos» (archivo JSON).

### 8.2 Rectificación

Corregir datos inexactos. Puedes cambiar tu color desde «Mi perfil». Para corregir otros datos, escríbenos (sección 12).

### 8.3 Eliminación

**Puedes borrar tu cuenta tú mismo** desde «Mi perfil» → «Borrar mi cuenta». El borrado es inmediato y no se puede deshacer. Qué se borra y qué no: sección 6.

### 8.4 Oposición

Oponerte a que usemos tus datos para algo distinto de darte el servicio. Hoy no los usamos para publicidad ni enviamos correos promocionales.

---

## 9. TRANSFERENCIAS INTERNACIONALES

Los servicios de la sección 4 operan fuera de Chile (principalmente en Estados Unidos). Al usar la Plataforma, tus datos pueden procesarse en esos países.

---

## 10. MENORES DE EDAD

La Plataforma no está dirigida a menores de 18 años. Si descubrimos que un menor nos entregó datos sin autorización de su tutor, los eliminaremos.

---

## 11. CAMBIOS A ESTA POLÍTICA

Podemos actualizar esta Política. La fecha de «Última actualización» indica la revisión más reciente. Si un cambio es importante, te avisaremos con 30 días de anticipación.

---

## 12. CONTACTO

- **Correo:** privacy@omicron.cl (pendiente: aún no habilitado)
- **Dirección:** Santiago, Chile
