import { useState } from 'react'
import { AgentExecutionPipeline } from '../components/AgentExecutionPipeline'
import { AgentProfileCard } from '../components/AgentProfileCard'
import { AgentReadinessScore } from '../components/AgentReadinessScore'
import { DecisionConsole } from '../components/DecisionConsole'
import { DecisionEvidencePanel } from '../components/DecisionEvidencePanel'
import { HoneypotTrapSelector } from '../components/HoneypotTrapSelector'
import { HumanVsAiBaseline } from '../components/HumanVsAiBaseline'
import { IntentCalldataVerifier } from '../components/IntentCalldataVerifier'
import { RecentTestHistory } from '../components/RecentTestHistory'
import { TopBar } from '../components/TopBar'
import { VerdictCard } from '../components/VerdictCard'
import { WalletGuardrails } from '../components/WalletGuardrails'
import {
  defaultBenchmarkPolicy,
  getRecentBenchmarkRuns,
  runBenchmark,
  type BenchmarkRunHistoryEntry,
} from '../core/benchmarkRunner'
import { logDecisionToMantle, type OnchainLogResult } from '../core/onchainLogger'
import { appCopy } from '../copy'
import { agents } from '../data/agents'
import { scenarios } from '../data/scenarios'
import type { BenchmarkResult, ComparisonRow, Scenario } from '../types/benchmark'

type RunPhase = 'idle' | 'proposed' | 'vetoed' | 'blocked'

const copy = appCopy
const selectedAgent = agents[0]
const initialScenario = scenarios[0]

export function ArenaDashboard() {
  const [selectedScenarioId, setSelectedScenarioId] = useState(initialScenario.id)
  const [phase, setPhase] = useState<RunPhase>('idle')
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult>()
  const [onchainLogResult, setOnchainLogResult] = useState<OnchainLogResult>()
  const [isLoggingDecision, setIsLoggingDecision] = useState(false)
  const [history, setHistory] = useState<BenchmarkRunHistoryEntry[]>(() =>
    getRecentBenchmarkRuns(),
  )

  const selectedScenario =
    scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? initialScenario
  const hasResult = Boolean(benchmarkResult)
  const hasBlockedResult = Boolean(benchmarkResult && phase === 'blocked')
  const isRunning = phase === 'proposed' || phase === 'vetoed'
  const profileStats = getProfileStats(history)

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
    setHistory(nextHistory)
    setPhase('proposed')

    await delay(300)
    setPhase('vetoed')

    await delay(420)
    setPhase('blocked')
    setHistory(nextHistory)
  }

  function handleSelectScenario(scenarioId: string) {
    if (isRunning) {
      return
    }

    setSelectedScenarioId(scenarioId)
    setBenchmarkResult(undefined)
    setPhase('idle')
    setOnchainLogResult(undefined)
  }

  async function handleRecordOnMantle() {
    if (!benchmarkResult || !hasBlockedResult || isLoggingDecision || onchainLogResult) {
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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar
        badges={[copy.hero.badges.builtOnMantle, copy.hero.badges.track06, copy.hero.badges.track05]}
        primaryAction={copy.hero.actions.connectWallet}
        secondaryAction={copy.hero.actions.viewDecisionContract}
        subtitle={copy.hero.subtitle}
        title={copy.hero.title}
      />
      <div className="mx-auto grid max-w-[1680px] gap-4 px-6 py-5 xl:grid-cols-[320px_minmax(720px,1fr)_360px]">
        <aside className="space-y-4">
          <AgentProfileCard
            description={selectedAgent.personality}
            facts={[
              { label: copy.agentProfile.facts.agentId, value: selectedAgent.id },
              { label: copy.agentProfile.facts.role, value: selectedAgent.type },
              { label: copy.agentProfile.facts.owner, value: selectedAgent.owner },
              { label: copy.agentProfile.facts.network, value: selectedAgent.network },
              { label: copy.agentProfile.facts.mode, value: selectedAgent.mode },
              {
                label: copy.agentProfile.facts.testsCompleted,
                value: String(profileStats.testsCompleted),
              },
              {
                label: copy.agentProfile.facts.trapsSurvived,
                value: formatSurvivalCount(profileStats.trapsSurvived, profileStats.testsCompleted),
              },
              {
                label: copy.agentProfile.facts.criticalFailures,
                value: String(profileStats.criticalFailures),
              },
            ]}
            name={selectedAgent.name}
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
            metrics={getScoreMetrics(selectedAgent.scoreBreakdown)}
            reason={benchmarkResult?.score.reason}
            scoreValue={getScoreValue(benchmarkResult)}
            status={benchmarkResult?.score.status}
            title={copy.score.title}
          />
          <RecentTestHistory
            emptyState={copy.history.emptyState}
            items={history.map(mapHistoryItem)}
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
          <VerdictCard
            details={hasBlockedResult && benchmarkResult ? getVerdictDetails(benchmarkResult) : []}
            emptyState={copy.history.emptyState}
            verdict={hasBlockedResult ? benchmarkResult?.execution.status : undefined}
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
        </section>

        <aside className="space-y-4">
          <DecisionConsole
            emptyState={copy.history.emptyState}
            events={getConsoleEvents(benchmarkResult, phase)}
            title={copy.console.title}
          />
          <DecisionEvidencePanel
            emptyState={copy.history.emptyState}
            explorerLabel={copy.evidence.actions.viewOnMantleExplorer}
            explorerHref={
              onchainLogResult?.mode === 'onchain' ? onchainLogResult.explorerUrl : undefined
            }
            facts={
              hasBlockedResult && benchmarkResult
                ? getEvidenceFacts(benchmarkResult, onchainLogResult)
                : []
            }
            modeLabel={hasResult ? getEvidenceModeLabel(onchainLogResult) : undefined}
            recordAction={
              hasBlockedResult ? (
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
          <HumanVsAiBaseline
            emptyState={copy.history.emptyState}
            finalLabel={copy.humanVsAi.finalLabel}
            finalResult={hasBlockedResult ? copy.humanVsAi.finalResult : undefined}
            rows={hasBlockedResult ? getHumanVsAiRows() : []}
            title={copy.humanVsAi.title}
          />
        </aside>
      </div>
    </main>
  )
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
  const facts = [
    { label: copy.evidence.fields.network, value: result.agent.network },
    { label: copy.evidence.fields.contract, value: result.decodedCalldata.contractLabel },
    { label: copy.evidence.fields.agentId, value: result.agent.id },
    { label: copy.evidence.fields.scenarioId, value: result.scenario.id },
    { label: copy.evidence.fields.verdict, value: result.execution.status },
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

function getHumanVsAiRows() {
  return [
    copy.humanVsAi.rows.proposer,
    copy.humanVsAi.rows.auditor,
    copy.humanVsAi.rows.human,
  ]
}

function mapHistoryItem(entry: BenchmarkRunHistoryEntry) {
  return {
    label: `${entry.scenarioId} ${entry.scenarioTitle}`,
    meta: `${entry.agentName} ${entry.previousScore} -> ${entry.nextScore}`,
    verdict: entry.executionStatus,
  }
}

function getProfileStats(history: BenchmarkRunHistoryEntry[]) {
  const agentHistory = history.filter((entry) => entry.agentId === selectedAgent.id)
  const trapsSurvived = agentHistory.filter((entry) => entry.scoreDelta >= 0).length
  const criticalFailures = agentHistory.filter((entry) => entry.scoreDelta < 0).length

  return {
    testsCompleted: agentHistory.length,
    trapsSurvived,
    criticalFailures,
  }
}

function getScoreValue(result: BenchmarkResult | undefined) {
  if (!result) {
    return String(selectedAgent.initialScore)
  }

  return `${result.score.previousScore} -> ${result.score.nextScore}`
}

function getScoreMetrics(scoreBreakdown: typeof selectedAgent.scoreBreakdown) {
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

function formatSurvivalCount(survived: number, total: number) {
  return `${survived} / ${total}`
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
