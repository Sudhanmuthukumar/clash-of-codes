import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { IconSwords, IconShield, IconHammer, IconCastle, IconTrophy, IconGear } from './FantasyIcons';

const Navbar = () => {
  const { user, logout, isAdmin, isParticipant } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  // Requirement: Completely remove navigation bar from the MAIN HOME PAGE
  if (location.pathname === '/') {
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const NavLinks = () => (
    <>
      {isAdmin && (
        <>
          <Link to="/admin/dashboard" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconCastle className="w-3.5 h-3.5 text-amber-400" />
            <span>War Room</span>
          </Link>
          <Link to="/admin/teams" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconShield className="w-3.5 h-3.5 text-amber-400" />
            <span>Clans</span>
          </Link>
          <Link to="/admin/code-scramble" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconHammer className="w-3.5 h-3.5 text-red-400" />
            <span>Builder's Challenge</span>
          </Link>
          <Link to="/admin/hidden-tech" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconShield className="w-3.5 h-3.5 text-blue-400" />
            <span>Code Invasion</span>
          </Link>
          <Link to="/admin/results" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
            <span>Hall of Victory</span>
          </Link>
          <Link to="/admin/settings" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconGear className="w-3.5 h-3.5 text-stone-400" />
            <span>Settings</span>
          </Link>
        </>
      )}
      {isParticipant && (
        <>
          <Link to="/participant/dashboard" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
            <IconCastle className="w-3.5 h-3.5 text-amber-400" />
            <span>Clan Camp</span>
          </Link>
          {(user?.year === '2nd Year' || user?.event?.toLowerCase().includes('scramble')) && (
            <Link to="/participant/code-scramble" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
              <IconHammer className="w-3.5 h-3.5 text-red-400" />
              <span>Builder's Challenge</span>
            </Link>
          )}
          {(user?.year === '3rd Year' || user?.event?.toLowerCase().includes('hidden') || user?.event?.toLowerCase().includes('invasion') || user?.event?.toLowerCase().includes('crack')) && (
            <Link to="/participant/hidden-tech" className="hover:text-amber-400 transition-colors py-2 lg:py-0 font-medium flex items-center gap-1.5">
              <IconShield className="w-3.5 h-3.5 text-blue-400" />
              <span>Code Invasion</span>
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <nav className="bg-stone-950/95 border-b border-amber-900/40 backdrop-blur-md sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2.5 group">
              <div className="p-1.5 rounded-full bg-gradient-to-b from-amber-500 to-amber-800 border border-amber-300 shadow-md group-hover:scale-105 transition-transform">
                <IconSwords className="w-5 h-5 text-stone-950" />
              </div>
              <span className="text-xl sm:text-2xl font-black font-clash tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                CLASH OF CODES
              </span>
            </Link>
            {user && (
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5 ${isAdmin ? 'bg-amber-950/60 border-amber-600 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'bg-emerald-950/60 border-emerald-600 text-emerald-300'}`}>
                {isAdmin ? (
                  <>
                    <IconShield className="w-3 h-3 text-amber-400" />
                    <span>WAR ROOM</span>
                  </>
                ) : (
                  <>
                    <IconSwords className="w-3 h-3 text-emerald-400" />
                    <span>WARRIOR</span>
                  </>
                )}
              </span>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="ml-10 flex items-baseline space-x-6 text-sm text-stone-300">
              <NavLinks />
              {user && (
                <button onClick={handleLogout} className="text-stone-400 hover:text-red-400 transition-colors ml-4 font-medium">
                  Leave Battle
                </button>
              )}
            </div>
          </div>

          <div className="-mr-2 flex lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-stone-400 hover:text-amber-300 hover:bg-stone-900 focus:outline-none"
            >
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-stone-900 border-b border-amber-900/40">
          <div className="px-3 pt-2 pb-3 space-y-1 text-sm text-stone-200 flex flex-col">
            <NavLinks />
            {user && (
              <button onClick={handleLogout} className="text-left text-stone-400 hover:text-red-400 transition-colors py-2 w-full font-medium">
                Leave Battle
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
