import { StartupExperience } from "@/components/startup/StartupExperience";

type MobileStartupExperienceProps = {
  titleFontClassName: string;
  monoFontClassName: string;
};

export function MobileStartupExperience(props: MobileStartupExperienceProps) {
  return <StartupExperience {...props} isMobileExperience />;
}
