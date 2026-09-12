import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../utils/api';

const Settings = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmAction, setConfirmAction] = useState(null); // { action, eventId, eventName, title, msg, confirmStyle }
  const [editForms, setEditForms] = useState({});
  const toast = useToast();

  const fetchEvents = async () => {
    try {
      const res = await api.get('/admin/events');
      setEvents(res.data);
      const forms = {};
      res.data.forEach(ev => {
        forms[ev.id] = {
          time_limit_minutes: ev.time_limit_minutes,
          questions_per_team: ev.questions_per_team,
          name: ev.name,
          description: ev.description,
        };
      });
      setEditForms(forms);
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleFieldChange = (eventId, field, value) => {
    setEditForms(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value,
      },
    }));
  };

  const handleUpdate = async (eventId) => {
    try {
      const form = editForms[eventId];
      const ev = events.find(e => e.id === eventId);
      const qPerTeam = parseInt(form.questions_per_team, 10);
      const timeLimit = parseInt(form.time_limit_minutes, 10);

      if (ev && qPerTeam > ev.question_count && ev.question_count > 0) {
        toast.error(`Questions per team (${qPerTeam}) cannot exceed available pool size (${ev.question_count})`);
        return;
      }

      await api.put(`/admin/events/${eventId}`, {
        name: form.name,
        description: form.description,
        time_limit_minutes: timeLimit,
        questions_per_team: qPerTeam,
      });
      toast.success('Event settings updated successfully');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update settings');
    }
  };

  const executeControlAction = async () => {
    if (!confirmAction) return;
    const { action, eventId } = confirmAction;
    try {
      let endpoint = '';
      if (action === 'start') endpoint = `/admin/events/${eventId}/start`;
      else if (action === 'pause') endpoint = `/admin/events/${eventId}/pause`;
      else if (action === 'resume') endpoint = `/admin/events/${eventId}/resume`;
      else if (action === 'end') endpoint = `/admin/events/${eventId}/end`;
      else if (action === 'reset') endpoint = `/admin/events/${eventId}/reset`;
      else if (action === 'regenerate') endpoint = `/admin/events/${eventId}/regenerate-allocations`;

      const res = await api.post(endpoint);
      toast.success(res.data.message || 'Action executed successfully');
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setConfirmAction(null);
    }
  };

  const requestControlAction = (ev, action) => {
    let title = '';
    let msg = '';
    let confirmStyle = 'danger';

    switch (action) {
      case 'start':
        title = `Start Event: ${ev.name}?`;
        msg = `This will change the event status to LIVE. Registered teams will be able to enter the arena and start solving challenges.`;
        confirmStyle = 'primary';
        break;
      case 'pause':
        title = `Pause Event: ${ev.name}?`;
        msg = `This will temporarily pause the event. Teams will be prevented from making submissions until resumed.`;
        confirmStyle = 'warning';
        break;
      case 'resume':
        title = `Resume Event: ${ev.name}?`;
        msg = `This will resume the event and set status back to LIVE.`;
        confirmStyle = 'primary';
        break;
      case 'end':
        title = `End Event: ${ev.name}?`;
        msg = `Are you sure you want to end the event? All ongoing teams will have submissions locked and marked as time-expired/completed.`;
        confirmStyle = 'danger';
        break;
      case 'reset':
        title = `Reset Event: ${ev.name}?`;
        msg = `Are you sure you want to reset this event? This will clear all submitted attempts and timer history, but KEEP the existing randomly assigned questions for all teams.`;
        confirmStyle = 'danger';
        break;
      case 'regenerate':
        title = `⚠️ Regenerate Question Allocations for ${ev.name}?`;
        msg = `This will permanently DELETE and replace the currently assigned questions for all teams in ${ev.name}. Each team will receive a new random set of questions from the pool. This action cannot be undone.`;
        confirmStyle = 'danger';
        break;
      default:
        return;
    }

    setConfirmAction({
      action,
      eventId: ev.id,
      eventName: ev.name,
      title,
      msg,
      confirmStyle,
    });
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading settings...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-8 border-b border-stone-800 pb-4">
        <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-2">
          ⚔️ HIGH COMMAND BATTLE ADMINISTRATION
        </span>
        <h1 className="text-3xl font-black text-amber-100 font-fantasy">Battle Controls & Fortress Settings</h1>
        <p className="text-stone-400 text-sm mt-1 font-sans">
          Configure time limits, challenge allocation quotas, and execute battle state transitions.
        </p>
      </div>

      <div className="space-y-8">
        {events.map((ev) => {
          const form = editForms[ev.id] || {};
          const isLive = ev.status === 'live';
          const isPaused = ev.status === 'paused';
          const isEnded = ev.status === 'ended';
          const isNotStarted = ev.status === 'not_started';

          return (
            <div key={ev.id} className="card border-dark-700 bg-dark-900/80 shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-700 pb-4 mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white tracking-tight">{ev.name}</h2>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-dark-800 border border-dark-600 text-cyan-300">
                      {ev.year}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">{ev.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Current Status:</span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                      isLive
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600'
                        : isPaused
                        ? 'bg-yellow-950/60 text-yellow-400 border-yellow-600'
                        : isEnded
                        ? 'bg-red-950/60 text-red-400 border-red-600'
                        : 'bg-dark-800 text-gray-400 border-dark-600'
                    }`}
                  >
                    {ev.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Configuration Column */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400 border-b border-dark-800 pb-2">
                    Event Configuration
                  </h3>

                  <div>
                    <label className="label">Event Title</label>
                    <input
                      type="text"
                      className="input-field text-sm"
                      value={form.name || ''}
                      onChange={(e) => handleFieldChange(ev.id, 'name', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Time Limit (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        max="300"
                        className="input-field text-sm font-mono"
                        value={form.time_limit_minutes || ''}
                        onChange={(e) => handleFieldChange(ev.id, 'time_limit_minutes', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="label">Questions Per Team</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        className="input-field text-sm font-mono"
                        value={form.questions_per_team || ''}
                        onChange={(e) => handleFieldChange(ev.id, 'questions_per_team', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 bg-dark-950/60 rounded-lg border border-dark-800 text-center font-mono">
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Question Pool</span>
                      <span className="text-base font-bold text-white">{ev.question_count || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Assigned / Team</span>
                      <span className="text-base font-bold text-cyan-400">{ev.questions_per_team || 0}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-500 block uppercase">Registered Teams</span>
                      <span className="text-base font-bold text-purple-400">{ev.team_count || 0}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpdate(ev.id)}
                    className="btn-secondary text-xs w-full py-2.5 font-medium"
                  >
                    💾 Save Configuration
                  </button>
                </div>

                {/* Event Control Actions */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400 border-b border-dark-800 pb-2">
                    Event Life-Cycle Controls
                  </h3>

                  <div className="grid grid-cols-2 gap-3">
                    {isPaused ? (
                      <button
                        onClick={() => requestControlAction(ev, 'resume')}
                        className="btn-success py-2.5 text-xs font-bold"
                      >
                        ▶ Resume Event
                      </button>
                    ) : (
                      <button
                        onClick={() => requestControlAction(ev, 'start')}
                        disabled={isLive || isEnded}
                        className="btn-success py-2.5 text-xs font-bold disabled:opacity-40"
                      >
                        ▶ Start Event
                      </button>
                    )}

                    <button
                      onClick={() => requestControlAction(ev, 'pause')}
                      disabled={!isLive}
                      className="px-4 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white font-bold rounded-lg text-xs transition-all disabled:opacity-40"
                    >
                      ⏸ Pause Event
                    </button>

                    <button
                      onClick={() => requestControlAction(ev, 'end')}
                      disabled={isEnded || isNotStarted}
                      className="btn-danger py-2.5 text-xs font-bold disabled:opacity-40"
                    >
                      ⏹ End Event
                    </button>

                    <button
                      onClick={() => requestControlAction(ev, 'reset')}
                      className="px-4 py-2.5 bg-dark-800 hover:bg-dark-700 text-gray-200 border border-dark-600 font-bold rounded-lg text-xs transition-all"
                      title="Reset state and attempts, keep allocations"
                    >
                      🔄 Reset Progress (Keep Allocations)
                    </button>
                  </div>

                  {/* Danger Zone: Regenerate Question Allocations */}
                  <div className="pt-4 mt-4 border-t border-dark-800">
                    <div className="p-3 bg-red-950/20 border border-red-900/40 rounded-lg">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                          ⚠️ Dangerous Operation
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mb-3 leading-relaxed">
                        Regenerating question allocations will overwrite the current question set for all teams in this event.
                      </p>
                      <button
                        onClick={() => requestControlAction(ev, 'regenerate')}
                        className="w-full px-4 py-2 border border-red-600/60 text-red-400 hover:bg-red-950/50 hover:text-red-300 font-bold rounded-lg text-xs transition-all"
                      >
                        🎲 Regenerate Question Allocations
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={executeControlAction}
        title={confirmAction?.title}
        message={confirmAction?.msg}
        confirmText="Yes, Proceed"
        confirmStyle={confirmAction?.confirmStyle || 'danger'}
      />
    </div>
  );
};

export default Settings;
