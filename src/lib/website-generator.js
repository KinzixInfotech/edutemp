import JSZip from "jszip";

export async function generateWebsiteZip(school, config) {
    const zip = new JSZip();

    // Normalize config to ensure sections array exists
    let sections = config.sections || [];

    // Backward compatibility: if no sections array, map old keys
    if (sections.length === 0 && (config.hero || config.about)) {
        if (config.hero) sections.push({ type: 'hero', data: config.hero });
        if (config.about) sections.push({ type: 'about', data: config.about });
        if (config.principal) sections.push({ type: 'principal', data: config.principal });
        if (config.facilities) sections.push({ type: 'facilities', data: config.facilities }); // Note: facilities data structure might differ
        if (config.contact) sections.push({ type: 'contact', data: config.contact });
    }

    const global = config.global || {
        theme: 'modern-white',
        colors: { primary: '#2563eb', secondary: '#1e293b' }
    };

    const cssContent = `
    :root {
        --primary: ${global.colors?.primary || '#2563eb'};
        --secondary: ${global.colors?.secondary || '#1e293b'};
        --background: #ffffff;
        --text: #0f172a;
        --muted: #f1f5f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; color: var(--text); line-height: 1.6; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
    
    /* Header */
    header { background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; }
    nav { display: flex; justify-content: space-between; align-items: center; height: 4rem; }
    .logo { font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .logo img { height: 2.5rem; width: auto; }
    .nav-links { display: flex; gap: 2rem; }
    .nav-links a { text-decoration: none; color: var(--secondary); font-weight: 500; }
    .nav-links a:hover { color: var(--primary); }

    /* Hero Section - Default Beautiful Styling */
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 6rem 1rem; text-align: center; color: white; }
    .hero-title { font-size: 3.5rem; margin-bottom: 1rem; font-weight: 800; line-height: 1.1; }
    .hero-subtitle { font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.95; font-weight: 300; }
    .btn { display: inline-block; background: white; color: var(--primary); padding: 1rem 2.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1); }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
    .hero-btn { background: #ff6b6b; color: white; }
    .hero-btn:hover { background: #ee5a52; }
    .hero-img { margin-top: 3rem; border-radius: 1rem; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 100%; height: auto; }

    /* Sections */
    section { padding: 5rem 0; }
    .section-title { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: var(--secondary); font-weight: 700; }
    
    /* About Section - Default Beautiful Styling */
    .about-content { max-width: 800px; margin: 0 auto; font-size: 1.125rem; line-height: 1.8; color: #4a5568; }

    /* Principal Section - Default Beautiful Styling */
    .principal { background: var(--muted); }
    .principal-grid { display: grid; grid-template-columns: 300px 1fr; gap: 4rem; align-items: center; max-width: 1000px; margin: 0 auto; }
    .principal-img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 50%; border: 5px solid white; box-shadow: 0 10px 40px rgba(0,0,0,0.1); }
    .principal-name { font-size: 1.75rem; margin-bottom: 0.5rem; color: var(--primary); font-weight: 600; }
    .principal-message { font-size: 1.125rem; line-height: 1.8; color: #4a5568; font-style: italic; }
    @media (max-width: 768px) { .principal-grid { grid-template-columns: 1fr; text-align: center; } }

    /* Facilities */
    .facilities-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; }
    .facility-card { padding: 2rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; text-align: center; transition: all 0.3s; background: white; }
    .facility-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.1); border-color: var(--primary); }
    .facility-icon { font-size: 2.5rem; margin-bottom: 1rem; display: block; }

    /* Contact Section - Default Beautiful Styling */
    .contact { background: var(--secondary); color: white; }
    .contact .section-title { color: white; }
    .contact-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 3rem; text-align: center; }
    .contact-item { padding: 2rem; background: rgba(255,255,255,0.05); border-radius: 0.75rem; transition: all 0.3s; }
    .contact-item:hover { background: rgba(255,255,255,0.1); transform: translateY(-3px); }
    .contact-item h3 { margin-bottom: 0.75rem; color: #94a3b8; text-transform: uppercase; font-size: 0.875rem; letter-spacing: 0.05em; }
    .contact-item p { font-size: 1.125rem; }

    /* Footer */
    footer { background: #0f172a; color: #94a3b8; padding: 2rem 0; text-align: center; border-top: 1px solid #1e293b; }

    /* Custom CSS - Applied on top of defaults */
    ${sections.map(section => {
        if (!section.customCss) return '';
        // Use simple section type as ID: #hero, #about, #principal, #contact
        const id = `#${section.type}`;
        if (section.customCss.includes('&')) {
            return section.customCss.replace(/&/g, id);
        } else {
            return `${id} { ${section.customCss} }`;
        }
    }).join('\n')}
  `;

    const jsContent = `
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
  `;

    const renderSection = (section) => {
        const { type, data } = section;
        const textAlign = data.textAlign || 'center';

        if (type === 'hero') {
            return `
    <section id="hero" class="hero" style="${data.bgColor ? `background: ${data.bgColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}">
        <div class="container" style="text-align: ${textAlign}">
            <h1>${data.title || ''}</h1>
            <p>${data.subtitle || ''}</p>
            ${data.ctaText ? `<a href="${data.ctaLink || '#'}" class="btn">${data.ctaText}</a>` : ''}
            ${data.image ? `<br><img src="${data.image}" alt="Hero" class="hero-img">` : ''}
        </div>
    </section>
          `;
        }

        if (type === 'about') {
            return `
    <section id="about" style="${data.bgColor ? `background: ${data.bgColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}">
        <div class="container" style="text-align: ${textAlign}">
            <h2 class="section-title">${data.title || 'About Us'}</h2>
            <div class="about-content">
                <p>${data.content || ''}</p>
            </div>
        </div>
    </section>
          `;
        }

        if (type === 'principal') {
            return `
    <section id="principal" class="principal" style="${data.bgColor ? `background: ${data.bgColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}">
        <div class="container">
            <h2 class="section-title" style="text-align: ${textAlign}">Principal's Message</h2>
            <div class="principal-grid">
                <div>
                    ${data.image ? `<img src="${data.image}" alt="${data.name}" class="principal-img">` : '<div style="background:#cbd5e1;height:300px;border-radius:0.5rem;"></div>'}
                </div>
                <div style="text-align: ${textAlign}">
                    <h3 style="font-size:1.5rem;margin-bottom:1rem;">${data.name || 'Principal'}</h3>
                    <p>${data.message || ''}</p>
                </div>
            </div>
        </div>
    </section>
          `;
        }

        if (type === 'contact') {
            return `
    <section id="contact" class="contact" style="${data.bgColor ? `background: ${data.bgColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}">
        <div class="container">
            <h2 class="section-title">Contact Us</h2>
            <div class="contact-grid">
                <div class="contact-item">
                    <h3>Address</h3>
                    <p>${data.address || ''}</p>
                </div>
                <div class="contact-item">
                    <h3>Phone</h3>
                    <p>${data.phone || ''}</p>
                </div>
                <div class="contact-item">
                    <h3>Email</h3>
                    <p>${data.email || ''}</p>
                </div>
            </div>
        </div>
    </section>
          `;
        }

        return '';
    };

    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${school.name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header style="${global.header?.bgColor ? `background: ${global.header.bgColor};` : ''}">
        <div class="container">
            <nav style="${global.header?.menuAlign === 'center' ? 'justify-content: center;' : ''}">
                ${global.header?.menuAlign === 'center' ? `
                <div style="display: flex; flex-direction: column; align-items: center; gap: 1rem;">
                    <div class="logo">
                        ${global.logo ? `<img src="${global.logo}" alt="Logo">` : (school.profilePicture ? `<img src="${school.profilePicture}" alt="Logo">` : '')}
                        <span>${school.name}</span>
                    </div>
                    <div class="nav-links">
                        ${(global.header?.links || []).map(l => `<a href="${l.url}">${l.label}</a>`).join('\n                        ')}
                    </div>
                </div>` : `
                <div class="logo">
                    ${global.logo ? `<img src="${global.logo}" alt="Logo">` : (school.profilePicture ? `<img src="${school.profilePicture}" alt="Logo">` : '')}
                    <span>${school.name}</span>
                </div>
                <div class="nav-links">
                    ${(global.header?.links || []).map(l => `<a href="${l.url}">${l.label}</a>`).join('\n                    ')}
                </div>`}
            </nav>
        </div>
    </header>

    ${sections.map(renderSection).join('\n')}

    <footer>
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${school.name}. All rights reserved.</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>
  `;

    zip.file("index.html", htmlContent);
    zip.file("style.css", cssContent);
    zip.file("script.js", jsContent);

    return await zip.generateAsync({ type: "blob" });
}
