/*
  app/student/group/page.tsx

  Shows the student their assigned group. Fetches the group they belong to
  via the member_of table, then loads the other members from profile.

  Three possible states:
    1. Not in a group yet — shows a friendly message
    2. In a group — shows meeting time, preference, and member list
*/

import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function formatTime(timeString: string) {
  const [hourStr, minStr] = timeString.split(':')
  const hour   = parseInt(hourStr)
  const ampm   = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minStr} ${ampm}`
}

export default async function GroupPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // find which group this student belongs to
  const { data: membership } = await supabase
    .from('member_of')
    .select('group_id')
    .eq('user_id', user.id)
    .single()

  // student has not been assigned to a group yet
  if (!membership) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-3">
        <h1 className="text-2xl font-semibold text-gray-900">Your Study Group</h1>
        <p className="text-gray-500 text-sm">
          You have not been assigned to a group yet. Groups are created by your
          instructor after availability submissions close. Check back soon.
        </p>
      </div>
    )
  }

  // fetch the group details
  const { data: group } = await supabase
    .from('group')
    .select('id, preference, day_of_week, meet_start_time, meet_end_time')
    .eq('id', membership.group_id)
    .single()

  // fetch all members of this group with their profile info
  const { data: members } = await supabase
    .from('member_of')
    .select(`
      user_id,
      profile (
        full_name,
        email,
        phone
      )
    `)
    .eq('group_id', membership.group_id)

  if (!group) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500 text-sm">Something went wrong loading your group. Try refreshing.</p>
      </div>
    )
  }

  const meetingDay  = DAY_NAMES[group.day_of_week ?? 0]
  const startTime   = formatTime(group.meet_start_time)
  const endTime     = formatTime(group.meet_end_time)
  const isOnline    = group.preference === 'online'

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Your Study Group</h1>
        <p className="text-sm text-gray-500 mt-1">
          Here is your assigned group and meeting details.
        </p>
      </div>

      {/* meeting info card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">Meeting Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Day</p>
            <p className="text-sm text-gray-800 mt-0.5">{meetingDay}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Time</p>
            <p className="text-sm text-gray-800 mt-0.5">{startTime} to {endTime}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Format</p>
            <p className="text-sm text-gray-800 mt-0.5">{isOnline ? 'Online' : 'In Person'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Members</p>
            <p className="text-sm text-gray-800 mt-0.5">{members?.length ?? 0} students</p>
          </div>
        </div>
      </div>

      {/* members card */}
      <div className="rounded-lg border border-gray-200 bg-white p-5 space-y-4">
        <h2 className="text-sm font-medium text-gray-700">Group Members</h2>

        {!members || members.length === 0 ? (
          <p className="text-sm text-gray-400">No members found.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m: any) => {
              const isYou = m.user_id === user.id
              return (
                <li key={m.user_id} className="py-3 flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-800">
                      {m.profile?.full_name ?? 'Unknown'}
                      {isYou && (
                        <span className="ml-2 text-xs text-[#BB0000] font-medium">You</span>
                      )}
                    </p>
                    {m.profile?.email && (
                      <p className="text-xs text-gray-400 mt-0.5">{m.profile.email}</p>
                    )}
                  </div>
                  {m.profile?.phone && (
                    <p className="text-xs text-gray-400">{m.profile.phone}</p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

    </div>
  )
}