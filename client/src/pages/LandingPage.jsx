import React from 'react';
import { Link } from 'react-router-dom';
import { 
  IconTeam, 
  IconLightbulb, 
  IconCode, 
  IconPuzzle, 
  IconTimer, 
  IconLock, 
  IconTarget, 
  IconStar, 
  IconGear, 
  IconTrophy, 
  IconSwap, 
  IconSwords, 
  IconShield,
  IconCastle
} from '../components/FantasyIcons';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col relative overflow-hidden font-sans select-none">
      
      {/* =========================================================================
          LAYERED FANTASY BATTLE ENVIRONMENT (Poster-Inspired Atmospheric Background)
          ========================================================================= */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Sky gradient with sunset / dusk glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#181a2e] via-[#1a1215] to-[#0c0a0d]"></div>

        {/* Ambient colored faction auras */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[70vw] h-[350px] bg-amber-500/15 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] -left-20 w-[45vw] h-[500px] bg-blue-600/15 blur-[160px] rounded-full"></div>
        <div className="absolute top-[20%] -right-20 w-[45vw] h-[500px] bg-red-600/15 blur-[160px] rounded-full"></div>
        <div className="absolute bottom-0 left-0 right-0 h-[250px] bg-gradient-to-t from-stone-950 via-emerald-950/20 to-transparent"></div>

        {/* Illustrated Mountain & Fortress Silhouettes (subtle SVG backdrop) */}
        <div className="absolute bottom-0 left-0 right-0 h-48 opacity-25 overflow-hidden">
          <svg className="w-full h-full text-stone-900 fill-current" viewBox="0 0 1200 200" preserveAspectRatio="none">
            <path d="M0,200 L0,110 L120,60 L240,130 L380,45 L500,105 L620,30 L740,115 L890,55 L1020,120 L1140,70 L1200,95 L1200,200 Z" />
          </svg>
        </div>

        {/* Subtle dot-matrix stone texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#3a3229_1px,transparent_1px)] [background-size:32px_32px] opacity-20"></div>
      </div>

      {/* =========================================================================
          MAIN CONTENT CONTAINER
          ========================================================================= */}
      <div className="flex-grow z-10 flex flex-col items-center px-4 sm:px-6 py-6 max-w-6xl mx-auto w-full">
        
        {/* 1. TOP INSTITUTIONAL CARVED BANNER (Exact Match from Poster) */}
        <header className="w-full max-w-4xl mb-6 relative">
          <div className="parchment-banner px-6 py-4 text-center relative border-[#8c5a2b] shadow-2xl">
            {/* 4 Corner Metal Rivets */}
            <span className="rivet absolute top-2 left-2"></span>
            <span className="rivet absolute top-2 right-2"></span>
            <span className="rivet absolute bottom-2 left-2"></span>
            <span className="rivet absolute bottom-2 right-2"></span>

            <h2 className="text-sm sm:text-base md:text-lg font-black tracking-wider uppercase text-amber-100 font-fantasy drop-shadow-md">
              SARANATHAN COLLEGE OF ENGINEERING
            </h2>
            <p className="text-[10px] sm:text-xs tracking-widest text-amber-400/90 font-bold uppercase mt-0.5">
              (AN AUTONOMOUS INSTITUTION)
            </p>
            <div className="my-1.5 flex items-center justify-center gap-2">
              <span className="h-px w-16 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 font-fantasy">
                CONDUCTED BY
              </span>
              <span className="h-px w-16 bg-gradient-to-r from-transparent via-amber-600 to-transparent"></span>
            </div>
            <p className="text-[10px] sm:text-xs text-stone-300 font-semibold uppercase tracking-wide max-w-2xl mx-auto leading-relaxed">
              DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING &amp; THE INSTITUTION OF ENGINEERS (INDIA)
            </p>
          </div>
        </header>

        {/* 2. POSTER HERO TITLE (Clash of Clans Dimensional Emblem) */}
        <section className="text-center mb-8 relative flex flex-col items-center">
          
          {/* Emblem Shield Framing */}
          <div className="relative inline-flex flex-col items-center justify-center p-3 sm:p-5">
            {/* Golden Battle Crest on Apex */}
            <div className="flex items-center justify-center mb-1">
              <div className="p-2 rounded-full bg-gradient-to-b from-amber-400 via-amber-600 to-amber-900 border-2 border-amber-300 shadow-[0_4px_15px_rgba(245,158,11,0.5)]">
                <IconSwords className="w-8 h-8 text-stone-950" />
              </div>
            </div>

            {/* Dimensional Main Title: CLASH OF CODES */}
            <div className="relative z-10 flex flex-col items-center">
              <h1 className="font-clash text-6xl sm:text-7xl md:text-8xl tracking-wider text-3d-gold uppercase leading-none">
                CLASH
              </h1>
              
              <div className="flex items-center gap-2 -my-2 sm:-my-3 z-20">
                <span className="h-0.5 w-8 bg-amber-500 shadow"></span>
                <span className="px-3 py-0.5 rounded-full bg-[#2a170c] border-2 border-amber-600 text-amber-200 text-xs sm:text-sm font-clash tracking-widest shadow-lg">
                  OF
                </span>
                <span className="h-0.5 w-8 bg-amber-500 shadow"></span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <h1 className="font-clash text-6xl sm:text-7xl md:text-8xl tracking-wider text-3d-stone uppercase leading-none">
                  CODES
                </h1>
                <span className="font-mono text-3xl sm:text-4xl text-amber-400 font-black bg-stone-900/90 px-2 py-1 rounded-lg border-2 border-amber-600/80 shadow-md">
                  &lt;/&gt;
                </span>
              </div>
            </div>

            {/* Arched Wooden Ribbon: ENGINEER'S DAY CELEBRATION */}
            <div className="mt-3 inline-flex items-center gap-2 px-6 py-1.5 rounded-lg bg-gradient-to-r from-[#3b2010] via-[#522e17] to-[#3b2010] border-2 border-amber-500 shadow-[0_6px_16px_rgba(0,0,0,0.8)]">
              <IconStar className="w-4 h-4 text-amber-400" />
              <span className="text-amber-200 text-xs sm:text-sm md:text-base font-clash uppercase tracking-widest">
                ENGINEER'S DAY CELEBRATION
              </span>
              <IconStar className="w-4 h-4 text-amber-400" />
            </div>

            <p className="text-sm sm:text-base text-amber-100/90 font-fantasy font-semibold mt-2.5 tracking-wide drop-shadow">
              Where Code Meets Combat &bull; Think. Solve. Conquer.
            </p>
          </div>
        </section>

        {/* 3. DUAL BATTLE FACTIONS (Poster Layout: Blue Left, Red Right) */}
        <section className="grid md:grid-cols-2 gap-6 lg:gap-8 w-full mb-8">
          
          {/* ===================================================================
              LEFT PANEL: CRACK THE CODE (3rd Year CSE - Blue Fortress Theme)
              =================================================================== */}
          <div className="fortress-panel-blue flex flex-col justify-between group hover:border-blue-400 transition-all duration-200">
            {/* Corner Rivets */}
            <span className="rivet absolute top-2.5 left-2.5"></span>
            <span className="rivet absolute top-2.5 right-2.5"></span>

            {/* Arched Top Header Banner */}
            <div>
              <div className="text-center pt-5 pb-3 px-4 border-b-2 border-blue-800/80 bg-gradient-to-b from-blue-900/60 to-transparent">
                <div className="inline-block px-4 py-1 rounded bg-blue-950 border border-blue-400 text-blue-200 text-xs font-clash tracking-widest uppercase mb-2 shadow">
                  3RD YEAR CSE • 🏰 CODE INVASION
                </div>
                <h3 className="text-3xl sm:text-4xl font-clash text-3d-banner text-blue-100 tracking-wider">
                  CRACK THE CODE
                </h3>
              </div>

              {/* Items List with Circular Gold-Bordered Medallion Icons */}
              <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm text-stone-200">
                
                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconTeam className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Team:</strong> 2 students
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconLightbulb className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Concept:</strong> Teams must crack a hidden password by solving technical puzzles and clues.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconCode className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Mechanism:</strong> Each challenge reveals a digit/letter of the password.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconPuzzle className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Challenges:</strong> Regex, SQL, Java, Data Structures, Cipher.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconLightbulb className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Clues:</strong> Strategic clues are available to aid teams during difficult challenges.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconTimer className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Pressure:</strong> The event is time-based, adding battle pressure.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-blue-950/40 p-2.5 rounded-xl border border-blue-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconLock className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-blue-300 font-semibold">Victory:</strong> The first team to correctly crack the complete password wins.
                  </div>
                </div>

                {/* Wooden Goal Plaque */}
                <div className="mt-3 parchment-banner p-3 border-amber-600/80 flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-amber-950/80 border border-amber-600 shrink-0">
                    <IconTarget className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="text-xs sm:text-sm">
                    <span className="font-clash text-amber-300 text-sm block">GOAL</span>
                    <span className="text-stone-200">Use technical knowledge + logical thinking to unlock the final password.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Blue Action Button */}
            <div className="p-4 pt-1">
              <Link to="/login" className="btn-battle-blue w-full block">
                ENTER CODE INVASION →
              </Link>
            </div>
          </div>

          {/* ===================================================================
              RIGHT PANEL: CODE SCRAMBLE (2nd Year CSE - Red Warrior Theme)
              =================================================================== */}
          <div className="fortress-panel-red flex flex-col justify-between group hover:border-red-400 transition-all duration-200">
            {/* Corner Rivets */}
            <span className="rivet absolute top-2.5 left-2.5"></span>
            <span className="rivet absolute top-2.5 right-2.5"></span>

            {/* Arched Top Header Banner */}
            <div>
              <div className="text-center pt-5 pb-3 px-4 border-b-2 border-red-800/80 bg-gradient-to-b from-red-900/60 to-transparent">
                <div className="inline-block px-4 py-1 rounded bg-red-950 border border-red-400 text-red-200 text-xs font-clash tracking-widest uppercase mb-2 shadow">
                  2ND YEAR CSE &bull; BUILDER'S CHALLENGE
                </div>
                <h3 className="text-3xl sm:text-4xl font-clash text-3d-banner text-red-100 tracking-wider">
                  CODE SCRAMBLE
                </h3>
              </div>

              {/* Items List with Circular Gold-Bordered Medallion Icons */}
              <div className="p-4 sm:p-5 space-y-2.5 text-xs sm:text-sm text-stone-200">
                
                <div className="flex items-start gap-3 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconTeam className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-red-300 font-semibold">Team:</strong> 2 members
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconStar className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-red-300 font-semibold">Format:</strong> Time-based interactive code unscrambling challenge
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconCode className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-red-300 font-semibold">Objective:</strong> Arrange scrambled Python code blocks into correct operational order.
                  </div>
                </div>

                {/* How It Works Box */}
                <div className="bg-gradient-to-b from-[#2b1013] to-[#1a080a] p-3 rounded-xl border border-red-700/60 shadow-inner">
                  <div className="font-clash text-xs uppercase tracking-wider text-amber-300 flex items-center gap-2 mb-1.5">
                    <IconGear className="w-3.5 h-3.5 text-amber-400" /> HOW IT WORKS
                  </div>
                  <div className="space-y-1.5 text-xs text-stone-200 pl-4 border-l-2 border-red-700/60">
                    <div className="flex items-center gap-2">
                      <IconSwap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Drag &amp; drop scrambled lines to reorder them</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconLightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Request Clues &rarr; Automatically places the next correct line</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block shrink-0 shadow-sm"></span>
                      <span>Correctly placed blocks turn <strong className="text-emerald-300 font-bold">GREEN</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <IconTarget className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Solve with maximum efficiency &amp; fewest moves</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconTrophy className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-red-300 font-semibold">Victory:</strong> Evaluated by accuracy, speed, and strategic solution efficiency.
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-red-950/40 p-2.5 rounded-xl border border-red-800/40 shadow-sm">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-300 via-amber-600 to-amber-900 p-0.5 shadow flex-shrink-0">
                    <div className="w-full h-full rounded-full bg-stone-950 flex items-center justify-center">
                      <IconPuzzle className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="pt-0.5">
                    <strong className="text-red-300 font-semibold">Challenges:</strong> Basic Python progressing to loops, lists, strings &amp; mixed programs.
                  </div>
                </div>

                {/* Wooden Goal Plaque */}
                <div className="mt-3 parchment-banner p-3 border-amber-600/80 flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-amber-950/80 border border-amber-600 shrink-0">
                    <IconTarget className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="text-xs sm:text-sm">
                    <span className="font-clash text-amber-300 text-sm block">GOAL</span>
                    <span className="text-stone-200">Arrange code blocks correctly in shortest time with minimum swaps.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Red Action Button */}
            <div className="p-4 pt-1">
              <Link to="/login" className="btn-battle-red w-full block">
                ENTER BUILDER'S CHALLENGE →
              </Link>
            </div>
          </div>
        </section>

        {/* 4. BOTTOM POSTER PROPS & BATTLE CTAS */}
        <section className="w-full flex flex-col items-center gap-5 mb-8">
          
          {/* Center Banner Ribbon: LET THE BEST CODERS WIN */}
          <div className="relative px-8 py-3 rounded-xl bg-gradient-to-r from-[#2c170a] via-[#4d2812] to-[#2c170a] border-2 border-amber-500 shadow-[0_8px_25px_rgba(0,0,0,0.85)] flex items-center gap-3">
            <IconSwords className="w-5 h-5 text-amber-400" />
            <span className="font-clash text-base sm:text-xl md:text-2xl text-amber-200 tracking-wider uppercase drop-shadow">
              LET THE BEST CODERS WIN
            </span>
            <IconSwords className="w-5 h-5 text-amber-400" />
          </div>

          {/* Side Props & Main Buttons Container */}
          <div className="flex flex-wrap items-center justify-center gap-5 w-full max-w-2xl mt-2">
            
            {/* Left Prop: Treasure Chest (Elixir Gems) */}
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-gradient-to-b from-[#24170e] to-[#120a06] border border-amber-700/60 shadow-lg">
              <IconCastle className="w-5 h-5 text-amber-400" />
              <div>
                <span className="text-[10px] font-clash text-amber-300 block uppercase">VICTORY VAULT</span>
                <span className="text-[10px] text-blue-300 font-mono font-bold">100+ GEMS</span>
              </div>
            </div>

            {/* Core Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 flex-grow justify-center">
              <Link to="/login" className="btn-battle-gold min-w-[200px]">
                ENTER BATTLE LOGIN
              </Link>
              <Link
                to="/register"
                className="px-6 py-3 bg-gradient-to-b from-[#2a1b12] to-[#19100a] hover:from-[#3a251a] hover:to-[#24170e] text-amber-300 font-clash font-black text-base tracking-wider rounded-xl border-2 border-amber-600/80 shadow-lg text-center uppercase active:translate-y-0.5 transition-all"
              >
                REGISTER CLAN
              </Link>
            </div>

            {/* Right Prop: Wooden Signboard */}
            <div className="hidden sm:block px-3.5 py-2 rounded-xl bg-[#2a170d] border-2 border-[#5c371f] shadow-lg -rotate-2">
              <span className="text-[11px] font-clash text-amber-200 block text-center uppercase tracking-widest leading-tight">
                THINK<br />CODE<br />CONQUER
              </span>
            </div>
          </div>

          {/* Subtle War Room Portal Link */}
          <div className="mt-4 text-center">
            <Link
              to="/admin/login"
              className="text-xs text-stone-500 hover:text-amber-300 transition-colors uppercase tracking-widest font-mono flex items-center gap-1.5"
            >
              <IconShield className="w-3.5 h-3.5 text-stone-500" />
              <span>War Room Portal (Admin)</span>
            </Link>
          </div>
        </section>

      </div>

      <footer className="z-10 py-5 border-t border-stone-800/80 text-center text-xs text-stone-500 font-sans">
        <p>Saranathan College of Engineering &bull; CSE &amp; IEI &bull; CLASH OF CODES</p>
      </footer>
    </div>
  );
};

export default LandingPage;

