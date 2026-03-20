/**
 * CLI Version Check Hook
 *
 * Checks for CLI updates on application startup and shows toast notifications
 * with buttons to update directly.
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  useClaudeCliStatus,
  useAvailableCliVersions,
  useClaudePathDetection,
  claudeCliQueryKeys,
} from '@/services/claude-cli'
import {
  useGhCliStatus,
  useAvailableGhVersions,
  useGhPathDetection,
  ghCliQueryKeys,
} from '@/services/gh-cli'
import {
  useCodexCliStatus,
  useAvailableCodexVersions,
  useCodexPathDetection,
  codexCliQueryKeys,
} from '@/services/codex-cli'
import {
  useOpencodeCliStatus,
  useAvailableOpencodeVersions,
  useOpencodePathDetection,
  opencodeCliQueryKeys,
} from '@/services/opencode-cli'
import { useUIStore } from '@/store/ui-store'
import { isNewerVersion } from '@/lib/version-utils'
import { logger } from '@/lib/logger'
import { isNativeApp } from '@/lib/environment'
import { usePreferences } from '@/services/preferences'
import type { AppPreferences } from '@/types/preferences'
import { invoke } from '@/lib/transport'

interface CliUpdateInfo {
  type: 'claude' | 'gh' | 'codex' | 'opencode'
  currentVersion: string
  latestVersion: string
  cliSource?: 'jean' | 'path'
  cliPath?: string | null
  packageManager?: string | null
}

interface PendingCliUpdate extends CliUpdateInfo {
  key: string
}

interface CliStatusSnapshot {
  installed?: boolean
  version?: string | null
  path?: string | null
}

interface CliVersionSnapshot {
  version: string
  prerelease: boolean
}

interface CliPathInfoSnapshot {
  package_manager?: string | null
}

interface CliUpdateCandidate {
  type: CliUpdateInfo['type']
  status: CliStatusSnapshot | undefined
  versions: CliVersionSnapshot[] | undefined
  cliSource: CliUpdateInfo['cliSource']
  pathInfo: CliPathInfoSnapshot | undefined
}

/** Map CLI type to the binary name used by the package manager */
const CLI_BINARY_NAMES: Record<CliUpdateInfo['type'], string> = {
  claude: 'claude-code',
  gh: 'gh',
  codex: 'codex',
  opencode: 'opencode',
}

const CLI_DISPLAY_NAMES: Record<CliUpdateInfo['type'], string> = {
  claude: 'Claude CLI',
  gh: 'GitHub CLI',
  codex: 'Codex CLI',
  opencode: 'OpenCode CLI',
}

/** Map CLI type to its Tauri install command name */
const CLI_INSTALL_COMMANDS: Record<CliUpdateInfo['type'], string> = {
  claude: 'install_claude_cli',
  gh: 'install_gh_cli',
  codex: 'install_codex_cli',
  opencode: 'install_opencode_cli',
}

/** Map CLI type to its query keys for cache invalidation */
const CLI_STATUS_QUERY_KEYS: Record<CliUpdateInfo['type'], readonly string[]> = {
  claude: claudeCliQueryKeys.status(),
  gh: ghCliQueryKeys.status(),
  codex: codexCliQueryKeys.status(),
  opencode: opencodeCliQueryKeys.status(),
}

/** Map CLI type to its auto-update preference key */
const CLI_AUTO_UPDATE_PREF_KEYS: Record<
  CliUpdateInfo['type'],
  keyof AppPreferences
> = {
  claude: 'auto_update_claude_cli',
  gh: 'auto_update_gh_cli',
  codex: 'auto_update_codex_cli',
  opencode: 'auto_update_opencode_cli',
}

function getCliUpdateKey(
  type: CliUpdateInfo['type'],
  currentVersion: string,
  latestVersion: string
) {
  return `${type}:${currentVersion}→${latestVersion}`
}

function canAutoInstallCli(
  update: CliUpdateInfo,
  preferences: AppPreferences | undefined
) {
  const prefKey = CLI_AUTO_UPDATE_PREF_KEYS[update.type]
  return preferences?.[prefKey] === true && update.cliSource === 'jean'
}

function collectPendingUpdates(
  candidates: CliUpdateCandidate[],
  handledKeys: Set<string>,
  autoInstallInFlightKeys: Set<string>
): PendingCliUpdate[] {
  const updates: PendingCliUpdate[] = []

  for (const candidate of candidates) {
    const { type, status, versions, cliSource, pathInfo } = candidate
    if (!status?.installed || !status.version || !versions?.length) {
      continue
    }

    const latestStable = versions.find(version => !version.prerelease)
    if (!latestStable || !isNewerVersion(latestStable.version, status.version)) {
      continue
    }

    const key = getCliUpdateKey(type, status.version, latestStable.version)
    if (handledKeys.has(key) || autoInstallInFlightKeys.has(key)) {
      continue
    }

    updates.push({
      key,
      type,
      currentVersion: status.version,
      latestVersion: latestStable.version,
      cliSource,
      cliPath: status.path,
      packageManager: pathInfo?.package_manager,
    })
  }

  return updates
}

function splitUpdatesByInstallMode(
  updates: PendingCliUpdate[],
  preferences: AppPreferences | undefined
) {
  const autoInstallUpdates: PendingCliUpdate[] = []
  const manualUpdates: PendingCliUpdate[] = []

  for (const update of updates) {
    if (canAutoInstallCli(update, preferences)) {
      autoInstallUpdates.push(update)
    } else {
      manualUpdates.push(update)
    }
  }

  return { autoInstallUpdates, manualUpdates }
}

/**
 * Hook that checks for CLI updates on startup and periodically (every hour).
 * Shows toast notifications when updates are detected.
 * When auto-update is enabled for a Jean-managed installer, silently installs the pinned version.
 * Should be called once in App.tsx.
 */
export function useCliVersionCheck() {
  const shouldCheck = isNativeApp()
  const { data: preferences } = usePreferences()
  const queryClient = useQueryClient()
  const { data: claudePathInfo } = useClaudePathDetection({ enabled: shouldCheck })
  const { data: ghPathInfo } = useGhPathDetection({ enabled: shouldCheck })
  const { data: codexPathInfo } = useCodexPathDetection({ enabled: shouldCheck })
  const { data: opencodePathInfo } = useOpencodePathDetection({ enabled: shouldCheck })

  // Defer version fetches (GitHub API) by 10s — they're only for update toasts,
  // no reason to compete with startup-critical queries.
  const [versionCheckReady, setVersionCheckReady] = useState(false)
  useEffect(() => {
    if (!shouldCheck) return
    const timer = setTimeout(() => setVersionCheckReady(true), 10_000)
    return () => clearTimeout(timer)
  }, [shouldCheck])

  const { data: claudeStatus, isLoading: claudeLoading } =
    useClaudeCliStatus({ enabled: shouldCheck && versionCheckReady })
  const { data: ghStatus, isLoading: ghLoading } =
    useGhCliStatus({ enabled: shouldCheck && versionCheckReady })
  const { data: codexStatus, isLoading: codexLoading } =
    useCodexCliStatus({ enabled: shouldCheck && versionCheckReady })
  const { data: opencodeStatus, isLoading: opencodeLoading } =
    useOpencodeCliStatus({ enabled: shouldCheck && versionCheckReady })
  const { data: claudeVersions, isLoading: claudeVersionsLoading } =
    useAvailableCliVersions({ enabled: shouldCheck && versionCheckReady })
  const { data: ghVersions, isLoading: ghVersionsLoading } =
    useAvailableGhVersions({ enabled: shouldCheck && versionCheckReady })
  const { data: codexVersions, isLoading: codexVersionsLoading } =
    useAvailableCodexVersions({ enabled: shouldCheck && versionCheckReady })
  const { data: opencodeVersions, isLoading: opencodeVersionsLoading } =
    useAvailableOpencodeVersions({ enabled: shouldCheck && versionCheckReady })

  // Track which update pairs we've already shown notifications for or auto-installed
  // Format: "type:currentVersion→latestVersion"
  const handledRef = useRef<Set<string>>(new Set())
  const autoInstallInFlightRef = useRef<Set<string>>(new Set())
  const isInitialCheckRef = useRef(true)

  useEffect(() => {
    // Wait until all data is loaded
    const isLoading = [
      claudeLoading,
      ghLoading,
      codexLoading,
      opencodeLoading,
      claudeVersionsLoading,
      ghVersionsLoading,
      codexVersionsLoading,
      opencodeVersionsLoading,
    ].some(Boolean)
    if (isLoading) return

    const updates = collectPendingUpdates(
      [
        {
          type: 'claude',
          status: claudeStatus,
          versions: claudeVersions,
          cliSource: preferences?.claude_cli_source,
          pathInfo: claudePathInfo,
        },
        {
          type: 'gh',
          status: ghStatus,
          versions: ghVersions,
          cliSource: preferences?.gh_cli_source,
          pathInfo: ghPathInfo,
        },
        {
          type: 'codex',
          status: codexStatus,
          versions: codexVersions,
          cliSource: preferences?.codex_cli_source,
          pathInfo: codexPathInfo,
        },
        {
          type: 'opencode',
          status: opencodeStatus,
          versions: opencodeVersions,
          cliSource: preferences?.opencode_cli_source,
          pathInfo: opencodePathInfo,
        },
      ],
      handledRef.current,
      autoInstallInFlightRef.current
    )

    if (updates.length > 0) {
      logger.info('CLI updates available', { updates })

      // Split updates into silent auto-install (Jean-managed + auto-update enabled) vs manual toast.
      const { autoInstallUpdates, manualUpdates } = splitUpdatesByInstallMode(
        updates,
        preferences
      )

      const isInitialCheck = isInitialCheckRef.current

      for (const update of manualUpdates) {
        handledRef.current.add(update.key)
      }

      // Auto-install: keep launch-time work serialized to avoid startup contention.
      if (autoInstallUpdates.length > 0) {
        for (const update of autoInstallUpdates) {
          autoInstallInFlightRef.current.add(update.key)
        }

        void processAutoInstallQueue(
          autoInstallUpdates,
          queryClient,
          handledRef.current,
          autoInstallInFlightRef.current
        )
      }

      // Manual: show interactive toasts (with delay on initial check)
      if (manualUpdates.length > 0) {
        if (isInitialCheck) {
          setTimeout(() => {
            showUpdateToasts(manualUpdates)
          }, 5000)
        } else {
          showUpdateToasts(manualUpdates)
        }
      }
    }

    isInitialCheckRef.current = false
  }, [
    claudeStatus,
    ghStatus,
    codexStatus,
    opencodeStatus,
    claudeVersions,
    ghVersions,
    codexVersions,
    opencodeVersions,
    claudeLoading,
    ghLoading,
    codexLoading,
    opencodeLoading,
    claudeVersionsLoading,
    ghVersionsLoading,
    codexVersionsLoading,
    opencodeVersionsLoading,
    preferences?.claude_cli_source,
    preferences?.codex_cli_source,
    preferences?.opencode_cli_source,
    preferences?.gh_cli_source,
    preferences?.auto_update_claude_cli,
    preferences?.auto_update_codex_cli,
    preferences?.auto_update_opencode_cli,
    preferences?.auto_update_gh_cli,
    queryClient,
  ])
}

/**
 * Silently auto-install a CLI update. Shows a loading toast that transitions
 * to success/error. Each CLI gets its own stacked toast.
 */
async function autoInstallCli(
  update: CliUpdateInfo,
  queryClient: QueryClient
): Promise<boolean> {
  const cliName = CLI_DISPLAY_NAMES[update.type]
  const toastId = `cli-auto-update-${update.type}`
  const command = CLI_INSTALL_COMMANDS[update.type]
  const statusQueryKey = CLI_STATUS_QUERY_KEYS[update.type]

  toast.loading(`Updating ${cliName}...`, {
    id: toastId,
    description: `v${update.currentVersion} → v${update.latestVersion}`,
  })

  try {
    await invoke(command, { version: update.latestVersion })
    await queryClient.invalidateQueries({ queryKey: statusQueryKey })
    toast.success(`${cliName} updated`, {
      id: toastId,
      description: `v${update.currentVersion} → v${update.latestVersion}`,
    })
    logger.info(`[CliVersionCheck] Auto-updated ${cliName}`, {
      from: update.currentVersion,
      to: update.latestVersion,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.error(`Failed to update ${cliName}`, {
      id: toastId,
      description: message,
    })
    logger.error(`[CliVersionCheck] Auto-update failed for ${cliName}`, { error: message })
    return false
  }
}

async function processAutoInstallQueue(
  updates: PendingCliUpdate[],
  queryClient: QueryClient,
  handledKeys: Set<string>,
  autoInstallInFlightKeys: Set<string>
) {
  for (const update of updates) {
    let didInstall = false

    try {
      didInstall = await autoInstallCli(update, queryClient)
    } finally {
      autoInstallInFlightKeys.delete(update.key)
    }

    handledKeys.add(update.key)

    if (!didInstall) {
      showUpdateToasts([update])
    }
  }
}

/** Get the correct self-update args for each CLI type, or null if no built-in update */
function getPathModeUpdateArgs(
  type: CliUpdateInfo['type']
): string[] | null {
  switch (type) {
    case 'claude':
      return ['update']
    case 'opencode':
      return ['upgrade']
    // gh and codex have no built-in self-update command
    default:
      return null
  }
}

/**
 * Show toast notifications for each CLI update.
 * Each CLI gets its own toast with Update and Cancel buttons.
 * Toast stays visible until user dismisses it.
 */
function showUpdateToasts(updates: CliUpdateInfo[]) {
  const { openCliUpdateModal, openCliLoginModal } = useUIStore.getState()

  for (const update of updates) {
    const cliName = CLI_DISPLAY_NAMES[update.type]
    const toastId = `cli-update-${update.type}`

    const isPathMode = update.cliSource === 'path'
    const isHomebrew = update.packageManager === 'homebrew'

    toast.info(`${cliName} update available`, {
      id: toastId,
      description: `v${update.currentVersion} → v${update.latestVersion}`,
      duration: Infinity, // Don't auto-dismiss
      action: {
        label: 'Update',
        onClick: () => {
          if (isPathMode && isHomebrew) {
            const brewPkg = CLI_BINARY_NAMES[update.type]
            logger.debug(`[CliVersionCheck] Homebrew update: brew upgrade ${brewPkg}`)
            openCliLoginModal(update.type, 'brew', ['upgrade', brewPkg])
          } else if (isPathMode && update.cliPath) {
            const pathUpdateArgs = getPathModeUpdateArgs(update.type)
            if (pathUpdateArgs) {
              logger.debug(
                `[CliVersionCheck] PATH-mode update: type=${update.type} path=${update.cliPath} args=${pathUpdateArgs}`
              )
              openCliLoginModal(update.type, update.cliPath, pathUpdateArgs)
            } else {
              openCliUpdateModal(update.type)
            }
          } else {
            openCliUpdateModal(update.type)
          }
          toast.dismiss(toastId)
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {
          toast.dismiss(toastId)
        },
      },
    })
  }
}
