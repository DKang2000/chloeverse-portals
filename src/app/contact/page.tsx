import { MobileContactExperience } from "@/components/mobile/contact/MobileContactExperience";
import ContactMissionGame from "@/components/contact/ContactMissionGame";
import { ExperienceModeSwitch } from "@/lib/experience-mode/ExperienceModeSwitch";

function ContactDesktopPage() {
  return (
    <main className="min-h-screen w-full bg-black">
      <ContactMissionGame />
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
