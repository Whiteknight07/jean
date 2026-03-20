/**
 * CLI Version Check Hook
 *
 * Checks for CLI updates on application startup and shows toast notifications
 * with buttons to update directly.
 */

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
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
import { invoke } from '@/lib/transport'

interface CliUpdateInfo {
  type: 'claude' | 'gh' | 'codex' | 'opencode'
  currentVersion: string
  latestVersion: string
  cliSource?: 'jean' | 'path'
  cliPath?: string | null
  packageManager?: string | null
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
const CLI_AUTO_UPDATE_PREF_KEYS: Record<CliUpdateInfo['type'], string> = {
  claude: 'auto_update_claude_cli',
  gh: 'auto_update_gh_cli',
  codex: 'auto_update_codex_cli',
  opencode: 'auto_update_opencode_cli',
}

/**
 * Hook that checks for CLI updates on startup and periodically (every hour).
 * Shows toast notifications when updates are detected.
 * When auto-update is enabled for a CLI (jean-managed only), silently installs the latest version.
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
  const notifiedRef = useRef<Set<string>>(new Set())
  const isInitialCheckRef = useRef(true)

  useEffect(() => {
    // Wait until all data is loaded
    const isLoading =
      claudeLoading ||
      ghLoading ||
      codexLoading ||
      opencodeLoading ||
      claudeVersionsLoading ||
      ghVersionsLoading ||
      codexVersionsLoading ||
      opencodeVersionsLoading
    if (isLoading) return

    const updates: CliUpdateInfo[] = []

    // Check Claude CLI
    if (
      claudeStatus?.installed &&
      claudeStatus.version &&
      claudeVersions?.length
    ) {
      const latestStable = claudeVersions.find(v => !v.prerelease)
      if (
        latestStable &&
        isNewerVersion(latestStable.version, claudeStatus.version)
      ) {
        const key = `claude:${claudeStatus.version}→${latestStable.version}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          updates.push({
            type: 'claude',
            currentVersion: claudeStatus.version,
            latestVersion: latestStable.version,
            cliSource: preferences?.claude_cli_source,
            cliPath: claudeStatus.path,
            packageManager: claudePathInfo?.package_manager,
          })
        }
      }
    }

    // Check GitHub CLI
    if (ghStatus?.installed && ghStatus.version && ghVersions?.length) {
      const latestStable = ghVersions.find(v => !v.prerelease)
      if (
        latestStable &&
        isNewerVersion(latestStable.version, ghStatus.version)
      ) {
        const key = `gh:${ghStatus.version}→${latestStable.version}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          updates.push({
            type: 'gh',
            currentVersion: ghStatus.version,
            latestVersion: latestStable.version,
            cliSource: preferences?.gh_cli_source,
            cliPath: ghStatus.path,
            packageManager: ghPathInfo?.package_manager,
          })
        }
      }
    }

    // Check Codex CLI
    if (
      codexStatus?.installed &&
      codexStatus.version &&
      codexVersions?.length
    ) {
      const latestStable = codexVersions.find(v => !v.prerelease)
      if (
        latestStable &&
        isNewerVersion(latestStable.version, codexStatus.version)
      ) {
        const key = `codex:${codexStatus.version}→${latestStable.version}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          updates.push({
            type: 'codex',
            currentVersion: codexStatus.version,
            latestVersion: latestStable.version,
            cliSource: preferences?.codex_cli_source,
            cliPath: codexStatus.path,
            packageManager: codexPathInfo?.package_manager,
          })
        }
      }
    }

    // Check OpenCode CLI
    if (
      opencodeStatus?.installed &&
      opencodeStatus.version &&
      opencodeVersions?.length
    ) {
      const latestStable = opencodeVersions.find(v => !v.prerelease)
      if (
        latestStable &&
        isNewerVersion(latestStable.version, opencodeStatus.version)
      ) {
        const key = `opencode:${opencodeStatus.version}→${latestStable.version}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          updates.push({
            type: 'opencode',
            currentVersion: opencodeStatus.version,
            latestVersion: latestStable.version,
            cliSource: preferences?.opencode_cli_source,
            cliPath: opencodeStatus.path,
            packageManager: opencodePathInfo?.package_manager,
          })
        }
      }
    }

    if (updates.length > 0) {
      logger.info('CLI updates available', { updates })

      // Split updates into auto-install (jean-managed + auto-update enabled) vs manual toast
      const autoInstallUpdates: CliUpdateInfo[] = []
      const manualUpdates: CliUpdateInfo[] = []

      for (const update of updates) {
        const prefKey = CLI_AUTO_UPDATE_PREF_KEYS[update.type] as keyof typeof preferences
        const isAutoUpdate = preferences?.[prefKey] === true
        const isJeanManaged = update.cliSource === 'jean'

        if (isAutoUpdate && isJeanManaged) {
          autoInstallUpdates.push(update)
        } else {
          manualUpdates.push(update)
        }
      }

      // Auto-install: fire all in parallel with loading toasts
      for (const update of autoInstallUpdates) {
        autoInstallCli(update, queryClient)
      }

      // Manual: show interactive toasts (with delay on initial check)
      if (manualUpdates.length > 0) {
        if (isInitialCheckRef.current) {
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
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>
) {
  const cliName = CLI_DISPLAY_NAMES[update.type]
  const toastId = `cli-auto-update-${update.type}`
  const command = CLI_INSTALL_COMMANDS[update.type]
  const statusQueryKey = CLI_STATUS_QUERY_KEYS[update.type]

  toast.loading(`Updating ${cliName}...`, {
    id: toastId,
    description: `v${update.currentVersion} → v${update.latestVersion}`,
  })

  try {
    await invoke(command, { version: null })
    queryClient.invalidateQueries({ queryKey: statusQueryKey })
    toast.success(`${cliName} updated`, {
      id: toastId,
      description: `v${update.currentVersion} → v${update.latestVersion}`,
    })
    logger.info(`[CliVersionCheck] Auto-updated ${cliName}`, {
      from: update.currentVersion,
      to: update.latestVersion,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    toast.error(`Failed to update ${cliName}`, {
      id: toastId,
      description: message,
    })
    logger.error(`[CliVersionCheck] Auto-update failed for ${cliName}`, { error: message })
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
