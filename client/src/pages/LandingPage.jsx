import React from 'react';
import { Link } from 'react-router-dom';
import { IconSwords, IconShield, IconLock, IconHammer, IconCastle, IconStar } from '../components/FantasyIcons';

import clashLogo from '../assets/clash-of-codes-logo.png';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col relative overflow-hidden font-sans select-none justify-between">
      
      {/* =========================================================================
          ATMOSPHERIC FANTASY CODING ARENA BACKGROUND (Poster-Inspired Blue/Red Clash)
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Sky & deep stone battlefield gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b0e1a] via-[#150d12] to-[#080507]"></div>

        {/* Ambient colored faction auras (Blue on left, Red on right, Gold in center) */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[80vw] max-w-4xl h-[380px] bg-amber-500/15 blur-[140px] rounded-full"></div>
        <div className="absolute top-[25%] -left-20 w-[50vw] max-w-lg h-[550px] bg-blue-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute top-[25%] -right-20 w-[50vw] max-w-lg h-[550px] bg-red-600/20 blur-[150px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[280px] bg-gradient-to-t from-stone-950 via-[#120a06]/60 to-transparent"></div>

        {/* Subtle dot-matrix stone grit texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#3e3020_1px,transparent_1px)] [background-size:28px_28px] opacity-25"></div>

        {/* Illustrated Fortress Silhouette at Horizon */}
        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-44 opacity-20 overflow-hidden">
          <svg className="w-full h-full text-stone-900 fill-current" viewBox="0 0 1200 180" preserveAspectRatio="none">
            <path d="M0,180 L0,90 L80,90 L80,110 L140,50 L200,100 L280,40 L340,95 L440,30 L520,85 L600,20 L680,85 L760,30 L860,95 L920,40 L1000,100 L1060,50 L1120,110 L1120,90 L1200,90 L1200,180 Z" />
          </svg>
        </div>
      </div>

      {/* =========================================================================
          MAIN HOME PAGE CONTENT
          ========================================================================= */}
      <div className="flex-grow z-10 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-8 max-w-5xl mx-auto w-full">
        
        {/* 1. TOP INSTITUTIONAL CARVED BANNER (Exact Match from Poster) */}
        <header className="w-full max-w-2xl mb-4 sm:mb-6 text-center relative">
          <div className="parchment-banner px-4 sm:px-6 py-3 sm:py-3.5 relative border-[#8c5a2b] shadow-2xl">
            {/* Corner Rivets */}
            <span className="rivet absolute top-2 left-2"></span>
            <span className="rivet absolute top-2 right-2"></span>
            <span className="rivet absolute bottom-2 left-2"></span>
            <span className="rivet absolute bottom-2 right-2"></span>

            <h2 className="text-xs sm:text-sm md:text-base font-black tracking-wider uppercase text-amber-100 font-fantasy drop-shadow">
              SARANATHAN COLLEGE OF ENGINEERING
            </h2>
            <p className="text-[9px] sm:text-[10px] tracking-widest text-amber-400 font-bold uppercase mt-0.5">
              (AN AUTONOMOUS INSTITUTION)
            </p>
            <div className="my-1 flex items-center justify-center gap-2">
              <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></span>
              <span className="text-[9px] uppercase font-bold tracking-widest text-amber-300 font-fantasy">
                DEPARTMENT OF CSE &amp; IEI
              </span>
              <span className="h-px w-10 sm:w-16 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></span>
            </div>
          </div>
        </header>

        {/* 2. MAIN EXTRACTED CLASH OF CODES LOGO (From Provided Poster) */}
        <section className="text-center mb-5 sm:mb-7 relative flex flex-col items-center w-full">
          <div className="relative inline-flex flex-col items-center justify-center max-w-md sm:max-w-lg md:max-w-xl w-full px-2">
            {/* Ambient Gold Halo behind the extracted logo */}
            <div className="absolute inset-0 bg-amber-500/15 blur-2xl rounded-full scale-90 pointer-events-none"></div>

            {/* Extracted Original Poster Logo */}
            <img
              src={clashLogo}
              alt="Clash of Codes - Engineers' Day Celebration"
              className="relative z-10 w-full h-auto max-h-[290px] sm:max-h-[360px] md:max-h-[400px] object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.9)] hover:scale-[1.02] transition-transform duration-300"
            />

            {/* Subtitle */}
            <p className="text-xs sm:text-sm md:text-base text-amber-200/90 font-fantasy font-semibold mt-3 tracking-wider drop-shadow">
              Where Code Meets Combat &bull; Think. Code. Conquer.
            </p>
          </div>
        </section>

        {/* 3. SECTION DIRECTIVE: CHOOSE YOUR BATTLE */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3 px-5 py-1.5 rounded-full bg-[#1c120a]/80 border border-amber-800/60 shadow-md">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-clash text-xs sm:text-sm uppercase tracking-widest text-amber-300">
              CHOOSE YOUR BATTLE
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
        </div>

        {/* 4. TWO SIMPLE YEAR ENTRY OPTIONS (Concise, Clean, Visually Distinct) */}
        <section className="grid sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-8 w-full max-w-3xl mb-8">
          
          {/* ===================================================================
              3RD YEAR ENTRY CARD: CRACK THE CODE (Blue Theme • Code Invasion)
              =================================================================== */}
          <Link
            to="/login?year=3rd+Year"
            className="entry-card-blue p-6 rounded-2xl flex flex-col justify-between items-center text-center group cursor-pointer transition-all duration-200 active:scale-[0.98]"
            title="Enter 3rd Year Crack the Code (Code Invasion)"
          >
            {/* Year Tag Badge */}
            <div className="px-3.5 py-1 rounded-full bg-blue-950 border border-blue-400/80 text-blue-200 text-xs font-clash tracking-widest uppercase mb-3 shadow">
              3RD YEAR CSE
            </div>

            {/* Event Name */}
            <h3 className="text-2xl sm:text-3xl font-clash text-white tracking-wide uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mb-1 group-hover:text-blue-200 transition-colors">
              CRACK THE CODE
            </h3>

            {/* Subtitle */}
            <span className="text-xs sm:text-sm font-clash uppercase tracking-wider text-cyan-400 mb-5 flex items-center gap-1.5">
              <IconShield className="w-4 h-4 text-cyan-400" />
              <span>CODE INVASION</span>
            </span>

            {/* 3D Action Button */}
            <div className="w-full btn-battle-blue py-3 flex items-center justify-center gap-2 group-hover:brightness-110">
              <IconLock className="w-4 h-4 text-white" />
              <span>ENTER BATTLE &rarr;</span>
            </div>
          </Link>

          {/* ===================================================================
              2ND YEAR ENTRY CARD: CODE SCRAMBLE (Red Theme • Builder's Challenge)
              =================================================================== */}
          <Link
            to="/login?year=2nd+Year"
            className="entry-card-red p-6 rounded-2xl flex flex-col justify-between items-center text-center group cursor-pointer transition-all duration-200 active:scale-[0.98]"
            title="Enter 2nd Year Code Scramble (Builder's Challenge)"
          >
            {/* Year Tag Badge */}
            <div className="px-3.5 py-1 rounded-full bg-red-950 border border-red-400/80 text-red-200 text-xs font-clash tracking-widest uppercase mb-3 shadow">
              2ND YEAR CSE
            </div>

            {/* Event Name */}
            <h3 className="text-2xl sm:text-3xl font-clash text-white tracking-wide uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] mb-1 group-hover:text-red-200 transition-colors">
              CODE SCRAMBLE
            </h3>

            {/* Subtitle */}
            <span className="text-xs sm:text-sm font-clash uppercase tracking-wider text-amber-400 mb-5 flex items-center gap-1.5">
              <IconHammer className="w-4 h-4 text-amber-400" />
              <span>BUILDER'S CHALLENGE</span>
            </span>

            {/* 3D Action Button */}
            <div className="w-full btn-battle-red py-3 flex items-center justify-center gap-2 group-hover:brightness-110">
              <IconSwords className="w-4 h-4 text-white" />
              <span>ENTER BATTLE &rarr;</span>
            </div>
          </Link>
        </section>

        {/* 5. EVENT INFO & SECONDARY CLAN REGISTRATION */}
        <section className="w-full max-w-xl flex flex-col items-center gap-3 text-center">
          
          {/* Date & Venue Badge from Poster */}
          <div className="parchment-banner px-5 py-2 border-amber-700/60 shadow flex items-center justify-center gap-4 text-xs font-mono">
            <span className="text-amber-300 font-bold">DATE: 15 SEP 2026</span>
            <span className="text-stone-500">&bull;</span>
            <span className="text-stone-300">VENUE: CSE LAB</span>
          </div>

          {/* Clan Registration CTA for new teams */}
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="text-stone-400 font-sans">New team?</span>
            <Link
              to="/register"
              className="text-amber-400 hover:text-amber-300 font-clash uppercase tracking-wider underline flex items-center gap-1 transition-colors"
            >
              <IconCastle className="w-3.5 h-3.5 text-amber-400" />
              <span>Register Your Clan</span>
            </Link>
          </div>

          {/* Discreet Admin War Room Access */}
          <div className="mt-2">
            <Link
              to="/admin/login"
              className="text-[11px] text-stone-600 hover:text-amber-400 transition-colors uppercase tracking-widest font-mono flex items-center gap-1"
            >
              <IconShield className="w-3 h-3 text-stone-600" />
              <span>War Room Portal</span>
            </Link>
          </div>
        </section>

      </div>

      {/* FOOTER */}
      <footer className="z-10 py-3 border-t border-stone-800/60 text-center text-[11px] text-stone-500 font-sans">
        <p>Saranathan College of Engineering &bull; Department of CSE &amp; IEI &bull; Engineers' Day Celebration</p>
      </footer>
    </div>
  );
};

export default LandingPage;

