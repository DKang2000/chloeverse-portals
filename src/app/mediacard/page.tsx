import { MobileMediaCardExperience } from "@/components/mobile/mediacard/MobileMediaCardExperience";
import { ExperienceModeSwitch } from "@/lib/experience-mode/ExperienceModeSwitch";
import * as Mod from "@/components/mediacard/MediaCardExperience";

const MediaCardExperience = (Mod as any).default ?? (Mod as any).MediaCardExperience;

export const metadata = {
  title: "Mediacard",
};

function MediaCardDesktopPage() {
  const Comp = MediaCardExperience;
  if (!Comp) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="max-w-xl w-full">
          <h1 className="font-mono text-3xl tracking-widest">MEDIACARD</h1>
          <p className="mt-3 font-mono text-white/60">
            MediaCardExperience export not found. Check <code>src/components/mediacard/MediaCardExperience.tsx</code>.
          </p>
          <a href="/" className="mt-8 inline-flex font-mono text-sm text-white/80 hover:text-white underline underline-offset-4">Return home</a>
        </div>
      </main>
    );
  }
  return <Comp />;
}

export default function MediaCardPage() {
  return (
    <ExperienceModeSwitch
      desktop={<MediaCardDesktopPage />}
      mobile={<MobileMediaCardExperience />}
    />
  );
}
