import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';
import { IconTrophy, IconSwords, IconHammer, IconShield } from '../../components/FantasyIcons';

const Results = () => {
  const [activeEventId, setActiveEventId] = useState(1); // 1 = CS, 2 = HT
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedTeamId, setExpandedTeamId] = useState(null);
  const [teamDetail, setTeamDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const toast = useToast();

  const fetchResults = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get(`/admin/results?event_id=${activeEventId}`);
      setResults(res.data);
    } catch (err) {
      if (!isBackground) toast.error('Failed to load leaderboard results');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults(false);
    setExpandedTeamId(null);
    setTeamDetail(null);

    // 8-second background polling without clearing existing UI or state
    const interval = setInterval(() => {
      fetchResults(true);
    }, 8000);

    return () => clearInterval(interval);
  }, [activeEventId]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/admin/results/export/csv?event_id=${activeEventId}`, {
        responseType: 'blob',
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ClashOfCodes_Results_Event_${activeEventId}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('CSV Export downloaded');
    } catch (err) {
      toast.error('Failed to export CSV');
    }
  };

  const toggleExpand = async (teamId) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
      setTeamDetail(null);
      return;
    }
    setExpandedTeamId(teamId);
    setLoadingDetail(true);
    try {
      const res = await api.get(`/admin/results/${teamId}`);
      setTeamDetail(res.data);
    } catch (err) {
      toast.error('Failed to load team score details');
    } finally {
      setLoadingDetail(false);
    }
  };

  const formatSeconds = (sec) => {
    if (sec === null || sec === undefined || isNaN(sec)) return '—';
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}m ${rem}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-1">
            BATTLE CONQUEST & CLAN STANDINGS
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">
            HALL OF VICTORY
          </h1>
          <p className="text-stone-400 text-xs mt-1 font-sans">
            Primary ranking by Highest Total Marks. Ties resolved by Fastest Completion Time. Time never affects marks.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={fetchResults} className="btn-secondary text-xs px-3.5 py-2 font-medium">
            Refresh
          </button>
          <button onClick={handleExportCSV} className="btn-primary text-xs font-bold px-4 py-2 flex items-center gap-1.5 uppercase tracking-wide">
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Event Tabs */}
      <div className="flex border-b border-stone-800 font-sans text-sm">
        <button
          onClick={() => setActiveEventId(1)}
          className={`px-6 py-3 font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeEventId === 1
              ? 'text-amber-400 border-amber-400 bg-amber-950/30'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <IconHammer className="w-4 h-4" />
          <span>Code Scramble &mdash; Round 1 (2nd Year)</span>
        </button>
        <button
          onClick={() => setActiveEventId(3)}
          className={`px-6 py-3 font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeEventId === 3
              ? 'text-amber-400 border-amber-400 bg-amber-950/30'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <IconHammer className="w-4 h-4" />
          <span>Code Scramble &mdash; Round 2 (2nd Year)</span>
        </button>
        <button
          onClick={() => setActiveEventId(2)}
          className={`px-6 py-3 font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeEventId === 2
              ? 'text-amber-400 border-amber-400 bg-amber-950/30'
              : 'text-stone-400 border-transparent hover:text-stone-200'
          }`}
        >
          <IconShield className="w-4 h-4" />
          <span>Crack the Code (3rd Year)</span>
        </button>
      </div>

      {/* Main Results Table */}
      <div className="card-fortress overflow-hidden p-0">
        {loading ? (
          <div className="p-8 text-center text-stone-400 font-sans">Computing scores and clan rankings...</div>
        ) : results.length === 0 ? (
          <div className="p-8 text-center text-stone-500 font-sans">No clans found for this battle.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-950 text-stone-400 text-xs font-sans uppercase tracking-wider border-b border-stone-800">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">Rank</th>
                  <th className="py-3 px-4">Clan</th>
                  <th className="py-3 px-4">Year</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Time</th>
                  <th className="py-3 px-4 text-center">Challenges</th>
                  <th className="py-3 px-4 text-center">Hints</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 font-mono text-xs">
                {results.map((r) => {
                  const isTop3 = r.rank <= 3;
                  const rankBadgeColor =
                    r.rank === 1
                      ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40'
                      : r.rank === 2
                      ? 'bg-slate-400/20 text-slate-200 border-slate-400/40'
                      : r.rank === 3
                      ? 'bg-amber-700/20 text-amber-400 border-amber-600/40'
                      : 'bg-dark-800 text-gray-400';

                  return (
                    <React.Fragment key={r.team_id}>
                      <tr className={`hover:bg-stone-800/40 transition-colors ${isTop3 ? 'bg-stone-900/60' : ''}`}>
                        <td className="py-3 px-4 text-center font-bold">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full border text-xs font-bold ${rankBadgeColor}`}>
                            {r.rank}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans font-bold text-white">
                          <div className="text-sm font-fantasy text-amber-200">{r.team_name}</div>
                          <div className="text-[11px] text-stone-400 font-sans">
                            {r.p1_name} {r.p2_name ? `& ${r.p2_name}` : ''}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-sans text-stone-300">
                          <span className="text-xs px-2 py-0.5 rounded bg-stone-900 border border-stone-700 font-mono">
                            {r.year}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="text-sm font-black text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded">
                            {r.total_marks}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center text-stone-300 font-mono">
                          {formatSeconds(r.time_taken)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-stone-300">
                          {r.questions_attempted} / {r.questions_allocated || 5}
                        </td>
                        <td className="py-3 px-4 text-center text-amber-400">
                          {r.hints_used} {r.hint_penalty > 0 ? `(−${r.hint_penalty})` : ''}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            r.status === 'completed'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                              : 'bg-stone-900 text-stone-400 border border-stone-700'
                          }`}>
                            {r.status === 'completed' ? 'Finished' : r.status || 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => toggleExpand(r.team_id)}
                            className="btn-secondary text-[11px] px-2.5 py-1 font-sans"
                          >
                            {expandedTeamId === r.team_id ? 'Hide' : 'Inspect'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded Question Breakdown */}
                      {expandedTeamId === r.team_id && (
                        <tr className="bg-dark-950/90">
                          <td colSpan="10" className="p-4 border-y border-dark-700">
                            {loadingDetail ? (
                              <div className="text-center py-4 text-gray-400">Loading breakdown...</div>
                            ) : teamDetail ? (
                              <div className="space-y-4">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                                  Question-by-Question Scoring Breakdown for {r.team_name}
                                </h4>

                                <div className="grid md:grid-cols-2 gap-4">
                                  {(teamDetail.question_details || []).map((qd, i) => (
                                    <div key={qd.question_id || i} className="p-3 bg-dark-900 rounded border border-dark-800 space-y-1.5 font-sans">
                                      <div className="flex justify-between items-center font-mono text-xs border-b border-dark-800 pb-1">
                                        <span className="font-bold text-white">Q{qd.question_number}: {qd.title}</span>
                                        <span className={`font-bold ${qd.is_correct ? 'text-emerald-400' : 'text-gray-400'}`}>
                                          {qd.marks_awarded} / {qd.max_marks} marks
                                        </span>
                                      </div>

                                      {qd.type === 'code_scramble' && (
                                        <div className="text-xs space-y-1 text-gray-400 font-mono">
                                          <div>Submission: {qd.is_submitted ? 'Submitted' : 'Not Submitted'}</div>
                                          <div>Arrangement Correct: {qd.is_correct ? 'YES (✓)' : 'NO (✗)'}</div>
                                          <div>Starting Points: {qd.starting_points || qd.max_marks} pts</div>
                                          <div>Swaps Count: {qd.swaps_count || 0} (−{qd.swaps_count || 0} pts)</div>
                                          <div>Clues Used: {qd.hints_used || 0} (−{(qd.hints_used || 0) * 5} pts)</div>
                                          <div className="text-amber-300 font-bold">Remaining Points: {qd.points_remaining !== undefined ? qd.points_remaining : qd.max_marks} pts</div>
                                        </div>
                                      )}

                                      {qd.type === 'hidden_tech' && (
                                        <div className="text-xs space-y-2 text-gray-400 font-mono pt-1">
                                          <div className="space-y-1">
                                            {(qd.sub_questions || []).map((sq) => (
                                              <div key={sq.sub_id} className="flex justify-between text-[11px] bg-dark-950/60 p-1.5 rounded">
                                                <span>Part {sq.number} ({sq.domain}): {sq.is_attempted ? (sq.is_correct ? '✓ Correct' : '✗ Wrong') : 'Not attempted'}</span>
                                                <span className="font-bold text-white">{sq.marks_awarded}/{sq.max_marks} pts</span>
                                              </div>
                                            ))}
                                          </div>
                                          <div className="flex justify-between pt-1 border-t border-dark-800">
                                            <span>Final Output: {qd.final_output_correct ? '✓ Correct' : (qd.final_output_given ? '✗ Wrong' : 'Not submitted')}</span>
                                            <span className="text-yellow-400 font-bold">Word: {qd.final_output_expected}</span>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
