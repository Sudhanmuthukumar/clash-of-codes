import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';
import { IconShield, IconSwords, IconTrophy, IconGear, IconHammer } from '../../components/FantasyIcons';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const navigate = useNavigate();
  const toast = useToast();

  const fetchDashboard = async () => {
    try {
      const liveEndpoint = selectedEventId ? `/admin/dashboard/live?event_id=${selectedEventId}` : '/admin/dashboard/live';
      const [statsRes, liveRes] = await Promise.all([
        api.get('/admin/dashboard/stats'),
        api.get(liveEndpoint),
      ]);
      setStats(statsRes.data);
      setLive(liveRes.data);
    } catch (err) {
      toast.error('Failed to load admin dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 8000);
    return () => clearInterval(interval);
  }, [selectedEventId]);

  const formatTime = (sec) => {
    if (sec === null || sec === undefined || isNaN(sec)) return '—';
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem.toString().padStart(2, '0')}s`;
  };

  if (loading || !stats) return <div className="p-8 text-center text-gray-400">Loading admin dashboard...</div>;

  const y2Teams = (stats.teamsByYear?.find(y => y.year === '2nd Year')?.c) || 0;
  const y3Teams = (stats.teamsByYear?.find(y => y.year === '3rd Year')?.c) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-6">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-2">
            HIGH COMMAND BATTLE HQ
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">
            CLASH OF CODES &bull; WAR ROOM
          </h1>
          <p className="text-stone-400 text-sm mt-1 font-sans">Live battle monitoring and clan management</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button onClick={() => navigate('/admin/teams/create')} className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wide flex items-center gap-1.5">
            <span>+</span>
            <span>Enlist Clan</span>
          </button>
          <button onClick={() => navigate('/admin/results')} className="btn-secondary text-xs px-3.5 py-2 font-medium flex items-center gap-1.5">
            <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Hall of Victory</span>
          </button>
          <button onClick={() => navigate('/admin/settings')} className="btn-secondary text-xs px-3.5 py-2 font-medium flex items-center gap-1.5">
            <IconGear className="w-3.5 h-3.5 text-stone-400" />
            <span>Battle Controls</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-fortress text-center p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wider mb-1 font-sans">Total Clans</div>
          <div className="text-3xl font-bold font-mono text-amber-200">{stats.totalTeams || 0}</div>
        </div>
        <div className="card-fortress text-center p-4 border-amber-800/60">
          <div className="text-stone-400 text-xs uppercase tracking-wider mb-1 font-sans">2nd Year (CS)</div>
          <div className="text-3xl font-bold font-mono text-amber-400">{y2Teams}</div>
        </div>
        <div className="card-fortress text-center p-4 border-amber-800/60">
          <div className="text-stone-400 text-xs uppercase tracking-wider mb-1 font-sans">3rd Year (HT)</div>
          <div className="text-3xl font-bold font-mono text-amber-400">{y3Teams}</div>
        </div>
        <div className="card-fortress text-center p-4 border-emerald-900/60">
          <div className="text-stone-400 text-xs uppercase tracking-wider mb-1 font-sans">Active Clans</div>
          <div className="text-3xl font-bold font-mono text-emerald-400">{stats.activeTeams || 0}</div>
        </div>
        <div className="card-fortress text-center p-4">
          <div className="text-stone-400 text-xs uppercase tracking-wider mb-1 font-sans">Finished Battle</div>
          <div className="text-3xl font-bold font-mono text-amber-300">{stats.completedTeams || 0}</div>
        </div>
      </div>

      {/* Event Overview Section - Dedicated cards for all 4 events */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(stats.events || []).map((ev) => {
          const isY2 = ev.year === '2nd Year';
          const isRound2 = ev.name.includes('Round 2');
          const isHT = ev.year === '3rd Year';

          const borderTopColor = isHT 
            ? (isRound2 ? 'border-t-emerald-500' : 'border-t-purple-500')
            : isRound2 
            ? 'border-t-cyan-500' 
            : 'border-t-amber-500';

          const manageRoute = isHT ? '/admin/hidden-tech' : '/admin/code-scramble';

          return (
            <div key={ev.id} className={`card-fortress border-t-4 ${borderTopColor} bg-stone-900/95 shadow-xl flex flex-col justify-between`}>
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-base font-bold font-fantasy text-amber-100 tracking-wide">
                      {ev.name}
                    </h2>
                    <span className="text-xs text-amber-400 font-sans font-bold">
                      {isHT ? (isRound2 ? '⚡ 3rd Year Round 2' : '🛡 3rd Year Round 1') : (isRound2 ? '⚡ 2nd Year Round 2' : '🔨 2nd Year Round 1')}
                    </span>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                      ev.status === 'live'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-600'
                        : ev.status === 'paused'
                        ? 'bg-yellow-950/60 text-yellow-400 border-yellow-600'
                        : ev.status === 'ended'
                        ? 'bg-red-950/60 text-red-400 border-red-600'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    {ev.status || 'not_started'}
                  </span>
                </div>

                <div className="space-y-2.5 font-mono text-xs border-t border-stone-800 pt-3">
                  <div className="flex justify-between text-stone-400 font-sans">
                    <span>Question Pool:</span>
                    <span className="text-stone-100 font-bold font-mono">{ev.questionCount || 0} questions</span>
                  </div>
                  <div className="flex justify-between text-stone-400 font-sans">
                    <span>Assigned / Clan:</span>
                    <span className="text-amber-300 font-bold font-mono">{ev.questions_per_team || 0}</span>
                  </div>
                  <div className="flex justify-between text-stone-400 font-sans">
                    <span>Battle Duration:</span>
                    <span className="text-stone-100 font-bold font-mono">{ev.time_limit_minutes} mins</span>
                  </div>
                  <div className="flex justify-between text-stone-400 font-sans">
                    <span>Total Marks:</span>
                    <span className="text-stone-100 font-bold font-mono">{ev.totalMarks || 0} marks</span>
                  </div>
                  <div className="flex justify-between text-stone-400 font-sans">
                    <span>Clans Enlisted:</span>
                    <span className="text-stone-100 font-bold font-mono">{ev.teamsCount || 0}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-stone-800 flex gap-2">
                <button
                  onClick={() => navigate(manageRoute)}
                  className="btn-secondary text-xs flex-grow"
                >
                  Manage
                </button>
                <button
                  onClick={() => navigate('/admin/settings')}
                  className="btn-primary text-xs flex-grow"
                >
                  Controls
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Team Monitoring Table */}
      <div className="card overflow-hidden">
        <div className="flex justify-between items-center mb-4 border-b border-dark-800 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white">Live Monitoring Arena</h2>
            <p className="text-xs text-gray-400">Real-time team progress during the event (refreshes automatically)</p>
          </div>
          <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            LIVE FEED
          </span>
        </div>

        {/* Round Filter Tabs */}
        <div className="flex flex-wrap border-b border-dark-800 text-xs font-mono mb-4 gap-2 pb-3">
          <button
            onClick={() => setSelectedEventId(null)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedEventId === null
                ? 'bg-amber-500 text-dark-950 shadow'
                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-dark-800'
            }`}
          >
            All Rounds
          </button>
          <button
            onClick={() => setSelectedEventId(1)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedEventId === 1
                ? 'bg-amber-500 text-dark-950 shadow'
                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-dark-800'
            }`}
          >
            🔨 2nd Year R1
          </button>
          <button
            onClick={() => setSelectedEventId(3)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedEventId === 3
                ? 'bg-cyan-500 text-dark-950 shadow'
                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-dark-800'
            }`}
          >
            ⚡ 2nd Year R2
          </button>
          <button
            onClick={() => setSelectedEventId(2)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedEventId === 2
                ? 'bg-purple-500 text-white shadow'
                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-dark-800'
            }`}
          >
            🛡 3rd Year R1
          </button>
          <button
            onClick={() => setSelectedEventId(4)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              selectedEventId === 4
                ? 'bg-emerald-500 text-dark-950 shadow'
                : 'bg-dark-900 text-gray-400 hover:text-gray-200 border border-dark-800'
            }`}
          >
            ⚡ 3rd Year R2
          </button>
        </div>

        {(!live || live.length === 0) ? (
          <div className="text-center py-8 text-gray-500 text-sm font-mono">
            No active teams in live sessions.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-dark-950 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-dark-800">
                <tr>
                  <th className="py-3 px-4">Team Name</th>
                  <th className="py-3 px-4">Event / Round</th>
                  <th className="py-3 px-4 text-center">Current Score</th>
                  <th className="py-3 px-4 text-center">Questions Attempted</th>
                  <th className="py-3 px-4 text-center">Warnings</th>
                  <th className="py-3 px-4 text-center">Test Status</th>
                  <th className="py-3 px-4 text-right">Time Consumed</th>
                  <th className="py-3 px-4 text-right">Time Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800 font-mono text-xs">
                {live.map((t) => (
                  <tr key={t.id} className="hover:bg-dark-800/40">
                    <td className="py-3 px-4 font-bold text-white">{t.team_name}</td>
                    <td className="py-3 px-4 text-cyan-300">{t.event_name}</td>
                    <td className="py-3 px-4 text-center font-bold text-amber-300">
                      {t.current_score || 0} PTS
                    </td>
                    <td className="py-3 px-4 text-center text-gray-300">
                      {t.questions_attempted} / {t.total_allocated}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {t.status === 'terminated' || t.test_status === 'TERMINATED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-950 text-red-400 border border-red-700" title={t.termination_reason || '3 violations exceeded'}>
                          TERMINATED (3/3)
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          (t.violation_count || 0) === 0
                            ? 'bg-stone-900 text-stone-400 border border-stone-800'
                            : (t.violation_count || 0) === 1
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-red-950 text-red-400 border border-red-800 animate-pulse'
                        }`}>
                          {t.violation_count || 0} / 3
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase ${
                          (t.test_status === 'TERMINATED' || t.status === 'terminated')
                            ? 'bg-red-950 text-red-400 border border-red-800 font-black'
                            : (t.test_status === 'EXPIRED' || t.status === 'time_expired')
                            ? 'bg-stone-800 text-stone-400 border border-stone-700'
                            : (t.test_status === 'SUBMITTED' || t.status === 'completed')
                            ? 'bg-blue-900/40 text-blue-400 border border-blue-800'
                            : (t.test_status === 'ACTIVE' || t.status === 'active')
                            ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800'
                            : 'bg-stone-900 text-stone-400 border border-stone-800'
                        }`}
                      >
                        {t.test_status || t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-amber-300 font-bold">
                      {formatTime(t.time_consumed ?? t.time_used ?? t.time_elapsed)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-300 font-bold">
                      {t.time_remaining !== undefined ? `${Math.floor(t.time_remaining / 60)}m ${t.time_remaining % 60}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Audit Log */}
      {stats.recentAudit && stats.recentAudit.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3 border-b border-dark-800 pb-2">
            Recent Admin Audit Trail
          </h3>
          <div className="space-y-2 text-xs font-mono">
            {stats.recentAudit.slice(0, 6).map((log) => (
              <div key={log.id} className="flex justify-between items-center text-gray-400 py-1 border-b border-dark-800/50">
                <span className="text-gray-300">
                  <span className="text-cyan-400 font-bold mr-2">[{log.action}]</span>
                  {log.details}
                </span>
                <span className="text-gray-500">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
