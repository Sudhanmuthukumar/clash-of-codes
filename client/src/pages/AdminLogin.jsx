import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import api from '../utils/api';
import { IconShield } from '../components/FantasyIcons';

const AdminLogin = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/admin/login', { user_id: userId, password });
      login(res.data.token, res.data.user);
      toast.success('Admin login successful');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid admin credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center p-4">
      <div className="card-fortress max-w-md w-full border-amber-900/50 bg-stone-900/95 relative shadow-2xl">
        <span className="rivet absolute top-3 left-3"></span>
        <span className="rivet absolute top-3 right-3"></span>

        <div className="text-center mb-6">
          <span className="text-xs font-clash uppercase tracking-widest text-amber-300 bg-amber-950/80 border border-amber-700/60 px-3.5 py-1 rounded-full inline-block mb-3 shadow">
            ⚔️ CLASH OF CODES
          </span>
          <h2 className="text-3xl font-black text-amber-100 font-clash tracking-wider uppercase">
            WAR ROOM
          </h2>
          <p className="text-xs text-stone-400 font-sans mt-1">High Command Battle Administration</p>
          <div className="h-1 w-16 bg-gradient-to-r from-amber-500 to-amber-700 mx-auto mt-4 rounded-full"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="label">Commander ID</label>
            <input 
              type="text" 
              className="input-field font-sans" 
              value={userId} 
              onChange={e => setUserId(e.target.value)}
              required
              placeholder="e.g. admin"
            />
          </div>
          <div>
            <label className="label">Battle Passcode</label>
            <input 
              type="password" 
              className="input-field font-sans" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" disabled={loading} className="btn-battle-gold w-full text-base uppercase tracking-wider mt-4 flex items-center justify-center gap-2">
            {loading ? (
              <span>AUTHENTICATING COMMAND...</span>
            ) : (
              <>
                <IconShield className="w-5 h-5 text-stone-950" />
                <span>ENTER WAR ROOM</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
