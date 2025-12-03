import JSZip from "jszip";

export async function generateWebsiteZip(school, config) {
    const zip = new JSZip();

    const global = config.global || {
        theme: 'modern-white',
        colors: { primary: '#2563eb', secondary: '#1e293b' }
    };

    // Helper to resolve links for static export
    const resolveLink = (url, target) => {
        if (!url) return '#';
        if (target === 'section' && url.startsWith('#')) return url;
        if (target === 'page') {
            if (url === '/') return 'index.html';
            return `${url.replace(/^\//, '')}.html`;
        }
        return url;
    };

    // Collect all custom CSS from all pages
    const pages = config.pages || [{ slug: '/', sections: config.sections || [] }];
    let allCustomCss = config.global?.customCss || '';

    pages.forEach(page => {
        (page.sections || []).forEach(section => {
            if (section.customCss) {
                const id = `#section-${section.id}`;
                if (section.customCss.includes('&')) {
                    allCustomCss += `\n${section.customCss.replace(/&/g, id)}`;
                } else {
                    allCustomCss += `\n${id} { ${section.customCss} }`;
                }
            }
        });
    });

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

    /* Hero Section */
    .hero { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 6rem 1rem; text-align: center; color: white; }
    .hero-title { font-size: 3.5rem; margin-bottom: 1rem; font-weight: 800; line-height: 1.1; }
    .hero-subtitle { font-size: 1.5rem; margin-bottom: 2rem; opacity: 0.95; font-weight: 300; }
    .btn { display: inline-block; background: white; color: var(--primary); padding: 1rem 2.5rem; border-radius: 0.5rem; text-decoration: none; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 14px 0 rgba(0,0,0,0.1); }
    .btn:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.15); }
    
    /* Sections */
    section { padding: 5rem 0; }
    .section-title { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: var(--secondary); font-weight: 700; }
    
    /* Footer */
    footer { background: #0f172a; color: #94a3b8; padding: 2rem 0; text-align: center; border-top: 1px solid #1e293b; }

    /* Custom Layout Grid */
    .row { display: flex; flex-wrap: wrap; margin: 0 -1rem; margin-bottom: 1rem; }
    .col { padding: 0 1rem; box-sizing: border-box; }

    /* Custom CSS */
    ${allCustomCss}
    `;

    const jsContent = `
    // Smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    `;

    const renderSection = (section) => {
        const { type, data, id } = section;
        const sectionId = `section-${id}`;
        const style = `style="${data.bgColor ? `background: ${data.bgColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}"`;
        const textAlign = data.textAlign || 'center';

        if (type === 'hero') {
            return `
    <section id="${sectionId}" class="hero" ${style}>
        <div class="container" style="text-align: ${textAlign}">
            <h1 class="hero-title">${data.title || ''}</h1>
            <p class="hero-subtitle">${data.subtitle || ''}</p>
            ${data.ctaText ? `<a href="${resolveLink(data.ctaLink, 'url')}" class="btn">${data.ctaText}</a>` : ''}
            ${data.image ? `<br><img src="${data.image}" alt="Hero" class="hero-img" style="margin-top: 3rem; border-radius: 1rem; max-width: 100%;">` : ''}
        </div>
    </section>`;
        }

        if (type === 'about') {
            return `
    <section id="${sectionId}" ${style}>
        <div class="container" style="text-align: ${textAlign}">
            <h2 class="section-title">${data.title || 'About Us'}</h2>
            <div class="about-content" style="max-width: 800px; margin: 0 auto; font-size: 1.125rem; line-height: 1.8;">
                <p>${data.content || ''}</p>
            </div>
        </div>
    </section>`;
        }

        if (type === 'custom_layout') {
            const renderWidget = (widget) => {
                if (!widget) return '';
                if (widget.type === 'text') return `<div style="white-space: pre-wrap;">${widget.content}</div>`;
                if (widget.type === 'image') return `<img src="${widget.url}" style="max-width: 100%; height: auto; border-radius: 8px;">`;
                if (widget.type === 'button') return `<a href="${widget.url}" class="btn" style="background: var(--primary); color: white;">${widget.text}</a>`;
                if (widget.type === 'spacer') return `<div style="height: ${widget.height};"></div>`;
                return '';
            };

            return `
    <section id="${sectionId}" ${style}>
        <div class="container">
            ${(data.rows || []).map(row => `
                <div class="row">
                    ${(row.columns || []).map(col => `
                        <div class="col" style="width: ${col.width};">
                            ${renderWidget(col.widget)}
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
    </section>`;
        }

        // Add other sections...
        return '';
    };

    // Generate pages
    pages.forEach(page => {
        const filename = page.slug === '/' ? 'index.html' : `${page.slug.replace(/^\//, '')}.html`;

        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${school.name} - ${page.name}</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header style="${global.header?.bgColor ? `background: ${global.header.bgColor};` : ''}">
        <div class="container">
            <nav style="${global.header?.menuAlign === 'center' ? 'justify-content: center;' : ''}">
                <div class="logo">
                    ${global.logo ? `<img src="${global.logo}" alt="Logo">` : (school.profilePicture ? `<img src="${school.profilePicture}" alt="Logo">` : '')}
                    <span>${school.name}</span>
                </div>
                <div class="nav-links">
                    ${(global.header?.links || []).map(l => `<a href="${resolveLink(l.url, l.target)}">${l.label}</a>`).join('\n                    ')}
                </div>
            </nav>
        </div>
    </header>

    ${(page.sections || []).map(renderSection).join('\n')}

    <footer style="${global.footer?.bgColor ? `background: ${global.footer.bgColor};` : ''}">
        <div class="container">
            <p>${global.footer?.text || `&copy; ${new Date().getFullYear()} ${school.name}. All rights reserved.`}</p>
        </div>
    </footer>

    <script src="script.js"></script>
</body>
</html>`;

        zip.file(filename, htmlContent);
    });

    zip.file("style.css", cssContent);
    zip.file("script.js", jsContent);

    return await zip.generateAsync({ type: "blob" });
}
