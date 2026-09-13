import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';
import { IconSwords, IconShield } from '../components/FantasyIcons';

const ParticipantLogin = () => {
  const [searchParams] = useSearchParams();
  const initialYear = searchParams.get('year') === '3rd Year' || searchParams.get('year') === '3' 
    ? '3rd Year' 
    : '2nd Year';

  const [year, setYear] = useState(initialYear);
  const [teamName, setTeamName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const qYear = searchParams.get('year');
    if (qYear === '3rd Year' || qYear === '3') {
      setYear('3rd Year');
    } else if (qYear === '2nd Year' || qYear === '2') {
      setYear('2nd Year');
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/participant/login', {
        year,
        team_name: teamName.trim(),
        password,
      });
      login(res.data.token, res.data.user);
      toast.success('Login successful!');
      navigate('/participant/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4 relative z-10">
      <div className="card-fortress max-w-md w-full shadow-2xl border-amber-900/40 bg-stone-900/95 relative">
        <span className="rivet absolute top-3 left-3"></span>
        <span className="rivet absolute top-3 right-3"></span>

        <div className="text-center mb-6">
          <span className="text-xs font-clash uppercase tracking-widest text-amber-300 bg-amber-950/80 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-3 shadow">
            ⚔️ CLASH OF CODES
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-amber-100 font-clash tracking-wider mb-1 uppercase">
            PARTICIPANT LOGIN
          </h2>
          <p className="text-stone-400 text-xs font-sans">
            Enter your clan credentials to march into battle
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">YEAR</label>
            <select
              className="input-field text-sm font-medium"
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              <option value="2nd Year">2nd Year (Code Scramble — Builder's Challenge)</option>
              <option value="3rd Year">3rd Year (Crack the Code — Code Invasion)</option>
            </select>
          </div>

          <div>
            <label className="label">TEAM NAME</label>
            <input 
              type="text" 
              className="input-field text-sm font-sans" 
              value={teamName} 
              onChange={e => setTeamName(e.target.value)}
              required
              placeholder="e.g. Code Warriors"
            />
          </div>

          <div>
            <label className="label">PASSWORD</label>
            <input 
              type="password" 
              className="input-field text-sm font-sans" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="btn-battle-gold w-full text-base uppercase tracking-wider mt-3 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>MARCHING INTO BATTLE...</span>
            ) : (
              <>
                <IconSwords className="w-5 h-5 text-stone-950" />
                <span>ENTER BATTLE</span>
              </>
            )}
          </button>
        </form>
        
        {/* Clan Registration CTA Section */}
        <div className="mt-8 pt-6 border-t border-stone-800 text-center">
          <p className="text-xs text-stone-400 mb-3 font-sans">
            New Clan Ready to Compete?
          </p>
          <Link
            to="/register"
            className="w-full py-2.5 px-4 bg-gradient-to-b from-[#25170d] to-[#140c06] hover:from-[#362113] hover:to-[#1e120a] text-amber-300 font-clash font-bold rounded-xl border border-amber-700/80 transition-all text-sm uppercase tracking-wider shadow flex items-center justify-center gap-2"
          >
            <IconShield className="w-4 h-4 text-amber-400" />
            <span>REGISTER YOUR CLAN</span>
          </Link>
        </div>

        <div className="mt-5 text-center">
          <Link to="/" className="text-xs text-stone-500 hover:text-amber-300/80 transition-colors font-sans">
            &larr; Back to Battle Gate
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ParticipantLogin;
