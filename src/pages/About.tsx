import { Link } from "react-router-dom";
import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Brain, Calendar, ListChecks, Sparkles, Shield, Download } from "lucide-react";

const APK_DOWNLOAD_URL =
  "https://cmszoptzpkgnroeirilm.supabase.co/storage/v1/object/public/app-releases/Focus%20On.apk";

export default function About() {
  return (
    <main className="min-h-[100dvh] bg-[hsl(240,10%,8%)] text-[hsl(0,0%,96%)]">
      {/* Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-[hsl(152,55%,42%)] opacity-[0.08] blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-6 py-16 sm:py-24">
        {/* Header */}
        <header className="flex flex-col items-center text-center gap-6 mb-16">
          <AppLogo size={88} className="drop-shadow-lg" />
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight font-[Outfit]">
              Focus On Life
            </h1>
            <p className="text-lg sm:text-xl text-[hsl(240,5%,70%)] font-medium max-w-xl">
              La IA organiza, tú ejecutas.
            </p>
          </div>

          <a
            href={APK_DOWNLOAD_URL}
            download
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              className="h-12 px-6 rounded-2xl bg-[hsl(152,55%,42%)] hover:bg-[hsl(152,55%,36%)] text-white shadow-[0_0_30px_hsl(152,55%,42%,0.3)] gap-2"
            >
              <Download className="!size-4" />
              Descargar app Android
            </Button>
          </a>
        </header>

        {/* What it is */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-4 font-[Outfit]">
            ¿Qué es Focus On Life?
          </h2>
          <p className="text-[hsl(240,5%,75%)] leading-relaxed">
            Focus On Life es una aplicación móvil de productividad personal pensada
            para personas que se sienten saturadas o que postergan. En lugar de
            pedirte que planifiques todo el día, la app usa inteligencia artificial
            para ayudarte a <strong>nombrar la próxima tarea concreta</strong>,
            ejecutarla en un bloque de enfoque y avanzar sin culpa.
          </p>
          <p className="text-[hsl(240,5%,75%)] leading-relaxed mt-4">
            El mantra del producto es simple:{" "}
            <em>"No planifiques de más. Empieza."</em>
          </p>
        </section>

        {/* Features */}
        <section className="mb-14">
          <h2 className="text-2xl font-semibold mb-6 font-[Outfit]">
            ¿Qué puedes hacer con la app?
          </h2>
          <ul className="grid sm:grid-cols-2 gap-4">
            <Feature
              icon={<Brain className="size-5" />}
              title="Asistente de IA"
              text="Te ayuda a transformar pensamientos confusos en tareas claras y accionables."
            />
            <Feature
              icon={<ListChecks className="size-5" />}
              title="Tareas con prioridad"
              text="Sistema simple de Hoy / Excepción / Pendiente para que sepas por dónde empezar."
            />
            <Feature
              icon={<Sparkles className="size-5" />}
              title="Focus Time"
              text="Bloques de enfoque con cronómetro y alarma para entrar en acción sin distracción."
            />
            <Feature
              icon={<Calendar className="size-5" />}
              title="Google Calendar (opcional)"
              text="Crea eventos solo para tus bloques de Focus Time si lo conectas voluntariamente."
            />
          </ul>
        </section>

        {/* Privacy */}
        <section className="mb-14 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <div className="flex items-start gap-3">
            <div className="size-10 rounded-xl bg-[hsl(152,55%,42%)]/15 flex items-center justify-center flex-shrink-0">
              <Shield className="size-5 text-[hsl(152,55%,55%)]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">Privacidad primero</h3>
              <p className="text-sm text-[hsl(240,5%,70%)] leading-relaxed">
                Tus tareas y notas son tuyas. Si conectas Google Calendar, Focus On
                Life solo crea, actualiza y elimina eventos propios de la app para
                tus bloques — nunca lee eventos ajenos ni comparte tu información.
              </p>
              <div className="mt-3 flex gap-4 text-sm">
                <Link
                  to="/privacidad"
                  className="text-[hsl(152,55%,55%)] hover:underline"
                >
                  Política de privacidad
                </Link>
                <Link
                  to="/terminos"
                  className="text-[hsl(152,55%,55%)] hover:underline"
                >
                  Términos de uso
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <h2 className="text-2xl font-semibold mb-4 font-[Outfit]">
            Empieza hoy
          </h2>
          <p className="text-[hsl(240,5%,70%)] mb-6 max-w-md mx-auto">
            Descarga la app o entra desde tu navegador. No necesitas tarjeta ni
            registro complicado.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={APK_DOWNLOAD_URL}
              download
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                size="lg"
                className="h-12 px-6 rounded-2xl bg-[hsl(152,55%,42%)] hover:bg-[hsl(152,55%,36%)] text-white gap-2"
              >
                <Download className="!size-4" />
                Descargar APK
              </Button>
            </a>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-6 rounded-2xl border-white/20 bg-transparent hover:bg-white/5 text-white"
              >
                Abrir en navegador
              </Button>
            </Link>
          </div>
        </section>

        <footer className="mt-20 text-center text-xs text-[hsl(240,5%,40%)]">
          © {new Date().getFullYear()} Focus On Life · focusonlife.app
        </footer>
      </div>
    </main>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <li className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center gap-3 mb-2">
        <div className="size-9 rounded-lg bg-[hsl(152,55%,42%)]/15 flex items-center justify-center text-[hsl(152,55%,55%)]">
          {icon}
        </div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="text-sm text-[hsl(240,5%,70%)] leading-relaxed">{text}</p>
    </li>
  );
}
