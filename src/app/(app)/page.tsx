'use client';

import { BookOpen, ChevronRight, FlaskConical, GraduationCap, Play, Swords, Target, Users, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { CharacterAvatar } from '@/components/characters/CharacterAvatar';
import { XpBar } from '@/components/progression/XpBar';
import { LinkButton } from '@/components/ui/Button';
import { SectionTitle, Stat } from '@/components/ui/primitives';
import { getBot } from '@/content/bots';
import { CHALLENGES } from '@/content/challenges';
import { getCharacter, HAROLDO_ID } from '@/content/characters';
import { TEACH_MODULES } from '@/content/teaching';
import { dailyChallenge } from '@/core/challenges';
import { getCareerView, getLevelInfo } from '@/core/progression';
import { ContinueGameBanner } from '@/features/game/ContinueGameBanner';
import { useProgressStore } from '@/stores/progress';
import { useSessionStore } from '@/stores/session';

export default function HomePage() {
  const user = useSessionStore((s) => s.user);
  const progress = useProgressStore((s) => s.progress);
  const career = getCareerView(progress);
  const stageBot = career.current ? getBot(career.current.botId) : null;
  const stageCharacter = stageBot ? getCharacter(stageBot.characterId) : null;

  const today = new Date().toISOString();
  const daily = dailyChallenge(CHALLENGES, today);
  const dailyDone = progress.lastDailyDate === today.slice(0, 10);
  const nextModule = TEACH_MODULES.find((m) => !progress.teachCompleted[m.id]);
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <>
      <p className="mt-1 text-[15px] text-olive">Olá, {firstName}</p>
      <h1 className="display text-[42px] text-ink">Bora jogar?</h1>

      {/* Nível + próxima partida da carreira */}
      <section className="night-surface swoosh mt-4 rounded-3xl p-5">
        <XpBar xp={progress.xp} tone="night" />
        <div className="mt-5 flex items-center gap-3">
          <CharacterAvatar characterId={stageCharacter?.id ?? HAROLDO_ID} size={52} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-wider text-lime uppercase">
              {career.completed ? 'Carreira concluída' : `Carreira · ${career.current?.title}`}
            </p>
            <p className="truncate text-sm text-paper/85">
              {career.completed
                ? 'Você é campeão da Liga X.'
                : `Próximo: ${stageCharacter?.name} (${progress.career.stageWins}/${career.current?.winsToAdvance})`}
            </p>
          </div>
        </div>
        <LinkButton href="/carreira" variant="lime" size="lg" block className="relative z-10 mt-4" icon={<Play size={18} fill="currentColor" />}>
          Continuar carreira
        </LinkButton>
      </section>

      <ContinueGameBanner className="mt-3" />

      {/* O ciclo: jogar → aprender → desafiar-se */}
      <nav aria-label="Modos" className="mt-6 divide-y divide-line">
        <ModeRow href="/jogar" icon={Swords} color="#81a44c" title="Treinar" text="Escolha o adversário e jogue à vontade." />
        <ModeRow
          href="/amigo"
          icon={Users}
          color="#1c1f15"
          title="Jogar com um amigo"
          text={`Online. Seu Score: ${user?.score ?? 0}.`}
        />
        <ModeRow
          href={nextModule ? `/ensino/${nextModule.id}` : '/aprender'}
          icon={GraduationCap}
          color="#2f8f9d"
          title="Aprender"
          text={nextModule ? `Próxima lição: ${nextModule.title}.` : 'Você concluiu todas as lições. Revise quando quiser.'}
        />
        <ModeRow
          href={daily ? `/desafio/${daily.id}?diario=1` : '/desafios'}
          icon={Target}
          color="#d2572f"
          title="Desafio do dia"
          text={dailyDone ? 'Feito por hoje. Tem mais na lista.' : daily ? `${daily.title}. Vale XP extra.` : 'Veja os desafios.'}
        />
        <ModeRow href="/aulas" icon={BookOpen} color="#5a4b8c" title="Aulas" text="Vídeos dos professores. Assistir sobe seu nível." />
        <ModeRow href="/laboratorio" icon={FlaskConical} color="#595c4e" title="Laboratório" text="Monte e analise qualquer posição." />
      </nav>

      <SectionTitle
        className="mt-8"
        action={
          <Link href="/perfil" className="flex min-h-11 items-center text-sm font-bold text-brand-deep">
            Ver perfil
          </Link>
        }
      >
        Seu progresso
      </SectionTitle>
      <div className="grid grid-cols-3 gap-4 rounded-3xl bg-card p-5">
        <Stat value={getLevelInfo(progress.xp).level} label="Nível" />
        <Stat value={user?.score ?? 0} label="Score online" />
        <Stat value={progress.stats.wins + (user?.online.wins ?? 0)} label="Vitórias" />
      </div>
    </>
  );
}

function ModeRow({
  href,
  icon: Icon,
  color,
  title,
  text,
}: {
  href: string;
  icon: LucideIcon;
  color: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} className="flex min-h-[76px] items-center gap-4 py-3 active:bg-black/[0.03]">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white"
        style={{ backgroundColor: color }}
      >
        <Icon size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="display block text-[26px] text-ink">{title}</span>
        <span className="block truncate text-sm text-mute">{text}</span>
      </span>
      <ChevronRight size={20} className="shrink-0 text-mute" />
    </Link>
  );
}
