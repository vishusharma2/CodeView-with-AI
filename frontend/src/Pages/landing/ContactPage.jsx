import React from "react";
import Navbar from "../../components/Navbar";
import { GitHubIcon, LinkedInIcon, EmailIcon, GlobeIcon } from "../../components/Icons";

const ContactPage = () => {
  const socialLinks = [
    { label: 'GitHub', href: 'https://github.com/vishusharma2', icon: <GitHubIcon /> },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/vis-sha/', icon: <LinkedInIcon /> },
    { label: 'Email', href: 'mailto:vishu.sharma90861@gmail.com', icon: <EmailIcon /> },
    { label: 'Portfolio', href: 'https://portfolio-sigma-ruddy-79.vercel.app/', icon: <GlobeIcon /> },
  ];
  const socialLinks2 = [
    { label: 'GitHub', href: 'https://github.com/Priyanka7081', icon: <GitHubIcon /> },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/priyanka-fullstack-developer/', icon: <LinkedInIcon /> },
    { label: 'Email', href: 'mailto:priyankau7081@gmail.com', icon: <EmailIcon /> },
  ];
  const socialLinks3 = [
    { label: 'GitHub', href: 'https://github.com/Shivam1327', icon: <GitHubIcon /> },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/shivamkr1327/', icon: <LinkedInIcon /> },
    { label: 'Email', href: 'mailto:san.shivam1327@gmail.com', icon: <EmailIcon /> },
  ];

  return (
    <div className="landing-root">
      <Navbar />

      <section id="contact" style={{
        padding: '140px 24px 100px', position: 'relative', overflow: 'hidden', minHeight: 'calc(100vh - 80px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg, #0a0e27 0%, #0d1030 50%, #0a0e27 100%)',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)', filter: 'blur(80px)' }} />

        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <span className="landing-section-label">Contact</span>
          <h2 className="landing-section-title">Get in Touch</h2>
          <p className="landing-section-desc">Have questions, feedback, or want to collaborate? Reach out!</p>

          {/* Developer Cards Container */}
          <div style={{
            display: 'flex', alignItems: 'stretch', justifyContent: 'center', gap: '40px',
            marginTop: '56px', flexWrap: 'wrap'
          }}>
            {/* Card 1 */}
            <div style={{
              flex: '1 1 300px', maxWidth: '340px', padding: '48px 32px',
              position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.15)',
              borderRadius: '24px', backdropFilter: 'blur(40px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 50px rgba(99,102,241,0.25)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(99,102,241,0.12) 0%, rgba(255,255,255,0.02) 100%)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0.01) 100%)';
              }}>
              {/* Avatar Glow */}
              <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'radial-gradient(ellipse, rgba(99,102,241,0.4) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

              {/* Avatar */}
              <div style={{
                flexShrink: 0, position: 'relative', zIndex: 2, width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(99,102,241,0.4)', border: '2px solid rgba(255,255,255,0.2)'
              }}>
                <img src="/author1.JPG" alt="Vishu Sharma" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <h3 style={{ position: 'relative', zIndex: 2, fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 6px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Vishu Sharma</h3>
              <p style={{ position: 'relative', zIndex: 2, fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 32px', flex: 1, lineHeight: 1.5 }}>Full-Stack Developer &amp; Creator of CodeView</p>

              {/* Social Links */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {socialLinks.map((link, i) => (
                  <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
                    title={link.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px',
                      borderRadius: '14px', textDecoration: 'none',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818cf8'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Card 2 */}
            <div style={{
              flex: '1 1 300px', maxWidth: '340px', padding: '48px 32px',
              position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.15)',
              borderRadius: '24px', backdropFilter: 'blur(40px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 50px rgba(16,185,129,0.25)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(16,185,129,0.12) 0%, rgba(255,255,255,0.02) 100%)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(16,185,129,0.08) 0%, rgba(255,255,255,0.01) 100%)';
              }}>
              {/* Avatar Glow */}
              <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'radial-gradient(ellipse, rgba(16,185,129,0.4) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

              {/* Avatar */}
              <div style={{
                flexShrink: 0, position: 'relative', zIndex: 2, width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(16,185,129,0.4)', border: '2px solid rgba(255,255,255,0.2)'
              }}>
                <img src="/author2.png" alt="Priyanka Kumari" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <h3 style={{ position: 'relative', zIndex: 2, fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 6px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Priyanka Kumari</h3>
              <p style={{ position: 'relative', zIndex: 2, fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 32px', flex: 1, lineHeight: 1.5 }}>Full-Stack Developer & partner in CodeView</p>

              {/* Social Links */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {socialLinks2.slice(0, 4).map((link, i) => (
                  <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
                    title={link.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px',
                      borderRadius: '14px', textDecoration: 'none',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(16,185,129,0.15)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.4)'; e.currentTarget.style.color = '#34d399'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>

            {/* Card 3 - Shivam Kumar */}
            <div style={{
              flex: '1 1 300px', maxWidth: '340px', padding: '48px 32px',
              position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column',
              background: 'linear-gradient(145deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid rgba(255,255,255,0.06)', borderTopColor: 'rgba(255,255,255,0.15)',
              borderRadius: '24px', backdropFilter: 'blur(40px)',
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.4s ease',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-10px)';
                e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.3), 0 0 50px rgba(59,130,246,0.25)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(59,130,246,0.12) 0%, rgba(255,255,255,0.02) 100%)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)';
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(59,130,246,0.08) 0%, rgba(255,255,255,0.01) 100%)';
              }}>
              {/* Avatar Glow */}
              <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', width: '200px', height: '100px', background: 'radial-gradient(ellipse, rgba(59,130,246,0.4) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

              {/* Avatar */}
              <div style={{
                flexShrink: 0, position: 'relative', zIndex: 2, width: '88px', height: '88px', borderRadius: '50%', margin: '0 auto 24px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                background: 'rgba(255,255,255,0.05)', boxShadow: '0 10px 30px rgba(59,130,246,0.4)', border: '2px solid rgba(255,255,255,0.2)'
              }}>
                <img src="/author3.jpeg" alt="Shivam Kumar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <h3 style={{ position: 'relative', zIndex: 2, fontSize: '24px', fontWeight: 700, color: 'white', margin: '0 0 6px', fontFamily: "'Space Grotesk','Inter',sans-serif" }}>Shivam Kumar</h3>
              <p style={{ position: 'relative', zIndex: 2, fontSize: '15px', color: 'rgba(255,255,255,0.5)', margin: '0 0 32px', flex: 1, lineHeight: 1.5 }}>Devops Engineer & Partner in CodeView</p>

              {/* Social Links */}
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {socialLinks3.slice(0, 4).map((link, i) => (
                  <a key={i} href={link.href} target="_blank" rel="noopener noreferrer"
                    title={link.label}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', width: '46px', height: '46px',
                      borderRadius: '14px', textDecoration: 'none',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.color = '#60a5fa'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; e.currentTarget.style.transform = 'translateY(0)' }}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div className="landing-footer-brand">
            <img src="/icon.png" alt="CodeView" className="landing-footer-logo" />
            <span className="landing-footer-name">CodeView</span>
          </div>
          <p className="landing-footer-copy">© 2026 CodeView. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
