import { useEffect, useState } from 'react'
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

type RunPhase = 'idle' | 'proposed' | 'vetoed' | 'blocked'
type RiskSignalTone = 'critical' | 'high' | 'medium' | 'low'
type HumanReviewChoice = 'approve' | 'block' | 'needsReview'
type AgentStats = {
  testsCompleted: number
  trapsSurvived: number
  criticalFailures: number
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
  const [selectedAgentId, setSelectedAgentId] = useState(initialAgent.id)
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario.id)
  const [phase, setPhase] = useState<RunPhase>('idle')
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

  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? initialAgent
  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? initialScenario
  const selectedAgentHistory = history.filter((entry) => entry.agentId === selectedAgent.id)
  const hasResult = Boolean(benchmarkResult)
  const hasFinalResult = Boolean(benchmarkResult && phase === 'blocked')
  const isRunning = phase === 'proposed' || phase === 'vetoed'
  const profileStats = getProfileStats(selectedAgent, selectedAgentHistory)
  const decisionContractUrl = decisionLoggerAddress
    ? getMantleSepoliaAddressUrl(decisionLoggerAddress)
    : undefined

  async function handleRunTrustTest() {
    if (isRunning) {
      return
    }

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
    setHistory(nextHistory)
    setPhase('proposed')

    await delay(300)
    setPhase('vetoed')

    await delay(420)
    setPhase('blocked')
    setHistory(nextHistory)
  }

  function handleSelectAgent(agentId: string) {
    if (isRunning) {
      return
    }

    setSelectedAgentId(agentId)
    setBenchmarkResult(undefined)
    setPhase('idle')
    setOnchainLogResult(undefined)
    setHumanReviewChoice(undefined)
    setIsReportCardOpen(false)
    setIsReportSummaryCopied(false)
  }

  function handleSelectScenario(scenarioId: string) {
    if (isRunning) {
      return
    }

    setSelectedScenarioId(scenarioId)
    setBenchmarkResult(undefined)
    setPhase('idle')
    setOnchainLogResult(undefined)
    setHumanReviewChoice(undefined)
    setIsReportCardOpen(false)
    setIsReportSummaryCopied(false)
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
      <div className="mx-auto grid max-w-[1680px] gap-4 px-6 py-5 xl:grid-cols-[320px_minmax(720px,1fr)_360px]">
        <aside className="space-y-4">
          <AgentSelector
            agents={agents.map(mapAgentOption)}
            onSelectAgent={handleSelectAgent}
            selectedAgentId={selectedAgent.id}
            selectedAgentDetails={{
              description: selectedAgent.personality,
              facts: getAgentProfileFacts(selectedAgent, profileStats),
              name: selectedAgent.name,
            }}
            title={copy.agentProfile.title}
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
          <AgentReadinessScore
            formula={copy.score.formula}
            metrics={getScoreMetrics(selectedAgent.scoreBreakdown)}
            reason={benchmarkResult?.score.reason}
            scoreLabel={getScoreLabel(benchmarkResult)}
            scoreValue={getScoreValue(selectedAgent, benchmarkResult)}
            status={getScoreStatus(benchmarkResult)}
            title={copy.score.title}
          />
          <RecentTestHistory
            emptyState={copy.history.emptyState}
            items={selectedAgentHistory.map(mapHistoryItem)}
            title={copy.history.title}
          />
        </aside>

        <section className="space-y-4">
          <HoneypotTrapSelector
            description={copy.trap.description}
            disabled={isRunning}
            onRun={handleRunTrustTest}
            onSelect={handleSelectScenario}
            runLabel={copy.trap.actions.runTrustTest}
            selectedId={selectedScenarioId}
            title={copy.trap.title}
            traps={scenarios.map(mapScenarioToTrap)}
          />
          <AgentExecutionPipeline
            steps={getPipelineSteps(benchmarkResult, phase)}
            subtitle={copy.pipeline.subtitle}
            title={copy.pipeline.title}
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
            rows={benchmarkResult ? benchmarkResult.verification.comparisonRows.map(mapComparisonRow) : []}
            title={copy.verifier.title}
          />
          <RiskSignalPanel
            emptyState={copy.history.emptyState}
            signals={benchmarkResult ? getRiskSignalItems(benchmarkResult) : []}
            title={copy.score.metrics.riskSignalDetection}
          />
          <VerdictCard
            details={hasFinalResult && benchmarkResult ? getVerdictDetails(benchmarkResult) : []}
            emptyState={copy.history.emptyState}
            tone={isSafelyRejected(benchmarkResult) ? 'safe' : 'blocked'}
            verdict={hasFinalResult && benchmarkResult ? getVerdictLabel(benchmarkResult) : undefined}
          />
        </section>

        <aside className="space-y-4">
          <DecisionConsole
            emptyState={copy.history.emptyState}
            events={getConsoleEvents(benchmarkResult, phase)}
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
            modeLabel={hasResult ? getEvidenceModeLabel(onchainLogResult) : undefined}
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
    objective: scenario.objective,
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

function getPipelineSteps(result: BenchmarkResult | undefined, phase: RunPhase) {
  const proposer = copy.pipeline.agents.proposer
  const auditor = copy.pipeline.agents.riskAuditor
  const executor = copy.pipeline.agents.executor

  return [
    {
      role: proposer.title,
      status: phase === 'idle' ? undefined : proposer.status,
      description: proposer.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: proposer.permission,
      reason: result && phase !== 'idle' ? result.proposal.plan : undefined,
    },
    {
      role: auditor.title,
      status: phase === 'vetoed' || phase === 'blocked' ? auditor.status : undefined,
      description: auditor.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: auditor.permission,
      reason:
        result && (phase === 'vetoed' || phase === 'blocked')
          ? result.audit.vetoReason ?? result.audit.recommendation
          : undefined,
    },
    {
      role: executor.title,
      status: phase === 'blocked' ? executor.status : undefined,
      description: executor.role,
      permissionLabel: copy.pipeline.labels.permission,
      permission: executor.permission,
      reason: result && phase === 'blocked' ? result.execution.reason : undefined,
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

function getConsoleEvents(result: BenchmarkResult | undefined, phase: RunPhase) {
  if (!result || phase === 'idle') {
    return []
  }

  const events = [
    `${copy.console.events.trapLoaded} ${result.scenario.title}`,
    `${copy.console.events.agentProposal} ${result.proposal.plan}`,
  ]

  if (phase === 'vetoed' || phase === 'blocked') {
    events.push(
      `${copy.console.events.verifier} ${result.verification.detectedIssues[0] ?? result.verification.recommendation}`,
      `${copy.console.events.riskAuditor} ${result.audit.vetoReason ?? result.audit.recommendation}`,
    )
  }

  if (phase === 'blocked') {
    events.push(`${copy.console.events.mantleLog} ${result.evidence.metadataURI}`)
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

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
