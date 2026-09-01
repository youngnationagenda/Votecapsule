// ============================================================
// VoteCapsule™ — My Campaign Calendar (Candidate Portal)
// Phase 14A — Candidate's own events: create, view, submit capsule
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  MapPin, Users, CheckCircle, X, AlertCircle, FileText,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay,
  addMonths, subMonths, parseISO,
} from 'date-fns';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

const EVENT_COLORS: Record<string, string> = {
  RALLY:            'bg-amber-500 text-white',
  MEETING:          'bg-blue-500 text-white',
  DOOR_TO_DOOR:     'bg-emerald-500 text-white',
  PRESS_CONFERENCE: 'bg-violet-500 text-white',
  DEBATE:           'bg-red-500 text-white',
  FUNDRAISER:       'bg-pink-500 text-white',
  OTHER:            'bg-gray-400 text-white',
};

function useMyCampaign() {
  const { data: campaigns = [] } = useQuery({
    queryKey: ['my-campaigns'],
    queryFn:  () => campaignApi.list({ candidate: true }).then((r) => r.data?.data ?? r.data ?? []),
  });
  return campaigns.find((c: any) => c.status === 'active') ?? campaigns[0] ?? null;
}

// ── Create Event Modal ───────────────────────────────────────
function CreateEventModal({ campaignId, onClose }: { campaignId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    eventName: '', eventType: 'RALLY', startTime: '', endTime: '',
    venueName: '', lat: '', lng: '', wardCode: '',
    expectedAttendance: '0', budgetEstimate: '0',
    requiresPaSystem: false, requiresTransport: false,
    requiresSecurity: false, requiresTents: false, notes: '',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.events.create(campaignId, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-events'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="text-base font-semibold text-gray-900">Schedule Event</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...form, lat: form.lat ? parseFloat(form.lat) : undefined, lng: form.lng ? parseFloat(form.lng) : undefined, expectedAttendance: parseInt(form.expectedAttendance) || 0, budgetEstimate: parseFloat(form.budgetEstimate) || 0 }); }} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input className="vc-input" required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} placeholder="e.g. Mwiki Ward Rally" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Event Type *</label>
              <select className="vc-input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
                {['RALLY','MEETING','DOOR_TO_DOOR','PRESS_CONFERENCE','DEBATE','FUNDRAISER','OTHER'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g,' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ward Code</label>
              <input className="vc-input" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} placeholder="e.g. 0101" maxLength={4} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time *</label>
              <input type="datetime-local" className="vc-input" required value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time *</label>
              <input type="datetime-local" className="vc-input" required value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Venue Name</label>
            <input className="vc-input" value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} placeholder="e.g. Mwiki Social Hall" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendance</label>
              <input type="number" className="vc-input" min="0" value={form.expectedAttendance} onChange={(e) => setForm({ ...form, expectedAttendance: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Estimate (KES)</label>
              <input type="number" className="vc-input" min="0" value={form.budgetEstimate} onChange={(e) => setForm({ ...form, budgetEstimate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: 'requiresPaSystem',  label: 'PA System' },
                { key: 'requiresTransport', label: 'Transport' },
                { key: 'requiresSecurity',  label: 'Security' },
                { key: 'requiresTents',     label: 'Tents' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} className="rounded" />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="vc-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes..." />
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to create event. Please try again.</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Saving…' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Event Capsule Submit Modal ───────────────────────────────
function CapsuleModal({ campaignId, event, onClose }: { campaignId: string; event: any; onClose: () => void }) {
  const qc  = useQueryClient();
  const [form, setForm] = useState({
    attendanceCount: '', totalExpenditure: '',
    eventSummary: '', keyOutcomes: '', issuesReported: '',
    submissionLat: '', submissionLng: '',
  });

  const mut = useMutation({
    mutationFn: (data: any) => campaignApi.events.submitCapsule(campaignId, event.id, data),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['my-events'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Submit Event Capsule</h3>
            <p className="text-xs text-gray-500 mt-0.5">{event.eventName}</p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate({ ...form, attendanceCount: parseInt(form.attendanceCount) || 0, totalExpenditure: parseFloat(form.totalExpenditure) || 0, submissionLat: form.submissionLat ? parseFloat(form.submissionLat) : undefined, submissionLng: form.submissionLng ? parseFloat(form.submissionLng) : undefined }); }} className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800 font-medium">📍 Event Capsule</p>
            <p className="text-xs text-amber-700 mt-1">This creates an immutable evidence record of the event. Provide accurate details.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Actual Attendance *</label>
              <input type="number" className="vc-input" required min="0" value={form.attendanceCount} onChange={(e) => setForm({ ...form, attendanceCount: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Expenditure (KES)</label>
              <input type="number" className="vc-input" min="0" value={form.totalExpenditure} onChange={(e) => setForm({ ...form, totalExpenditure: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Summary *</label>
            <textarea className="vc-input" rows={3} required value={form.eventSummary} onChange={(e) => setForm({ ...form, eventSummary: e.target.value })} placeholder="Brief summary of what happened at the event..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key Outcomes</label>
            <textarea className="vc-input" rows={2} value={form.keyOutcomes} onChange={(e) => setForm({ ...form, keyOutcomes: e.target.value })} placeholder="What was achieved?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issues Reported</label>
            <textarea className="vc-input" rows={2} value={form.issuesReported} onChange={(e) => setForm({ ...form, issuesReported: e.target.value })} placeholder="Any problems or incidents during the event?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your GPS Latitude</label>
              <input type="number" step="any" className="vc-input" value={form.submissionLat} onChange={(e) => setForm({ ...form, submissionLat: e.target.value })} placeholder="-1.2921" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your GPS Longitude</label>
              <input type="number" step="any" className="vc-input" value={form.submissionLng} onChange={(e) => setForm({ ...form, submissionLng: e.target.value })} placeholder="36.8219" />
            </div>
          </div>
          {mut.isError && <p className="text-sm text-red-600">Failed to submit capsule. Please try again.</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mut.isPending} className="flex-1 vc-btn-primary">
              {mut.isPending ? 'Submitting…' : 'Submit Capsule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Calendar Page ───────────────────────────────────────
function MyCampaignCalendarContent(): React.JSX.Element {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showCreate, setShowCreate]     = useState(false);
  const [capsuleEvent, setCapsuleEvent] = useState<any>(null);
  const [selectedEvent, setSelected]    = useState<any>(null);
  const campaign = useMyCampaign();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd   = endOfMonth(currentMonth);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const { data: events = [] } = useQuery({
    queryKey: ['my-events', campaign?.id, format(currentMonth, 'yyyy-MM')],
    queryFn:  () => campaign
      ? campaignApi.events.list(campaign.id, {
          startAfter:  format(calStart, "yyyy-MM-dd'T'00:00:00"),
          startBefore: format(calEnd,   "yyyy-MM-dd'T'23:59:59"),
        }).then((r) => r.data?.data ?? r.data ?? [])
      : [],
    enabled: !!campaign?.id,
  });

  const eventsOnDay = (day: Date) =>
    events.filter((ev: any) => ev.startTime && isSameDay(parseISO(ev.startTime), day));

  return (
    <div className="space-y-5">
      {!campaign && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Calendar className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">Create a campaign to start scheduling events. <a href="/campaign" className="font-semibold underline hover:text-amber-900">Get started →</a></p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">{campaign?.name ?? ''}</p>
        </div>
        <button onClick={() => setShowCreate(true)} disabled={!campaign} className={`vc-btn-primary inline-flex items-center gap-2 text-sm ${!campaign ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <Plus className="w-4 h-4" /> Add Event
        </button>
      </div>

      {/* Month navigation */}
      <div className="vc-card p-4">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className="text-base font-semibold text-gray-900">{format(currentMonth, 'MMMM yyyy')}</h3>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
          {days.map((day) => {
            const dayEvents = eventsOnDay(day);
            const isToday   = isSameDay(day, new Date());
            const inMonth   = isSameMonth(day, currentMonth);
            return (
              <div key={day.toISOString()} className={`bg-white min-h-[72px] p-1 ${!inMonth ? 'opacity-40' : ''}`}>
                <div className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-amber-500 text-white' : 'text-gray-700'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 2).map((ev: any) => (
                    <button
                      key={ev.id}
                      onClick={() => setSelected(ev)}
                      className={`w-full text-left text-[10px] px-1 py-0.5 rounded truncate font-medium ${EVENT_COLORS[ev.eventType] ?? 'bg-gray-400 text-white'}`}
                    >
                      {ev.eventName}
                    </button>
                  ))}
                  {dayEvents.length > 2 && (
                    <p className="text-[10px] text-gray-500 px-1">+{dayEvents.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event list (upcoming) */}
      <div className="vc-card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">All Events This Month</h3>
        {events.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No events scheduled this month</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {events.map((ev: any) => (
              <div key={ev.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className={`w-2 h-10 rounded-full flex-shrink-0 ${EVENT_COLORS[ev.eventType]?.replace('text-white','') ?? 'bg-gray-400'}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{ev.eventName}</p>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    {ev.startTime ? new Date(ev.startTime).toLocaleString('en-KE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    {ev.venueName && <><MapPin className="w-3 h-3 ml-1" />{ev.venueName}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    ev.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    ev.status === 'confirmed' ? 'bg-blue-100 text-blue-700' :
                    ev.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{ev.status}</span>
                  {ev.status === 'completed' && !ev.capsuleSubmitted && (
                    <button
                      onClick={() => setCapsuleEvent(ev)}
                      className="text-xs text-amber-600 hover:text-amber-800 font-medium flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" /> Submit Capsule
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_COLORS).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-sm ${cls.split(' ')[0]}`} />
            <span className="text-xs text-gray-500">{type.replace(/_/g,' ')}</span>
          </div>
        ))}
      </div>

      {/* Modals */}
      {showCreate  && campaign && <CreateEventModal campaignId={campaign.id} onClose={() => setShowCreate(false)} />}
      {capsuleEvent && campaign && <CapsuleModal campaignId={campaign.id} event={capsuleEvent} onClose={() => setCapsuleEvent(null)} />}

      {/* Event detail panel */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EVENT_COLORS[selectedEvent.eventType] ?? 'bg-gray-400 text-white'}`}>{selectedEvent.eventType}</span>
                <h3 className="text-base font-bold text-gray-900 mt-2">{selectedEvent.eventName}</h3>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{selectedEvent.startTime ? new Date(selectedEvent.startTime).toLocaleString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'}</p>
              {selectedEvent.venueName && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />{selectedEvent.venueName}</p>}
              {selectedEvent.expectedAttendance > 0 && <p className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />Expected: {selectedEvent.expectedAttendance.toLocaleString()}</p>}
              {selectedEvent.wardCode && <p className="flex items-center gap-2"><MapPin className="w-4 h-4 text-gray-400" />Ward: {selectedEvent.wardCode}</p>}
            </div>
            {selectedEvent.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">{selectedEvent.notes}</p>}
            {selectedEvent.status === 'completed' && !selectedEvent.capsuleSubmitted && (
              <button
                onClick={() => { setSelected(null); setCapsuleEvent(selectedEvent); }}
                className="w-full vc-btn-primary flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" /> Submit Event Capsule
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MyCampaignCalendarPage() {
  return (
    <PageErrorBoundary page="My Campaign Calendar">
      <MyCampaignCalendarContent />
    </PageErrorBoundary>
  );
}
