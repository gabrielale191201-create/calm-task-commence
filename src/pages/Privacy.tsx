export default function Privacy() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-10 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Política de Privacidad</h1>
      <p className="text-xs text-muted-foreground mb-6">Última actualización: 18 de junio de 2026</p>

      <section className="space-y-4 text-sm leading-relaxed">
        <p>
          Focus On Life ("la app", "nosotros") respeta tu privacidad. Esta política explica qué datos recogemos,
          cómo los usamos y qué derechos tienes.
        </p>

        <h2 className="text-lg font-semibold mt-6">1. Datos que recogemos</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Datos de cuenta: correo y nombre cuando inicias sesión con Google o creas una cuenta.</li>
          <li>Contenido que creas: tareas, notas, recordatorios y registros de uso dentro de la app.</li>
          <li>Datos técnicos mínimos: eventos anónimos de uso para mejorar la app.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-6">2. Google Calendar</h2>
        <p>
          Si conectas tu Google Calendar, solicitamos el permiso
          <code className="mx-1 px-1 rounded bg-muted text-xs">calendar.events.owned</code>
          para crear, actualizar y eliminar únicamente eventos creados por Focus On Life para tus bloques
          de Focus Time. No leemos, importamos ni modificamos eventos creados por ti u otras apps.
          Puedes revocar el acceso en cualquier momento desde tu perfil o desde
          <a className="underline mx-1" href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer">
            myaccount.google.com/permissions
          </a>.
        </p>

        <h2 className="text-lg font-semibold mt-6">3. Cómo usamos tus datos</h2>
        <p>Para que la app funcione: guardar tus tareas, mostrar tu agenda, enviarte recordatorios que tú activas y mejorar la experiencia.</p>

        <h2 className="text-lg font-semibold mt-6">4. Con quién los compartimos</h2>
        <p>No vendemos tus datos. Usamos proveedores de infraestructura (base de datos, autenticación, notificaciones) que procesan datos en nuestro nombre bajo acuerdos de confidencialidad.</p>

        <h2 className="text-lg font-semibold mt-6">5. Retención y borrado</h2>
        <p>Conservamos tus datos mientras tu cuenta esté activa. Puedes eliminar tu cuenta y todos tus datos escribiéndonos al correo de contacto.</p>

        <h2 className="text-lg font-semibold mt-6">6. Seguridad</h2>
        <p>Usamos cifrado en tránsito (HTTPS) y políticas de acceso por usuario. Ningún sistema es 100% infalible; trabajamos para minimizar riesgos.</p>

        <h2 className="text-lg font-semibold mt-6">7. Contacto</h2>
        <p>
          Para cualquier consulta sobre privacidad escríbenos a
          <a className="underline ml-1" href="mailto:gabrielale191201@gmail.com">gabrielale191201@gmail.com</a>.
        </p>
      </section>
    </main>
  );
}
