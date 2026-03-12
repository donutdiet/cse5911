'use client'

/*
  components/admin/admin-groups-client.tsx

  Client component that owns all the interactive logic for the groups page.
  Calls the runMatchingAction server action directly instead of using a fetch
  to an API route — no app/api folder needed.

  View 1 (no groups exist): centered empty state with a "Generate Groups" button
  View 2 (groups exist):    groups list + flagged students from last run
                            + a smaller "Regenerate" button in the corner

  After running, calls router.refresh() so the server component re-fetches
  and passes fresh group data back down as props.
*/

import { useState }          from 'react'
import { useRouter }         from 'next/navigation'
import { runMatchingAction } from '@/lib/actions/admin-actions'

type Group = {
  id:               string
  preference:       string | null
  day_of_week:      number | null
  meet_start_time:  string
  meet_end_time:    string
  created_at:       string
  member_of:        any[]
}

type FlaggedStudent = {
  user_id:   string
  full_name: string
}

type MatchingResult = {
  groupsCreated: number
  flaggedCount:  number
  flagged:       FlaggedStudent[]
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(':')
  const hour   = parseInt(hourStr)
  const ampm   = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minStr} ${ampm}`
}

export default function AdminGroupsClient({ groups }: { groups: Group[] }) {
  const router = useRouter()

  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [lastResult,   setLastResult]   = useState<MatchingResult | null>(null)
  const [confirmRegen, setConfirmRegen] = useState(false)

  const hasGroups = groups.length > 0

  async function runMatching() {
    setError(null)
    setLastResult(null)
    setConfirmRegen(false)
    setLoading(true)

    try {
      const result = await runMatchingAction()

      if ('error' in result) {
        setError(result.error ?? 'Something went wrong')
        return
      }

      setLastResult(result as MatchingResult)
      router.refresh()

    } catch (err) {
      setError('Something went wrong. Check the terminal for details.')
      console.error('runMatchingAction error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ── empty state ──────────────────────────────────────────────────────────────
  if (!hasGroups && !lastResult) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Groups</h1>
        <p className="text-sm text-gray-500 mb-12">No groups have been generated yet.</p>

        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <p className="text-gray-500 text-sm text-center max-w-sm">
            Run the matching algorithm to automatically assign students into groups
            based on their availability and meeting preferences.
          </p>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 max-w-sm text-center">
              {error}
            </div>
          )}

          <button
            onClick={runMatching}
            disabled={loading}
            className="
              px-6 py-3 rounded-md text-sm font-medium
              bg-[#BB0000] text-white
              hover:bg-[#990000]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            "
          >
            {loading ? 'Generating...' : 'Generate Groups'}
          </button>

          {loading && (
            <p className="text-xs text-gray-400">
              Fetching student availability and building groups...
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── groups view ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">
            {groups.length} group{groups.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* regenerate button */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          {!confirmRegen ? (
            <button
              onClick={() => setConfirmRegen(true)}
              disabled={loading}
              className="
                px-3 py-1.5 rounded-md text-xs font-medium
                border border-gray-300 text-gray-600
                hover:border-gray-400 hover:text-gray-800
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              Regenerate Groups
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-xs text-gray-500">This will add new groups on top of existing ones.</p>
              <button
                onClick={runMatching}
                disabled={loading}
                className="
                  px-3 py-1.5 rounded-md text-xs font-medium
                  bg-[#BB0000] text-white
                  hover:bg-[#990000]
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-colors
                "
              >
                {loading ? 'Running...' : 'Confirm'}
              </button>
              <button
                onClick={() => setConfirmRegen(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* result banner from last run */}
      {lastResult && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
          Last run created {lastResult.groupsCreated} group{lastResult.groupsCreated !== 1 ? 's' : ''}.{' '}
          {lastResult.flaggedCount === 0
            ? 'All students were placed.'
            : `${lastResult.flaggedCount} student${lastResult.flaggedCount !== 1 ? 's' : ''} could not be placed — see below.`
          }
        </div>
      )}

      {/* flagged students from last run */}
      {lastResult && lastResult.flaggedCount > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 space-y-3">
          <div>
            <h2 className="text-sm font-medium text-amber-800">
              Unplaced Students ({lastResult.flaggedCount})
            </h2>
            <p className="text-xs text-amber-700 mt-1">
              These students could not be matched because they did not share a
              2-hour window with enough other students. You can assign them
              manually or ask them to update their availability.
            </p>
          </div>
          <ul className="space-y-1">
            {lastResult.flagged.map(s => (
              <li key={s.user_id} className="text-sm text-amber-900">
                {s.full_name || 'Unknown'}
                <span className="text-amber-600 ml-2 text-xs font-mono">{s.user_id.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* groups list */}
      <div className="space-y-3">
        {groups.map(group => (
          <div
            key={group.id}
            className="rounded-lg border border-gray-200 bg-white p-5 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {DAY_NAMES[group.day_of_week ?? 0]}{' '}
                  {formatTime(group.meet_start_time)} to {formatTime(group.meet_end_time)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 capitalize">
                  {group.preference?.replace('_', ' ')} &middot;{' '}
                  {group.member_of?.length ?? 0} member{group.member_of?.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-xs text-gray-400 font-mono">
                {group.id.slice(0, 8)}
              </span>
            </div>

            {group.member_of && group.member_of.length > 0 && (
              <ul className="space-y-1">
                {group.member_of.map((m: any) => (
                  <li key={m.user_id} className="text-sm text-gray-700">
                    {m.profile?.full_name ?? 'Unknown'}
                    <span className="text-gray-400 ml-1">({m.profile?.email})</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}