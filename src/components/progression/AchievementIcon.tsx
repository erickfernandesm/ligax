import {
  BookOpen,
  Brain,
  CalendarDays,
  Compass,
  Crown,
  Flame,
  FlaskConical,
  Medal,
  Puzzle,
  Shield,
  ShieldAlert,
  Star,
  Swords,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';

// As conquistas guardam só o nome do ícone (texto), para o conteúdo continuar
// independente da interface. Aqui o nome vira desenho.
const ICONS: Record<string, LucideIcon> = {
  trophy: Trophy,
  check: ShieldAlert,
  zap: Zap,
  flame: Flame,
  target: Target,
  compass: Compass,
  shield: Shield,
  crown: Crown,
  medal: Medal,
  book: BookOpen,
  brain: Brain,
  puzzle: Puzzle,
  swords: Swords,
  calendar: CalendarDays,
  star: Star,
  flask: FlaskConical,
};

/** Ícone de uma conquista dentro de um selo redondo. */
export function AchievementIcon({
  name,
  unlocked = true,
  tone = 'light',
  size = 44,
}: {
  name: string;
  unlocked?: boolean;
  tone?: 'light' | 'night';
  size?: number;
}) {
  const Icon = ICONS[name] ?? Trophy;
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full',
        !unlocked && 'bg-line text-mute',
        unlocked && tone === 'light' && 'bg-night text-lime',
        unlocked && tone === 'night' && 'bg-lime text-night',
      )}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.52)} strokeWidth={2.2} />
    </span>
  );
}
