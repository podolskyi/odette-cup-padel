import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { TournamentAwards } from '../stats'
import { Avatar } from './ui/Avatar'
import { accentByKey } from '../lib/colors'
import { pct, round1, signed } from '../lib/format'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

export function AwardCard({
  emoji,
  title,
  accent,
  blurb,
  children,
  tilt,
}: {
  emoji: string
  title: string
  accent: string
  blurb?: string
  children: ReactNode
  tilt?: number
}) {
  const { t } = useT()
  const a = accentByKey(accent)
  return (
    <div
      className={cx('sticker flex flex-col gap-3 p-4 animate-pop-in', a.soft)}
      style={tilt ? { rotate: `${tilt}deg` } : undefined}
    >
      <div className="flex items-center gap-3">
        <span
          className={cx(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-ink text-2xl shadow-hard-sm',
            a.solid,
          )}
        >
          {emoji}
        </span>
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">{t('Award', 'Нагорода')}</div>
          <h3 className="text-lg font-extrabold leading-none">{title}</h3>
        </div>
      </div>
      <div className="flex-1">{children}</div>
      {blurb && <p className="text-xs italic text-ink-soft">{blurb}</p>}
    </div>
  )
}

function DuoRow({ a, b }: { a: string; b: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        <Avatar name={a} size="sm" />
        <Avatar name={b} size="sm" />
      </div>
      <span className="font-bold">
        <Link to={`/p/${encodeURIComponent(a)}`} className="hover:underline">
          {a}
        </Link>
        <span className="text-ink-faint"> & </span>
        <Link to={`/p/${encodeURIComponent(b)}`} className="hover:underline">
          {b}
        </Link>
      </span>
    </div>
  )
}

function SoloRow({ name, note }: { name: string; note?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Link to={`/p/${encodeURIComponent(name)}`} className="flex items-center gap-2 hover:underline">
        <Avatar name={name} size="sm" />
        <span className="font-bold">{name}</span>
      </Link>
      {note && <span className="font-mono text-sm font-bold tabular">{note}</span>}
    </div>
  )
}

/** Renders the headline funny awards for one tournament as a sticker grid. */
export function AwardGrid({ awards }: { awards: TournamentAwards }) {
  const { t } = useT()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {awards.demolition && (
        <AwardCard
          emoji="💥"
          title="The Demolition"
          accent="punch"
          tilt={-1}
          blurb={t(`Biggest blowout — Round ${awards.demolition.round}`, `Найбільший розгром — Раунд ${awards.demolition.round}`)}
        >
          <DuoRow a={awards.demolition.winners[0]} b={awards.demolition.winners[1]} />
          <div className="mt-2 font-mono text-2xl font-bold tabular">
            {awards.demolition.scoreFor}–{awards.demolition.scoreAgainst}
            <span className="ml-2 text-sm text-punch">(+{awards.demolition.margin})</span>
          </div>
        </AwardCard>
      )}

      {awards.bestDuo && (
        <AwardCard
          emoji="🤝"
          title="Duo of the Night"
          accent="mint"
          tilt={1}
          blurb={t(`${round1(awards.bestDuo.pointsPerGame)} pts/game together`, `${round1(awards.bestDuo.pointsPerGame)} pts/гра разом`)}
        >
          <DuoRow a={awards.bestDuo.players[0]} b={awards.bestDuo.players[1]} />
          <div className="mt-2 font-mono text-sm font-bold tabular text-ink-soft">
            {awards.bestDuo.wins}-{awards.bestDuo.losses}-{awards.bestDuo.ties} · {pct(awards.bestDuo.winRate)} win
          </div>
        </AwardCard>
      )}

      {awards.cardio && (
        <AwardCard emoji="🏃" title="Cardio King/Queen" accent="tang" blurb={t('Most points scored', 'Найбільше набраних балів')}>
          <SoloRow name={awards.cardio.player} note={`${awards.cardio.pf} PF`} />
        </AwardCard>
      )}

      {awards.wall && (
        <AwardCard emoji="🧱" title="The Wall" accent="sky" blurb={t('Fewest points conceded / game', 'Найменше пропущено / гру')}>
          <SoloRow name={awards.wall.player} note={`${round1(awards.wall.paPerGame)} PA/g`} />
        </AwardCard>
      )}

      {awards.diplomat && (
        <AwardCard emoji="🕊️" title="The Diplomat" accent="grape" blurb={t('Most tied matches', 'Найбільше нічиїх')}>
          <SoloRow name={awards.diplomat.player} note={`${awards.diplomat.ties} ties`} />
        </AwardCard>
      )}

      {awards.heartbreaker && (
        <AwardCard emoji="😬" title="Heartbreaker" accent="sun" blurb={t('Most losses by ≤ 2 points', 'Найбільше поразок ≤ 2 балів')}>
          <SoloRow name={awards.heartbreaker.player} note={`${awards.heartbreaker.closeLosses}×`} />
        </AwardCard>
      )}

      {awards.giantSlayer && (
        <AwardCard
          emoji="🪓"
          title="Giant Slayer"
          accent="lime"
          blurb={t(`Beat a top-${awards.giantSlayer.loserRank} finisher (gap ${awards.giantSlayer.gap})`, `Переміг топ-${awards.giantSlayer.loserRank} фінішера (розрив ${awards.giantSlayer.gap})`)}
        >
          <DuoRow a={awards.giantSlayer.winners[0]} b={awards.giantSlayer.winners[1]} />
          <div className="mt-1 text-xs text-ink-soft">
            {t('toppled', 'повалив')} #{awards.giantSlayer.loserRank} {awards.giantSlayer.losers.join(' & ')}
          </div>
        </AwardCard>
      )}

      {awards.mostCarried && (
        <AwardCard
          emoji="🎒"
          title="Most Carried"
          accent="tang"
          blurb={t('Widest swing between best & worst partner', 'Найбільший розрив між найкращим і найгіршим партнером')}
        >
          <SoloRow name={awards.mostCarried.player} note={signed(Math.round(awards.mostCarried.spread * 100))} />
          <div className="mt-1 text-xs text-ink-soft">
            {t('soared with', 'злітав із')} {awards.mostCarried.bestPartner} ({pct(awards.mostCarried.bestRate)}), {t('sank with', 'тонув із')}{' '}
            {awards.mostCarried.worstPartner} ({pct(awards.mostCarried.worstRate)})
          </div>
        </AwardCard>
      )}

      {awards.woodenSpoon && (
        <AwardCard emoji="🥄" title="Wooden Spoon" accent="sun" blurb={t('Last place — back next week, stronger 💪', 'Останнє місце — повернеться сильнішим 💪')}>
          <SoloRow name={awards.woodenSpoon.player} note={`${awards.woodenSpoon.points} pts`} />
        </AwardCard>
      )}

      {awards.perfectPairs.length > 0 && (
        <AwardCard
          emoji="✨"
          title="Perfect Pairs"
          accent="mint"
          blurb={t('Undefeated together (2+ games)', 'Непереможні разом (2+ ігор)')}
        >
          <div className="flex flex-col gap-1.5">
            {awards.perfectPairs.slice(0, 4).map((p) => (
              <div key={p.key} className="flex items-center justify-between gap-2">
                <DuoRow a={p.players[0]} b={p.players[1]} />
                <span className="font-mono text-sm font-bold tabular">
                  {p.wins}-{p.losses}
                  {p.ties ? `-${p.ties}` : ''}
                </span>
              </div>
            ))}
          </div>
        </AwardCard>
      )}
    </div>
  )
}
