import { MobileContactExperience } from "@/components/mobile/contact/MobileContactExperience";
import ContactMissionGame3D from "@/components/contact/ContactMissionGame3D";
import { ExperienceModeSwitch } from "@/lib/experience-mode/ExperienceModeSwitch";

function ContactDesktopPage() {
  return (
    <main className="min-h-screen w-full bg-black">
      <ContactMissionGame3D />
    </main>
  );
}

export default function ContactPage() {
  return (
    <ExperienceModeSwitch
      desktop={<ContactDesktopPage />}
      mobile={<MobileContactExperience />}
    />
  );
}
