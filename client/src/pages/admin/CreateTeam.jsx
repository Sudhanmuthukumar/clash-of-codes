import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';

const CreateTeam = () => {
  const [formData, setFormData] = useState({
    year: '2nd Year',
    team_name: '',
    member_1_name: '',
    member_1_section: 'A',
    email: '',
    has_member_2: false,
    member_2_name: '',
    member_2_section: 'A'
  });
  const [sections, setSections] = useState(['A', 'B', 'C']);
  const [loading, setLoading] = useState(false);
  const [createdTeam, setCreatedTeam] = useState(null);
  
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await api.get('/auth/sections');
        if (Array.isArray(res.data) && res.data.length > 0) {
          setSections(res.data);
          setFormData(prev => ({
            ...prev,
            member_1_section: res.data[0],
            member_2_section: res.data[0]
          }));
        }
      } catch (err) {}
    };
    fetchSections();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.team_name.trim() || !formData.member_1_name.trim()) {
      toast.error('Team Name and Member 1 Name are required.');
      return;
    }

    if (formData.has_member_2 && !formData.member_2_name.trim()) {
      toast.error('Member 2 Name is required when Member 2 is added.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        year: formData.year,
        event_id: formData.event_id || 1,
        team_name: formData.team_name.trim(),
        member_1_name: formData.member_1_name.trim(),
        member_1_section: formData.member_1_section.trim(),
        member_2_name: formData.has_member_2 && formData.member_2_name.trim() ? formData.member_2_name.trim() : null,
        member_2_section: formData.has_member_2 && formData.member_2_section.trim() ? formData.member_2_section.trim() : null,
        email: formData.email.trim()
      };

      const res = await api.post('/admin/teams', payload);
      setCreatedTeam(res.data);
      toast.success('Team created successfully');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const handleDone = () => {
    navigate('/admin/teams');
  };

  if (createdTeam) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 w-full">
        <div className="card-fortress text-center border-emerald-900/50 shadow-2xl bg-stone-900">
          <div className="w-16 h-16 bg-emerald-900/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
          <h2 className="text-2xl font-black text-amber-200 font-fantasy mb-2">Clan Enlisted Successfully!</h2>
          <p className="text-stone-400 mb-8 text-sm font-sans">Please share these generated credentials securely with the clan warriors.</p>
          
          <div className="bg-stone-950 border border-stone-800 rounded-lg p-6 mb-8 max-w-sm mx-auto text-left font-mono">
            <div className="mb-4">
              <span className="text-stone-400 text-xs uppercase tracking-wider block mb-1 font-sans">Clan Name</span>
              <span className="text-amber-100 font-bold text-lg font-fantasy">{createdTeam.team_name}</span>
            </div>
            <div>
              <span className="text-stone-400 text-xs uppercase tracking-wider block mb-1 font-sans">Generated Battle Passcode</span>
              <span className="text-amber-400 font-mono text-2xl tracking-widest font-bold">{createdTeam.password}</span>
            </div>
          </div>
          
          <button onClick={handleDone} className="btn-primary px-8 uppercase font-bold tracking-wide">
            Return to Clan Roster
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 w-full">
      <div className="mb-6 flex items-center gap-4">
        <Link to="/admin/teams" className="text-stone-400 hover:text-amber-300 transition-colors text-sm font-sans">
          &larr; Back to Clan Roster
        </Link>
        <h1 className="text-3xl font-black text-amber-100 font-fantasy">Enlist New Clan (Admin)</h1>
      </div>

      <div className="card-fortress bg-stone-900 shadow-2xl border-stone-800">
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section 1: Team Details */}
          <div>
            <h3 className="text-lg font-bold font-fantasy text-amber-200 mb-4 border-b border-stone-800 pb-2">Clan Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Battle Track & Round</label>
                <select 
                  name="event_id" 
                  value={formData.event_id || 1} 
                  onChange={e => {
                    const val = parseInt(e.target.value);
                    const selectedYear = val === 2 ? '3rd Year' : '2nd Year';
                    setFormData(prev => ({ ...prev, event_id: val, year: selectedYear }));
                  }} 
                  className="input-field text-sm" 
                  required
                >
                  <option value={1}>2nd Year &mdash; Code Scramble Round 1</option>
                  <option value={3}>2nd Year &mdash; Code Scramble Round 2</option>
                  <option value={2}>3rd Year &mdash; Crack the Code (Hidden Tech)</option>
                </select>
              </div>
              <div>
                <label className="label text-xs">Clan Name</label>
                <input type="text" name="team_name" value={formData.team_name} onChange={handleChange} className="input-field text-sm" required placeholder="e.g. CodeNinjas" />
              </div>
              <div className="md:col-span-2">
                <label className="label text-xs">Contact Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field text-sm" required placeholder="primary.contact@college.edu" />
              </div>
            </div>
          </div>

          {/* Section 2: Member 1 */}
          <div>
            <h3 className="text-lg font-bold font-fantasy text-amber-200 mb-4 border-b border-stone-800 pb-2 flex items-center gap-2">
              <span className="bg-amber-900/60 text-amber-300 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono">1</span>
              Warrior 1 (Required)
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="label text-xs">Full Name</label>
                <input type="text" name="member_1_name" value={formData.member_1_name} onChange={handleChange} className="input-field text-sm" required placeholder="e.g. Arun Kumar" />
              </div>
              <div>
                <label className="label text-xs">Section</label>
                <select name="member_1_section" value={formData.member_1_section} onChange={handleChange} className="input-field text-sm font-mono" required>
                  {sections.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Member 2 (Optional) */}
          <div className="bg-dark-950/50 p-4 rounded-xl border border-dark-700 space-y-4">
            <div className="flex justify-between items-center border-b border-dark-800 pb-2">
              <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                <span className="bg-dark-800 text-gray-500 w-5 h-5 rounded-full flex items-center justify-center text-xs">2</span>
                Member 2 (Optional)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-cyan-400">
                <input
                  type="checkbox"
                  name="has_member_2"
                  checked={formData.has_member_2}
                  onChange={handleChange}
                  className="rounded bg-dark-800 border-dark-600 text-cyan-500"
                />
                <span>Include Member 2</span>
              </label>
            </div>

            {formData.has_member_2 && (
              <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="label text-xs">Full Name</label>
                  <input type="text" name="member_2_name" value={formData.member_2_name} onChange={handleChange} className="input-field text-sm" required={formData.has_member_2} placeholder="e.g. Priya S" />
                </div>
                <div>
                  <label className="label text-xs">Section</label>
                  <select name="member_2_section" value={formData.member_2_section} onChange={handleChange} className="input-field text-sm font-mono" required={formData.has_member_2}>
                    {sections.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <Link to="/admin/teams" className="btn-secondary text-sm">Cancel</Link>
            <button type="submit" disabled={loading} className="btn-primary px-8 text-sm font-bold">
              {loading ? 'Registering...' : 'Register Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTeam;
