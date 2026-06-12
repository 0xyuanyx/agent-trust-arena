import { useEffect, useRef, useState } from 'react'
import { AgentExecutionPipeline } from '../components/AgentExecutionPipeline'
import { AgentReportCardModal } from '../components/AgentReportCardModal'
import { AgentReadinessScore } from '../components/AgentReadinessScore'
import { AgentSelector } from '../components/AgentSelector'
import { DecisionConsole } from '../components/DecisionConsole'
import { DecisionEvidencePanel } from '../components/DecisionEvidencePanel'
import { HoneypotTrapSelector } from '../components/HoneypotTrapSelector'
import { HumanVsAiBaseline } from '../components/HumanVsAiBaseline'
import { IntentCalldataVerifier } from '../components/IntentCalldataVerifier'
import { RecentTestHistory } from '../components/RecentTestHistory'
import { RiskSignalPanel } from '../components/RiskSignalPanel'
import { TopBar } from '../components/TopBar'
import { VerdictCard } from '../components/VerdictCard'
import { WalletGuardrails } from '../components/WalletGuardrails'
import { getMantleSepoliaAddressUrl } from '../config/chains'
import { decisionLoggerAddress } from '../contracts/decisionLogger'
import { appCopy } from '../copy'
import { logDecisionToMantle, type OnchainLogResult } from '../core/onchainLogger'
import { detectRiskSignals, type RiskSignal } from '../core/riskSignals'
import {
  defaultBenchmarkPolicy,
  getRecentBenchmarkRuns,
  runBenchmark,
  type BenchmarkRunHistoryEntry,
} from '../core/benchmarkRunner'
import {
  connectWallet,
  getWalletState,
  onWalletChange,
  type WalletState,
} from '../core/walletConnection'
import { agents } from '../data/agents'
import { scenarios } from '../data/scenarios'
import type { AgentProfile, BenchmarkResult, ComparisonRow, Scenario } from '../types/benchmark'

type RevealStage =
  | 'idle'
  | 'trap'
  | 'proposal'
  | 'verifying'
  | 'auditor'
  | 'executor'
  | 'mantle'
  | 'complete'
type RiskSignalTone = 'critical' | 'high' | 'medium' | 'low'
type HumanReviewChoice = 'approve' | 'block' | 'needsReview'
type ScenarioWithCardSummary = Scenario & {
  cardSummary?: string
}
type AgentStats = {
  testsCompleted: number
  trapsSurvived: number
  criticalFailures: number
}
type TimelineConsoleEvent = {
  label: string
  message: string
  elapsedMs: number
  tone: 'neutral' | 'proposer' | 'verifier' | 'auditorVeto' | 'auditorPass' | 'executor'
}

type HumanReviewCopy = {
  prompt: string
  actions: Record<HumanReviewChoice, string>
  results: {
    blocked: string
    missed: string
    review: string
  }
  outcomes: {
    humanCaught: string
    humanMissed: string
    bothCaught: string
  }
}

type PartialHumanReviewCopy = {
  prompt?: string
  actions?: Partial<Record<HumanReviewChoice, string>>
  results?: Partial<HumanReviewCopy['results']>
  outcomes?: Partial<HumanReviewCopy['outcomes']>
}

const copy = appCopy
const initialAgent = agents[0]
const initialScenario = scenarios[0]
const stagedRevealTiming = {
  trapLoaded: 0,
  proposal: 520,
  verifierStart: 900,
  verifierRowInterval: 250,
  auditorPause: 350,
  executorAfterAuditor: 520,
  mantleAfterExecutor: 420,
  finalAfterMantle: 360,
} as const
const revealStageOrder: Record<RevealStage, number> = {
  idle: 0,
  trap: 1,
  proposal: 2,
  verifying: 3,
  auditor: 4,
  executor: 5,
  mantle: 6,
  complete: 7,
}
const humanReviewFallbackCopy = {
  prompt: 'Run as Human Reviewer',
  actions: {
    approve: '승인',
    block: '차단',
    needsReview: '검토 필요',
  },
  results: {
    blocked: '함정 차단',
    missed: '함정 놓침',
    review: '검토 필요',
  },
  outcomes: {
    humanCaught: 'Human reviewer caught the trap while the AI Risk Auditor blocked execution.',
    humanMissed: 'Human approved a malicious transaction - AI Risk Auditor caught it.',
    bothCaught: 'Human reviewer and AI both caught the trap before execution.',
  },
} satisfies HumanReviewCopy
const humanReviewCopy = getHumanReviewCopy()
const disconnectedWalletState: WalletState = {
  connected: false,
  isMantleSepolia: false,
}

export function ArenaDashboard() {
  const sequenceTimersRef = useRef<ReturnType<typeof window.setTimeout>[]>([])
  const sequenceIdRef = useRef(0)
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgent.id)
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario.id)
  const [revealStage, setRevealStage] = useState<RevealStage>('idle')
  const [visibleVerifierRows, setVisibleVerifierRows] = useState(0)
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult>()
  const [onchainLogResult, setOnchainLogResult] = useState<OnchainLogResult>()
  const [isLoggingDecision, setIsLoggingDecision] = useState(false)
  const [walletState, setWalletState] = useState<WalletState>(disconnectedWalletState)
  const [walletError, setWalletError] = useState<string>()
  const [isConnectingWallet, setIsConnectingWallet] = useState(false)
  const [humanReviewChoice, setHumanReviewChoice] = useState<HumanReviewChoice>()
  const [isReportCardOpen, setIsReportCardOpen] = useState(false)
  const [isReportSummaryCopied, setIsReportSummaryCopied] = useState(false)
  const [history, setHistory] = useState<BenchmarkRunHistoryEntry[]>(() =>
    getRecentBenchmarkRuns(),
  )

  function clearSequenceTimers() {
    sequenceTimersRef.current.forEach((timerId) => window.clearTimeout(timerId))
    sequenceTimersRef.current = []
  }

  useEffect(() => {
    let isMounted = true

    void getWalletState().then((state) => {
      if (isMounted) {
        setWalletState(state)
      }
    })

    const unsubscribe = onWalletChange((state) => {
      setWalletState(state)
      setWalletError(undefined)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    return () => {
      clearSequenceTimers()
    }
  }, [])

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? initialAgent
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? initialScenario
  const selectedAgentHistory = history.filter((entry) => entry.agentId === selectedAgent.id)
  const hasFinalResult = Boolean(benchmarkResult && revealStage === 'complete')
  const isRunning = revealStage !== 'idle' && revealStage !== 'complete'
  const finalBenchmarkResult = hasFinalResult ? benchmarkResult : undefined
  const profileStats = getProfileStats(selectedAgent, selectedAgentHistory)
  const decisionContractUrl = decisionLoggerAddress
    ? getMantleSepoliaAddressUrl(decisionLoggerAddress)
    : undefined

  async function handleRunTrustTest() {
    clearSequenceTimers()
    const sequenceId = sequenceIdRef.current + 1
    sequenceIdRef.current = sequenceId
    const result = runBenchmark({
      agentId: selectedAgent.id,
      scenarioId: selectedScenario.id,
      policy: defaultBenchmarkPolicy,
    })
    const nextHistory = getRecentBenchmarkRuns()

    setBenchmarkResult(result)
    setOnchainLogResult(undefined)
    setHumanReviewChoice(undefined)
    setIsReportCardOpen(false)
    setIsReportSummaryCopied(false)
    setVisibleVerifierRows(0)
    setRevealStage('trap')
    scheduleReveal(sequenceId, stagedRevealTiming.proposal, () => {
      setRevealStage('proposal')
    })

    result.verification.comparisonRows.forEach((_, index) => {
      scheduleReveal(
        sequenceId,
        stagedRevealTiming.verifierStart + index * stagedRevealTiming.verifierRowInterval,
        () => {
          setRevealStage('verifying')
          setVisibleVerifierRows(index + 1)
        },
      )
    })

    const auditorDelay = getAuditorRevealDelay(result)
    scheduleReveal(sequenceId, auditorDelay, () => {
      setRevealStage('auditor')
    })
    scheduleReveal(sequenceId, auditorDelay + stagedRevealTiming.executorAfterAuditor, () => {
      setRevealStage('executor')
    })
    scheduleReveal(
      sequenceId,
      auditorDelay + stagedRevealTiming.executorAfterAuditor + stagedRevealTiming.mantleAfterExecutor,
      () => {
        setRevealStage('mantle')
      },
    )
    scheduleReveal(
      sequenceId,
      getFinalRevealDelay(result),
      () => {
        setRevealStage('complete')
        setHistory(nextHistory)
      },
    )
  }

  function handleSelectAgent(agentId: string) {
    resetRunReveal()
    setSelectedAgentId(agentId)
  }

  function handleSelectScenario(scenarioId: string) {
    resetRunReveal()
    setSelectedScenarioId(scenarioId)
  }

  function resetRunReveal() {
    clearSequenceTimers()
    sequenceIdRef.current += 1
    setBenchmarkResult(undefined)
    setRevealStage('idle')
    setVisibleVerifierRows(0)
    setOnchainLogResult(undefined)
    setHumanReviewChoice(undefined)
    setIsReportCardOpen(false)
    setIsReportSummaryCopied(false)
  }

  function scheduleReveal(sequenceId: number, delayMs: number, callback: () => void) {
    const timerId = window.setTimeout(() => {
      sequenceTimersRef.current = sequenceTimersRef.current.filter((activeTimerId) => activeTimerId !== timerId)
      if (sequenceIdRef.current === sequenceId) {
        callback()
      }
    }, delayMs)
    sequenceTimersRef.current.push(timerId)
  }

  async function handleConnectWallet() {
    if (isConnectingWallet) {
      return
    }

    setIsConnectingWallet(true)
    setWalletError(undefined)

    try {
      const result = await connectWallet()
      if (result.error) {
        setWalletError(result.error)
      }
      setWalletState(await getWalletState())
    } finally {
      setIsConnectingWallet(false)
    }
  }

  function handleOpenDecisionContract() {
    if (decisionContractUrl) {
      window.open(decisionContractUrl, '_blank', 'noopener,noreferrer')
    }
  }

  async function handleRecordOnMantle() {
    if (!benchmarkResult || !hasFinalResult || isLoggingDecision || onchainLogResult) {
      return
    }

    setIsLoggingDecision(true)

    try {
      const result = await logDecisionToMantle(benchmarkResult.evidence)
      setOnchainLogResult(result)
    } finally {
      setIsLoggingDecision(false)
    }
  }

  function handleSelectHumanReview(actionId: string) {
    if (isHumanReviewChoice(actionId)) {
      setHumanReviewChoice(actionId)
    }
  }

  function handleOpenReportCard() {
    setIsReportSummaryCopied(false)
    setIsReportCardOpen(true)
  }

  function handleCloseReportCard() {
    setIsReportCardOpen(false)
  }

  async function handleCopyReportSummary() {
    if (!benchmarkResult) {
      return
    }

    const summaryText = getReportSummaryText(benchmarkResult, profileStats, onchainLogResult)
    await navigator.clipboard.writeText(summaryText)
    setIsReportSummaryCopied(true)
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar
        badges={[copy.hero.badges.builtOnMantle, copy.hero.badges.track06, copy.hero.badges.track05]}
        onPrimaryAction={handleConnectWallet}
        onSecondaryAction={handleOpenDecisionContract}
        primaryAction={getWalletActionLabel(walletState, isConnectingWallet, walletError)}
        primaryDisabled={isConnectingWallet}
        secondaryAction={copy.hero.actions.viewDecisionContract}
        secondaryDisabled={!decisionContractUrl}
        subtitle={copy.hero.subtitle}
        title={copy.hero.title}
      />
      <div className="mx-auto max-w-[1680px] px-4 py-3">
        <section className="space-y-3 lg:hidden">
          <AgentSelector
            agents={agents.map(mapAgentOption)}
            disabled={isRunning}
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgent.id}
            selectedAgentDetails={{
              description: selectedAgent.personality,
              facts: getAgentProfileFacts(selectedAgent, profileStats),
              name: selectedAgent.name,
            }}
            showDetails={false}
            title={copy.agentProfile.title}
          />
          <HoneypotTrapSelector
            description={copy.trap.description}
            disabled={isRunning}
            onRun={handleRunTrustTest}
            onSelect={handleSelectScenario}
            runLabel={getRunButtonLabel(isRunning, hasFinalResult)}
            selectedId={selectedScenarioId}
            showDetails={false}
            title={copy.trap.title}
            traps={scenarios.map(mapScenarioToTrap)}
          />
          <MobilePipelineStrip steps={getPipelineSteps(benchmarkResult, revealStage)} />
          <VerdictCard
            details={hasFinalResult && benchmarkResult ? getMobileVerdictDetails(benchmarkResult) : []}
            emptyState={copy.history.emptyState}
            tone={isSafelyRejected(benchmarkResult) ? 'safe' : 'blocked'}
            verdict={hasFinalResult && benchmarkResult ? getVerdictLabel(benchmarkResult) : undefined}
          />
          <AgentReadinessScore
            compact
            metrics={getScoreMetrics(selectedAgent.scoreBreakdown)}
            scoreLabel={getScoreLabel(finalBenchmarkResult)}
            scoreValue={getScoreValue(selectedAgent, finalBenchmarkResult)}
            status={getScoreStatus(finalBenchmarkResult)}
            title={copy.score.title}
          />
          <MobileEvidencePanel
            emptyState={copy.history.emptyState}
            explorerHref={
              onchainLogResult?.mode === 'onchain' ? onchainLogResult.explorerUrl : undefined
            }
            explorerLabel={copy.evidence.actions.viewOnMantleExplorer}
            isLoggingDecision={isLoggingDecision}
            onRecord={handleRecordOnMantle}
            recordDisabled={!hasFinalResult || isLoggingDecision || Boolean(onchainLogResult)}
            recordLabel={getRecordButtonLabel(onchainLogResult, isLoggingDecision)}
            result={hasFinalResult ? benchmarkResult : undefined}
            title={copy.evidence.title}
            txLabel={copy.evidence.fields.txHash}
            txValue={getMobileEvidenceTxValue(onchainLogResult)}
            verdictLabel={copy.evidence.fields.verdict}
          />
        </section>

        <div className="hidden gap-3 lg:grid xl:grid-cols-[280px_minmax(550px,1fr)_390px]">
          <aside className="space-y-3">
          <AgentSelector
            agents={agents.map(mapAgentOption)}
            disabled={isRunning}
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgent.id}
            selectedAgentDetails={{
              description: selectedAgent.personality,
              facts: getAgentProfileFacts(selectedAgent, profileStats),
              name: selectedAgent.name,
            }}
            title={copy.agentProfile.title}
          />
          <AgentReadinessScore
            formula={copy.score.formula}
            metrics={getScoreMetrics(selectedAgent.scoreBreakdown)}
            reason={finalBenchmarkResult?.score.reason}
            scoreLabel={getScoreLabel(finalBenchmarkResult)}
            scoreValue={getScoreValue(selectedAgent, finalBenchmarkResult)}
            status={getScoreStatus(finalBenchmarkResult)}
            title={copy.score.title}
          />
          <WalletGuardrails
            items={[
              {
                label: copy.guardrails.fields.maxDailySpend,
                value: copy.guardrails.values.maxDailySpend,
                active: defaultBenchmarkPolicy.maxDailySpendUSDC > 0,
              },
              {
                label: copy.guardrails.fields.blockUnlimitedApprovals,
                value: copy.guardrails.values.enabled,
                active: defaultBenchmarkPolicy.blockUnlimitedApprovals,
              },
              {
                label: copy.guardrails.fields.requireVerifiedContracts,
                value: copy.guardrails.values.enabled,
                active: defaultBenchmarkPolicy.requireVerifiedContracts,
              },
              {
                label: copy.guardrails.fields.blockUnknownEOAs,
                value: copy.guardrails.values.enabled,
                active: defaultBenchmarkPolicy.blockUnknownEOA,
              },
              {
                label: copy.guardrails.fields.humanVetoForHighRisk,
                value: copy.guardrails.values.enabled,
                active: defaultBenchmarkPolicy.humanVetoForHighRisk,
              },
              {
                label: copy.guardrails.fields.autoExecutionLimit,
                value: copy.guardrails.values.autoExecutionLimit,
                active: defaultBenchmarkPolicy.autoExecutionLimitUSDC === 0,
              },
            ]}
            title={copy.guardrails.title}
          />
          <RecentTestHistory
            emptyState={copy.history.emptyState}
            items={selectedAgentHistory.map(mapHistoryItem)}
            title={copy.history.title}
          />
          </aside>

          <section className="space-y-3">
          <HoneypotTrapSelector
            description={copy.trap.description}
            disabled={isRunning}
            onRun={handleRunTrustTest}
            onSelect={handleSelectScenario}
            runLabel={getRunButtonLabel(isRunning, hasFinalResult)}
            selectedId={selectedScenarioId}
            title={copy.trap.title}
            traps={scenarios.map(mapScenarioToTrap)}
          />
          <AgentExecutionPipeline
            steps={getPipelineSteps(benchmarkResult, revealStage)}
            subtitle={copy.pipeline.subtitle}
            title={copy.pipeline.title}
          />
          <VerdictCard
            details={hasFinalResult && benchmarkResult ? getVerdictDetails(benchmarkResult) : []}
            emptyState={copy.history.emptyState}
            tone={isSafelyRejected(benchmarkResult) ? 'safe' : 'blocked'}
            verdict={hasFinalResult && benchmarkResult ? getVerdictLabel(benchmarkResult) : undefined}
          />
          <IntentCalldataVerifier
            columns={{
              calldata: copy.verifier.tableHeaders.decodedCalldata,
              field: copy.verifier.tableHeaders.field,
              intent: copy.verifier.tableHeaders.userIntent,
              plan: copy.verifier.tableHeaders.agentPlan,
              status: copy.verifier.tableHeaders.status,
            }}
            emptyState={copy.history.emptyState}
            progressLabel={getVerifierProgressLabel(benchmarkResult, visibleVerifierRows)}
            rows={
              benchmarkResult
                ? benchmarkResult.verification.comparisonRows
                    .slice(0, visibleVerifierRows)
                    .map(mapComparisonRow)
                : []
            }
            title={copy.verifier.title}
          />
          <RiskSignalPanel
            emptyState={copy.history.emptyState}
            signals={isStageAtLeast(revealStage, 'auditor') && benchmarkResult ? getRiskSignalItems(benchmarkResult) : []}
            title={copy.score.metrics.riskSignalDetection}
          />
          </section>

          <aside className="space-y-3">
          <DecisionConsole
            emptyState={copy.history.emptyState}
            events={getConsoleEvents(benchmarkResult, revealStage, visibleVerifierRows)}
            lineCountLabel={getConsoleLineCountLabel(
              getConsoleEvents(benchmarkResult, revealStage, visibleVerifierRows).length,
            )}
            title={copy.console.title}
          />
          <DecisionEvidencePanel
            emptyState={copy.history.emptyState}
            explorerHref={
              onchainLogResult?.mode === 'onchain' ? onchainLogResult.explorerUrl : undefined
            }
            explorerLabel={copy.evidence.actions.viewOnMantleExplorer}
            facts={
              hasFinalResult && benchmarkResult
                ? getEvidenceFacts(benchmarkResult, onchainLogResult)
                : []
            }
            modeLabel={hasFinalResult ? getEvidenceModeLabel(onchainLogResult) : undefined}
            recordAction={
              hasFinalResult ? (
                <button
                  className="w-full rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition enabled:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isLoggingDecision || Boolean(onchainLogResult)}
                  onClick={handleRecordOnMantle}
                  type="button"
                >
                  {getRecordButtonLabel(onchainLogResult, isLoggingDecision)}
                </button>
              ) : undefined
            }
            title={copy.evidence.title}
          />
          {hasFinalResult && benchmarkResult ? (
            <button
              className="w-full rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-300/15"
              onClick={handleOpenReportCard}
              type="button"
            >
              {copy.reportCard.actions.view}
            </button>
          ) : null}
          <HumanVsAiBaseline
            actions={hasFinalResult ? getHumanReviewActions() : []}
            emptyState={copy.history.emptyState}
            facts={hasFinalResult && benchmarkResult ? getHumanReviewFacts(benchmarkResult) : []}
            finalLabel={copy.humanVsAi.finalLabel}
            finalResult={
              hasFinalResult && benchmarkResult && humanReviewChoice
                ? getHumanFinalOutcome(benchmarkResult, humanReviewChoice)
                : undefined
            }
            onSelectAction={handleSelectHumanReview}
            prompt={hasFinalResult ? humanReviewCopy.prompt : undefined}
            rows={
              hasFinalResult && benchmarkResult && humanReviewChoice
                ? getHumanVsAiRows(benchmarkResult, humanReviewChoice)
                : []
            }
            selectedAction={humanReviewChoice}
            title={copy.humanVsAi.title}
          />
          </aside>
        </div>
      </div>
      {benchmarkResult ? (
        <AgentReportCardModal
          agentName={benchmarkResult.agent.name}
          closeLabel={copy.reportCard.actions.close}
          copiedLabel={copy.reportCard.actions.copied}
          copySummaryLabel={copy.reportCard.actions.copySummary}
          isCopied={isReportSummaryCopied}
          lastDecision={getReportLastDecision(onchainLogResult)}
          metrics={getReportCardMetrics(profileStats)}
          onClose={handleCloseReportCard}
          onCopySummary={handleCopyReportSummary}
          open={isReportCardOpen && hasFinalResult}
          recentVerdict={{
            label: copy.reportCard.fields.recentVerdict,
            value: getVerdictLabel(benchmarkResult),
          }}
          scoreLabel={copy.reportCard.fields.readinessScore}
          scoreValue={`${benchmarkResult.score.nextScore}/100`}
          summaryLine={getReportSummaryLine(profileStats)}
          title={copy.reportCard.title}
        />
      ) : null}
    </main>
  )
}

function MobilePipelineStrip({ steps }: { steps: ReturnType<typeof getPipelineSteps> }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.04] p-3">
      <div className="grid grid-cols-[minmax(0,1fr)_14px_minmax(0,1fr)_14px_minmax(0,1fr)] items-stretch gap-1.5">
        {steps.map((step, index) => (
          <div className="contents" key={step.role}>
            <article className="min-w-0 rounded-lg border border-white/10 bg-slate-950/70 p-2">
              <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-white">
                {step.role}
              </p>
              {step.status ? (
                <span className="mt-1.5 inline-flex max-w-full rounded-md bg-emerald-300/10 px-1.5 py-0.5 text-[10px] font-semibold leading-3 text-emerald-100">
                  <span className="line-clamp-2 break-words">{step.status}</span>
                </span>
              ) : null}
            </article>
            {index < steps.length - 1 ? (
              <div
                aria-hidden="true"
                className="flex items-center justify-center text-sm font-semibold text-cyan-100/55"
              >
                →
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}

function MobileEvidencePanel({
  title,
  emptyState,
  result,
  verdictLabel,
  txLabel,
  txValue,
  recordLabel,
  explorerLabel,
  explorerHref,
  isLoggingDecision,
  recordDisabled,
  onRecord,
}: {
  title: string
  emptyState: string
  result?: BenchmarkResult
  verdictLabel: string
  txLabel: string
  txValue: string
  recordLabel: string
  explorerLabel: string
  explorerHref?: string
  isLoggingDecision: boolean
  recordDisabled: boolean
  onRecord: () => void
}) {
  return (
    <section className="rounded-lg border border-cyan-300/20 bg-cyan-300/[0.06] p-4">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      {result ? (
        <>
          <dl className="mt-4 divide-y divide-white/10">
            <div className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1fr)] gap-3 py-2 first:pt-0">
              <dt className="text-xs text-slate-500">{verdictLabel}</dt>
              <dd className="min-w-0 text-right text-xs font-semibold text-slate-100">
                {getVerdictLabel(result)}
              </dd>
            </div>
            <div className="grid grid-cols-[minmax(88px,0.8fr)_minmax(0,1fr)] gap-3 py-2 last:pb-0">
              <dt className="text-xs text-slate-500">{txLabel}</dt>
              <dd className="min-w-0 break-all text-right font-mono text-xs text-slate-200">
                {txValue}
              </dd>
            </div>
          </dl>
          <button
            className="mt-4 w-full rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950 transition enabled:hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={recordDisabled}
            onClick={onRecord}
            type="button"
          >
            {recordLabel}
          </button>
          <button
            className="mt-3 w-full rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition enabled:hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-45"
            disabled={!explorerHref || isLoggingDecision}
            onClick={() => {
              if (explorerHref) {
                window.open(explorerHref, '_blank', 'noopener,noreferrer')
              }
            }}
            type="button"
          >
            {explorerLabel}
          </button>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-400">{emptyState}</p>
      )}
    </section>
  )
}

function mapAgentOption(agent: AgentProfile) {
  return {
    id: agent.id,
    name: agent.name,
    personality: agent.personality,
    status: agent.status,
    strength: agent.strength,
    weakness: agent.weakness,
  }
}

function mapScenarioToTrap(scenario: Scenario) {
  return {
    id: scenario.id,
    name: scenario.title,
    severity: scenario.severity,
    objective: getScenarioCardSummary(scenario),
    details: [
      { label: copy.trap.cardFields.objective, value: scenario.objective },
      { label: copy.trap.cardFields.whatAgentSees, value: scenario.visibleIntent },
      { label: copy.trap.cardFields.hiddenBehavior, value: scenario.hiddenCalldata.summary },
      { label: copy.trap.cardFields.expectedSafeBehavior, value: scenario.expectedSafeBehavior },
      { label: copy.trap.cardFields.failureCondition, value: scenario.failureCondition },
      { label: copy.trap.cardFields.severity, value: scenario.severity },
    ],
  }
}

function getScenarioCardSummary(scenario: Scenario) {
  return (scenario as ScenarioWithCardSummary).cardSummary ?? scenario.objective
}

function getRunButtonLabel(isRunning: boolean, hasFinalResult: boolean) {
  if (isRunning) {
    return copy.stagedReveal.actions.running
  }

  return hasFinalResult ? copy.stagedReveal.actions.rerun : copy.trap.actions.runTrustTest
}

function getVerifierProgressLabel(
  result: BenchmarkResult | undefined,
  visibleVerifierRows: number,
) {
  if (!result || visibleVerifierRows <= 0) {
    return undefined
  }

  return copy.stagedReveal.verifier.progress
    .replace('{current}', String(visibleVerifierRows))
    .replace('{total}', String(result.verification.comparisonRows.length))
}

function getConsoleLineCountLabel(eventCount: number) {
  return copy.stagedReveal.console.lineCount.replace('{count}', String(eventCount))
}

function getAuditorConsoleMessage(result: BenchmarkResult) {
  return isSafelyRejected(result)
    ? copy.stagedReveal.console.auditorPassed
    : result.audit.vetoReason ?? result.audit.recommendation
}

function getAuditorRevealDelay(result: BenchmarkResult) {
  return (
    stagedRevealTiming.verifierStart +
    result.verification.comparisonRows.length * stagedRevealTiming.verifierRowInterval +
    stagedRevealTiming.auditorPause
  )
}

function getFinalRevealDelay(result: BenchmarkResult) {
  return (
    getAuditorRevealDelay(result) +
    stagedRevealTiming.executorAfterAuditor +
    stagedRevealTiming.mantleAfterExecutor +
    stagedRevealTiming.finalAfterMantle
  )
}

function isStageAtLeast(currentStage: RevealStage, targetStage: RevealStage) {
  return revealStageOrder[currentStage] >= revealStageOrder[targetStage]
}

function getPipelineSteps(result: BenchmarkResult | undefined, revealStage: RevealStage) {
  const proposer = copy.pipeline.agents.proposer
  const auditor = copy.pipeline.agents.riskAuditor
  const executor = copy.pipeline.agents.executor
  const didSafelyReject = isSafelyRejected(result)

  return [
    {
      role: proposer.title,
      status: isStageAtLeast(revealStage, 'proposal') ? proposer.status : undefined,
      description: proposer.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: proposer.permission,
      reason: result && isStageAtLeast(revealStage, 'proposal') ? result.proposal.plan : undefined,
    },
    {
      role: auditor.title,
      status: isStageAtLeast(revealStage, 'auditor')
        ? didSafelyReject
          ? copy.stagedReveal.pipeline.auditorPassedStatus
          : auditor.status
        : undefined,
      description: auditor.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: auditor.permission,
      reason:
        result && isStageAtLeast(revealStage, 'auditor')
          ? didSafelyReject
            ? copy.stagedReveal.pipeline.auditorPassedReason
            : result.audit.vetoReason ?? result.audit.recommendation
          : undefined,
    },
    {
      role: executor.title,
      status: isStageAtLeast(revealStage, 'executor') ? executor.status : undefined,
      description: executor.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: executor.permission,
      reason: result && isStageAtLeast(revealStage, 'executor') ? result.execution.reason : undefined,
    },
  ]
}

function mapComparisonRow(row: ComparisonRow) {
  return {
    field: mapVerifierField(row.field),
    intent: row.userIntent,
    plan: row.agentPlan,
    calldata: row.decodedCalldata,
    status: mapVerificationStatus(row.status),
    tone:
      row.status === 'MATCH'
        ? ('match' as const)
        : row.status === 'MISMATCH'
          ? ('warning' as const)
          : ('critical' as const),
  }
}

function mapVerifierField(field: string) {
  const normalizedField = field.toLowerCase()
  const fieldMap: Record<string, string> = {
    action: copy.verifier.fields.action,
    asset: copy.verifier.fields.asset,
    amount: copy.verifier.fields.amount,
    recipient: copy.verifier.fields.recipient,
    contract: copy.verifier.fields.contract,
    allowance: copy.verifier.fields.allowance,
    spender: copy.verifier.fields.spender,
    apr: copy.verifier.fields.apr,
    tvl: copy.verifier.fields.tvl,
  }

  return fieldMap[normalizedField] ?? field
}

function mapVerificationStatus(status: ComparisonRow['status']) {
  if (status === 'MATCH') {
    return copy.verifier.statuses.match
  }

  if (status === 'MISMATCH') {
    return copy.verifier.statuses.mismatch
  }

  return copy.verifier.statuses.criticalMismatch
}

function getRiskSignalItems(result: BenchmarkResult) {
  return detectRiskSignals(result.decodedCalldata, {
    metadata: result.scenario.metadata,
  }).map(mapRiskSignal)
}

function mapRiskSignal(signal: RiskSignal) {
  return {
    id: signal.id,
    label: mapRiskSignalLabel(signal.id),
    fieldLabel: mapVerifierField(signal.field),
    levelLabel: mapRiskLevelLabel(signal.riskLevel),
    reason: signal.reason,
    tone: mapRiskSignalTone(signal.riskLevel),
  }
}

function mapRiskSignalLabel(signalId: RiskSignal['id']) {
  const labelMap: Record<RiskSignal['id'], string> = {
    UNKNOWN_EOA_RECIPIENT: copy.riskSignals.unknownEoaRecipient,
    UNLIMITED_APPROVAL: copy.riskSignals.unlimitedApproval,
    APR_ANOMALY: copy.riskSignals.aprAnomaly,
    LOW_TVL: copy.riskSignals.lowTvl,
    UNVERIFIED_CONTRACT: copy.riskSignals.unverifiedContract,
  }

  return labelMap[signalId]
}

function mapRiskSignalTone(level: RiskSignal['riskLevel']): RiskSignalTone {
  if (level === 'CRITICAL') {
    return 'critical'
  }

  if (level === 'HIGH') {
    return 'high'
  }

  if (level === 'MEDIUM') {
    return 'medium'
  }

  return 'low'
}

function mapRiskLevelLabel(level: RiskSignal['riskLevel']) {
  const labelMap: Record<RiskSignal['riskLevel'], string> = {
    LOW: copy.riskSignals.levels.low,
    MEDIUM: copy.riskSignals.levels.medium,
    HIGH: copy.riskSignals.levels.high,
    CRITICAL: copy.riskSignals.levels.critical,
  }

  return labelMap[level]
}

function getVerdictLabel(result: BenchmarkResult) {
  return isSafelyRejected(result) ? copy.verdict.safelyRejected : result.execution.status
}

function getVerdictDetails(result: BenchmarkResult) {
  return [
    { label: getCopyLabel(copy.verdict.intent), value: result.scenario.visibleIntent },
    { label: getCopyLabel(copy.verdict.actualCalldata), value: result.scenario.hiddenCalldata.summary },
    {
      label: getCopyLabel(copy.verdict.mismatch),
      value: result.verification.detectedIssues.join('; '),
    },
    {
      label: getCopyLabel(copy.verdict.action),
      value: result.audit.vetoReason ?? result.audit.recommendation,
    },
  ]
}

function getMobileVerdictDetails(result: BenchmarkResult) {
  return [
    { label: getCopyLabel(copy.verdict.intent), value: result.scenario.visibleIntent },
    { label: getCopyLabel(copy.verdict.actualCalldata), value: result.scenario.hiddenCalldata.summary },
  ]
}

function getConsoleEvents(
  result: BenchmarkResult | undefined,
  revealStage: RevealStage,
  visibleVerifierRows: number,
) {
  if (!result || revealStage === 'idle') {
    return []
  }

  const auditorDelay = getAuditorRevealDelay(result)
  const executorDelay = auditorDelay + stagedRevealTiming.executorAfterAuditor
  const mantleDelay = executorDelay + stagedRevealTiming.mantleAfterExecutor
  const events: TimelineConsoleEvent[] = [
    {
      elapsedMs: stagedRevealTiming.trapLoaded,
      label: copy.console.events.trapLoaded,
      message: result.scenario.title,
      tone: 'neutral',
    },
  ]

  if (isStageAtLeast(revealStage, 'proposal')) {
    events.push({
      elapsedMs: stagedRevealTiming.proposal,
      label: copy.console.events.agentProposal,
      message: result.proposal.plan,
      tone: 'proposer',
    })
  }

  if (visibleVerifierRows > 0) {
    events.push({
      elapsedMs:
        stagedRevealTiming.verifierStart +
        (visibleVerifierRows - 1) * stagedRevealTiming.verifierRowInterval,
      label: copy.console.events.verifier,
      message: `${
        isStageAtLeast(revealStage, 'auditor')
          ? result.verification.detectedIssues[0] ?? result.verification.recommendation
          : getVerifierProgressLabel(result, visibleVerifierRows)
      }`,
      tone: 'verifier',
    })
  }

  if (isStageAtLeast(revealStage, 'auditor')) {
    events.push({
      elapsedMs: auditorDelay,
      label: copy.console.events.riskAuditor,
      message: getAuditorConsoleMessage(result),
      tone: isSafelyRejected(result) ? 'auditorPass' : 'auditorVeto',
    })
  }

  if (isStageAtLeast(revealStage, 'executor')) {
    events.push({
      elapsedMs: executorDelay,
      label: copy.stagedReveal.console.executor,
      message: copy.humanVsAi.finalResult,
      tone: 'executor',
    })
  }

  if (isStageAtLeast(revealStage, 'mantle')) {
    events.push({
      elapsedMs: mantleDelay,
      label: copy.console.events.mantleLog,
      message: result.evidence.metadataURI,
      tone: 'neutral',
    })
  }

  return events
}

function getEvidenceFacts(result: BenchmarkResult, logResult: OnchainLogResult | undefined) {
  const contractHref = decisionLoggerAddress
    ? getMantleSepoliaAddressUrl(decisionLoggerAddress)
    : undefined
  const facts = [
    { label: copy.evidence.fields.network, value: result.agent.network },
    {
      label: copy.evidence.fields.contract,
      value: decisionLoggerAddress ?? copy.evidence.values.notConfigured,
      href: contractHref,
    },
    { label: copy.evidence.fields.agentId, value: result.agent.id },
    { label: copy.evidence.fields.scenarioId, value: result.scenario.id },
    { label: copy.evidence.fields.verdict, value: getVerdictLabel(result) },
    { label: copy.evidence.fields.scoreDelta, value: formatSignedNumber(result.score.scoreDelta) },
    {
      label: copy.evidence.fields.txHash,
      value:
        logResult?.mode === 'onchain' && logResult.txHash
          ? logResult.txHash
          : copy.evidence.modes.localSimulationMode,
    },
  ]

  if (logResult?.mode === 'local-simulation' && logResult.error) {
    facts.push({ label: copy.evidence.fields.recordError, value: logResult.error })
  }

  return facts
}

function getEvidenceModeLabel(logResult: OnchainLogResult | undefined) {
  return logResult?.mode === 'onchain'
    ? copy.evidence.modes.onchain
    : copy.evidence.modes.localSimulationMode
}

function getMobileEvidenceTxValue(logResult: OnchainLogResult | undefined) {
  if (logResult?.mode === 'onchain' && logResult.txHash) {
    return formatAddress(logResult.txHash)
  }

  return copy.evidence.modes.localSimulationMode
}

function getRecordButtonLabel(logResult: OnchainLogResult | undefined, isLogging: boolean) {
  if (isLogging) {
    return copy.evidence.actions.recordingOnMantle
  }

  if (logResult?.mode === 'onchain') {
    return copy.evidence.actions.recordedOnMantle
  }

  if (logResult?.mode === 'local-simulation') {
    return copy.evidence.actions.localSimulationRecorded
  }

  return copy.evidence.actions.recordOnMantle
}

function getHumanVsAiRows(result: BenchmarkResult, humanChoice: HumanReviewChoice) {
  const finalOutcome = getHumanFinalOutcome(result, humanChoice)

  return [
    {
      actor: copy.humanVsAi.rows.proposer.actor,
      result: getAiProposerBaselineResult(result),
    },
    {
      actor: copy.humanVsAi.rows.auditor.actor,
      result: humanReviewCopy.results.blocked,
    },
    {
      actor: copy.humanVsAi.rows.human.actor,
      result: getHumanChoiceResult(humanChoice),
    },
    {
      actor: copy.humanVsAi.finalLabel,
      result: finalOutcome,
    },
  ]
}

function getHumanReviewFacts(result: BenchmarkResult) {
  return [
    { label: getCopyLabel(copy.verdict.intent), value: result.scenario.visibleIntent },
    {
      label: getCopyLabel(copy.verdict.actualCalldata),
      value: result.scenario.hiddenCalldata.summary,
    },
  ]
}

function getHumanReviewActions() {
  return [
    {
      id: 'approve',
      label: humanReviewCopy.actions.approve,
      tone: 'approve' as const,
    },
    {
      id: 'block',
      label: humanReviewCopy.actions.block,
      tone: 'block' as const,
    },
    {
      id: 'needsReview',
      label: humanReviewCopy.actions.needsReview,
      tone: 'review' as const,
    },
  ]
}

function getAiProposerBaselineResult(result: BenchmarkResult) {
  return isSafelyRejected(result) ? humanReviewCopy.results.blocked : humanReviewCopy.results.missed
}

function getHumanChoiceResult(humanChoice: HumanReviewChoice) {
  if (humanChoice === 'approve') {
    return humanReviewCopy.results.missed
  }

  if (humanChoice === 'needsReview') {
    return humanReviewCopy.results.review
  }

  return humanReviewCopy.results.blocked
}

function getHumanFinalOutcome(result: BenchmarkResult, humanChoice: HumanReviewChoice) {
  if (humanChoice === 'approve') {
    return humanReviewCopy.outcomes.humanMissed
  }

  if (isSafelyRejected(result)) {
    return humanReviewCopy.outcomes.bothCaught
  }

  return humanReviewCopy.outcomes.humanCaught
}

function getReportCardMetrics(stats: AgentStats) {
  return [
    { label: copy.reportCard.fields.trapsTested, value: String(stats.testsCompleted) },
    { label: copy.reportCard.fields.trapsSurvived, value: String(stats.trapsSurvived) },
    { label: copy.reportCard.fields.criticalFailures, value: String(stats.criticalFailures) },
  ]
}

function getReportLastDecision(logResult: OnchainLogResult | undefined) {
  if (logResult?.mode === 'onchain' && logResult.txHash) {
    return {
      label: copy.reportCard.fields.lastDecision,
      value: formatAddress(logResult.txHash),
      href: logResult.explorerUrl,
    }
  }

  return {
    label: copy.reportCard.fields.lastDecision,
    value: copy.reportCard.values.localSimulation,
  }
}

function getReportSummaryText(
  result: BenchmarkResult,
  stats: AgentStats,
  logResult: OnchainLogResult | undefined,
) {
  const verification =
    logResult?.mode === 'onchain' && logResult.explorerUrl
      ? `${copy.reportCard.values.verifiedOnMantleSepolia} ${logResult.explorerUrl}`
      : copy.reportCard.values.localSimulation

  return `${result.agent.name} — Readiness ${result.score.nextScore}/100 — ${getReportSummaryLine(stats)} — ${verification}`
}

function getReportSummaryLine(stats: AgentStats) {
  return copy.reportCard.summary.survivedTraps
    .replace('{survived}', String(stats.trapsSurvived))
    .replace('{tested}', String(stats.testsCompleted))
}

function getAgentProfileFacts(agent: AgentProfile, stats: AgentStats) {
  return [
    { label: copy.agentProfile.facts.agentId, value: agent.id },
    { label: copy.agentProfile.facts.role, value: agent.type },
    { label: copy.agentProfile.facts.owner, value: agent.owner },
    { label: copy.agentProfile.facts.network, value: agent.network },
    { label: copy.agentProfile.facts.mode, value: agent.mode },
    {
      label: copy.agentProfile.facts.testsCompleted,
      value: String(stats.testsCompleted),
    },
    {
      label: copy.agentProfile.facts.trapsSurvived,
      value: formatSurvivalCount(stats.trapsSurvived, stats.testsCompleted),
    },
    {
      label: copy.agentProfile.facts.criticalFailures,
      value: String(stats.criticalFailures),
    },
  ]
}

function mapHistoryItem(entry: BenchmarkRunHistoryEntry) {
  return {
    label: `${entry.scenarioId} ${entry.scenarioTitle}`,
    meta: `${entry.agentName} ${entry.previousScore} -> ${entry.nextScore} (${formatSignedNumber(entry.scoreDelta)})`,
    verdict: entry.scoreDelta > 0 ? copy.verdict.safelyRejected : entry.executionStatus,
  }
}

function getProfileStats(agent: AgentProfile, history: BenchmarkRunHistoryEntry[]): AgentStats {
  const latest = history[0]

  return {
    testsCompleted: latest?.testsCompleted ?? agent.testsCompleted,
    trapsSurvived: latest?.trapsSurvived ?? agent.trapsSurvived,
    criticalFailures: latest?.criticalFailures ?? agent.criticalFailures,
  }
}

function getScoreValue(agent: AgentProfile, result: BenchmarkResult | undefined) {
  if (!result) {
    return String(agent.initialScore)
  }

  return `${result.score.previousScore} -> ${result.score.nextScore} (${formatSignedNumber(result.score.scoreDelta)})`
}

function getScoreLabel(result: BenchmarkResult | undefined) {
  if (!result || result.score.scoreDelta <= 0) {
    return undefined
  }

  return copy.score.improved
}

function getScoreStatus(result: BenchmarkResult | undefined) {
  if (!result) {
    return undefined
  }

  return isSafelyRejected(result) ? copy.verdict.safelyRejected : result.score.status
}

function getScoreMetrics(scoreBreakdown: AgentProfile['scoreBreakdown']) {
  return [
    { label: copy.score.metrics.trapResistance, value: scoreBreakdown.trapResistance },
    {
      label: copy.score.metrics.intentCalldataAlignment,
      value: scoreBreakdown.intentCalldataAlignment,
    },
    {
      label: copy.score.metrics.walletPolicyCompliance,
      value: scoreBreakdown.walletPolicyCompliance,
    },
    { label: copy.score.metrics.riskSignalDetection, value: scoreBreakdown.riskSignalDetection },
    { label: copy.score.metrics.decisionTransparency, value: scoreBreakdown.decisionTransparency },
  ]
}

function getWalletActionLabel(
  walletState: WalletState,
  isConnecting: boolean,
  walletError: string | undefined,
) {
  if (isConnecting) {
    return copy.wallet.connecting
  }

  if (walletState.connected && walletState.address) {
    return walletState.isMantleSepolia ? formatAddress(walletState.address) : copy.wallet.wrongNetwork
  }

  return walletError ? copy.wallet.noWallet : copy.wallet.connect
}

function isSafelyRejected(result: BenchmarkResult | undefined) {
  return Boolean(result && result.score.scoreDelta > 0)
}

function isHumanReviewChoice(actionId: string): actionId is HumanReviewChoice {
  return actionId === 'approve' || actionId === 'block' || actionId === 'needsReview'
}

function getHumanReviewCopy(): HumanReviewCopy {
  const copyWithHumanReview = copy.humanVsAi as typeof copy.humanVsAi & PartialHumanReviewCopy

  return {
    prompt: copyWithHumanReview.prompt ?? humanReviewFallbackCopy.prompt,
    actions: {
      approve: copyWithHumanReview.actions?.approve ?? humanReviewFallbackCopy.actions.approve,
      block: copyWithHumanReview.actions?.block ?? humanReviewFallbackCopy.actions.block,
      needsReview:
        copyWithHumanReview.actions?.needsReview ?? humanReviewFallbackCopy.actions.needsReview,
    },
    results: {
      blocked: copyWithHumanReview.results?.blocked ?? humanReviewFallbackCopy.results.blocked,
      missed: copyWithHumanReview.results?.missed ?? humanReviewFallbackCopy.results.missed,
      review: copyWithHumanReview.results?.review ?? humanReviewFallbackCopy.results.review,
    },
    outcomes: {
      humanCaught:
        copyWithHumanReview.outcomes?.humanCaught ?? humanReviewFallbackCopy.outcomes.humanCaught,
      humanMissed:
        copyWithHumanReview.outcomes?.humanMissed ?? humanReviewFallbackCopy.outcomes.humanMissed,
      bothCaught:
        copyWithHumanReview.outcomes?.bothCaught ?? humanReviewFallbackCopy.outcomes.bothCaught,
    },
  }
}

function formatSurvivalCount(survived: number, total: number) {
  return `${survived} / ${total}`
}

function formatAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

function getCopyLabel(copyValue: string) {
  const separatorIndex = copyValue.indexOf(':')
  return separatorIndex > -1 ? copyValue.slice(0, separatorIndex) : copyValue
}
