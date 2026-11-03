# Política de Privacidad — Ómicron

**Última actualización:** 3 de noviembre de 2026

---

## 1. INTRODUCCIÓN

Ómicron SpA (en adelante, "Ómicron", "nosotros" o "la Empresa") se compromete a proteger la privacidad de los usuarios de su plataforma. Esta Política de Privacidad describe qué datos personales recopilamos, cómo los utilizamos, con quién los compartimos y cuáles son sus derechos.

Al utilizar la plataforma Ómicron, usted acepta las prácticas descritas en esta Política.

---

## 2. DATOS QUE RECOPILAMOS

### 2.1 Datos Proporcionados por Usted

Cuando se registra y utiliza la Plataforma, recopilamos:

- **Información de cuenta:** nombre, apellido, username, email, contraseña (encriptada).
- **Perfil profesional:** biografía, foto de perfil, credenciales (CV, títulos, certificados).
- **Texto de tu CV:** al pedir un análisis, el archivo PDF no sale de tu dispositivo; en el navegador se extrae su texto y solo ese texto se envía al servicio de análisis con IA (ver sección 4.2).
- **Datos de verificación:** documentos de identidad (para KYC cuando active retiros reales).
- **Información financiera:** historial de transacciones de tokens, contratos, pagos.
- **Contenido generado:** publicaciones en la Bóveda, mensajes en chat, calificaciones.

### 2.2 Datos Recopilados Automáticamente

- **Datos técnicos:** dirección IP, tipo de navegador, sistema operativo, dispositivo.
- **Datos de uso:** páginas visitadas, clics, tiempo en la Plataforma, acciones realizadas.
- **Cookies:** utilizamos cookies para recordar su sesión y preferencias (ver sección 7).

### 2.3 Datos de Terceros

- **Proveedores de autenticación:** si usa login con Google u otros, recibimos su nombre y email de esos servicios.
- **Procesadores de pago:** cuando active retiros reales (Stripe), compartiremos datos necesarios para cumplir con regulaciones financieras.

---

## 3. CÓMO UTILIZAMOS SUS DATOS

Utilizamos sus datos personales para:

### 3.1 Provisión del Servicio

- Crear y gestionar su cuenta.
- Facilitar contratos entre usuarios (escrow, pagos, arbitraje).
- Mostrar su perfil profesional a otros usuarios.
- Calcular y actualizar su reputación en tiempo real.
- Procesar pagos y retiros (cuando esté disponible).

### 3.2 Comunicación

- Enviar notificaciones sobre contratos, disputas, pagos.
- Responder a sus consultas y solicitudes de soporte.
- Enviar actualizaciones importantes sobre la Plataforma (cambios en Términos, nuevas funciones).

### 3.3 Mejora de la Plataforma

- Analizar cómo se usa la Plataforma para mejorar la experiencia.
- Detectar y prevenir fraudes, abusos o actividades ilícitas.
- Realizar investigaciones internas y desarrollo de nuevas funciones.

### 3.4 Marketing (con su consentimiento)

- Enviar boletines informativos o promociones (puede optar por no recibirlos).
- Utilizar testimonios o casos de éxito en materiales de marketing (previa autorización explícita).

---

## 4. CON QUIÉN COMPARTIMOS SUS DATOS

### 4.1 Otros Usuarios

Su perfil público (nombre, foto, reputación, credenciales) es visible para otros usuarios de la Plataforma. Usted controla qué información hace pública en su configuración de privacidad.

### 4.2 Proveedores de Servicios

Compartimos datos con terceros que nos ayudan a operar la Plataforma:

- **Supabase (PostgreSQL + Auth):** almacenamiento de datos y autenticación.
- **Vercel:** alojamiento del frontend.
- **Google (Gemini) y OpenRouter:** el texto de tu CV y tus mensajes al asistente los procesan modelos de lenguaje (Google Gemini primero; si no está disponible, modelos del catálogo de OpenRouter). Reciben solo el texto necesario para responder, nunca el archivo PDF.
- **Stripe (futuro):** procesamiento de pagos cuando active retiros reales.
- **Google Cloud (futuro):** análisis de datos y machine learning.

Todos estos proveedores están obligados por acuerdos de confidencialidad y solo procesan datos según nuestras instrucciones.

### 4.3 Autoridades Legales

Podemos divulgar sus datos si lo exige la ley chilena o para:

- Cumplir con una orden judicial o citación.
- Proteger nuestros derechos legales o los de otros usuarios.
- Prevenir fraude, lavado de dinero o actividades ilícitas.

### 4.4 Transferencias Empresariales

Si Ómicron es adquirida o fusionada con otra empresa, sus datos pueden transferirse al nuevo propietario (le notificaremos si esto ocurre).

---

## 5. SEGURIDAD DE LOS DATOS

Implementamos medidas técnicas y organizativas para proteger sus datos:

- **Encriptación:** contraseñas hasheadas con bcrypt, datos sensibles encriptados en tránsito (HTTPS).
- **Control de acceso:** políticas de Row-Level Security (RLS) en la base de datos.
- **Monitoreo:** detección de accesos no autorizados y actividades sospechosas.
- **Backups:** copias de seguridad regulares para prevenir pérdida de datos.

Sin embargo, ningún sistema es 100% seguro. Usted es responsable de mantener su contraseña confidencial.

---

## 6. RETENCIÓN DE DATOS

Conservamos sus datos personales mientras su cuenta esté activa. Si elimina su cuenta:

- Datos de perfil público se anonimizarán o eliminarán en 30 días.
- Datos de transacciones se conservarán 7 años (obligación legal tributaria en Chile).
- Datos de arbitraje y disputas se conservarán 5 años (obligación legal).

---

## 7. COOKIES Y TECNOLOGÍAS SIMILARES

Utilizamos cookies para:

- **Cookies esenciales:** mantener su sesión activa (no se pueden desactivar).
- **Cookies analíticas:** medir el tráfico y uso de la Plataforma (PostHog, Google Analytics).
- **Cookies de preferencias:** recordar su idioma y configuraciones.

Puede gestionar las cookies desde su navegador, pero algunas funciones de la Plataforma pueden no funcionar correctamente si las desactiva.

---

## 8. SUS DERECHOS

Bajo la Ley 19.628 de Protección de Datos Personales de Chile, usted tiene derecho a:

### 8.1 Acceso

Solicitar una copia de todos los datos personales que tenemos sobre usted.

### 8.2 Rectificación

Corregir datos inexactos o incompletos.

### 8.3 Eliminación

Solicitar la eliminación de sus datos (sujeto a obligaciones legales de retención).

### 8.4 Oposición

Oponerse al procesamiento de sus datos para fines de marketing.

### 8.5 Portabilidad

Recibir sus datos en formato estructurado y legible por máquina (JSON, CSV).

Para ejercer estos derechos, contáctenos en **privacy@omicron.cl** (pendiente).

---

## 9. TRANSFERENCIAS INTERNACIONALES

Sus datos se almacenan en servidores de Supabase ubicados en **Estados Unidos**. Supabase cumple con estándares internacionales de protección de datos (SOC 2 Type II, ISO 27001). Al usar la Plataforma, usted consiente estas transferencias.

---

## 10. PRIVACIDAD DE MENORES

La Plataforma NO está dirigida a menores de 18 años. Si descubrimos que un menor nos proporcionó datos sin autorización de un tutor, eliminaremos esos datos inmediatamente.

---

## 11. MODIFICACIONES A ESTA POLÍTICA

Podemos actualizar esta Política de Privacidad ocasionalmente. Los cambios significativos se notificarán por email con 30 días de anticipación. La fecha de "Última actualización" al inicio del documento indica cuándo se realizó la revisión más reciente.

---

## 12. CONTACTO

Para preguntas sobre esta Política de Privacidad o para ejercer sus derechos, contáctenos en:

- **Email:** privacy@omicron.cl (pendiente)
- **Dirección:** Santiago, Chile

---

## 13. CONSENTIMIENTO

Al registrarse en Ómicron, usted:

✅ **Acepta** esta Política de Privacidad.  
✅ **Consiente** el procesamiento de sus datos según lo descrito.  
✅ **Comprende** que puede retirar su consentimiento en cualquier momento eliminando su cuenta.

**Fecha de vigencia:** 9 de julio de 2026
