import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import LandingDemo from './LandingDemo';
import './Landing.css';

const features = [
  { icon: '✦', title: 'AI Smart Filter', desc: 'Type "devpost teams with open slots next month" and get exactly that. No dropdown hunting.', color: 'cyan' },
  { icon: '🎯', title: 'Recommendation Engine', desc: 'Get open teams and complementary teammates ranked by your history, skills and timing.', color: 'pink' },
  { icon: '⚡', title: 'Real-Time Dashboard', desc: 'Track all your hackathons, rounds, and deadlines in one unified command center.', color: 'cyan' },
  { icon: '🌍', title: 'Hackathon Worlds', desc: 'Discover public hackathons, form teams, and collaborate with participants globally.', color: 'purple' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Never miss a deadline. Get alerts for rounds, submissions, and team updates.', color: 'pink' },
  { icon: '👥', title: 'Team Management', desc: 'Invite members, manage roles, chat privately, and track team progress.', color: 'green' },
  { icon: '📅', title: 'Calendar View', desc: 'Visualize your hackathon schedule with an interactive calendar and round markers.', color: 'cyan' },
  { icon: '🔐', title: 'Secure Auth', desc: 'OTP-based registration, JWT sessions, and Google OAuth for seamless access.', color: 'purple' },
];

const steps = [
  { n: '01', title: 'Track', desc: 'Add the hackathons you are playing, with rounds, deadlines and team details.' },
  { n: '02', title: 'Get matched', desc: 'The recommendation engine learns your platforms and skills, then ranks open teams and teammates.' },
  { n: '03', title: 'Ship together', desc: 'Request to join, chat in real time, vote on ideas and keep every round on one calendar.' },
];

const ticker = [
  'Devpost', 'HackerEarth', 'Topcoder', 'CodeChef', 'HackerRank',
  'Track rounds', 'Find teams', 'Smart recommendations', 'AI filter', 'Team chat', 'Calendar sync',
];

export default function Landing() {
  const canvasRef = useRef(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? '0,255,255' : '191,0,255',
      alpha: Math.random() * 0.5 + 0.2,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,255,255,${0.07 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setOffset(o => o - 1), 25);
    return () => clearInterval(id);
  }, []);

  const tickerStr = ticker.join('  ◆  ') + '  ◆  ';

  return (
    <div className="landing">
      <canvas ref={canvasRef} className="landing-canvas" />
      <div className="grid-overlay" />

      {/* Ticker */}
      <div className="landing-ticker">
        <span className="ticker-label">◉ WORKS WITH</span>
        <div className="ticker-track">
          <div className="ticker-inner" style={{ transform: `translateX(${offset % (tickerStr.length * 9)}px)` }}>
            {tickerStr}{tickerStr}
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="landing-hero">
        <div className="hero-eyebrow">
          <span className="eyebrow-pulse" />
          HACKTRACK PLATFORM · v2.0 · BY MUKUL PRASAD
        </div>

        <h1 className="hero-title">
          <span className="ht-line ht-line1">DOMINATE</span>
          <span className="ht-line ht-line2">EVERY</span>
          <span className="ht-line ht-line3">HACKATHON</span>
        </h1>

        <p className="hero-sub">
          The professional command center for serious hackers.
          Track rounds, build teams, crush deadlines.
        </p>

        <div className="hero-cta">
          <Link to="/register" className="hero-btn-primary">
            <span className="btn-icon">⚡</span>
            GET STARTED FREE
            <span className="btn-arrow">→</span>
          </Link>
          <Link to="/login" className="hero-btn-secondary">
            SIGN IN
          </Link>
        </div>

        <div className="hero-scroll-hint">
          <span className="scroll-line" />
          SCROLL
          <span className="scroll-line" />
        </div>
      </section>

      {/* Features */}
      <section className="landing-features">
        <div className="section-header">
          <div className="section-tag">CAPABILITIES</div>
          <h2 className="section-title">Built for <span className="neon-cyan">Hackers</span></h2>
          <p className="section-sub">Everything you need to compete at the highest level.</p>
        </div>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className={`feat-card feat--${f.color}`}>
              <div className="feat-icon">{f.icon}</div>
              <h3 className="feat-title">{f.title}</h3>
              <p className="feat-desc">{f.desc}</p>
              <div className="feat-glow" />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-steps">
        <div className="section-header">
          <div className="section-tag">HOW IT WORKS</div>
          <h2 className="section-title">From idea to <span className="neon-cyan">submission</span></h2>
        </div>
        <div className="steps-grid">
          {steps.map(s => (
            <div key={s.n} className="step-card">
              <span className="step-n">{s.n}</span>
              <h3 className="feat-title">{s.title}</h3>
              <p className="feat-desc">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI filter demo */}
      <section className="landing-demo">
        <div className="section-header">
          <div className="section-tag">TRY IT</div>
          <h2 className="section-title">Search like you <span className="neon-pink">talk</span></h2>
          <p className="section-sub">Live demo on sample data. Inside the app it filters your real hackathons, public teams and teammates.</p>
        </div>
        <LandingDemo />
      </section>

      {/* CTA Banner */}
      <section className="landing-banner">
        <div className="banner-inner">
          <div className="banner-glow-left" />
          <div className="banner-glow-right" />
          <h2 className="banner-title">Ready to <span className="neon-pink">Compete?</span></h2>
          <p className="banner-sub">Track every round, find the right team and never miss a deadline again.</p>
          <div className="banner-btns">
            <Link to="/register" className="hero-btn-primary">⚡ CREATE ACCOUNT</Link>
            <Link to="/login" className="hero-btn-secondary">SIGN IN →</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="footer-logo">HACKTRACK</span>
            <span className="footer-by">by Mukul Prasad</span>
          </div>
          <p className="footer-copy">© {new Date().getFullYear()} HackTrack · Built with ⚡ for the hackathon community</p>
          <div className="footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
