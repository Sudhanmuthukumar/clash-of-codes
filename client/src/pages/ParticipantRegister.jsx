import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import api from '../utils/api';
import { IconShield, IconSwords } from '../components/FantasyIcons';

const ParticipantRegister = () => {
  const [formData, setFormData] = useState({
    team_name: '',
    year: '2nd Year',
    member_1_name: '',
    member_1_section: 'A',
    has_member_2: false,
    member_2_name: '',
    member_2_section: 'A',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [sections, setSections] = useState(['A', 'B', 'C']);
  const [loading, setLoading] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState(null);
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
            member_2_section: res.data[0],
          }));
        }
      } catch (err) {
        // Fallback default A, B, C already set
      }
    };
    fetchSections();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleMember2 = () => {
    setFormData(prev => ({
      ...prev,
      has_member_2: !prev.has_member_2,
      member_2_name: !prev.has_member_2 ? '' : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend Validations
    if (!formData.team_name.trim()) {
      toast.error('Team Name is required.');
      return;
    }
    if (!formData.member_1_name.trim()) {
      toast.error('Member 1 Name is required.');
      return;
    }
    if (!formData.member_1_section.trim()) {
      toast.error('Member 1 Section is required.');
      return;
    }
    if (formData.has_member_2) {
      if (!formData.member_2_name.trim()) {
        toast.error('Member 2 Name is required when Member 2 is added.');
        return;
      }
      if (!formData.member_2_section.trim()) {
        toast.error('Member 2 Section is required when Member 2 is added.');
        return;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error('Please enter a valid email address.');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      toast.error('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        team_name: formData.team_name.trim(),
        year: formData.year,
        event_id: formData.event_id || (formData.year === '3rd Year' ? 2 : 1),
        member_1_name: formData.member_1_name.trim(),
        member_1_section: formData.member_1_section.trim(),
        member_2_name: formData.has_member_2 && formData.member_2_name.trim() ? formData.member_2_name.trim() : null,
        member_2_section: formData.has_member_2 && formData.member_2_section.trim() ? formData.member_2_section.trim() : null,
        email: formData.email.trim(),
        password: formData.password,
        confirm_password: formData.confirm_password,
      };

      const res = await api.post('/auth/participant/register', payload);
      setRegisteredTeam(res.data.team);
      toast.success('Team registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // SUCCESS CONFIRMATION SCREEN
  if (registeredTeam) {
    const isSecondYear = registeredTeam.year === '2nd Year';
    return (
      <div className="flex-grow flex items-center justify-center p-4 relative z-10">
        <div className="card-fortress max-w-md w-full shadow-2xl border-amber-800/60 text-center p-8 bg-stone-900">
          <div className="text-5xl mb-3">🏰</div>
          <h2 className="text-2xl font-black text-amber-200 font-fantasy tracking-wide mb-1 uppercase">
            CLAN ESTABLISHED!
          </h2>
          <p className="text-stone-300 text-xs mb-6 font-sans">
            Welcome to <strong className="text-amber-400">CLASH OF CODES</strong>. Your clan is fortified and ready for battle.
          </p>

          <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-5 mb-8 text-left space-y-3.5 font-mono text-sm">
            <div>
              <span className="text-stone-400 text-xs uppercase tracking-wider block mb-0.5 font-sans">Clan Name</span>
              <span className="text-amber-200 font-bold text-base font-fantasy">{registeredTeam.team_name}</span>
            </div>
            <div className="border-t border-stone-800 pt-2">
              <span className="text-stone-400 text-xs uppercase tracking-wider block mb-0.5 font-sans">Academic Year</span>
              <span className="text-amber-400 font-medium">{registeredTeam.year}</span>
            </div>
            <div className="border-t border-stone-800 pt-2">
              <span className="text-stone-400 text-xs uppercase tracking-wider block mb-0.5 font-sans">Assigned Battle</span>
              <span className="text-amber-300 font-bold tracking-wider block">
                {isSecondYear ? 'CODE SCRAMBLE' : 'CRACK THE CODE'}
              </span>
              <span className="text-stone-400 text-xs font-sans">
                {isSecondYear ? "Builder's Challenge" : 'Code Invasion'}
              </span>
            </div>
            <div className="border-t border-stone-800 pt-2 text-xs text-stone-400 font-sans">
              <span>Warrior 1: <strong className="text-stone-200">{registeredTeam.member_1_name}</strong> (Sec {registeredTeam.member_1_section})</span>
              {registeredTeam.member_2_name && (
                <span className="block mt-1">
                  Warrior 2: <strong className="text-stone-200">{registeredTeam.member_2_name}</strong> (Sec {registeredTeam.member_2_section})
                </span>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="btn-primary w-full py-3.5 text-base font-extrabold uppercase tracking-wider"
          >
            ENTER BATTLE &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center p-4 py-8 relative z-10">
      <div className="card-fortress max-w-lg w-full shadow-2xl border-amber-900/40 bg-stone-900/95 relative">
        <span className="rivet absolute top-3 left-3"></span>
        <span className="rivet absolute top-3 right-3"></span>

        <div className="text-center mb-6">
          <span className="text-xs font-clash uppercase tracking-widest text-amber-300 bg-amber-950/80 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-3 shadow">
            ⚔️ CLASH OF CODES
          </span>
          <h2 className="text-3xl font-black text-amber-100 font-clash tracking-wide uppercase">
            REGISTER YOUR CLAN
          </h2>
          <p className="text-stone-400 text-xs mt-1 font-sans">
            Gather your warriors and prepare for battle.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Team Name */}
          <div>
            <label className="label flex justify-between items-center">
              <span>TEAM NAME</span>
              <span className="text-[11px] text-amber-400 font-mono">Unique Clan Name</span>
            </label>
            <input
              type="text"
              name="team_name"
              className="input-field"
              value={formData.team_name}
              onChange={handleChange}
              required
              placeholder="e.g. Code Warriors"
            />
          </div>

          {/* Year & Round Selection */}
          <div>
            <label className="label flex justify-between items-center">
              <span>BATTLE TRACK & ROUND</span>
              <span className="text-[11px] text-stone-500">Determines battle arena</span>
            </label>
            <select
              name="round_selection"
              className="input-field font-medium text-sm"
              value={formData.event_id || (formData.year === '3rd Year' ? 2 : 1)}
              onChange={e => {
                const val = parseInt(e.target.value);
                const yr = val === 2 ? '3rd Year' : '2nd Year';
                setFormData(prev => ({ ...prev, event_id: val, year: yr }));
              }}
              required
            >
              <option value={1}>2nd Year &rarr; CODE SCRAMBLE: Round 1</option>
              <option value={3}>2nd Year &rarr; CODE SCRAMBLE: Round 2</option>
              <option value={2}>3rd Year &rarr; CRACK THE CODE (Code Invasion)</option>
            </select>
          </div>

          {/* WARRIOR 1 (Required) */}
          <div className="p-4 rounded-xl bg-stone-950/80 border border-stone-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
              <span className="w-5 h-5 rounded-full bg-amber-900/60 text-amber-300 font-mono text-xs flex items-center justify-center font-bold">
                1
              </span>
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-fantasy">
                WARRIOR 1 (Required)
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="label text-xs">Name</label>
                <input
                  type="text"
                  name="member_1_name"
                  className="input-field text-sm"
                  value={formData.member_1_name}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Arun Kumar"
                />
              </div>

              <div>
                <label className="label text-xs">Section</label>
                <select
                  name="member_1_section"
                  className="input-field text-sm font-mono"
                  value={formData.member_1_section}
                  onChange={handleChange}
                  required
                >
                  {sections.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* WARRIOR 2 (Optional Toggle) */}
          <div className="p-4 rounded-xl bg-stone-950/50 border border-stone-800/80 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-stone-800 text-stone-400 font-mono text-xs flex items-center justify-center font-bold">
                  2
                </span>
                <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider font-fantasy">
                  WARRIOR 2 (OPTIONAL)
                </h3>
              </div>

              <button
                type="button"
                onClick={toggleMember2}
                className={`text-xs px-3 py-1 rounded-lg border font-medium transition-all ${
                  formData.has_member_2
                    ? 'bg-red-950/60 border-red-800 text-red-300 hover:bg-red-900/70'
                    : 'bg-stone-900 border-amber-800/80 text-amber-300 hover:bg-stone-800'
                }`}
              >
                {formData.has_member_2 ? '✕ Remove Warrior 2' : '+ Add Warrior 2'}
              </button>
            </div>

            {formData.has_member_2 && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-800">
                <div className="col-span-2">
                  <label className="label text-xs">Name</label>
                  <input
                    type="text"
                    name="member_2_name"
                    className="input-field text-sm"
                    value={formData.member_2_name}
                    onChange={handleChange}
                    required={formData.has_member_2}
                    placeholder="e.g. Priya S"
                  />
                </div>

                <div>
                  <label className="label text-xs">Section</label>
                  <select
                    name="member_2_section"
                    className="input-field text-sm font-mono"
                    value={formData.member_2_section}
                    onChange={handleChange}
                    required={formData.has_member_2}
                  >
                    {sections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <label className="label flex justify-between items-center">
              <span>EMAIL</span>
              <span className="text-[11px] text-stone-500">Contact of either warrior</span>
            </label>
            <input
              type="email"
              name="email"
              className="input-field"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="e.g. clan.contact@college.edu"
            />
          </div>

          {/* PASSWORD & CONFIRM PASSWORD */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">PASSWORD</label>
              <input
                type="password"
                name="password"
                className="input-field text-sm"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Min. 6 characters"
              />
            </div>
            <div>
              <label className="label text-xs">CONFIRM PASSWORD</label>
              <input
                type="password"
                name="confirm_password"
                className="input-field text-sm"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <p className="text-[11px] text-stone-500 font-sans">
            Security: Minimum 6 characters. Passwords are securely hashed with bcrypt.
          </p>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-battle-gold w-full text-base uppercase tracking-wider mt-2 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>FORTIFYING CLAN...</span>
            ) : (
              <>
                <IconShield className="w-5 h-5 text-stone-950" />
                <span>CREATE CLAN</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-stone-800 pt-4 space-y-2">
          <p className="text-xs text-stone-400">
            Already have a clan?{' '}
            <Link to="/login" className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors">
              Enter Battle
            </Link>
          </p>
          <div>
            <Link to="/" className="text-xs text-stone-500 hover:text-amber-300/80 transition-colors font-sans">
              &larr; Back to Battle Gate
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantRegister;
