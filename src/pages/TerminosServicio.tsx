// src/pages/TerminosServicio.tsx
// ═══════════════════════════════════════════════════════════════════════
// TÉRMINOS DE SERVICIO — Ómicrom
// Documento legal conforme a la ley chilena para marketplace de servicios.
// ═══════════════════════════════════════════════════════════════════════
import { ArrowLeft } from 'lucide-react';
import { C, FONT, tint, SIZE } from '../theme';

export function TerminosServicio() {
  return (
    <div style={S.page}>
      <div style={S.container}>
        <button
          onClick={() => window.history.back()}
          style={S.backBtn}
          aria-label="Volver"
        >
          <ArrowLeft size={18} />
          Volver
        </button>

        <h1 style={S.title}>Términos y Condiciones de Uso</h1>
        <p style={S.updated}>Última actualización: 9 de julio de 2026</p>

        <div style={S.content}>
          <section style={S.section}>
            <h2 style={S.h2}>1. ACEPTACIÓN DE LOS TÉRMINOS</h2>
            <p style={S.p}>
              Al acceder y utilizar la plataforma Ómicrom (en adelante, "la Plataforma"), 
              usted acepta estar obligado por estos Términos y Condiciones de Uso (en adelante, 
              "los Términos"). Si no está de acuerdo con estos Términos, no utilice la Plataforma.
            </p>
            <p style={S.p}>
              La Plataforma es operada por Ómicrom SpA (en adelante, "Ómicrom", "nosotros" o "la Empresa"), 
              con domicilio en Santiago, Chile, RUT pendiente de constitución.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>2. DEFINICIÓN DEL SERVICIO</h2>
            <p style={S.p}>
              Ómicrom es un marketplace que conecta profesionales y técnicos (en adelante, "Usuarios") 
              para la prestación y contratación de servicios profesionales. La Plataforma ofrece:
            </p>
            <ul style={S.ul}>
              <li style={S.li}><strong>Gemelo Digital:</strong> perfil profesional verificable con credenciales y reputación validada por pares.</li>
              <li style={S.li}><strong>Contratos con Escrow:</strong> sistema de pago protegido donde los fondos se liberan al completar el trabajo.</li>
              <li style={S.li}><strong>Academia:</strong> cursos y certificaciones para desarrollo profesional.</li>
              <li style={S.li}><strong>Bóveda de Conocimiento:</strong> repositorio de soluciones técnicas verificadas y vendibles.</li>
              <li style={S.li}><strong>Gobernanza:</strong> tribunal de pares para resolver disputas mediante arbitraje.</li>
              <li style={S.li}><strong>Sistema de Reputación:</strong> métrica transparente basada en desempeño verificado.</li>
            </ul>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>3. REGISTRO Y CUENTA DE USUARIO</h2>
            <h3 style={S.h3}>3.1 Requisitos</h3>
            <p style={S.p}>
              Para utilizar la Plataforma, debe ser mayor de 18 años o contar con autorización 
              de un tutor legal. Al registrarse, usted declara que:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Toda la información proporcionada es verdadera, precisa y actualizada.</li>
              <li style={S.li}>Tiene capacidad legal para celebrar contratos vinculantes.</li>
              <li style={S.li}>No utilizará la Plataforma para actividades ilícitas o fraudulentas.</li>
            </ul>

            <h3 style={S.h3}>3.2 Seguridad de la Cuenta</h3>
            <p style={S.p}>
              Usted es responsable de mantener la confidencialidad de su contraseña y de todas 
              las actividades que ocurran bajo su cuenta. Notifique inmediatamente a Ómicrom 
              sobre cualquier uso no autorizado de su cuenta.
            </p>

            <h3 style={S.h3}>3.3 Suspensión y Terminación</h3>
            <p style={S.p}>
              Ómicrom se reserva el derecho de suspender o terminar su cuenta si:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Viola estos Términos o la legislación chilena aplicable.</li>
              <li style={S.li}>Proporciona información falsa o engañosa.</li>
              <li style={S.li}>Realiza actividades fraudulentas o perjudiciales para otros Usuarios.</li>
              <li style={S.li}>Su reputación cae por debajo del umbral mínimo establecido (auditoría automática).</li>
            </ul>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>4. CONTRATOS Y ESCROW</h2>
            <h3 style={S.h3}>4.1 Creación de Contratos</h3>
            <p style={S.p}>
              Los contratos entre Usuarios son legalmente vinculantes. Al crear un contrato, 
              el comprador deposita el monto acordado en escrow (cuenta de garantía). 
              Los fondos permanecen bloqueados hasta que:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>El comprador aprueba el trabajo entregado (liberación automática).</li>
              <li style={S.li}>Transcurren 7 días sin disputa (ghost approval).</li>
              <li style={S.li}>Un tribunal de árbitros resuelve una disputa.</li>
            </ul>

            <h3 style={S.h3}>4.2 Responsabilidad</h3>
            <p style={S.p}>
              Ómicrom actúa como intermediario facilitador. <strong>NO somos parte de los contratos</strong> 
              entre Usuarios. No garantizamos la calidad, legalidad o idoneidad de los servicios prestados. 
              Cada Usuario es responsable de:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Cumplir con las obligaciones contractuales acordadas.</li>
              <li style={S.li}>Verificar las credenciales y reputación de la contraparte.</li>
              <li style={S.li}>Resolver conflictos de buena fe mediante el sistema de arbitraje.</li>
            </ul>

            <h3 style={S.h3}>4.3 Comisión de Plataforma</h3>
            <p style={S.p}>
              Ómicrom cobra una comisión del <strong>10%</strong> sobre el monto del contrato al momento 
              de liberar el pago al vendedor. Esta comisión cubre:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Servicio de escrow y procesamiento de pagos.</li>
              <li style={S.li}>Acceso al sistema de arbitraje en caso de disputa.</li>
              <li style={S.li}>Infraestructura y mantenimiento de la Plataforma.</li>
            </ul>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>5. SISTEMA DE TOKENS</h2>
            <h3 style={S.h3}>5.1 Naturaleza de los Tokens</h3>
            <p style={S.p}>
              Los tokens de Ómicrom son una <strong>moneda interna de la Plataforma</strong>, 
              sin valor de cambio fuera de ella. NO son criptomonedas, valores mobiliarios 
              ni instrumentos financieros regulados. Se utilizan exclusivamente para:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Pagar y recibir pagos por servicios dentro de la Plataforma.</li>
              <li style={S.li}>Acceder a contenido premium en la Academia y la Bóveda.</li>
              <li style={S.li}>Participar en staking de talento (inversión en reputación de otros Usuarios).</li>
            </ul>

            <h3 style={S.h3}>5.2 Conversión a Dinero Real</h3>
            <p style={S.p}>
              Cuando la Plataforma alcance el volumen necesario, se habilitará la conversión 
              de tokens a pesos chilenos (CLP) mediante integración con procesadores de pago 
              (Stripe u otros). La tasa de conversión será fijada por Ómicrom y comunicada 
              con 30 días de anticipación. Nos reservamos el derecho de:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Establecer límites de retiro diarios y mensuales.</li>
              <li style={S.li}>Solicitar verificación de identidad (KYC) para retiros superiores a $100.000 CLP.</li>
              <li style={S.li}>Retener pagos sospechosos de fraude o lavado de dinero.</li>
            </ul>

            <h3 style={S.h3}>5.3 Depreciación</h3>
            <p style={S.p}>
              Los tokens NO utilizados pierden valor gradualmente para fomentar la circulación 
              económica del ecosistema (0.1% mensual). Los tokens en escrow, staking activo 
              o ganados en los últimos 30 días están exentos de depreciación.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>6. PROPIEDAD INTELECTUAL</h2>
            <h3 style={S.h3}>6.1 Contenido del Usuario</h3>
            <p style={S.p}>
              Usted conserva todos los derechos sobre el contenido que publica en la Plataforma 
              (portafolios, credenciales, documentos de la Bóveda). Al publicar, nos otorga una 
              <strong> licencia mundial, no exclusiva, libre de regalías</strong> para:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Mostrar su contenido en la Plataforma.</li>
              <li style={S.li}>Compartirlo con otros Usuarios según las configuraciones de privacidad elegidas.</li>
              <li style={S.li}>Utilizarlo en materiales de marketing (previa autorización explícita).</li>
            </ul>

            <h3 style={S.h3}>6.2 Bóveda de Conocimiento</h3>
            <p style={S.p}>
              Los documentos publicados en la Bóveda pueden derivar de trabajos previos (regalías encadenadas). 
              Al publicar, usted declara que:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Es el autor original o tiene derechos para publicar el contenido.</li>
              <li style={S.li}>No infringe derechos de propiedad intelectual de terceros.</li>
              <li style={S.li}>Acepta que un 20% de las regalías vaya al autor del documento padre (si aplica).</li>
            </ul>

            <h3 style={S.h3}>6.3 Marca Ómicrom</h3>
            <p style={S.p}>
              "Ómicrom", el símbolo Ω, y todos los diseños asociados son marcas comerciales de Ómicrom SpA. 
              No puede utilizarlos sin autorización escrita previa.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>7. GOBERNANZA Y ARBITRAJE</h2>
            <h3 style={S.h3}>7.1 Disputas</h3>
            <p style={S.p}>
              Si surge un conflicto sobre un contrato, cualquiera de las partes puede abrir una disputa. 
              Se asignará automáticamente un tribunal de 3 árbitros aleatorios (Usuarios con alta reputación). 
              Los árbitros revisarán la evidencia y votarán. La resolución se toma por <strong>quórum 
              de 2 de 3 votos</strong>.
            </p>

            <h3 style={S.h3}>7.2 Apelaciones</h3>
            <p style={S.p}>
              Las decisiones del tribunal de árbitros son FINALES dentro de la Plataforma. Si considera 
              que hubo un error grave, puede apelar ante Ómicrom dentro de 15 días. Nos reservamos el 
              derecho de revisar casos excepcionales.
            </p>

            <h3 style={S.h3}>7.3 Jurisdicción Legal</h3>
            <p style={S.p}>
              Nada en estos Términos limita sus derechos legales bajo la ley chilena. Si una disputa 
              no puede resolverse mediante arbitraje interno, usted puede acudir a los tribunales 
              ordinarios de justicia de Santiago, Chile.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>8. LIMITACIÓN DE RESPONSABILIDAD</h2>
            <p style={S.p}>
              Ómicrom proporciona la Plataforma "TAL CUAL" y "SEGÚN DISPONIBILIDAD". 
              En la máxima medida permitida por la ley chilena, NO garantizamos:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Que la Plataforma estará libre de errores o interrupciones.</li>
              <li style={S.li}>La calidad, veracidad o legalidad de los servicios ofrecidos por Usuarios.</li>
              <li style={S.li}>La exactitud de las credenciales o reputación de otros Usuarios.</li>
            </ul>
            <p style={S.p}>
              Ómicrom <strong>NO será responsable</strong> por daños indirectos, incidentales, 
              especiales o consecuentes derivados del uso de la Plataforma, incluyendo:
            </p>
            <ul style={S.ul}>
              <li style={S.li}>Pérdida de ingresos o beneficios.</li>
              <li style={S.li}>Pérdida de datos o contenido.</li>
              <li style={S.li}>Incumplimiento de contratos entre Usuarios.</li>
            </ul>
            <p style={S.p}>
              Nuestra responsabilidad total, en caso de ser declarada, no excederá el monto de 
              comisiones pagadas por usted en los últimos 6 meses.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>9. MODIFICACIONES</h2>
            <p style={S.p}>
              Ómicrom se reserva el derecho de modificar estos Términos en cualquier momento. 
              Los cambios entrarán en vigor al ser publicados en la Plataforma. Si los cambios 
              son significativos, se notificará por email con <strong>30 días de anticipación</strong>. 
              El uso continuado de la Plataforma después de los cambios constituye aceptación de los 
              Términos modificados.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>10. LEY APLICABLE</h2>
            <p style={S.p}>
              Estos Términos se rigen por las leyes de la República de Chile. Cualquier controversia 
              se someterá a la jurisdicción exclusiva de los tribunales ordinarios de justicia de Santiago.
            </p>
          </section>

          <section style={S.section}>
            <h2 style={S.h2}>11. CONTACTO</h2>
            <p style={S.p}>
              Para preguntas sobre estos Términos, contáctenos en:
            </p>
            <ul style={S.ul}>
              <li style={S.li}><strong>Email:</strong> legal@omicron.cl (pendiente)</li>
              <li style={S.li}><strong>Dirección:</strong> Santiago, Chile</li>
            </ul>
          </section>

          <div style={S.acceptance}>
            <p style={S.p}>
              <strong>Al usar la Plataforma, usted acepta estos Términos y Condiciones.</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: C.bg,
    padding: '20px',
  },
  container: {
    maxWidth: 800,
    margin: '0 auto',
    background: C.surface,
    borderRadius: 20,
    padding: '32px',
    border: `1px solid ${C.line}`,
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 16px',
    borderRadius: 12,
    background: C.glass,
    border: `1px solid ${C.line}`,
    color: C.ink,
    fontFamily: FONT.display,
    fontSize: SIZE.sm,
    cursor: 'pointer',
    marginBottom: 24,
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 32,
    fontWeight: 700,
    color: C.ink,
    marginBottom: 8,
  },
  updated: {
    fontFamily: FONT.mono,
    fontSize: SIZE.xs,
    color: C.mut,
    marginBottom: 32,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  h2: {
    fontFamily: FONT.display,
    fontSize: 20,
    fontWeight: 700,
    color: C.cyan,
    marginTop: 8,
    marginBottom: 8,
  },
  h3: {
    fontFamily: FONT.display,
    fontSize: SIZE.md,
    fontWeight: 600,
    color: C.ink,
    marginTop: 8,
  },
  p: {
    fontFamily: FONT.body,
    fontSize: SIZE.sm,
    lineHeight: 1.7,
    color: C.mut,
    margin: 0,
  },
  ul: {
    margin: '8px 0',
    paddingLeft: 24,
  },
  li: {
    fontFamily: FONT.body,
    fontSize: SIZE.sm,
    lineHeight: 1.7,
    color: C.mut,
    marginBottom: 6,
  },
  acceptance: {
    marginTop: 24,
    padding: 16,
    background: tint(C.cyan, 10),
    border: `1px solid ${C.cyan}`,
    borderRadius: 12,
  },
};

export default TerminosServicio;
