import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './Landing.css';

const features = [
  { icon: '⚡', title: 'Real-Time Dashboard', desc: 'Track all your hackathons, rounds, and deadlines in one unified command center.', color: 'cyan' },
  { icon: '🌍', title: 'Hackathon Worlds', desc: 'Discover public hackathons, form teams, and collaborate with participants globally.', color: 'purple' },
  { icon: '🔔', title: 'Smart Notifications', desc: 'Never miss a deadline. Get alerts for rounds, submissions, and team updates.', color: 'pink' },
  { icon: '👥', title: 'Team Management', desc: 'Invite members, manage roles, chat privately, and track team progress.', color: 'green' },
  { icon: '📅', title: 'Calendar View', desc: 'Visualize your hackathon schedule with an interactive calendar and round markers.', color: 'cyan' },
  { icon: '🔐', title: 'Secure Auth', desc: 'OTP-based registration, JWT sessions, and Google OAuth for seamless access.', color: 'purple' },
];

const ticker = [
  'HackTheMountains 2025', 'DevPost Global Hack', 'MLH Spring League',
  'Google Solution Challenge', 'Smart India Hackathon', 'HackMIT 2025',
  'ETHGlobal', 'NASA Space Apps', 'HackNITR', 'CodeForces Round',
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
        <span className="ticker-label">◉ LIVE</span>
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

      {/* CTA Banner */}
      <section className="landing-banner">
        <div className="banner-inner">
          <div className="banner-glow-left" />
          <div className="banner-glow-right" />
          <h2 className="banner-title">Ready to <span className="neon-pink">Compete?</span></h2>
          <p className="banner-sub">Join thousands of hackers tracking their journey on HackTrack.</p>
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
          <p className="footer-copy">© 2025 HackTrack · Built with ⚡ for the hackathon community</p>
          <div className="footer-links">
            <Link to="/login">Sign In</Link>
            <Link to="/register">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
