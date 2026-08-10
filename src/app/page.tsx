'use client';

import { useEffect, useState, type FormEvent } from "react";
import "./personal.css";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [toTop, setToTop] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [formStatus, setFormStatus] = useState<{ text: string; kind: "success" | "error" | "" }>({ text: "", kind: "" });
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // scroll listener
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
      setToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    setYear(new Date().getFullYear());
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // reveal observer
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.dataset.reveal!;
            setRevealed((prev) => new Set(prev).add(id));
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -50px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // body scroll lock when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href.startsWith("#") && href.length > 1) {
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 70;
        window.scrollTo({ top, behavior: "smooth" });
      }
    }
    closeMenu();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = (fd.get("name") as string)?.trim();
    const email = (fd.get("email") as string)?.trim();
    const message = (fd.get("message") as string)?.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !email || !message) {
      setFormStatus({ text: "Please fill in all fields.", kind: "error" });
      return;
    }
    if (!emailRe.test(email)) {
      setFormStatus({ text: "Please enter a valid email address.", kind: "error" });
      return;
    }

    const subject = encodeURIComponent(`Portfolio message from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:you@example.com?subject=${subject}&body=${body}`;
    setFormStatus({ text: "Opening your email client...", kind: "success" });
    (e.target as HTMLFormElement).reset();
  };

  const reveal = (id: string) =>
    revealed.has(id) ? "reveal visible" : "reveal";

  return (
    <>
      {/* NAVBAR */}
      <header className={`navbar ${scrolled ? "scrolled" : ""}`}>
        <div className="container nav-inner">
          <a href="#hero" className="brand" onClick={(e) => handleNavClick(e, "#hero")}>
            <span className="brand-dot"></span>
            <span className="brand-name">yourname</span>
          </a>
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="#about" onClick={(e) => handleNavClick(e, "#about")}>About</a>
            <a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>Skills</a>
            <a href="#projects" onClick={(e) => handleNavClick(e, "#projects")}>Projects</a>
            <a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>Contact</a>
            <a href="#contact" className="btn btn-primary btn-sm" onClick={(e) => handleNavClick(e, "#contact")}>Hire me</a>
          </nav>
          <button
            className={`nav-toggle ${menuOpen ? "active" : ""}`}
            aria-label="Toggle menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="hero" id="hero">
        <div className="container hero-grid">
          <div className={`hero-text ${reveal("hero-text")}`} data-reveal="hero-text">
            <p className="eyebrow">Hello, I&apos;m</p>
            <h1 className="hero-title">Your Name</h1>
            <h2 className="hero-subtitle">
              I build <span className="gradient-text">clean digital experiences</span>
            </h2>
            <p className="hero-desc">
              A passionate developer focused on creating polished, accessible,
              and performant products. I care about the details that make
              software feel great to use.
            </p>
            <div className="hero-cta">
              <a href="#projects" className="btn btn-primary" onClick={(e) => handleNavClick(e, "#projects")}>View my work</a>
              <a href="#contact" className="btn btn-ghost" onClick={(e) => handleNavClick(e, "#contact")}>Get in touch</a>
            </div>
            <div className="hero-socials">
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer">GitHub</a>
              <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
              <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer">Twitter</a>
              <a href="mailto:you@example.com">Email</a>
            </div>
          </div>
          <div className={`hero-visual ${reveal("hero-visual")}`} data-reveal="hero-visual" aria-hidden="true">
            <div className="blob blob-1"></div>
            <div className="blob blob-2"></div>
            <div className="hero-card">
              <div className="hero-card-row">
                <span className="dot dot-red"></span>
                <span className="dot dot-yellow"></span>
                <span className="dot dot-green"></span>
              </div>
              <pre className="hero-code"><code>{`const `}<span className="k">developer</span>{` = {
  name: `}<span className="s">'Your Name'</span>{`,
  role: `}<span className="s">'Full-stack Developer'</span>{`,
  stack: [`}<span className="s">'JS'</span>{`, `}<span className="s">'TS'</span>{`, `}<span className="s">'React'</span>{`],
  available: `}<span className="k">true</span>{`,
};`}</code></pre>
            </div>
          </div>
        </div>
        <a href="#about" className="scroll-cue" aria-label="Scroll down" onClick={(e) => handleNavClick(e, "#about")}>
          <span></span>
        </a>
      </section>

      {/* ABOUT */}
      <section className="section" id="about">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">01 — About</p>
            <h2 className="section-title">A bit about me</h2>
          </header>
          <div className="about-grid">
            <div className={`about-text ${reveal("about-text")}`} data-reveal="about-text">
              <p>
                I&apos;m a developer who loves turning ideas into products. Over the past
                few years I&apos;ve worked across the stack — from designing database
                schemas to polishing pixel-perfect UIs. I believe great software
                comes from empathy for the user combined with disciplined engineering.
              </p>
              <p>
                When I&apos;m not coding, you&apos;ll find me reading about design systems,
                experimenting with side projects, or exploring a new coffee shop.
                I&apos;m always open to interesting conversations and collaborations.
              </p>
              <ul className="about-stats">
                <li><strong>5+</strong><span>Years building things</span></li>
                <li><strong>30+</strong><span>Projects shipped</span></li>
                <li><strong>∞</strong><span>Cups of coffee</span></li>
              </ul>
            </div>
            <aside className={`about-card ${reveal("about-card")}`} data-reveal="about-card">
              <h3>Quick facts</h3>
              <dl>
                <dt>Location</dt><dd>Earth 🌍</dd>
                <dt>Languages</dt><dd>English, Persian</dd>
                <dt>Focus</dt><dd>Web &amp; Product</dd>
                <dt>Availability</dt><dd>Open to work</dd>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {/* SKILLS */}
      <section className="section section-alt" id="skills">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">02 — Skills</p>
            <h2 className="section-title">Tools I work with</h2>
          </header>
          <div className="skills-grid">
            {[
              { t: "Frontend", d: "Building responsive, accessible interfaces with modern tooling.", tags: ["HTML", "CSS", "JavaScript", "TypeScript", "React", "Next.js", "Tailwind"] },
              { t: "Backend", d: "Designing APIs and services that scale and stay maintainable.", tags: ["Node.js", "Express", "Python", "FastAPI", "REST", "GraphQL", "WebSockets"] },
              { t: "Data", d: "Modeling, querying, and optimizing data stores.", tags: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "Prisma", "SQLite"] },
              { t: "Tooling", d: "Shipping with confidence using proven workflows.", tags: ["Git", "Docker", "CI/CD", "Vercel", "Linux", "Figma"] },
            ].map((s, i) => (
              <article key={s.t} className={`skill-card ${reveal(`skill-${i}`)}`} data-reveal={`skill-${i}`}>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
                <ul className="tags">{s.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROJECTS */}
      <section className="section" id="projects">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">03 — Projects</p>
            <h2 className="section-title">Selected work</h2>
          </header>
          <div className="projects-grid">
            {[
              { n: "01", t: "Project Alpha", d: "A SaaS dashboard for tracking metrics in real time, built with Next.js and WebSockets.", tags: ["Next.js", "Prisma", "WebSocket"], c1: "#6366f1", c2: "#a855f7" },
              { n: "02", t: "Project Beta", d: "An AI-powered writing assistant that drafts, edits, and summarizes content with style.", tags: ["Python", "FastAPI", "LLM"], c1: "#06b6d4", c2: "#3b82f6" },
              { n: "03", t: "Project Gamma", d: "A mobile-first e-commerce storefront with cart, checkout, and Stripe payments.", tags: ["React", "Stripe", "Tailwind"], c1: "#f59e0b", c2: "#ef4444" },
              { n: "04", t: "Project Delta", d: "A collaborative note-taking app with real-time sync and offline support.", tags: ["Vue", "IndexedDB", "PWA"], c1: "#10b981", c2: "#06b6d4" },
            ].map((p, i) => (
              <article key={p.t} className={`project-card ${reveal(`project-${i}`)}`} data-reveal={`project-${i}`}>
                <div className="project-thumb" style={{ ["--c1" as string]: p.c1, ["--c2" as string]: p.c2 }}>
                  <span className="project-num">{p.n}</span>
                </div>
                <div className="project-body">
                  <h3>{p.t}</h3>
                  <p>{p.d}</p>
                  <ul className="tags">{p.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
                  <div className="project-links">
                    <a href="#" target="_blank" rel="noopener noreferrer">Live →</a>
                    <a href="#" target="_blank" rel="noopener noreferrer">Code →</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="section section-alt" id="contact">
        <div className="container">
          <header className="section-head">
            <p className="section-eyebrow">04 — Contact</p>
            <h2 className="section-title">Let&apos;s build something</h2>
          </header>
          <div className="contact-grid">
            <div className={`contact-info ${reveal("contact-info")}`} data-reveal="contact-info">
              <p>
                Have a project in mind, a question, or just want to say hi?
                Drop a message and I&apos;ll get back to you within a day or two.
              </p>
              <ul className="contact-list">
                <li>
                  <span className="contact-label">Email</span>
                  <a href="mailto:you@example.com">you@example.com</a>
                </li>
                <li>
                  <span className="contact-label">GitHub</span>
                  <a href="https://github.com/" target="_blank" rel="noopener noreferrer">github.com/yourname</a>
                </li>
                <li>
                  <span className="contact-label">LinkedIn</span>
                  <a href="https://linkedin.com/" target="_blank" rel="noopener noreferrer">linkedin.com/in/yourname</a>
                </li>
              </ul>
            </div>
            <form className={`contact-form ${reveal("contact-form")}`} data-reveal="contact-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input type="text" id="name" name="name" placeholder="Jane Doe" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" placeholder="jane@example.com" required />
              </div>
              <div className="field">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows={5} placeholder="Tell me about your idea..." required></textarea>
              </div>
              <button type="submit" className="btn btn-primary btn-block">Send message</button>
              <p className={`form-status ${formStatus.kind}`} role="status">{formStatus.text}</p>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container footer-inner">
          <p>© {year ?? ""} Your Name. Built with care.</p>
          <ul className="footer-links">
            <li><a href="#about" onClick={(e) => handleNavClick(e, "#about")}>About</a></li>
            <li><a href="#skills" onClick={(e) => handleNavClick(e, "#skills")}>Skills</a></li>
            <li><a href="#projects" onClick={(e) => handleNavClick(e, "#projects")}>Projects</a></li>
            <li><a href="#contact" onClick={(e) => handleNavClick(e, "#contact")}>Contact</a></li>
          </ul>
        </div>
      </footer>

      <button
        className={`to-top ${toTop ? "visible" : ""}`}
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        ↑
      </button>
    </>
  );
}
