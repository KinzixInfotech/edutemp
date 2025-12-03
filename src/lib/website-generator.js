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
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;600;700&display=swap');
    
    :root {
        --primary: ${global.colors?.primary || '#2563eb'};
        --secondary: ${global.colors?.secondary || '#1e293b'};
        --primary-dark: #1e40af;
        --text-dark: #1f2937;
        --text-medium: #4b5563;
        --text-light: #6b7280;
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
        font-family: 'Open Sans', sans-serif; 
        color: var(--text-dark); 
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
    }
    
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', sans-serif;
        font-weight: 700;
        line-height: 1.2;
        color: var(--text-dark);
        margin-bottom: 1rem;
    }
    h1 { font-size: 3rem; }
    h2 { font-size: 2.5rem; }
    h3 { font-size: 2rem; }
    p { margin-bottom: 1rem; color: var(--text-medium); }
    
    /* Header */
    header { background: white; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 50; }
    nav { display: flex; justify-content: space-between; align-items: center; padding: 1rem 0; }
    .logo { font-weight: bold; font-size: 1.25rem; display: flex; align-items: center; gap: 0.5rem; }
    .logo img { height: 2.5rem; width: auto; }
    .nav-links { display: flex; gap: 2rem; }
    .nav-links a { text-decoration: none; color: var(--secondary); font-weight: 500; transition: color 0.25s; }
    .nav-links a:hover { color: var(--primary); }

    /* Buttons */
    .btn {
        display: inline-block;
        padding: 12px 28px;
        font-family: 'Inter', sans-serif;
        font-size: 1rem;
        font-weight: 600;
        text-decoration: none;
        text-align: center;
        border-radius: 8px;
        transition: all 0.25s ease;
        cursor: pointer;
    }
    .btn-primary {
        background: var(--primary);
        color: white;
    }
    .btn-primary:hover {
        background: var(--primary-dark);
        transform: translateY(-2px);
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }

    /* Hero Slider */
    .hero-slider {
        position: relative;
        width: 100%;
        overflow: hidden;
    }
    .hero-slide {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        transition: opacity 0.5s ease;
    }
    .hero-slide.active {
        opacity: 1;
        position: relative;
    }
    .hero-slide img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .hero-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(to right, rgba(0,0,0,0.6), rgba(0,0,0,0.3));
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .hero-content {
        text-align: center;
        color: white;
        max-width: 800px;
        padding: 0 20px;
    }
    .hero-content h1 {
        font-size: 3.5rem;
        font-weight: 800;
        margin-bottom: 1rem;
        color: white;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }
    .hero-content p {
        font-size: 1.25rem;
        margin-bottom: 2rem;
        color: rgba(255,255,255,0.95);
    }
    .slider-controls {
        position: absolute;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 10px;
    }
    .slider-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: rgba(255,255,255,0.5);
        border: none;
        cursor: pointer;
        transition: all 0.25s ease;
    }
    .slider-dot.active {
        background: white;
        width: 30px;
        border-radius: 9999px;
    }

    /* Content Image Text */
    .content-image-text {
        padding: 80px 20px;
    }
    .content-wrapper {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 60px;
        align-items: center;
    }
    .content-image-text.image-right .content-wrapper {
        direction: rtl;
    }
    .content-image-text.image-right .text-column {
        direction: ltr;
    }
    .image-column img {
        width: 100%;
        height: auto;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }

    /* Content Cards */
    .content-cards {
        padding: 80px 20px;
        background: #f9fafb;
    }
    .content-cards h2 {
        text-align: center;
        font-size: 2.5rem;
        margin-bottom: 3rem;
    }
    .cards-grid {
        display: grid;
        gap: 30px;
    }
    .cards-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .cards-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .cards-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .card {
        background: white;
        padding: 30px;
        transition: all 0.25s ease;
        text-align: center;
    }
    .card.elevated {
        border-radius: 12px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .card.elevated:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .card.flat {
        border-radius: 12px;
    }
    .card-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    .card h3 {
        font-size: 1.5rem;
        margin-bottom: 1rem;
    }
    .card a {
        color: var(--primary);
        text-decoration: none;
        font-weight: 600;
    }

    /* Stats */
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 30px;
        text-align: center;
    }
    .stat-number {
        font-size: 3rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
    }
    .stat-label {
        font-size: 1.1rem;
        opacity: 0.9;
    }

    /* Message Profile */
    .message-profile {
        padding: 80px 20px;
    }
    .message-profile .content-wrapper {
        grid-template-columns: 300px 1fr;
    }
    .profile-image-column {
        text-align: center;
    }
    .profile-image-column img {
        width: 100%;
        border-radius: 12px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        margin-bottom: 1rem;
    }
    .profile-name {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.25rem;
    }
    .profile-designation {
        font-size: 1rem;
        color: var(--primary);
        font-weight: 600;
    }

    /* Gallery Grid */
    .gallery-grid {
        padding: 80px 20px;
    }
    .gallery-images {
        display: grid;
        gap: 16px;
    }
    .gallery-images.cols-2 { grid-template-columns: repeat(2, 1fr); }
    .gallery-images.cols-3 { grid-template-columns: repeat(3, 1fr); }
    .gallery-images.cols-4 { grid-template-columns: repeat(4, 1fr); }
    .gallery-item {
        position: relative;
        overflow: hidden;
        border-radius: 8px;
        cursor: pointer;
        aspect-ratio: 4/3;
    }
    .gallery-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.35s ease;
    }
    .gallery-item:hover img {
        transform: scale(1.1);
    }
    .gallery-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        opacity: 0;
        transition: opacity 0.25s ease;
        display: flex;
        align-items: center;
        justify-center;
        color: white;
    }
    .gallery-item:hover .gallery-overlay {
        opacity: 1;
    }

    /* Masonry Grid */
    .masonry-grid {
        column-count: 3;
        column-gap: 16px;
    }
    .masonry-item {
        break-inside: avoid;
        margin-bottom: 16px;
    }
    .masonry-item img {
        width: 100%;
        border-radius: 8px;
    }

    /* Video Container */
    .video-container {
        aspect-ratio: 16/9;
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
    }

    /* Tabs */
    .tabs-content {
        padding: 80px 20px;
    }
    .tabs-header {
        display: flex;
        gap: 0;
        border-bottom: 2px solid #e5e7eb;
        margin-bottom: 2rem;
    }
    .tab-button {
        padding: 1rem 2rem;
        background: none;
        border: none;
        font-family: 'Inter', sans-serif;
        font-size: 1.1rem;
        font-weight: 600;
        color: #6b7280;
        cursor: pointer;
        position: relative;
        transition: color 0.25s ease;
    }
    .tab-button.active {
        color: var(--primary);
    }
    .tab-button.active::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 0;
        width: 100%;
        height: 3px;
        background: var(--primary);
    }
    .tab-panel {
        display: none;
    }
    .tab-panel.active {
        display: block;
    }

    /* Accordion */
    .accordion {
        padding: 80px 20px;
    }
    .accordion-item {
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 1rem;
        overflow: hidden;
    }
    .accordion-header {
        padding: 1.5rem;
        background: #f9fafb;
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .accordion-header h3 {
        margin: 0;
        font-size: 1.25rem;
    }
    .accordion-icon {
        font-size: 1.5rem;
        transition: transform 0.25s ease;
    }
    .accordion-item.active .accordion-icon {
        transform: rotate(180deg);
    }
    .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.35s ease;
    }
    .accordion-item.active .accordion-content {
        max-height: 1000px;
    }
    .accordion-body {
        padding: 1.5rem;
    }

    /* Timeline */
    .timeline {
        position: relative;
    }
    .timeline-item {
        display: grid;
        grid-template-columns: 100px 40px 1fr;
        gap: 20px;
        margin-bottom: 40px;
    }
    .timeline-year {
        text-align: right;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--primary);
    }
    .timeline-dot {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: var(--primary);
        margin: 0 auto;
        position: relative;
    }
    .timeline-dot::after {
        content: '';
        position: absolute;
        top: 16px;
        left: 7px;
        width: 2px;
        height: 100px;
        background: #e5e7eb;
    }
    .timeline-item:last-child .timeline-dot::after {
        display: none;
    }
    .timeline-content h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
    }

    /* Sections */
    section { padding: 5rem 0; }
    .section-title { font-size: 2.5rem; text-align: center; margin-bottom: 3rem; color: var(--secondary); font-weight: 700; }
    .max-w-4xl { max-width: 896px; margin: 0 auto; }
    .max-w-5xl { max-width: 1024px; margin: 0 auto; }
    .text-center { text-align: center; }
    .text-xl { font-size: 1.25rem; }
    .text-2xl { font-size: 1.5rem; }
    .text-4xl { font-size: 2.25rem; }
    .italic { font-style: italic; }
    .opacity-90 { opacity: 0.9; }
    .mb-4 { margin-bottom: 1rem; }
    .mb-6 { margin-bottom: 1.5rem; }
    .mb-8 { margin-bottom: 2rem; }
    .py-20 { padding-top: 5rem; padding-bottom: 5rem; }
    .px-4 { padding-left: 1rem; padding-right: 1rem; }
    
    /* Quote Author */
    .quote-author {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
    }
    .author-image {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        object-fit: cover;
    }
    .author-name {
        font-weight: 700;
        font-size: 1.125rem;
    }
    .author-designation {
        color: var(--text-light);
    }
    
    /* Footer */
    footer { background: #0f172a; color: #94a3b8; padding: 2rem 0; text-align: center; border-top: 1px solid #1e293b; }

    /* Custom Layout Grid */
    .row { display: flex; flex-wrap: wrap; margin: 0 -1rem; margin-bottom: 1rem; }
    .col { padding: 0 1rem; box-sizing: border-box; }

    /* Responsive */
    @media (max-width: 768px) {
        .hero-content h1 { font-size: 2rem; }
        .content-wrapper,
        .message-profile .content-wrapper {
            grid-template-columns: 1fr;
            gap: 30px;
        }
        .cards-grid.cols-2,
        .cards-grid.cols-3,
        .cards-grid.cols-4 {
            grid-template-columns: 1fr;
        }
        .stats-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .masonry-grid {
            column-count: 1;
        }
        .timeline-item {
            grid-template-columns: 60px 20px 1fr;
            gap: 10px;
        }
    }

    /* Custom CSS */
    ${allCustomCss}
    `;

    const jsContent = `
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Hero Slider Functionality
    function initHeroSliders() {
        const sliders = document.querySelectorAll('.hero-slider');
        
        sliders.forEach(slider => {
            const slides = slider.querySelectorAll('.hero-slide');
            const dots = slider.querySelectorAll('.slider-dot');
            let currentSlide = 0;
            let autoplayInterval;

            function showSlide(index) {
                slides.forEach(s => s.classList.remove('active'));
                dots.forEach(d => d.classList.remove('active'));
                
                if (slides[index]) {
                    slides[index].classList.add('active');
                }
                if (dots[index]) {
                    dots[index].classList.add('active');
                }
                currentSlide = index;
            }

            function nextSlide() {
                let next = (currentSlide + 1) % slides.length;
                showSlide(next);
            }

            function startAutoplay() {
                autoplayInterval = setInterval(nextSlide, 5000);
            }

            function stopAutoplay() {
                clearInterval(autoplayInterval);
            }

            // Dot navigation
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    stopAutoplay();
                    showSlide(index);
                    startAutoplay();
                });
            });

            // Start autoplay if multiple slides
            if (slides.length > 1) {
                startAutoplay();
            }

            // Pause on hover
            slider.addEventListener('mouseenter', stopAutoplay);
            slider.addEventListener('mouseleave', () => {
                if (slides.length > 1) startAutoplay();
            });
        });
    }

    // Tab Switching
    window.switchTab = function(tabIndex) {
        const section = event.target.closest('.tabs-content');
        const buttons = section.querySelectorAll('.tab-button');
        const panels = section.querySelectorAll('.tab-panel');

        buttons.forEach((btn, idx) => {
            if (idx === tabIndex) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        panels.forEach((panel, idx) => {
            if (idx === tabIndex) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    };

    // Accordion Toggle
    window.toggleAccordion = function(element) {
        const item = element.closest('.accordion-item');
        const wasActive = item.classList.contains('active');

        // Close all accordions in this section
        const section = item.closest('.accordion');
        section.querySelectorAll('.accordion-item').forEach(acc => {
            acc.classList.remove('active');
        });

        // Toggle current accordion
        if (!wasActive) {
            item.classList.add('active');
        }
    };

    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
        initHeroSliders();
        
        // Add loading animation
        document.body.style.opacity = '0';
        setTimeout(() => {
            document.body.style.transition = 'opacity 0.5s';
            document.body.style.opacity = '1';
        }, 100);
    });

    // Lazy load images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imageObserver.unobserve(img);
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
    `;

    const renderSection = (section) => {
        const { type, data, id } = section;
        const sectionId = `section-${id}`;
        const style = `style="${data.bgColor || data.backgroundColor ? `background: ${data.bgColor || data.backgroundColor};` : ''} ${data.textColor ? `color: ${data.textColor};` : ''}"`;
        const textAlign = data.textAlign || 'center';

        // Legacy hero
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

        // Hero Slider
        if (type === 'hero-slider') {
            return `
    <section id="${sectionId}" class="hero-slider" style="height: ${data.height || '600px'}">
        ${(data.slides || []).map((slide, index) => `
        <div class="hero-slide ${index === 0 ? 'active' : ''}">
            <img src="${slide.image}" alt="${slide.title}">
            <div class="hero-overlay">
                <div class="hero-content">
                    <h1>${slide.title}</h1>
                    <p>${slide.subtitle}</p>
                    ${slide.buttonText ? `<a href="${slide.buttonLink || '#'}" class="btn btn-primary">${slide.buttonText}</a>` : ''}
                </div>
            </div>
        </div>`).join('')}
        ${data.showDots ? `
        <div class="slider-controls">
            ${(data.slides || []).map((_, i) => `<button class="slider-dot ${i === 0 ? 'active' : ''}"></button>`).join('')}
        </div>` : ''}
    </section>`;
        }

        // Hero Simple
        if (type === 'hero-simple') {
            return `
    <section id="${sectionId}" class="hero-slider" style="height: ${data.height || '500px'}">
        <div class="hero-slide active">
            <img src="${data.image}" alt="${data.title}">
            <div class="hero-overlay">
                <div class="hero-content" style="text-align: ${data.textAlign || 'center'}">
                    <h1>${data.title}</h1>
                    <p>${data.subtitle}</p>
                    ${data.buttonText ? `<a href="${data.buttonLink || '#'}" class="btn btn-primary">${data.buttonText}</a>` : ''}
                </div>
            </div>
        </div>
    </section>`;
        }

        // Hero Split
        if (type === 'hero-split') {
            return `
    <section id="${sectionId}" class="content-image-text ${data.imagePosition === 'right' ? 'image-right' : ''}" ${style}>
        <div class="container">
            <div class="content-wrapper">
                <div class="image-column">
                    <img src="${data.image}" alt="${data.title}">
                </div>
                <div class="text-column">
                    <h1>${data.title}</h1>
                    <p class="text-xl opacity-90 mb-4">${data.subtitle}</p>
                    ${data.description ? `<p class="mb-6">${data.description}</p>` : ''}
                    ${data.buttonText ? `<a href="${data.buttonLink || '#'}" class="btn btn-primary">${data.buttonText}</a>` : ''}
                </div>
            </div>
        </div>
    </section>`;
        }

        // Content Image Text
        if (type === 'content-image-text') {
            return `
    <section id="${sectionId}" class="content-image-text ${data.layout === 'image-right' ? 'image-right' : ''}" ${style}>
        <div class="container">
            <div class="content-wrapper">
                <div class="image-column">
                    <img src="${data.image}" alt="${data.heading}">
                </div>
                <div class="text-column">
                    <h2>${data.heading}</h2>
                    <p>${data.content}</p>
                    ${data.buttonText ? `<a href="${data.buttonLink || '#'}" class="btn btn-primary">${data.buttonText}</a>` : ''}
                </div>
            </div>
        </div>
    </section>`;
        }

        // Content Cards
        if (type === 'content-cards') {
            return `
    <section id="${sectionId}" class="content-cards" ${style}>
        <div class="container">
            <h2>${data.heading}</h2>
            ${data.subheading ? `<p class="text-center text-xl text-slate-600 mb-8">${data.subheading}</p>` : ''}
            <div class="cards-grid cols-${data.columns || 3}">
                ${(data.cards || []).map(card => `
                <div class="card ${data.cardStyle || 'elevated'}">
                    ${card.icon ? `<div class="card-icon">${card.icon}</div>` : ''}
                    <h3>${card.title}</h3>
                    <p>${card.description}</p>
                    ${card.link ? `<a href="${card.link}">Learn More →</a>` : ''}
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Content Features
        if (type === 'content-features') {
            return `
    <section id="${sectionId}" class="content-cards" ${style}>
        <div class="container">
            <h2>${data.heading}</h2>
            <div class="cards-grid cols-${data.columns || 2}">
                ${(data.features || []).map(feature => `
                <div class="card flat">
                    <div class="card-icon">${feature.icon}</div>
                    <h3>${feature.title}</h3>
                    <p>${feature.description}</p>
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Content Stats
        if (type === 'content-stats') {
            return `
    <section id="${sectionId}" class="py-20 px-4" ${style}>
        <div class="container">
            <div class="stats-grid">
                ${(data.stats || []).map(stat => `
                <div class="stat-item">
                    <div class="stat-number">${stat.number}</div>
                    <div class="stat-label">${stat.label}</div>
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Message Profile
        if (type === 'message-profile') {
            return `
    <section id="${sectionId}" class="message-profile ${data.layout === 'image-right' ? 'image-right' : ''}" ${style}>
        <div class="container">
            <div class="content-wrapper">
                <div class="profile-image-column">
                    <img src="${data.image}" alt="${data.name}">
                    <div class="profile-name">${data.name}</div>
                    <div class="profile-designation">${data.designation}</div>
                </div>
                <div class="message-column">
                    ${data.heading ? `<h2>${data.heading}</h2>` : ''}
                    <p>${data.message}</p>
                </div>
            </div>
        </div>
    </section>`;
        }

        // Message Quote
        if (type === 'message-quote') {
            return `
    <section id="${sectionId}" class="py-20 px-4" ${style}>
        <div class="container max-w-4xl">
            <div class="text-center">
                <div class="text-4xl text-primary mb-6">"</div>
                <p class="text-2xl italic text-slate-700 mb-8">${data.quote}</p>
                <div class="quote-author">
                    ${data.image ? `<img src="${data.image}" alt="${data.author}" class="author-image">` : ''}
                    <div>
                        <div class="author-name">${data.author}</div>
                        <div class="author-designation">${data.designation}</div>
                    </div>
                </div>
            </div>
        </div>
    </section>`;
        }

        // Gallery Grid
        if (type === 'gallery-grid') {
            return `
    <section id="${sectionId}" class="gallery-grid" ${style}>
        <div class="container">
            <h2>${data.heading}</h2>
            <div class="gallery-images cols-${data.columns || 4}" style="gap: ${data.spacing || 16}px">
                ${(data.images || []).map(image => `
                <div class="gallery-item">
                    <img src="${image.url}" alt="${image.caption || 'Gallery image'}">
                    ${image.caption ? `<div class="gallery-overlay"><span>${image.caption}</span></div>` : ''}
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Gallery Masonry
        if (type === 'gallery-masonry') {
            return `
    <section id="${sectionId}" class="py-20 px-4" ${style}>
        <div class="container">
            <h2 class="section-title">${data.heading}</h2>
            <div class="masonry-grid">
                ${(data.images || []).map(image => `
                <div class="masonry-item">
                    <img src="${image.url}" alt="${image.caption || 'Gallery image'}">
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Video Section
        if (type === 'video-section') {
            return `
    <section id="${sectionId}" class="py-20 px-4" ${style}>
        <div class="container max-w-5xl">
            <h2 class="section-title">${data.heading}</h2>
            ${data.description ? `<p class="text-center text-lg mb-8">${data.description}</p>` : ''}
            <div class="video-container">
                <iframe width="100%" height="100%" src="${data.videoUrl}" frameborder="0" allowfullscreen></iframe>
            </div>
        </div>
    </section>`;
        }

        // Tabs Content
        if (type === 'tabs-content') {
            return `
    <section id="${sectionId}" class="tabs-content" ${style}>
        <div class="container">
            <h2>${data.heading}</h2>
            <div class="tabs-header">
                ${(data.tabs || []).map((tab, i) => `<button class="tab-button ${i === 0 ? 'active' : ''}" onclick="switchTab(${i})">${tab.label}</button>`).join('')}
            </div>
            ${(data.tabs || []).map((tab, i) => `
            <div class="tab-panel ${i === 0 ? 'active' : ''}" id="tab-${i}">
                <p>${tab.content}</p>
            </div>`).join('')}
        </div>
    </section>`;
        }

        // Accordion
        if (type === 'accordion') {
            return `
    <section id="${sectionId}" class="accordion" ${style}>
        <div class="container max-w-4xl">
            <h2 class="section-title">${data.heading}</h2>
            ${(data.items || []).map((item, i) => `
            <div class="accordion-item ${i === 0 ? 'active' : ''}" onclick="toggleAccordion(this)">
                <div class="accordion-header">
                    <h3>${item.title}</h3>
                    <span class="accordion-icon">▼</span>
                </div>
                <div class="accordion-content">
                    <div class="accordion-body">
                        <p>${item.content}</p>
                    </div>
                </div>
            </div>`).join('')}
        </div>
    </section>`;
        }

        // Timeline
        if (type === 'timeline') {
            return `
    <section id="${sectionId}" class="py-20 px-4" ${style}>
        <div class="container max-w-4xl">
            <h2 class="section-title">${data.heading}</h2>
            <div class="timeline">
                ${(data.events || []).map((event, i) => `
                <div class="timeline-item">
                    <div class="timeline-year">${event.year}</div>
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <h3>${event.title}</h3>
                        <p>${event.description}</p>
                    </div>
                </div>`).join('')}
            </div>
        </div>
    </section>`;
        }

        // Legacy about
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

        // Custom layout
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
