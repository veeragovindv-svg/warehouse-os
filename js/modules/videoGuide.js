/* ============================================================
   WarehouseOS — modules/videoGuide.js
   Interactive "How to Run" Video Walkthrough & Tour Player
   ============================================================ */

const VideoGuideModule = (() => {

  let isPlaying = true;
  let currentTime = 0;
  const totalDuration = 270; // 4 minutes 30 seconds
  let playbackSpeed = 1.0;
  let activeChapterIndex = 0;
  let animTimer = null;
  let voiceEnabled = false;
  let lastSpokenChapter = -1;

  const CHAPTERS = [
    {
      id: 'ch-1',
      title: 'Chapter 1: Local Server Setup & Launch',
      startTime: 0,
      endTime: 55,
      icon: '🚀',
      desc: 'How to boot the local Python web server on port 8080 and open the web dashboard in Chrome/Edge.',
      cli: 'python -m http.server 8080',
      sceneText: 'STAGE 1: Booting Local Web Server on Port 8080…',
      highlightBadge: 'CLI SETUP',
      highlightColor: '#06B6D4',
      narration: 'Welcome to WarehouseOS! Step one: To run the platform locally, open your terminal or PowerShell, navigate to your workspace, and launch the Python web server on port 8080. Then open your browser at localhost 8080.'
    },
    {
      id: 'ch-2',
      title: 'Chapter 2: Admin Access & Staff Onboarding',
      startTime: 55,
      endTime: 110,
      icon: '👑',
      desc: 'Signing in with Root Admin clearance (Veera Govind) and onboarding new warehouse pickers with 1-click presets.',
      cli: 'Auth: admin@warehouse.os / admin (Veera Govind - Operations Director)',
      sceneText: 'STAGE 2: Authenticating Root Admin & Managing Staff Roster…',
      highlightBadge: 'ADMIN ACCESS',
      highlightColor: '#A855F7',
      narration: 'Chapter two: Executive Admin Access. Signed in as Veera Govind, you have root-level clearance to onboard new staff, assign zones, manage shifts, and monitor workforce productivity in real time.'
    },
    {
      id: 'ch-3',
      title: 'Chapter 3: 3D Floor Digital Twin & AGVs',
      startTime: 110,
      endTime: 170,
      icon: '🗺️',
      desc: 'Interacting with Three.js 3D warehouse wireframe bins, camera presets (2D/3D), and AGV-04 robotic spine transit.',
      cli: 'Navigation: Click bins for IoT telemetry, temperature & stock flyout',
      sceneText: 'STAGE 3: 3D Spatial Digital Twin & Autonomous AGV Telemetry…',
      highlightBadge: '3D SPATIAL',
      highlightColor: '#38BDF8',
      narration: 'Chapter three: 3D Spatial Digital Twin. Navigate across warehouse zones in 3D or 2D top-down view. Click any storage bin to inspect live IoT temperature, humidity, and stock levels, while autonomous AGV robots transport goods across the main spine.'
    },
    {
      id: 'ch-4',
      title: 'Chapter 4: Order Allocation & Picking Workflow',
      startTime: 170,
      endTime: 220,
      icon: '🛒',
      desc: 'Managing pending orders, batch inventory allocation, paperless barcode verification, and thermal label generation.',
      cli: 'Workflow: 1-Click Allocate -> Generate Pick List -> Dispatch Manifest',
      sceneText: 'STAGE 4: Autonomous Order Allocation & Pick Verification…',
      highlightBadge: 'ORDER OPS',
      highlightColor: '#10B981',
      narration: 'Chapter four: Order operations and picking. Utilize one-click automated allocation to assign inventory, generate optimized picking paths for floor operators, and verify barcodes with zero paper waste.'
    },
    {
      id: 'ch-5',
      title: 'Chapter 5: CDC Stream & Markov Demand Forecasting',
      startTime: 220,
      endTime: 270,
      icon: '🔮',
      desc: 'Live PostgreSQL CDC replication streaming 42+ mutations/sec and Markov transition matrix demand predictions.',
      cli: 'Data Engine: CDC Replication Slot 01 + Markov 48h Matrix Shift',
      sceneText: 'STAGE 5: Real-Time CDC Data Stream & Markov Machine Learning…',
      highlightBadge: 'PREDICTIVE ML',
      highlightColor: '#F59E0B',
      narration: 'Chapter five: Predictive intelligence. Our real-time change data capture stream syncs forty-two mutations per second, while Markov machine learning models forecast demand surges forty-eight hours in advance.'
    }
  ];

  // ─── SWEET VOICE NARRATOR SYNTHESIZER ──────────────────────
  function speakNarration(text) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel(); // Stop any previous speech

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select the sweetest/natural female voice
    const voices = window.speechSynthesis.getVoices();
    const sweetVoice = voices.find(v => 
      v.name.includes('Zira') || 
      v.name.includes('Google UK English Female') || 
      v.name.includes('Samantha') || 
      v.name.includes('Karen') || 
      v.name.includes('Victoria') ||
      (v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];

    if (sweetVoice) {
      utterance.voice = sweetVoice;
    }

    utterance.pitch = 1.08; // Sweet, warm, friendly pitch
    utterance.rate = 0.95 * playbackSpeed; // Relaxed pleasant pace
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }

  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
    if (!voiceEnabled) {
      window.speechSynthesis?.cancel();
      Utils.Toast.info('Voice Narrator Muted', 'Voiceover turned OFF');
    } else {
      Utils.Toast.success('Voice Narrator Active', 'Sweet Voice narration turned ON');
      const ch = CHAPTERS[activeChapterIndex] || CHAPTERS[0];
      speakNarration(ch.narration);
    }
    updateVoiceButtonUI();
  }

  function updateVoiceButtonUI() {
    const btn = document.getElementById('video-voice-btn');
    if (btn) {
      btn.innerHTML = voiceEnabled ? '🎙️ Sweet Voice: ON' : '🔇 Voice: OFF';
      btn.className = `btn btn-xs font-bold ${voiceEnabled ? 'btn-primary' : 'btn-secondary'}`;
    }
  }

  function render(container) {
    container.innerHTML = buildHTML();
    bindEvents(container);
    startAnimationLoop();
  }

  function buildHTML() {
    return `
    <div class="video-guide-module" style="max-width:1160px;margin:0 auto;padding-bottom:40px;">
      
      <!-- Section Header -->
      <div class="section-header mb-4">
        <div class="section-header-left">
          <div class="flex items-center gap-2 mb-1">
            <h2 class="section-title">🎬 How to Run WarehouseOS — Video Walkthrough</h2>
            <span class="badge badge-primary font-mono font-bold" style="font-size:10px">HD INTERACTIVE TOUR</span>
          </div>
          <p class="section-sub">Step-by-step master video guide covering local server startup, 3D floor map navigation, order fulfillment, and AI forecasting.</p>
        </div>
        <div class="section-actions flex items-center gap-2">
          <button class="btn btn-secondary btn-sm" onclick="VideoGuideModule.copyRunCommands()">
            📋 Copy Run Commands
          </button>
          <button class="btn btn-primary btn-sm font-bold" onclick="VideoGuideModule.restartVideo()">
            ↺ Restart Tour
          </button>
        </div>
      </div>

      <!-- MAIN VIDEO PLAYER STAGE CONTAINER -->
      <div class="card p-4 mb-6" style="background:linear-gradient(145deg, rgba(15,23,42,0.98), rgba(30,41,59,0.92));border:1px solid rgba(6,182,212,0.4);border-radius:var(--radius-2xl);box-shadow:0 25px 60px rgba(0,0,0,0.7);">
        
        <!-- Video Screen Canvas -->
        <div class="video-screen-wrapper relative overflow-hidden rounded-xl" style="background:#090D16;border:1px solid rgba(255,255,255,0.08);aspect-ratio:16/9;min-height:380px;">
          
          <canvas id="video-sim-canvas" style="width:100%;height:100%;display:block;"></canvas>

          <!-- Top Video Overlay HUD -->
          <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div class="flex items-center gap-2">
              <span class="badge badge-danger font-bold flex items-center gap-1" style="box-shadow:0 0 12px rgba(239,68,68,0.5)">
                <span style="width:6px;height:6px;border-radius:50%;background:#fff;display:inline-block;animation:live-dot-blink 1s infinite"></span>
                SIMULATED WALKTHROUGH
              </span>
              <span id="video-chapter-badge" class="badge badge-primary font-bold">Chapter 1: Local Setup</span>
            </div>
            <div class="flex items-center gap-2 text-xs font-mono text-muted bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur">
              <span id="video-timer-display">00:00 / 04:30</span>
              <span>· 1080p 60fps</span>
            </div>
          </div>

          <!-- Central Play / Pause Overlay Icon (appears briefly on click) -->
          <div id="video-center-icon" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity" style="transition:opacity 0.3s">
            <div class="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style="background:rgba(6,182,212,0.85);color:#fff;box-shadow:0 0 30px rgba(6,182,212,0.6)">
              ▶️
            </div>
          </div>
        </div>

        <!-- Video Control Bar -->
        <div class="video-controls-bar mt-3 pt-3 flex flex-col gap-2" style="border-top:1px solid rgba(255,255,255,0.08);">
          
          <!-- Scrubber Timeline Progress Bar -->
          <div class="video-timeline-wrapper relative cursor-pointer py-1" onclick="VideoGuideModule.seekTimeline(event)">
            <div class="w-full h-2 rounded-full" style="background:rgba(255,255,255,0.1);overflow:hidden;">
              <div id="video-timeline-progress" class="h-full rounded-full" style="width:0%;background:linear-gradient(90deg, #06B6D4, #38BDF8, #A855F7);transition:width 0.1s linear;"></div>
            </div>
          </div>

          <!-- Bottom Control Buttons -->
          <div class="flex items-center justify-between flex-wrap gap-4" style="font-family:'Space Grotesk', sans-serif;">
            <div class="flex items-center gap-2 flex-wrap min-w-[280px]">
              <button id="video-play-btn" class="btn btn-primary btn-sm font-bold icon-btn" onclick="VideoGuideModule.togglePlay()" title="Play / Pause" style="min-width:32px;">
                ⏸️
              </button>
              <button class="btn btn-secondary btn-sm icon-btn" onclick="VideoGuideModule.prevChapter()" title="Previous Chapter" style="min-width:32px;">
                ⏮️
              </button>
              <button class="btn btn-secondary btn-sm icon-btn" onclick="VideoGuideModule.nextChapter()" title="Next Chapter" style="min-width:32px;">
                ⏭️
              </button>
              <span id="video-active-title" class="text-xs font-semibold text-primary ml-1 truncate" style="max-width:240px; display:inline-block; vertical-align:middle;">
                Chapter 1: Local Server Setup & Launch
              </span>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button id="video-voice-btn" class="btn btn-xs font-bold flex items-center gap-1 \${voiceEnabled ? 'btn-primary' : 'btn-secondary'}" onclick="VideoGuideModule.toggleVoice()" title="Toggle Sweet Voice Narration Voiceover">
                \${voiceEnabled ? '🎙️ Sweet Voice: ON' : '🔇 Voice: OFF'}
              </button>

              <button class="btn btn-secondary btn-xs font-semibold" onclick="VideoGuideModule.replayVoice()" title="Replay current chapter voice narration">
                🗣️ Replay Voice
              </button>

              <div class="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/10" style="padding:2px 6px;">
                <button class="btn btn-ghost btn-xs font-mono \${playbackSpeed===1.0?'text-primary font-bold':''}" onclick="VideoGuideModule.setSpeed(1.0)">1.0x</button>
                <button class="btn btn-ghost btn-xs font-mono \${playbackSpeed===1.5?'text-primary font-bold':''}" onclick="VideoGuideModule.setSpeed(1.5)">1.5x</button>
                <button class="btn btn-ghost btn-xs font-mono \${playbackSpeed===2.0?'text-primary font-bold':''}" onclick="VideoGuideModule.setSpeed(2.0)">2.0x</button>
              </div>

              <button class="btn btn-secondary btn-xs font-bold" onclick="VideoGuideModule.openQuickLaunchModal()">
                ⚡ Quick Launch
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- CHAPTER TIMELINE NAVIGATION GRID -->
      <div class="section-title text-sm mb-3">📑 Walkthrough Chapters & Key Highlights</div>
      <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
        ${CHAPTERS.map((ch, idx) => `
          <div class="card p-3 cursor-pointer transition-all hover:scale-[1.02] ${activeChapterIndex===idx?'border-primary':''}"
               id="ch-card-${idx}"
               onclick="VideoGuideModule.jumpToChapter(${idx})"
               style="background:rgba(15,23,42,0.85);border:1px solid ${activeChapterIndex===idx?'rgba(6,182,212,0.6)':'rgba(255,255,255,0.08)'};border-radius:var(--radius-xl);">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-lg">${ch.icon}</span>
              <span class="badge badge-neutral font-mono" style="font-size:9px">${formatTime(ch.startTime)}</span>
            </div>
            <div class="font-bold text-xs mb-1 truncate" style="color:var(--clr-text)">${ch.title}</div>
            <div class="text-xs text-muted leading-tight" style="font-size:10.5px">${ch.desc}</div>
          </div>
        `).join('')}
      </div>

      <!-- HOW TO RUN COMMAND CHEAT SHEET -->
      <div class="card p-5" style="background:rgba(15,23,42,0.9);border:1px solid rgba(168,85,247,0.3);border-radius:var(--radius-2xl);">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">💻</span>
            <div>
              <div class="font-bold text-sm" style="color:#C084FC">Terminal Commands — Run in 2 Seconds</div>
              <div class="text-xs text-muted">Execute these commands in PowerShell / Terminal to launch WarehouseOS:</div>
            </div>
          </div>
          <button class="btn btn-secondary btn-xs font-bold" onclick="VideoGuideModule.copyRunCommands()">
            📋 Copy All
          </button>
        </div>

        <div class="p-3 rounded-xl font-mono text-xs mb-3 flex items-center justify-between" style="background:#090D16;border:1px solid rgba(255,255,255,0.1);color:#38BDF8;">
          <code>python -m http.server 8080</code>
          <span class="badge badge-success" style="font-size:9px">PORT 8080</span>
        </div>

        <div class="text-xs text-muted leading-relaxed">
          Open your browser and navigate to <strong class="text-primary">http://localhost:8080</strong>. Default Administrator login is <code class="text-purple-400">admin@warehouse.os</code> with password <code class="text-purple-400">admin</code>.
        </div>
      </div>

    </div>`;
  }

  function bindEvents(container) {
    const canvas = document.getElementById('video-sim-canvas');
    if (canvas) {
      canvas.addEventListener('click', togglePlay);
    }
  }

  // ─── CANVAS ANIMATION ENGINE ───────────────────────────────
  function startAnimationLoop() {
    if (animTimer) clearInterval(animTimer);

    const canvas = document.getElementById('video-sim-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Resize canvas
    canvas.width = 960;
    canvas.height = 540;

    let frame = 0;

    animTimer = setInterval(() => {
      if (isPlaying) {
        currentTime += 0.25 * playbackSpeed;
        if (currentTime >= totalDuration) {
          currentTime = 0; // Loop
        }
      }

      frame++;
      updateChapterState();
      updateUIElements();
      drawVideoFrame(ctx, canvas, frame);
    }, 50);
  }

  function updateChapterState() {
    const currentChapter = CHAPTERS.find(ch => currentTime >= ch.startTime && currentTime < ch.endTime) || CHAPTERS[0];
    const newIdx = CHAPTERS.indexOf(currentChapter);
    if (newIdx !== activeChapterIndex) {
      activeChapterIndex = newIdx;
      // Highlight chapter card
      document.querySelectorAll('[id^="ch-card-"]').forEach((el, i) => {
        el.style.borderColor = i === activeChapterIndex ? 'rgba(6,182,212,0.8)' : 'rgba(255,255,255,0.08)';
        el.style.background = i === activeChapterIndex ? 'rgba(6,182,212,0.1)' : 'rgba(15,23,42,0.85)';
      });

      // Sweet Voice Narration Trigger
      if (lastSpokenChapter !== activeChapterIndex && isPlaying) {
        lastSpokenChapter = activeChapterIndex;
        speakNarration(currentChapter.narration);
      }
    }
  }

  function updateUIElements() {
    const timerEl = document.getElementById('video-timer-display');
    const badgeEl = document.getElementById('video-chapter-badge');
    const titleEl = document.getElementById('video-active-title');
    const progressEl = document.getElementById('video-timeline-progress');

    if (timerEl) timerEl.textContent = `${formatTime(currentTime)} / ${formatTime(totalDuration)}`;
    if (badgeEl && CHAPTERS[activeChapterIndex]) badgeEl.textContent = CHAPTERS[activeChapterIndex].title.split(':')[0];
    if (titleEl && CHAPTERS[activeChapterIndex]) titleEl.textContent = CHAPTERS[activeChapterIndex].title;
    if (progressEl) progressEl.style.width = `${(currentTime / totalDuration) * 100}%`;
  }

  function drawVideoFrame(ctx, canvas, frame) {
    const ch = CHAPTERS[activeChapterIndex] || CHAPTERS[0];
    const w = canvas.width;
    const h = canvas.height;

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0f1d');
    bgGrad.addColorStop(1, '#111827');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle animated grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offset = (frame * 0.5) % gridSize;
    for (let x = -gridSize; x < w + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x + offset, 0);
      ctx.lineTo(x + offset, h);
      ctx.stroke();
    }
    for (let y = -gridSize; y < h + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y + offset);
      ctx.lineTo(w, y + offset);
      ctx.stroke();
    }

    // Dynamic Central Stage Content by Chapter
    if (activeChapterIndex === 0) {
      // CHAPTER 1: Terminal & Server Boot
      drawTerminalMockup(ctx, w, h, frame);
    } else if (activeChapterIndex === 1) {
      // CHAPTER 2: Admin Auth & Staff Roster
      drawAuthMockup(ctx, w, h, frame);
    } else if (activeChapterIndex === 2) {
      // CHAPTER 3: 3D Digital Twin Map & AGV
      draw3DMapMockup(ctx, w, h, frame);
    } else if (activeChapterIndex === 3) {
      // CHAPTER 4: Order Allocation & Barcode
      drawOrderOpsMockup(ctx, w, h, frame);
    } else {
      // CHAPTER 5: CDC Stream & Markov
      drawCDCMarkovMockup(ctx, w, h, frame);
    }

    // Bottom Video Title Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(20, h - 70, w - 40, 50);
    ctx.strokeStyle = ch.highlightColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(20, h - 70, w - 40, 50);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 15px "Space Grotesk", sans-serif';
    ctx.fillText(`${ch.icon} ${ch.sceneText}`, 35, h - 44);

    ctx.fillStyle = ch.highlightColor;
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`> ${ch.cli}`, 35, h - 26);
  }

  // Visual Mockup Drawings
  function drawTerminalMockup(ctx, w, h, frame) {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(100, 70, w - 200, h - 170);
    ctx.strokeStyle = 'rgba(6,182,212,0.4)';
    ctx.strokeRect(100, 70, w - 200, h - 170);

    // Terminal Header
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(100, 70, w - 200, 30);
    ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(118, 85, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(134, 85, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.arc(150, 85, 5, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('PowerShell — Local Server Terminal', 170, 89);

    // Terminal Code Lines
    ctx.fillStyle = '#38BDF8';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('PS C:\\warehouse> python -m http.server 8080', 120, 135);

    ctx.fillStyle = '#10B981';
    ctx.fillText('Serving HTTP on :: port 8080 (http://localhost:8080/) ...', 120, 165);
    ctx.fillText('127.0.0.1 - - [2026-08-18] "GET / HTTP/1.1" 200 OK', 120, 195);
    ctx.fillText('127.0.0.1 - - [2026-08-18] "GET /js/data.js HTTP/1.1" 200 OK', 120, 225);

    // Blinking cursor
    if (Math.floor(frame / 10) % 2 === 0) {
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(120, 245, 10, 16);
    }
  }

  function drawAuthMockup(ctx, w, h, frame) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(140, 80, w - 280, h - 180);
    ctx.strokeStyle = 'rgba(168,85,247,0.4)';
    ctx.strokeRect(140, 80, w - 280, h - 180);

    ctx.fillStyle = '#C084FC';
    ctx.font = 'bold 18px "Space Grotesk"';
    ctx.fillText('👑 Executive Root Admin Portal', 170, 125);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '13px "Space Grotesk"';
    ctx.fillText('Signed in: Veera Govind · Operations Director (Full Access)', 170, 155);

    // 3 Staff Badge Cards
    const cards = [
      { name: 'Alex Rivera', role: 'Senior Picker', zone: 'Zone A', col: '#06B6D4' },
      { name: 'Dana Patel', role: 'Lead Packer', zone: 'Zone D', col: '#10B981' },
      { name: 'Karthik Iyer', role: 'Shift Supervisor', zone: 'Zone E', col: '#A855F7' }
    ];

    cards.forEach((c, idx) => {
      const bx = 170 + idx * 200;
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(bx, 180, 180, 70);
      ctx.strokeStyle = c.col;
      ctx.strokeRect(bx, 180, 180, 70);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 13px "Space Grotesk"';
      ctx.fillText(c.name, bx + 15, 205);

      ctx.fillStyle = c.col;
      ctx.font = '11px "JetBrains Mono"';
      ctx.fillText(`${c.role} · ${c.zone}`, bx + 15, 230);
    });
  }

  function draw3DMapMockup(ctx, w, h, frame) {
    // 3D Wireframe Racks
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 1.5;

    for (let i = 0; i < 4; i++) {
      const rx = 180 + i * 160;
      ctx.fillStyle = 'rgba(6,182,212,0.1)';
      ctx.fillRect(rx, 120, 120, 140);
      ctx.strokeRect(rx, 120, 120, 140);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 12px "Space Grotesk"';
      ctx.fillText(`Zone ${String.fromCharCode(65 + i)}`, rx + 15, 150);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px "JetBrains Mono"';
      ctx.fillText(`Bin 0${i+1}-01`, rx + 15, 175);
    }

    // Animated AGV Robot moving along floor
    const agvX = 180 + ((frame * 2.5) % 550);
    ctx.fillStyle = '#A855F7';
    ctx.fillRect(agvX, 280, 50, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 10px "JetBrains Mono"';
    ctx.fillText('AGV-04', agvX + 6, 296);
  }

  function drawOrderOpsMockup(ctx, w, h, frame) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(120, 80, w - 240, h - 180);
    ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    ctx.strokeRect(120, 80, w - 240, h - 180);

    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 18px "Space Grotesk"';
    ctx.fillText('🛒 1-Click Order Allocation & Batch Picking', 150, 125);

    const orders = [
      { id: 'ORD-001', cust: 'Apex Distributors', tier: 'VIP', status: 'ALLOCATED (100%)', col: '#10B981' },
      { id: 'ORD-002', cust: 'Meridian Electronics', tier: 'EXPRESS', status: 'PICKING (Zone A)', col: '#38BDF8' },
      { id: 'ORD-003', cust: 'BuildRight Co.', tier: 'STANDARD', status: 'PACKED & STAGED', col: '#A855F7' }
    ];

    orders.forEach((o, i) => {
      const oy = 155 + i * 36;
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(150, oy, w - 300, 30);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 12px "JetBrains Mono"';
      ctx.fillText(o.id, 165, oy + 20);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '12px "Space Grotesk"';
      ctx.fillText(o.cust, 260, oy + 20);

      ctx.fillStyle = o.col;
      ctx.font = 'bold 11px "JetBrains Mono"';
      ctx.fillText(o.status, 520, oy + 20);
    });
  }

  function drawCDCMarkovMockup(ctx, w, h, frame) {
    // Left Box: CDC Stream
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(120, 80, 320, h - 180);
    ctx.strokeStyle = 'rgba(6,182,212,0.4)';
    ctx.strokeRect(120, 80, 320, h - 180);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 14px "Space Grotesk"';
    ctx.fillText('⚡ Real-Time CDC Ingestion', 140, 115);

    ctx.fillStyle = '#10B981';
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillText('• Slot: cdc_stream_slot_01', 140, 145);
    ctx.fillText('• 42.4 mutations / sec', 140, 175);
    ctx.fillText('• LSN: 0/1A3F992 [LIVE SYNC]', 140, 205);

    // Right Box: Markov Model
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(480, 80, 320, h - 180);
    ctx.strokeStyle = 'rgba(245,158,11,0.4)';
    ctx.strokeRect(480, 80, 320, h - 180);

    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 14px "Space Grotesk"';
    ctx.fillText('🔮 Markov 48h Demand Forecast', 500, 115);

    ctx.fillStyle = '#E2E8F0';
    ctx.font = '11px "JetBrains Mono"';
    ctx.fillText('• Zone A Demand Surge: 78.4%', 500, 145);
    ctx.fillText('• Reorder Trigger: SKU PRD-050', 500, 175);
    ctx.fillText('• Equilibrium Vector: [0.42, 0.38]', 500, 205);
  }

  // ─── PLAYER CONTROLS ───────────────────────────────────────
  function togglePlay() {
    isPlaying = !isPlaying;
    const btn = document.getElementById('video-play-btn');
    if (btn) btn.textContent = isPlaying ? '⏸️' : '▶️';

    const centerIcon = document.getElementById('video-center-icon');
    if (centerIcon) {
      centerIcon.style.opacity = '1';
      centerIcon.querySelector('div').textContent = isPlaying ? '▶️' : '⏸️';
      setTimeout(() => { centerIcon.style.opacity = '0'; }, 400);
    }
  }

  function restartVideo() {
    currentTime = 0;
    isPlaying = true;
    const btn = document.getElementById('video-play-btn');
    if (btn) btn.textContent = '⏸️';
    Utils.Toast.info('Video Restarted', 'Playing from Chapter 1');
  }

  function jumpToChapter(idx) {
    if (CHAPTERS[idx]) {
      currentTime = CHAPTERS[idx].startTime;
      isPlaying = true;
      const btn = document.getElementById('video-play-btn');
      if (btn) btn.textContent = '⏸️';
      Utils.Toast.success('Chapter Loaded', CHAPTERS[idx].title);
    }
  }

  function nextChapter() {
    const nextIdx = (activeChapterIndex + 1) % CHAPTERS.length;
    jumpToChapter(nextIdx);
  }

  function prevChapter() {
    const prevIdx = (activeChapterIndex - 1 + CHAPTERS.length) % CHAPTERS.length;
    jumpToChapter(prevIdx);
  }

  function setSpeed(speed) {
    playbackSpeed = speed;
    Utils.Toast.info('Speed Updated', `${speed}x Playback Speed`);
    Router.dispatch();
  }

  function seekTimeline(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    currentTime = pct * totalDuration;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  function copyRunCommands() {
    const text = `cd "c:\\Users\\veera\\OneDrive\\Documents\\smart houseware"\npython -m http.server 8080\n# Open in browser: http://localhost:8080`;
    navigator.clipboard?.writeText(text);
    Utils.Sound?.playSuccess?.();
    Utils.Toast.success('Copied to Clipboard!', 'Paste into PowerShell to boot the server instantly.');
  }

  function openQuickLaunchModal() {
    Utils.Modal.open('⚡ Quick Launch Helper', `
      <div class="flex flex-col gap-3">
        <p class="text-xs text-muted">Run WarehouseOS in 3 simple steps on any Windows / Mac / Linux machine:</p>
        
        <div class="p-3 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(6,182,212,0.3)">
          <div class="font-bold text-xs text-primary mb-1">Step 1: Open PowerShell in Workspace Directory</div>
          <code class="text-xs font-mono text-muted">cd "c:\\Users\\veera\\OneDrive\\Documents\\smart houseware"</code>
        </div>

        <div class="p-3 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(16,185,129,0.3)">
          <div class="font-bold text-xs text-success mb-1">Step 2: Start Local Python Server</div>
          <code class="text-xs font-mono text-muted">python -m http.server 8080</code>
        </div>

        <div class="p-3 rounded-xl" style="background:rgba(255,255,255,0.03);border:1px solid rgba(168,85,247,0.3)">
          <div class="font-bold text-xs text-purple-400 mb-1">Step 3: Open in Chrome / Edge</div>
          <a href="http://localhost:8080" target="_blank" class="text-xs font-mono text-primary hover:underline">http://localhost:8080/#/dashboard</a>
        </div>
      </div>
    `, { size: 'md' });
  }

  function replayVoice() {
    const ch = CHAPTERS[activeChapterIndex] || CHAPTERS[0];
    if (ch) {
      voiceEnabled = true;
      updateVoiceButtonUI();
      speakNarration(ch.narration);
      Utils.Toast.info('Playing Narration', ch.title);
    }
  }

  return {
    render, togglePlay, restartVideo, jumpToChapter, nextChapter, prevChapter,
    setSpeed, seekTimeline, copyRunCommands, openQuickLaunchModal,
    toggleVoice, replayVoice
  };
})();
