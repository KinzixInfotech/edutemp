import React, { useEffect, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { generateWebsiteZip } from "@/lib/website-generator";

export function LivePreview({ config, school }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    const updatePreview = async () => {
      if (!iframeRef.current || !config) return;

      // Generate HTML string directly instead of ZIP for preview
      // We can reuse logic from generator but output string
      // For now, let's mock a simple render or adapt generator

      // Actually, let's just construct the HTML here for speed or refactor generator to return HTML string
      // Ideally generator should return { html, css, js }

      // Temporary: Basic HTML construction matching generator logic
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              :root {
                --primary: ${config.global?.colors?.primary || '#2563eb'};
                --secondary: ${config.global?.colors?.secondary || '#1e293b'};
              }
              body { font-family: system-ui; margin: 0; }
              .container { max-width: 1200px; margin: 0 auto; padding: 1rem; }
              header { padding: 1rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
              .logo { font-weight: bold; display: flex; align-items: center; gap: 0.5rem; }
              .logo img { height: 2.5rem; }
              
              /* Hero - Beautiful Default */
              .hero { padding: 4rem 1rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
              .hero-title { font-size: 3.5rem; font-weight: 800; margin-bottom: 1rem; }
              .hero-subtitle { font-size: 1.5rem; opacity: 0.95; margin-bottom: 2rem; }
              .hero-btn { background: #ff6b6b; color: white; padding: 1rem 2.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; display: inline-block; box-shadow: 0 4px 14px rgba(0,0,0,0.1); }
              .hero-btn:hover { background: #ee5a52; transform: translateY(-2px); }
              .hero-img { margin-top: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 100%; }
              
              .btn { background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 0.25rem; text-decoration: none; }
              .section { padding: 3rem 1rem; }
              .section-title { font-size: 2.5rem; font-weight: 700; margin-bottom: 2rem; }
              
              /* Principal - Beautiful Default */
              .principal { background: #f1f5f9; }
              .principal-grid { display: grid; grid-template-columns: 300px 1fr; gap: 4rem; align-items: center; max-width: 1000px; margin: 0 auto; }
              .principal-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 5px solid white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
              .principal-name { font-size: 1.75rem; color: #667eea; font-weight: 600; margin-bottom: 0.5rem; }
              .principal-message { font-size: 1.125rem; line-height: 1.8; font-style: italic; }
              
              /* Contact - Beautiful Default */
              .contact { background: #1e293b; color: white; }
              .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 3rem; }
              .contact-item { padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 0.75rem; }
              .contact-item h3 { color: #94a3b8; text-transform: uppercase; font-size: 0.875rem; margin-bottom: 0.75rem; }
              
              .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
              
              /* Custom CSS - Overrides */
              ${config.sections.map(section => {
        if (!section.customCss) return '';
        // Use simple section type as ID: #hero, #about, #principal, #contact
        const css = section.customCss;
        const id = `#${section.type}`;

        if (css.includes('&')) {
          return css.replace(/&/g, id);
        } else {
          return `${id} { ${css} }`;
        }
      }).join('\n')}
            </style>
          </head>
          <body>
            <header style="${config.global?.header?.bgColor ? `background: ${config.global.header.bgColor};` : ''}">
              <nav style="justify-content: ${config.global?.header?.menuAlign === 'center' ? 'center' : 'space-between'}">
                ${config.global?.header?.menuAlign === 'center' ? `
                  <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <div class="logo">
                      ${config.global?.logo ? `<img src="${config.global.logo}" alt="Logo">` : (school.profilePicture ? `<img src="${school.profilePicture}" alt="Logo">` : '')}
                      <span>${school.name}</span>
                    </div>
                    <div style="display: flex; gap: 1.5rem;">
                      ${(config.global?.header?.links || []).map(l => `<a href="${l.url}" style="color: var(--secondary); text-decoration: none;">${l.label}</a>`).join('')}
                    </div>
                  </div>
                ` : `
                  <div class="logo">
                    ${config.global?.logo ? `<img src="${config.global.logo}" alt="Logo">` : (school.profilePicture ? `<img src="${school.profilePicture}" alt="Logo">` : '')}
                    <span>${school.name}</span>
                  </div>
                  <div style="display: flex; gap: 1.5rem; align-items: center;">
                    ${(config.global?.header?.links || []).map(l => `<a href="${l.url}" style="color: var(--secondary); text-decoration: none;">${l.label}</a>`).join('')}
                  </div>
                `}
              </nav>
            </header>
            
            ${config.sections.map(section => {
        if (section.type === 'hero') {
          return `
                  <div id="hero" class="hero" style="${section.data.bgColor ? `background: ${section.data.bgColor};` : ''} ${section.data.textColor ? `color: ${section.data.textColor} !important;` : ''}">
                    <div class="container" style="text-align: ${section.data.textAlign || 'center'}; ${section.data.textColor ? `color: ${section.data.textColor};` : ''}">
                        <h1 style="${section.data.textColor ? `color: ${section.data.textColor};` : ''}">${section.data.title || ''}</h1>
                        <p style="${section.data.textColor ? `color: ${section.data.textColor};` : ''}">${section.data.subtitle || ''}</p>
                        ${section.data.ctaText ? `<a href="${section.data.ctaLink || '#'}" class="btn" style="${section.data.textColor ? `color: ${section.data.textColor};` : ''}">${section.data.ctaText}</a>` : ''}
                        ${section.data.image ? `<br><img src="${section.data.image}" alt="Hero" class="hero-img">` : ''}
                    </div>
                  </div>
                `;
        }
        if (section.type === 'about') {
          return `
                  <div id="about" class="section" style="${section.data.bgColor ? `background: ${section.data.bgColor};` : ''} ${section.data.textColor ? `color: ${section.data.textColor};` : ''}">
                    <div class="container" style="text-align: ${section.data.textAlign || 'center'}">
                        <h2 class="section-title">${section.data.title || 'About Us'}</h2>
                        <div class="about-content">
                            <p>${section.data.content || ''}</p>
                        </div>
                    </div>
                  </div>
                `;
        }
        if (section.type === 'principal') {
          return `
                  <div id="principal" class="section principal" style="${section.data.bgColor ? `background: ${section.data.bgColor};` : ''} ${section.data.textColor ? `color: ${section.data.textColor};` : ''}">
                    <div class="container">
                        <h2 class="section-title" style="text-align: ${section.data.textAlign || 'center'}">Principal's Message</h2>
                        <div class="principal-grid">
                            <div>
                                ${section.data.image ? `<img src="${section.data.image}" alt="${section.data.name}" class="principal-img">` : '<div style="background:#cbd5e1;height:300px;border-radius:0.5rem;"></div>'}
                            </div>
                            <div style="text-align: ${section.data.textAlign || 'left'}">
                                <h3 style="font-size:1.5rem;margin-bottom:1rem;">${section.data.name || 'Principal'}</h3>
                                <p>${section.data.message || ''}</p>
                            </div>
                        </div>
                    </div>
                  </div>
                `;
        }
        if (section.type === 'contact') {
          return `
                  <div id="contact" class="section contact" style="${section.data.bgColor ? `background: ${section.data.bgColor};` : ''} ${section.data.textColor ? `color: ${section.data.textColor};` : ''}">
                    <div class="container">
                        <h2 class="section-title">Contact Us</h2>
                        <div class="contact-grid">
                            <div class="contact-item">
                                <h3>Address</h3>
                                <p>${section.data.address || ''}</p>
                            </div>
                            <div class="contact-item">
                                <h3>Phone</h3>
                                <p>${section.data.phone || ''}</p>
                            </div>
                            <div class="contact-item">
                                <h3>Email</h3>
                                <p>${section.data.email || ''}</p>
                            </div>
                        </div>
                    </div>
                  </div>
                `;
        }
        return '';
      }).join('\n')}
          </body>
        </html>
      `;

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      iframeRef.current.src = url;

      return () => URL.revokeObjectURL(url);
    };

    updatePreview();
  }, [config, school]);

  return (
    <Card className="flex-1 h-full overflow-hidden rounded-lg border-l-0">
      <iframe
        ref={iframeRef}
        className="w-full h-full border-0 bg-white"
        title="Live Preview"
      />
    </Card>
  );
}
