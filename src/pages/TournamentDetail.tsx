import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { saveCommunityTournament, saveCommunityAliases } from '../lib/supabase'
import { tournamentInsights } from '../stats'
import type { Match, Tournament } from '../types'
import { StandingsTable } from '../components/StandingsTable'
import { AwardGrid } from '../components/AwardCard'
import { PodiumBlock } from '../components/PodiumBlock'
import { SectionTitle, Chip, Empty } from '../components/ui/Bits'
import { Avatar } from '../components/ui/Avatar'
import { eventTitle, nicknameOf } from '../lib/tournament'
import { useT } from '../lib/i18n'
import { cx } from '../lib/cx'

export function TournamentDetail() {
  const { t } = useT()
  const { id } = useParams()
  const tournaments = useAppStore((s) => s.tournaments)
  const aliases = useAppStore((s) => s.aliases)
  const localOnly = useAppStore((s) => s.localOnly)

  const tournament = tournaments.find((t) => t.id === id)
  const isDraft = !!tournament && localOnly.includes(tournament.id)
  const insights = useMemo(
    () => (tournament ? tournamentInsights(tournament, aliases) : null),
    [tournament, aliases],
  )

  if (!tournament || !insights) {
    return (
      <Empty emoji="🤷">
        {t('Tournament not found.', 'Турнір не знайдено.')} <Link to="/" className="font-bold underline">{t('Back to dashboard', 'На головну')}</Link>.
      </Empty>
    )
  }

  const { standings, awards } = insights
  const champion = standings[0]
  const rounds = Math.max(...tournament.matches.map((m) => m.round))

  return (
    <div className="space-y-10">
      {isDraft && <DraftBanner tournament={tournament} />}

      {/* Header */}
      <section className="sticker-lg bg-paper-100 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/" className="chip bg-paper-100 hover:bg-paper-300">
            {t('← Home', '← Головна')}
          </Link>
          <Chip tone="bg-sun-soft">🎉 {nicknameOf(tournament)}</Chip>
          <Chip tone="bg-mint-soft">{tournament.format}</Chip>
          <Chip tone="bg-sky-soft">{t(`to ${tournament.pointsPerMatch} pts`, `до ${tournament.pointsPerMatch} pts`)}</Chip>
        </div>
        <h1 className="mt-3 text-4xl font-extrabold sm:text-5xl">{eventTitle(tournament)}</h1>
        {champion && (
          <p className="mt-2 flex items-center gap-2 text-ink-soft">
            {t('Champion:', 'Чемпіон:')} <Avatar name={champion.player} size="sm" />
            <span className="font-bold text-ink">{champion.player}</span> 👑 {t(`with ${champion.points} pts`, `з ${champion.points} балів`)}
          </p>
        )}
        <div className="mt-5">
          <Link to={`/t/${tournament.id}/wrapped`} className="btn-dark">
            {t('✨ Open Wrapped recap', '✨ Відкрити Wrapped')}
          </Link>
        </div>
      </section>

      {/* Podium */}
      <section className="sticker bg-gradient-to-b from-paper-100 to-paper-200 px-4 py-8">
        <PodiumBlock standings={standings} />
      </section>

      {/* Standings */}
      <section>
        <SectionTitle emoji="🏆" title={t('Final Standings', 'Фінальна таблиця')} hint={t("Points = sum of your team's scores", 'Бали = сума рахунків твоєї команди')} />
        <StandingsTable standings={standings} />
      </section>

      {/* Awards */}
      <section>
        <SectionTitle emoji="🎁" title={t('The Awards', 'Нагороди')} hint={t('Auto-generated, lovingly data-driven', 'Згенеровано автоматично, з любов’ю з даних')} />
        <AwardGrid awards={awards} />
      </section>

      {/* Match log */}
      <section>
        <SectionTitle emoji="🎾" title={t('Match Log', 'Журнал матчів')} hint={t(`${tournament.matches.length} matches`, `${tournament.matches.length} матчів`)} />
        <div className="space-y-4">
          {Array.from({ length: rounds }, (_, r) => r + 1).map((round) => (
            <div key={round}>
              <div className="mb-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft">
                {t('Round', 'Раунд')} {round}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {tournament.matches
                  .map((m, idx) => ({ m, idx }))
                  .filter(({ m }) => m.round === round)
                  .map(({ m, idx }) => (
                    <MatchRow key={idx} match={m} />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Banner for test-mode tournaments that live only in this browser. */
function DraftBanner({ tournament }: { tournament: Tournament }) {
  const { t } = useT()
  const navigate = useNavigate()
  const aliases = useAppStore((s) => s.aliases)
  const deleteTournament = useAppStore((s) => s.deleteTournament)
  const unmarkLocalOnly = useAppStore((s) => s.unmarkLocalOnly)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const publish = async () => {
    setBusy(true)
    setError(null)
    try {
      await saveCommunityTournament(tournament)
      if (Object.keys(aliases).length) await saveCommunityAliases(aliases)
      unmarkLocalOnly(tournament.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const discard = () => {
    deleteTournament(tournament.id)
    navigate('/')
  }

  return (
    <section className="sticker border-dashed bg-sky-soft p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">🧪</span>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold">{t('Test tournament — only on this device', 'Тестовий турнір — лише на цьому пристрої')}</div>
          <p className="text-sm text-ink-soft">
            {t(
              'Nobody else sees it, and it skews your local stats while it exists. Publish it for everyone, or delete it.',
              'Ніхто інший його не бачить, і поки він існує — він викривлює твою локальну статистику. Опублікуй для всіх або видали.',
            )}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button className="btn-dark px-4 py-2 text-sm" disabled={busy} onClick={publish}>
            {busy ? t('Publishing…', 'Публікація…') : t('🚀 Publish for everyone', '🚀 Опублікувати для всіх')}
          </button>
          <button className="btn px-4 py-2 text-sm" disabled={busy} onClick={discard}>
            {t('🗑 Delete', '🗑 Видалити')}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm font-bold text-punch">⚠️ {t('Publishing failed: ', 'Не вдалося опублікувати: ')}{error}</p>}
    </section>
  )
}

function Team({ players, win }: { players: [string, string]; win: boolean }) {
  return (
    <div className={cx('flex items-center gap-1.5', win && 'font-bold')}>
      <Avatar name={players[0]} size="sm" />
      <Avatar name={players[1]} size="sm" />
      <span className="ml-0.5 truncate text-sm">
        {players[0]} & {players[1]}
      </span>
    </div>
  )
}

function MatchRow({ match }: { match: Match }) {
  const aWin = match.scoreA > match.scoreB
  const bWin = match.scoreB > match.scoreA

  return (
    <div className="sticker flex items-center justify-between gap-2 p-2.5">
      <Team players={match.teamA} win={aWin} />
      <div className="shrink-0 rounded-lg border-2 border-ink bg-paper-200 px-2 py-0.5 font-mono text-sm font-bold tabular">
        {match.scoreA}–{match.scoreB}
      </div>
      <Team players={match.teamB} win={bWin} />
    </div>
  )
}
