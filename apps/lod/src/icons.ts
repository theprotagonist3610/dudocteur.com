// Noms d'icônes du catalogue (@lod/core) → composants Heroicons pour le web.
import {
  BeakerIcon,
  BugAntIcon,
  CalendarDaysIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  FireIcon,
  FunnelIcon,
  HeartIcon,
  MoonIcon,
  ScaleIcon,
  SparklesIcon,
  UserIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";
import type { IconName } from "@lod/core";
import type { ComponentType } from "react";

export const ICONS: Record<IconName, ComponentType<{ className?: string }>> = {
  scale: ScaleIcon,
  heart: HeartIcon,
  beaker: BeakerIcon,
  calendar: CalendarDaysIcon,
  brain: CpuChipIcon,
  filter: FunnelIcon,
  fire: FireIcon,
  sparkles: SparklesIcon,
  user: UserIcon,
  baby: UserPlusIcon,
  moon: MoonIcon,
  warning: ExclamationTriangleIcon,
  bug: BugAntIcon,
  smile: FaceSmileIcon,
};
