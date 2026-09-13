import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import ConfirmDialog from '../../components/ConfirmDialog';
import api from '../../utils/api';

const TeamList = () => {
  const [teams, setTeams] = useState([]);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [events, setEvents] = useState([]);
  const [sections, setSections] = useState(['A', 'B', 'C']);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('All');
  const [eventFilter, setEventFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const [deleteId, setDeleteId] = useState(null);
  const [resetPwData, setResetPwData] = useState(null);
  const [viewTeamData, setViewTeamData] = useState(null);
  const [editTeamData, setEditTeamData] = useState(null);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  const navigate = useNavigate();
  const toast = useToast();

  const fetchTeamsAndEvents = async () => {
    try {
      const [teamsRes, eventsRes, secRes] = await Promise.all([
        api.get('/admin/teams'),
        api.get('/admin/events'),
        api.get('/admin/teams/sections')
      ]);
      setTeams(teamsRes.data);
      setEvents(eventsRes.data);
      if (Array.isArray(secRes.data)) {
        setSections(secRes.data.map(s => s.name || s));
      }
    } catch (err) {
      toast.error('Failed to fetch teams data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamsAndEvents();
  }, []);

  useEffect(() => {
    let list = [...teams];
    if (yearFilter !== 'All') {
      list = list.filter(t => t.year === yearFilter);
    }
    if (eventFilter !== 'All') {
      list = list.filter(t => String(t.event_id) === String(eventFilter));
    }
    if (statusFilter !== 'All') {
      list = list.filter(t => t.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t =>
        (t.team_name && t.team_name.toLowerCase().includes(q)) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.member_1_name && t.member_1_name.toLowerCase().includes(q)) ||
        (t.member_2_name && t.member_2_name.toLowerCase().includes(q))
      );
    }
    setFilteredTeams(list);
  }, [teams, search, yearFilter, eventFilter, statusFilter]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/teams/${deleteId}`);
      toast.success('Team deleted successfully');
      fetchTeamsAndEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete team');
    } finally {
      setDeleteId(null);
    }
  };

  const handleResetPassword = async (id, teamName) => {
    if (!window.confirm(`Are you sure you want to regenerate a password for ${teamName}?`)) return;
    try {
      const res = await api.post(`/admin/teams/${id}/reset-password`);
      setResetPwData(res.data);
      toast.success('New password generated');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reset password');
    }
  };

  const handleToggleStatus = async (team) => {
    const newStatus = team.status === 'disabled' ? 'active' : 'disabled';
    try {
      await api.put(`/admin/teams/${team.id}/status`, { status: newStatus });
      toast.success(`Team status updated to ${newStatus}`);
      fetchTeamsAndEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update team status');
    }
  };

  const handleViewTeam = async (teamId) => {
    try {
      const res = await api.get(`/admin/teams/${teamId}`);
      setViewTeamData(res.data);
    } catch (err) {
      toast.error('Failed to load team details');
    }
  };

  const handleOpenEdit = (team) => {
    setEditTeamData({
      id: team.id,
      team_name: team.team_name,
      member_1_name: team.member_1_name || '',
      member_1_section: team.member_1_section || 'A',
      member_2_name: team.member_2_name || '',
      member_2_section: team.member_2_section || 'A',
      has_member_2: !!team.member_2_name,
      email: team.email || '',
      event_id: team.event_id || 1
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        team_name: editTeamData.team_name.trim(),
        event_id: editTeamData.event_id,
        member_1_name: editTeamData.member_1_name.trim(),
        member_1_section: editTeamData.member_1_section.trim(),
        member_2_name: editTeamData.has_member_2 && editTeamData.member_2_name.trim() ? editTeamData.member_2_name.trim() : null,
        member_2_section: editTeamData.has_member_2 && editTeamData.member_2_section.trim() ? editTeamData.member_2_section.trim() : null,
        email: editTeamData.email.trim()
      };

      await api.put(`/admin/teams/${editTeamData.id}`, payload);
      toast.success('Team details updated successfully');
      setEditTeamData(null);
      fetchTeamsAndEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update team');
    }
  };

  const handleAddSection = async (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    try {
      await api.post('/admin/teams/sections', { name: newSectionName.trim() });
      toast.success(`Section ${newSectionName.trim().toUpperCase()} added`);
      setNewSectionName('');
      fetchTeamsAndEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add section');
    }
  };

  const handleRemoveSection = async (sec) => {
    if (!window.confirm(`Remove section ${sec}?`)) return;
    try {
      await api.delete(`/admin/teams/sections/${sec}`);
      toast.success(`Section ${sec} removed`);
      fetchTeamsAndEvents();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to remove section');
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-400">Loading teams...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-800 pb-4">
        <div>
          <span className="text-xs font-fantasy uppercase tracking-widest text-amber-400 bg-amber-950/70 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-1">
            🛡️ HIGH COMMAND CLAN DIRECTORY
          </span>
          <h1 className="text-3xl font-black text-amber-100 font-fantasy tracking-tight">Registered Clans</h1>
          <p className="text-stone-400 text-xs mt-1 font-sans">
            Oversee enlisted clans, warrior rosters, and assigned battle tracks.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => setShowSectionManager(!showSectionManager)}
            className="btn-secondary text-xs font-bold px-3.5 py-2 font-sans"
          >
            ⚙️ Manage Sections ({sections.length})
          </button>
          <Link to="/admin/teams/create" className="btn-primary text-xs font-bold px-4 py-2 uppercase tracking-wide">
            + Enlist Clan (Admin)
          </Link>
        </div>
      </div>

      {/* Optional Section Manager Drawer */}
      {showSectionManager && (
        <div className="card border-cyan-800/50 bg-dark-900/90 p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-dark-700 pb-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Configurable Academic Sections
            </h3>
            <span className="text-xs text-gray-400">Used across registration and team forms</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {sections.map(sec => (
              <span key={sec} className="inline-flex items-center gap-1.5 px-3 py-1 bg-dark-800 text-cyan-300 border border-dark-600 rounded-lg text-xs font-mono font-bold">
                Section {sec}
                <button
                  onClick={() => handleRemoveSection(sec)}
                  className="text-gray-400 hover:text-red-400 text-xs ml-1"
                  title="Remove section"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddSection} className="flex gap-2 max-w-xs pt-1">
            <input
              type="text"
              maxLength="5"
              placeholder="New section (e.g. D)"
              className="input-field text-xs uppercase"
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
            />
            <button type="submit" className="btn-secondary text-xs px-3 font-bold whitespace-nowrap">
              + Add
            </button>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <div className="flex-grow min-w-[240px]">
          <input
            type="text"
            placeholder="Search team, member, email..."
            className="input-field text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <select
          className="input-field max-w-[160px] text-xs font-medium"
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value)}
        >
          <option value="All">All Years</option>
          <option value="2nd Year">2nd Year</option>
          <option value="3rd Year">3rd Year</option>
        </select>

        <select
          className="input-field max-w-[180px] text-xs font-medium"
          value={eventFilter}
          onChange={e => setEventFilter(e.target.value)}
        >
          <option value="All">All Events</option>
          {events.map(ev => (
            <option key={ev.id} value={ev.id}>{ev.name}</option>
          ))}
        </select>

        <select
          className="input-field max-w-[150px] text-xs font-medium"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="All">All Statuses</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
          <option value="completed">Completed</option>
          <option value="time_expired">Time Expired</option>
        </select>

        <div className="text-gray-400 text-xs font-mono ml-auto">
          Showing {filteredTeams.length} of {teams.length} teams
        </div>
      </div>

      {/* Teams Table */}
      <div className="card p-0 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-dark-950 text-gray-400 text-xs font-mono uppercase tracking-wider border-b border-dark-800">
              <tr>
                <th className="py-3 px-3">Year</th>
                <th className="py-3 px-4">Team Name</th>
                <th className="py-3 px-3">Event</th>
                <th className="py-3 px-4">Member 1 Name</th>
                <th className="py-3 px-3 text-center">Sec</th>
                <th className="py-3 px-4">Member 2 Name</th>
                <th className="py-3 px-3 text-center">Sec</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-3">Registered</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800 font-mono text-xs">
              {filteredTeams.map(t => {
                const m1Name = t.member_1_name || t.participant_1_name;
                const m1Sec = t.member_1_section || t.participant_1_batch;
                const m2Name = t.member_2_name || t.participant_2_name;
                const m2Sec = t.member_2_section || t.participant_2_batch;
                const regDate = t.created_at ? new Date(t.created_at).toLocaleDateString() : '—';

                return (
                  <tr key={t.id} className="hover:bg-dark-800/40 transition-colors">
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        t.year === '2nd Year' ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/60' : 'bg-purple-950/60 text-purple-300 border border-purple-800/60'
                      }`}>
                        {t.year}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-sans font-bold text-white text-sm">
                      {t.team_name}
                    </td>
                    <td className="py-3 px-3 font-sans text-cyan-400 font-medium">
                      {t.event_name || 'Assigned'}
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-200">{m1Name}</td>
                    <td className="py-3 px-3 text-center font-bold text-cyan-300">{m1Sec}</td>
                    <td className="py-3 px-4 font-sans text-gray-200">
                      {m2Name ? m2Name : <span className="text-gray-600 font-bold">—</span>}
                    </td>
                    <td className="py-3 px-3 text-center text-purple-300">
                      {m2Sec ? m2Sec : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-sans text-xs">{t.email}</td>
                    <td className="py-3 px-3 text-gray-500 font-sans text-[11px]">{regDate}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        t.status === 'active'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : t.status === 'disabled'
                          ? 'bg-gray-800 text-gray-500 border border-gray-700'
                          : 'bg-blue-900/40 text-blue-400 border border-blue-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-1 font-sans">
                      <button
                        onClick={() => handleViewTeam(t.id)}
                        className="text-xs px-2 py-1 bg-dark-800 hover:bg-dark-700 text-gray-200 rounded border border-dark-700"
                        title="View Team Allocations"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="text-xs px-2 py-1 bg-dark-800 hover:bg-dark-700 text-cyan-400 rounded border border-dark-700"
                        title="Edit Team"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleResetPassword(t.id, t.team_name)}
                        className="text-xs px-2 py-1 bg-dark-800 hover:bg-dark-700 text-yellow-400 rounded border border-dark-700"
                        title="Reset Team Password"
                      >
                        Reset PW
                      </button>
                      <button
                        onClick={() => handleToggleStatus(t)}
                        className={`text-xs px-2 py-1 rounded border ${
                          t.status === 'disabled'
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800'
                            : 'bg-dark-800 text-gray-400 border-dark-700'
                        }`}
                        title={t.status === 'disabled' ? 'Enable Team' : 'Disable Team'}
                      >
                        {t.status === 'disabled' ? 'Enable' : 'Disable'}
                      </button>
                      <button
                        onClick={() => setDeleteId(t.id)}
                        className="text-xs px-2 py-1 bg-red-950/40 hover:bg-red-900 text-red-300 rounded border border-red-900/50"
                        title="Delete Team"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredTeams.length === 0 && (
                <tr>
                  <td colSpan="11" className="p-8 text-center text-gray-500 font-mono">
                    No teams found matching the specified filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Team Dialog */}
      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Team?"
        message="Are you sure you want to delete this team? All their allocations and progress will be permanently erased."
        confirmText="Delete Team"
      />

      {/* Reset Password Modal */}
      {resetPwData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card max-w-md w-full border-yellow-800/60 bg-dark-900 shadow-2xl p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-2">New Team Password Generated</h3>
            <p className="text-gray-400 text-xs mb-6">
              Stored securely as a bcrypt hash. Securely provide this password to the team participants.
            </p>
            <div className="bg-dark-950 border border-dark-700 rounded-lg p-4 font-mono text-2xl font-bold text-yellow-400 tracking-widest mb-6 select-all">
              {resetPwData.new_password}
            </div>
            <button onClick={() => setResetPwData(null)} className="btn-primary w-full py-2.5 text-sm font-bold">
              Done
            </button>
          </div>
        </div>
      )}

      {/* View Team Modal */}
      {viewTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card max-w-xl w-full border-cyan-800/60 bg-dark-900 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3">
              <h3 className="text-lg font-bold text-white">Team Details & Question Allocations</h3>
              <button onClick={() => setViewTeamData(null)} className="text-gray-400 hover:text-white font-mono text-lg">✕</button>
            </div>
            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Team Name:</span>
                <span className="text-white font-bold">{viewTeamData.team_name}</span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Year & Event:</span>
                <span className="text-cyan-400">{viewTeamData.year} &bull; {viewTeamData.event_name}</span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Member 1:</span>
                <span className="text-white">
                  {viewTeamData.member_1_name || viewTeamData.participant_1_name} (Section: {viewTeamData.member_1_section || viewTeamData.participant_1_batch})
                </span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Member 2:</span>
                <span className="text-white">
                  {viewTeamData.member_2_name || viewTeamData.participant_2_name ? (
                    `${viewTeamData.member_2_name || viewTeamData.participant_2_name} (Section: ${viewTeamData.member_2_section || viewTeamData.participant_2_batch})`
                  ) : (
                    '— (Single-member team)'
                  )}
                </span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Contact Email:</span>
                <span className="text-white">{viewTeamData.email}</span>
              </div>
              <div className="flex justify-between border-b border-dark-800 pb-1">
                <span className="text-gray-400">Status:</span>
                <span className="text-emerald-400 font-bold uppercase">{viewTeamData.status}</span>
              </div>
              <div className="pt-2">
                <span className="text-gray-400 block mb-1 font-bold">Allocated Question IDs (Persistent):</span>
                <div className="flex flex-wrap gap-1.5">
                  {viewTeamData.allocated_questions && viewTeamData.allocated_questions.length > 0 ? (
                    viewTeamData.allocated_questions.map(qid => (
                      <span key={qid} className="px-2.5 py-1 rounded bg-dark-950 border border-dark-700 text-cyan-300 font-mono">
                        Question #{qid}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-500 italic">Questions will be randomly assigned on first login/dashboard access.</span>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 pt-3 border-t border-dark-800 flex justify-between items-center">
              <button
                onClick={() => navigate(`/admin/results?event_id=${viewTeamData.event_id}`)}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-mono"
              >
                &rarr; View in Leaderboard
              </button>
              <button onClick={() => setViewTeamData(null)} className="btn-secondary text-xs px-4 py-2">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Team Modal */}
      {editTeamData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="card max-w-lg w-full border-cyan-800/60 bg-dark-900 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Team Details</h3>
              <button onClick={() => setEditTeamData(null)} className="text-gray-400 hover:text-white font-mono text-lg">✕</button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="label text-xs">Team Name</label>
                <input
                  type="text"
                  className="input-field text-sm"
                  value={editTeamData.team_name}
                  onChange={e => setEditTeamData({ ...editTeamData, team_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Assigned Event / Round</label>
                <select
                  className="input-field text-sm"
                  value={editTeamData.event_id || 1}
                  onChange={e => setEditTeamData({ ...editTeamData, event_id: parseInt(e.target.value) })}
                >
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.name} ({ev.year})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label text-xs">Contact Email</label>
                <input
                  type="email"
                  className="input-field text-sm"
                  value={editTeamData.email}
                  onChange={e => setEditTeamData({ ...editTeamData, email: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="label text-xs">Member 1 Name</label>
                  <input
                    type="text"
                    className="input-field text-sm"
                    value={editTeamData.member_1_name}
                    onChange={e => setEditTeamData({ ...editTeamData, member_1_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Section</label>
                  <select
                    className="input-field text-sm font-mono"
                    value={editTeamData.member_1_section}
                    onChange={e => setEditTeamData({ ...editTeamData, member_1_section: e.target.value })}
                  >
                    {sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-dark-950 rounded-lg border border-dark-800 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                  <input
                    type="checkbox"
                    checked={editTeamData.has_member_2}
                    onChange={e => setEditTeamData({ ...editTeamData, has_member_2: e.target.checked })}
                    className="rounded bg-dark-800 border-dark-600 text-cyan-500"
                  />
                  <span>Has Member 2</span>
                </label>

                {editTeamData.has_member_2 && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="label text-xs">Member 2 Name</label>
                      <input
                        type="text"
                        className="input-field text-sm"
                        value={editTeamData.member_2_name}
                        onChange={e => setEditTeamData({ ...editTeamData, member_2_name: e.target.value })}
                        required={editTeamData.has_member_2}
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Section</label>
                      <select
                        className="input-field text-sm font-mono"
                        value={editTeamData.member_2_section}
                        onChange={e => setEditTeamData({ ...editTeamData, member_2_section: e.target.value })}
                      >
                        {sections.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-dark-800">
                <button
                  type="button"
                  onClick={() => setEditTeamData(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs px-5 py-2 font-bold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamList;
