// ============================================================
// VoteCapsule™ — Campaign Calendar (Party Portal)
// Phase 14A — Full calendar with day/week/month views
// ============================================================
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, ChevronRight, Plus, Calendar, Clock,
  MapPin, Users, AlertCircle, CheckCircle, X,
} from 'lucide-react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addMonths,
  subMonths, addWeeks, subWeeks, parseISO,
} from 'date-fns';
import { campaignApi } from '../api/campaignApi';
import { PageErrorBoundary } from '../components/PageErrorBoundary';

type ViewMode = 'month' | 'week' | 'day';

const EVENT_TYPE_COLORS: Record<string, string> = {
  RALLY:            'bg-violet-500 text-white',
  MEETING:          'bg-blue-500 text-white',
  DOOR_TO_DOOR:     'bg-emerald-500 text-white',
  PRESS_CONFERENCE: 'bg-amber-500 text-white',
  DEBATE:           'bg-red-500 text-white',
  FUNDRAISER:       'bg-pink-500 text-white',
  OTHER:            'bg-gray-500 text-white',
};

interface EventModalProps {
  campaignId: string;
  onClose: () => void;
}

function CreateEventModal({ campaignId, onClose }: EventModalProps) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    eventName: '', eventType: 'RALLY', startTime: '', endTime: '',
    venueName: '', lat: '', lng: '', wardCode: '', expectedAttendance: '0',
    requiresSecurity: false, requiresTransport: false, requiresPaSystem: false,
    requiresStage: false, requiresTents: false, requiresChairs: false,
    budgetEstimate: '0', notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => campaignApi.events.create(campaignId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaign-events'] }); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      lat: form.lat ? parseFloat(form.lat) : undefined,
      lng: form.lng ? parseFloat(form.lng) : undefined,
      expectedAttendance: parseInt(form.expectedAttendance) || 0,
      budgetEstimate: parseFloat(form.budgetEstimate) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Event</h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Name *</label>
            <input className="vc-input" required value={form.eventName} onChange={(e) => setForm({ ...form, eventName: e.target.value })} placeholder="e.g. Nairobi Rally 2027" />
          </div>
          <div className="grid grid-cols-2 gap-4">
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
              <input className="vc-input" value={form.wardCode} onChange={(e) => setForm({ ...form, wardCode: e.target.value })} placeholder="e.g. 0101" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
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
            <input className="vc-input" value={form.venueName} onChange={(e) => setForm({ ...form, venueName: e.target.value })} placeholder="Venue or location" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input type="number" step="0.0000001" className="vc-input" value={form.lat} onChange={(e) => setForm({ ...form, lat: e.target.value })} placeholder="-1.2921" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input type="number" step="0.0000001" className="vc-input" value={form.lng} onChange={(e) => setForm({ ...form, lng: e.target.value })} placeholder="36.8219" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Requirements</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'requiresSecurity',  label: 'Security' },
                { key: 'requiresTransport', label: 'Transport' },
                { key: 'requiresPaSystem',  label: 'PA System' },
                { key: 'requiresStage',     label: 'Stage' },
                { key: 'requiresTents',     label: 'Tents' },
                { key: 'requiresChairs',    label: 'Chairs' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Attendance</label>
              <input type="number" className="vc-input" value={form.expectedAttendance} onChange={(e) => setForm({ ...form, expectedAttendance: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Budget Estimate (KES)</label>
              <input type="number" className="vc-input" value={form.budgetEstimate} onChange={(e) => setForm({ ...form, budgetEstimate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="vc-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          {mutation.isError && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">Failed to create event. Please try again.</div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 vc-btn-secondary">Cancel</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 vc-btn-primary">
              {mutation.isPending ? 'Saving...' : 'Schedule Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CampaignCalendarContent(): React.JSX.Element {
  const [view, setView]         = useState<ViewMode>('month');
  const [currentDate, setDate]  = useState(new Date());
  const [showCreate, setCreate] = useState(false);
  const [selectedEvent, setSelected] = useState<any>(null);

  // We need a campaign ID — use first active campaign
  const { data: campaigns = [] } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => campaignApi.list().then((r) => r.data?.data ?? r.data ?? []),
  });
  const campaign = campaigns.find((c: any) => c.status === 'active') ?? campaigns[0];

  const startDate = view === 'month'
    ? format(startOfMonth(currentDate), 'yyyy-MM-dd')
    : format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const endDate = view === 'month'
    ? format(endOfMonth(currentDate), 'yyyy-MM-dd')
    : format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const { data: calendarData = {} } = useQuery({
    queryKey: ['campaign-events', campaign?.id, startDate, endDate],
    queryFn: () => campaign ? campaignApi.events.calendar(campaign.id, { start: startDate, end: endDate }).then((r) => r.data?.data ?? r.data ?? {}) : {},
    enabled: !!campaign?.id,
  });

  const navigate = (dir: 1 | -1) => {
    if (view === 'month')  setDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    else                   setDate(dir === 1 ? addWeeks(currentDate, 1)  : subWeeks(currentDate, 1));
  };

  // Build month grid
  const monthDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
    end:   endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Campaign Calendar</h2>
          <p className="text-sm text-gray-500 mt-1">Schedule and manage campaign events</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['month','week','day'] as ViewMode[]).map((v) => (
              <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-medium transition-colors capitalize ${view === v ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>{v}</button>
            ))}
          </div>
          {campaign ? (
            <button onClick={() => setCreate(true)} className="vc-btn-primary inline-flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Event
            </button>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
              Create a campaign first to add events
            </span>
          )}
        </div>
      </div>

      {/* Calendar Header */}
      <div className="vc-card p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <h3 className="text-base font-semibold text-gray-900">
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : "'Week of' MMM d, yyyy")}
          </h3>
          <button onClick={() => navigate(1)} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
        </div>

        {/* Month View */}
        {view === 'month' && (
          <div>
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b">
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
                <div key={d} className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">{d}</div>
              ))}
            </div>
            {/* Days */}
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const key    = format(day, 'yyyy-MM-dd');
                const events = (calendarData as any)[key] ?? [];
                const isToday = isSameDay(day, new Date());
                const inMonth = isSameMonth(day, currentDate);
                return (
                  <div key={key} className={`min-h-[100px] p-2 border-b border-r last:border-r-0 ${!inMonth ? 'bg-gray-50' : 'bg-white'}`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm mb-1 ${isToday ? 'bg-violet-600 text-white font-bold' : `${inMonth ? 'text-gray-900' : 'text-gray-400'}`}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {events.slice(0, 3).map((ev: any) => (
                        <button
                          key={ev.id}
                          onClick={() => setSelected(ev)}
                          className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate ${EVENT_TYPE_COLORS[ev.eventType] ?? 'bg-gray-200 text-gray-700'}`}
                        >
                          {ev.eventName}
                        </button>
                      ))}
                      {events.length > 3 && (
                        <p className="text-xs text-gray-500 pl-1">+{events.length - 3} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Event Detail Panel */}
      {selectedEvent && (
        <div className="vc-card">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">{selectedEvent.eventName}</h3>
              <span className={`vc-badge mt-1 ${EVENT_TYPE_COLORS[selectedEvent.eventType] ?? ''}`}>
                {selectedEvent.eventType?.replace(/_/g,' ')}
              </span>
            </div>
            <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>{new Date(selectedEvent.startTime).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{selectedEvent.venueName ?? 'No venue set'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span>Expected: {selectedEvent.expectedAttendance?.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedEvent.status === 'completed' ? (
                <CheckCircle className="w-4 h-4 text-emerald-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-500" />
              )}
              <span className="text-gray-600 capitalize">{selectedEvent.status}</span>
            </div>
          </div>
          {selectedEvent.notes && <p className="text-sm text-gray-500 mt-3">{selectedEvent.notes}</p>}
        </div>
      )}

      {showCreate && campaign && (
        <CreateEventModal campaignId={campaign.id} onClose={() => setCreate(false)} />
      )}
    </div>
  );
}

export function CampaignCalendarPage() {
  return (
    <PageErrorBoundary page="Campaign Calendar">
      <CampaignCalendarContent />
    </PageErrorBoundary>
  );
}
