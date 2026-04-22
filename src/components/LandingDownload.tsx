import { AppLogo } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import { Download, Smartphone } from "lucide-react";

const APK_DOWNLOAD_URL = "https://cmszoptzpkgnroeirilm.supabase.co/storage/v1/object/public/app-releases/Focus%20On.apk";

export function LandingDownload() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[hsl(240,10%,8%)] text-[hsl(0,0%,96%)] px-6 py-12">
      {/* Glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsl(152,55%,42%)] opacity-[0.07] blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 max-w-md text-center">
        <AppLogo size={96} className="drop-shadow-lg" />

        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight font-[Outfit]">
            FocusON
          </h1>
          <p className="text-lg sm:text-xl text-[hsl(240,5%,65%)] font-medium">
            La IA organiza, tú ejecutas.
          </p>
        </div>

        <p className="text-sm text-[hsl(240,5%,50%)] max-w-xs leading-relaxed">
          Organiza tus tareas, enfócate y lleva un diario de tu progreso.
          Descarga la app para comenzar.
        </p>

        <a
          href={APK_DOWNLOAD_URL}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs"
        >
          <Button
            size="lg"
            className="w-full h-14 text-base font-semibold gap-3 rounded-2xl bg-[hsl(152,55%,42%)] hover:bg-[hsl(152,55%,36%)] text-white shadow-[0_0_30px_hsl(152,55%,42%,0.3)]"
          >
            <Download className="!size-5" />
            Descargar APK para Android
          </Button>
        </a>

        <div className="flex items-center gap-2 text-xs text-[hsl(240,5%,40%)]">
          <Smartphone className="size-4" />
          <span>Android 8.0+  •  ~15 MB</span>
        </div>
      </div>
    </div>
  );
}
