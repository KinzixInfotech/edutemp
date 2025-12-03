/* eslint-disable @next/next/no-img-element */
import React from 'react';
import Link from 'next/link';

export function WebsiteRenderer({ config, school, activePage, notices, gallery }) {
    // Helper to resolve links
    const resolveLink = (url, target) => {
        if (!url) return '#';
        if (target === 'section' && url.startsWith('#')) {
            return url;
        }
        if (target === 'page') {
            // Ensure we don't double slash
            const cleanUrl = url.startsWith('/') ? url : `/${url}`;
            return `/school/${school.domain}${cleanUrl}`;
        }
        return url;
    };

    // CSS Generation
    const generateCss = () => {
        const sections = activePage?.sections || [];
        const sectionCss = sections.map(section => {
            if (!section.customCss) return '';
            const selector = `#section-${section.id}`;
            if (section.customCss.includes('&')) {
                return section.customCss.replace(/&/g, selector);
            } else {
                return `${selector} { ${section.customCss} }`;
            }
        }).join('\n');

        return (
            <style dangerouslySetInnerHTML={{
                __html: `
                /* Website Preview Scoped Styles */
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Open+Sans:wght@300;400;600;700&display=swap');
                
                .website-preview-wrapper {
                    --primary: ${config.global?.colors?.primary || '#2563eb'};
                    --secondary: ${config.global?.colors?.secondary || '#1e293b'};
                    --primary-dark: #1e40af;
                    --text-dark: #1f2937;
                    --text-medium: #4b5563;
                    --text-light: #6b7280;
                    min-height: 100vh;
                    background: white;
                    font-family: 'Open Sans', sans-serif;
                    color: #1f2937;
                }
                
                .website-preview-wrapper * {
                    box-sizing: border-box;
                }
                
                .website-preview-wrapper .container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 20px;
                }
                
                .website-preview-wrapper h1, .website-preview-wrapper h2, .website-preview-wrapper h3,
                .website-preview-wrapper h4, .website-preview-wrapper h5, .website-preview-wrapper h6 {
                    font-family: 'Inter', sans-serif;
                    font-weight: 700;
                    line-height: 1.2;
                    color: var(--text-dark);
                    margin-bottom: 1rem;
                }
                
                .website-preview-wrapper h1 { font-size: 3rem; }
                .website-preview-wrapper h2 { font-size: 2.5rem; }
                .website-preview-wrapper h3 { font-size: 2rem; }
                
                .website-preview-wrapper p {
                    margin-bottom: 1rem;
                    color: var(--text-medium);
                }
                
                .website-preview-wrapper .btn {
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
                
                .website-preview-wrapper .btn-primary {
                    background: var(--primary);
                    color: white;
                }
                
                .website-preview-wrapper .btn-primary:hover {
                    background: var(--primary-dark);
                    transform: translateY(-2px);
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                }
                
                /* Hero Slider Styles */
                .website-preview-wrapper .hero-slider {
                    position: relative;
                    width: 100%;
                    overflow: hidden;
                }
                
                .website-preview-wrapper .hero-slide {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    opacity: 0;
                    transition: opacity 0.5s ease;
                }
                
                .website-preview-wrapper .hero-slide.active {
                    opacity: 1;
                    position: relative;
                }
                
                .website-preview-wrapper .hero-slide img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .website-preview-wrapper .hero-overlay {
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
                
                .website-preview-wrapper .hero-content {
                    text-align: center;
                    color: white;
                    max-width: 800px;
                    padding: 0 20px;
                }
                
                .website-preview-wrapper .hero-content h1 {
                    font-size: 3.5rem;
                    font-weight: 800;
                    margin-bottom: 1rem;
                    color: white;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                
                .website-preview-wrapper .hero-content p {
                    font-size: 1.25rem;
                    margin-bottom: 2rem;
                    color: rgba(255,255,255,0.95);
                }
                
                .website-preview-wrapper .slider-controls {
                    position: absolute;
                    bottom: 30px;
                    left: 50%;
                    transform: translateX(-50%);
                    display: flex;
                    gap: 10px;
                }
                
                .website-preview-wrapper .slider-dot {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: rgba(255,255,255,0.5);
                    border: none;
                    cursor: pointer;
                    transition: all 0.25s ease;
                }
                
                .website-preview-wrapper .slider-dot.active {
                    background: white;
                    width: 30px;
                    border-radius: 9999px;
                }
                
                /* Content Image Text Section */
                .website-preview-wrapper .content-image-text {
                    padding: 80px 20px;
                }
                
                .website-preview-wrapper .content-wrapper {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 60px;
                    align-items: center;
                }
                
                .website-preview-wrapper .content-image-text.image-right .content-wrapper {
                    direction: rtl;
                }
                
                .website-preview-wrapper .content-image-text.image-right .text-column {
                    direction: ltr;
                }
                
                .website-preview-wrapper .image-column img {
                    width: 100%;
                    height: auto;
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                }
                
                /* Content Cards Section */
                .website-preview-wrapper .content-cards {
                    padding: 80px 20px;
                    background: #f9fafb;
                }
                
                .website-preview-wrapper .content-cards h2 {
                    text-align: center;
                    font-size: 2.5rem;
                    margin-bottom: 3rem;
                }
                
                .website-preview-wrapper .cards-grid {
                    display: grid;
                    gap: 30px;
                }
                
                .website-preview-wrapper .cards-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
                .website-preview-wrapper .cards-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
                .website-preview-wrapper .cards-grid.cols-4 { grid-template-columns: repeat(4, 1fr); }
                
                .website-preview-wrapper .card {
                    background: white;
                    padding: 30px;
                    transition: all 0.25s ease;
                    text-align: center;
                }
                
                .website-preview-wrapper .card.elevated {
                    border-radius: 12px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                }
                
                .website-preview-wrapper .card.elevated:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
                }
                
                .website-preview-wrapper .card-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                }
                
                .website-preview-wrapper .card h3 {
                    font-size: 1.5rem;
                    margin-bottom: 1rem;
                }
                
                /* Message Profile Section */
                .website-preview-wrapper .message-profile {
                    padding: 80px 20px;
                }
                
                .website-preview-wrapper .message-profile .content-wrapper {
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 60px;
                    align-items: start;
                }
                
                .website-preview-wrapper .profile-image-column {
                    text-align: center;
                }
                
                .website-preview-wrapper .profile-image-column img {
                    width: 100%;
                    border-radius: 12px;
                    box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
                    margin-bottom: 1rem;
                }
                
                .website-preview-wrapper .profile-name {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                
                .website-preview-wrapper .profile-designation {
                    font-size: 1rem;
                    color: var(--primary);
                    font-weight: 600;
                }
                
                /* Gallery Grid Section */
                .website-preview-wrapper .gallery-grid {
                    padding: 80px 20px;
                }
                
                .website-preview-wrapper .gallery-images {
                    display: grid;
                    gap: 16px;
                }
                
                .website-preview-wrapper .gallery-images.cols-2 { grid-template-columns: repeat(2, 1fr); }
                .website-preview-wrapper .gallery-images.cols-3 { grid-template-columns: repeat(3, 1fr); }
                .website-preview-wrapper .gallery-images.cols-4 { grid-template-columns: repeat(4, 1fr); }
                
                .website-preview-wrapper .gallery-item {
                    position: relative;
                    overflow: hidden;
                    border-radius: 8px;
                    cursor: pointer;
                    aspect-ratio: 4/3;
                }
                
                .website-preview-wrapper .gallery-item img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: transform 0.35s ease;
                }
                
                .website-preview-wrapper .gallery-item:hover img {
                    transform: scale(1.1);
                }
                
                .website-preview-wrapper .gallery-overlay {
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
                
                .website-preview-wrapper .gallery-item:hover .gallery-overlay {
                    opacity: 1;
                }
                
                /* Tabs Section */
                .website-preview-wrapper .tabs-content {
                    padding: 80px 20px;
                }
                
                .website-preview-wrapper .tabs-header {
                    display: flex;
                    gap: 0;
                    border-bottom: 2px solid #e5e7eb;
                    margin-bottom: 2rem;
                }
                
                .website-preview-wrapper .tab-button {
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
                
                .website-preview-wrapper .tab-button.active {
                    color: var(--primary);
                }
                
                .website-preview-wrapper .tab-button.active::after {
                    content: '';
                    position: absolute;
                    bottom: -2px;
                    left: 0;
                    width: 100%;
                    height: 3px;
                    background: var(--primary);
                }
                
                .website-preview-wrapper .tab-panel {
                    display: none;
                }
                
                .website-preview-wrapper .tab-panel.active {
                    display: block;
                }
                
                /* Accordion Section */
                .website-preview-wrapper .accordion {
                    padding: 80px 20px;
                }
                
                .website-preview-wrapper .accordion-item {
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    margin-bottom: 1rem;
                    overflow: hidden;
                }
                
                .website-preview-wrapper .accordion-header {
                    padding: 1.5rem;
                    background: #f9fafb;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .website-preview-wrapper .accordion-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                }
                
                .website-preview-wrapper .accordion-icon {
                    font-size: 1.5rem;
                    transition: transform 0.25s ease;
                }
                
                .website-preview-wrapper .accordion-item.active .accordion-icon {
                    transform: rotate(180deg);
                }
                
                .website-preview-wrapper .accordion-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height 0.35s ease;
                }
                
                .website-preview-wrapper .accordion-item.active .accordion-content {
                    max-height: 1000px;
                }
                
                .website-preview-wrapper .accordion-body {
                    padding: 1.5rem;
                }
                
                /* Responsive */
                @media (max-width: 768px) {
                    .website-preview-wrapper .hero-content h1 { font-size: 2rem; }
                    .website-preview-wrapper .content-wrapper,
                    .website-preview-wrapper .message-profile .content-wrapper {
                        grid-template-columns: 1fr;
                        gap: 30px;
                    }
                    .website-preview-wrapper .cards-grid.cols-2,
                    .website-preview-wrapper .cards-grid.cols-3,
                    .website-preview-wrapper .cards-grid.cols-4 {
                        grid-template-columns: 1fr;
                    }
                }
                
                ${config.global?.customCss || ''}
                ${sectionCss}
            `}} />
        );
    };

    return (
        <div className="website-preview-wrapper">
            {generateCss()}

            {/* Header */}
            <header
                className="border-b sticky top-0 z-50 bg-white/80 backdrop-blur-md"
                style={{ background: config.global?.header?.bgColor }}
            >
                <div className="container mx-auto px-4 py-4">
                    <nav className={`flex items-center ${config.global?.header?.menuAlign === 'center' ? 'justify-center flex-col gap-4' : 'justify-between'}`}>
                        <div className="flex items-center gap-2 font-bold text-xl">
                            {(config.global?.logo || school.profilePicture) && (
                                <img src={config.global?.logo || school.profilePicture} alt={school.name} className="h-10 w-auto object-contain" />
                            )}
                            <span>{school.name}</span>
                        </div>
                        <div className="flex items-center gap-6 flex-wrap justify-center">
                            {(config.global?.header?.links || []).map((link, i) => (
                                <Link
                                    key={i}
                                    href={resolveLink(link.url, link.target)}
                                    className="text-slate-600 hover:text-primary transition-colors font-medium"
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main>
                {(activePage?.sections || []).map(section => (
                    <SectionRenderer
                        key={section.id}
                        section={section}
                        notices={notices}
                        gallery={gallery}
                        school={school}
                        resolveLink={resolveLink}
                    />
                ))}
            </main>

            {/* Footer */}
            <footer
                className="py-12"
                style={{ background: config.global?.footer?.bgColor || '#0f172a', color: 'white' }}
            >
                <div className="container mx-auto px-4 text-center">
                    <p className="opacity-80">{config.global?.footer?.text || `© ${new Date().getFullYear()} ${school.name}. All rights reserved.`}</p>
                </div>
            </footer>
        </div>
    );
}

function SectionRenderer({ section, notices, gallery, school, resolveLink }) {
    const { type, data, id } = section;
    const sectionId = `section-${id}`;

    // Common styles
    const style = {
        background: data.bgColor,
        color: data.textColor,
        textAlign: data.textAlign
    };

    if (type === 'hero') {
        return (
            <section id={sectionId} className="py-20 px-4 relative overflow-hidden" style={style}>
                <div className="container mx-auto text-center max-w-5xl relative z-10">
                    <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">{data.title}</h1>
                    <p className="text-xl md:text-2xl opacity-90 mb-10 max-w-3xl mx-auto">{data.subtitle}</p>
                    {data.ctaText && (
                        <Link href={resolveLink(data.ctaLink, 'url')} className="inline-block bg-primary text-white px-8 py-4 rounded-lg font-bold text-lg hover:opacity-90 transition-transform hover:-translate-y-1 shadow-lg">
                            {data.ctaText}
                        </Link>
                    )}
                    {data.image && (
                        <img src={data.image} alt="Hero" className="mt-16 rounded-2xl shadow-2xl w-full object-cover max-h-[600px]" />
                    )}
                </div>
                {/* Default gradient if no bg color */}
                {!data.bgColor && <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 to-indigo-50" />}
            </section>
        );
    }

    if (type === 'about') {
        return (
            <section id={sectionId} className="py-20 px-4" style={style}>
                <div className="container mx-auto max-w-4xl">
                    <h2 className="text-3xl font-bold mb-8 text-center">{data.title || 'About Us'}</h2>
                    <div className="prose prose-lg mx-auto text-slate-600" style={{ color: data.textColor }}>
                        <p className="whitespace-pre-wrap">{data.content}</p>
                    </div>
                </div>
            </section>
        );
    }

    if (type === 'principal') {
        return (
            <section id={sectionId} className="py-20 px-4 bg-slate-50" style={style}>
                <div className="container mx-auto max-w-5xl">
                    <h2 className="text-3xl font-bold mb-12 text-center">Principal's Message</h2>
                    <div className="grid md:grid-cols-[300px_1fr] gap-12 items-center">
                        <div>
                            {data.image ? (
                                <img src={data.image} alt={data.name} className="w-full aspect-square object-cover rounded-full border-4 border-white shadow-xl" />
                            ) : (
                                <div className="w-full aspect-square bg-slate-200 rounded-full flex items-center justify-center text-slate-400">No Image</div>
                            )}
                        </div>
                        <div className={`text-${data.textAlign || 'left'}`}>
                            <h3 className="text-2xl font-bold text-primary mb-4">{data.name || 'Principal'}</h3>
                            <div className="prose prose-lg text-slate-600 italic" style={{ color: data.textColor }}>
                                <p className="whitespace-pre-wrap">{data.message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (type === 'contact') {
        return (
            <section id={sectionId} className="py-20 px-4 bg-slate-900 text-white" style={style}>
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold mb-12 text-center">Contact Us</h2>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white/5 p-8 rounded-xl backdrop-blur-sm">
                            <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">Address</h3>
                            <p className="text-lg">{data.address}</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-xl backdrop-blur-sm">
                            <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">Phone</h3>
                            <p className="text-lg">{data.phone}</p>
                        </div>
                        <div className="bg-white/5 p-8 rounded-xl backdrop-blur-sm">
                            <h3 className="text-blue-400 font-bold uppercase tracking-wider text-sm mb-4">Email</h3>
                            <p className="text-lg">{data.email}</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (type === 'dynamic_notices') {
        const limit = data.limit || 3;
        const displayNotices = notices?.slice(0, limit) || [];

        return (
            <section id={sectionId} className="py-20 px-4 bg-slate-50" style={style}>
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold mb-12 text-center">{data.title || 'Latest Notices'}</h2>

                    {displayNotices.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {displayNotices.map((notice) => (
                                <div key={notice.id} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow border border-slate-100">
                                    <div className="text-sm text-slate-500 mb-2">{new Date(notice.createdAt).toLocaleDateString()}</div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2 line-clamp-2">{notice.title}</h3>
                                    <p className="text-slate-600 line-clamp-3 mb-4">{notice.description}</p>
                                    {notice.fileUrl && (
                                        <a href={notice.fileUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm font-medium hover:underline">
                                            View Attachment
                                        </a>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-12 bg-white rounded-xl border border-dashed">
                            No notices available at the moment.
                        </div>
                    )}

                    {data.viewAllLink && (
                        <div className="text-center mt-12">
                            <Link href={resolveLink(data.viewAllLink, 'url')} className="inline-block border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors">
                                View All Notices
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    if (type === 'dynamic_gallery') {
        const limit = data.limit || 6;
        const displayImages = gallery?.slice(0, limit) || [];

        return (
            <section id={sectionId} className="py-20 px-4" style={style}>
                <div className="container mx-auto max-w-6xl">
                    <h2 className="text-3xl font-bold mb-12 text-center">{data.title || 'Photo Gallery'}</h2>

                    {displayImages.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                            {displayImages.map((item) => (
                                <div key={item.id} className="aspect-[4/3] overflow-hidden rounded-xl group relative">
                                    <img
                                        src={item.url || item.imageUrl} // Adjust based on Gallery model
                                        alt={item.title || 'Gallery Image'}
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                        <p className="text-white font-medium truncate w-full">{item.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-slate-500 py-12 bg-slate-50 rounded-xl border border-dashed">
                            No images in gallery.
                        </div>
                    )}

                    {data.viewAllLink && (
                        <div className="text-center mt-12">
                            <Link href={resolveLink(data.viewAllLink, 'url')} className="inline-block border-2 border-primary text-primary px-8 py-3 rounded-lg font-semibold hover:bg-primary hover:text-white transition-colors">
                                View All Photos
                            </Link>
                        </div>
                    )}
                </div>
            </section>
        );
    }

    if (type === 'custom_layout') {
        return (
            <section id={sectionId} className="py-20 px-4" style={style}>
                <div className="container mx-auto">
                    {(data.rows || []).map((row, rIndex) => (
                        <div key={row.id || rIndex} className="flex flex-wrap -mx-4 mb-8 last:mb-0">
                            {(row.columns || []).map((col, cIndex) => (
                                <div key={col.id || cIndex} className="px-4 mb-4 md:mb-0" style={{ width: col.width || '100%' }}>
                                    {col.widget && (
                                        <div className="h-full">
                                            {col.widget.type === 'text' && (
                                                <div className="prose max-w-none whitespace-pre-wrap">{col.widget.content}</div>
                                            )}
                                            {col.widget.type === 'image' && (
                                                <img src={col.widget.url} alt="Widget" className="w-full h-auto rounded-lg" />
                                            )}
                                            {col.widget.type === 'button' && (
                                                <Link href={col.widget.url || '#'} className="inline-block bg-primary text-white px-6 py-2 rounded-md font-medium hover:opacity-90">
                                                    {col.widget.text}
                                                </Link>
                                            )}
                                            {col.widget.type === 'spacer' && (
                                                <div style={{ height: col.widget.height }}></div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // New Section Types

    // Hero Slider
    if (type === 'hero-slider') {
        return (
            <section id={sectionId} className="hero-slider relative" style={{ height: data.height || '600px' }}>
                {(data.slides || []).map((slide, index) => (
                    <div key={slide.id} className={`hero-slide ${index === 0 ? 'active' : ''}`}>
                        <img src={slide.image} alt={slide.title} />
                        <div className="hero-overlay">
                            <div className="hero-content">
                                <h1>{slide.title}</h1>
                                <p>{slide.subtitle}</p>
                                {slide.buttonText && (
                                    <Link href={slide.buttonLink || '#'} className="btn btn-primary">
                                        {slide.buttonText}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {data.showDots && (
                    <div className="slider-controls">
                        {(data.slides || []).map((slide, index) => (
                            <button key={slide.id} className={`slider-dot ${index === 0 ? 'active' : ''}`} />
                        ))}
                    </div>
                )}
            </section>
        );
    }

    // Hero Simple
    if (type === 'hero-simple') {
        return (
            <section id={sectionId} className="hero-slider relative" style={{ height: data.height || '500px' }}>
                <div className="hero-slide active">
                    <img src={data.image} alt={data.title} />
                    <div className="hero-overlay">
                        <div className="hero-content" style={{ textAlign: data.textAlign || 'center' }}>
                            <h1>{data.title}</h1>
                            <p>{data.subtitle}</p>
                            {data.buttonText && (
                                <Link href={data.buttonLink || '#'} className="btn btn-primary">
                                    {data.buttonText}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Hero Split
    if (type === 'hero-split') {
        return (
            <section id={sectionId} className="content-image-text" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <div className={`content-wrapper ${data.imagePosition === 'right' ? 'image-right' : ''}`}>
                        <div className="image-column">
                            <img src={data.image} alt={data.title} />
                        </div>
                        <div className="text-column">
                            <h1>{data.title}</h1>
                            <p className="text-xl opacity-90 mb-4">{data.subtitle}</p>
                            {data.description && <p className="mb-6">{data.description}</p>}
                            {data.buttonText && (
                                <Link href={data.buttonLink || '#'} className="btn btn-primary">
                                    {data.buttonText}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Content Image Text
    if (type === 'content-image-text') {
        return (
            <section id={sectionId} className={`content-image-text ${data.layout === 'image-right' ? 'image-right' : ''}`} style={{ backgroundColor: data.backgroundColor, padding: data.padding }}>
                <div className="container">
                    <div className="content-wrapper">
                        <div className="image-column">
                            <img src={data.image} alt={data.heading} />
                        </div>
                        <div className="text-column">
                            <h2>{data.heading}</h2>
                            <p>{data.content}</p>
                            {data.buttonText && (
                                <Link href={data.buttonLink || '#'} className="btn btn-primary">
                                    {data.buttonText}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Content Cards
    if (type === 'content-cards') {
        return (
            <section id={sectionId} className="content-cards" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <h2>{data.heading}</h2>
                    {data.subheading && <p className="text-center text-xl text-slate-600 mb-8">{data.subheading}</p>}
                    <div className={`cards-grid cols-${data.columns || 3}`}>
                        {(data.cards || []).map(card => (
                            <div key={card.id} className={`card ${data.cardStyle || 'elevated'}`}>
                                {card.icon && <div className="card-icon">{card.icon}</div>}
                                <h3>{card.title}</h3>
                                <p>{card.description}</p>
                                {card.link && <Link href={card.link}>Learn More →</Link>}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Content Features
    if (type === 'content-features') {
        return (
            <section id={sectionId} className="content-cards" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <h2>{data.heading}</h2>
                    <div className={`cards-grid cols-${data.columns || 2}`}>
                        {(data.features || []).map(feature => (
                            <div key={feature.id} className="card flat">
                                <div className="card-icon">{feature.icon}</div>
                                <h3>{feature.title}</h3>
                                <p>{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Content Stats
    if (type === 'content-stats') {
        return (
            <section id={sectionId} className="py-20 px-4" style={{ backgroundColor: data.backgroundColor, color: data.textColor }}>
                <div className="container">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {(data.stats || []).map(stat => (
                            <div key={stat.id}>
                                <div className="text-5xl font-bold mb-2">{stat.number}</div>
                                <div className="text-lg opacity-90">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Message Profile
    if (type === 'message-profile') {
        return (
            <section id={sectionId} className={`message-profile ${data.layout === 'image-right' ? 'image-right' : ''}`} style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <div className="content-wrapper">
                        <div className="profile-image-column">
                            <img src={data.image} alt={data.name} />
                            <div className="profile-name">{data.name}</div>
                            <div className="profile-designation">{data.designation}</div>
                        </div>
                        <div className="message-column">
                            {data.heading && <h2>{data.heading}</h2>}
                            <p>{data.message}</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Message Quote
    if (type === 'message-quote') {
        return (
            <section id={sectionId} className="py-20 px-4" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container max-w-4xl">
                    <div className="text-center">
                        <div className="text-4xl text-primary mb-6">"</div>
                        <p className="text-2xl italic text-slate-700 mb-8">{data.quote}</p>
                        <div className="flex items-center justify-center gap-4">
                            {data.image && <img src={data.image} alt={data.author} className="w-16 h-16 rounded-full object-cover" />}
                            <div className="text-left">
                                <div className="font-bold text-lg">{data.author}</div>
                                <div className="text-slate-600">{data.designation}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    // Gallery Grid
    if (type === 'gallery-grid') {
        return (
            <section id={sectionId} className="gallery-grid" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <h2>{data.heading}</h2>
                    <div className={`gallery-images cols-${data.columns || 4}`} style={{ gap: `${data.spacing || 16}px` }}>
                        {(data.images || []).map(image => (
                            <div key={image.id} className="gallery-item">
                                <img src={image.url} alt={image.caption || 'Gallery image'} />
                                {image.caption && (
                                    <div className="gallery-overlay">
                                        <span>{image.caption}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Gallery Masonry
    if (type === 'gallery-masonry') {
        return (
            <section id={sectionId} className="py-20 px-4" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <h2 className="text-3xl font-bold mb-12 text-center">{data.heading}</h2>
                    <div className="columns-2 md:columns-3 lg:columns-4 gap-4">
                        {(data.images || []).map(image => (
                            <div key={image.id} className="mb-4 break-inside-avoid">
                                <img src={image.url} alt={image.caption || 'Gallery image'} className="w-full rounded-lg hover:opacity-90 transition-opacity cursor-pointer" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    // Video Section
    if (type === 'video-section') {
        return (
            <section id={sectionId} className="py-20 px-4" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container max-w-5xl">
                    <h2 className="text-3xl font-bold mb-8 text-center">{data.heading}</h2>
                    {data.description && <p className="text-center text-lg text-slate-600 mb-8">{data.description}</p>}
                    <div className="aspect-video rounded-xl overflow-hidden shadow-xl">
                        <iframe
                            width="100%"
                            height="100%"
                            src={data.videoUrl}
                            title={data.heading}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                </div>
            </section>
        );
    }

    // Tabs Content
    if (type === 'tabs-content') {
        return (
            <section id={sectionId} className="tabs-content" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container">
                    <h2>{data.heading}</h2>
                    <div className="tabs-header">
                        {(data.tabs || []).map((tab, index) => (
                            <button key={tab.id} className={`tab-button ${index === 0 ? 'active' : ''}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    {(data.tabs || []).map((tab, index) => (
                        <div key={tab.id} className={`tab-panel ${index === 0 ? 'active' : ''}`}>
                            <p className="text-lg text-slate-700">{tab.content}</p>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // Accordion
    if (type === 'accordion') {
        return (
            <section id={sectionId} className="accordion" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container max-w-4xl">
                    <h2 className="text-3xl font-bold mb-12 text-center">{data.heading}</h2>
                    {(data.items || []).map((item, index) => (
                        <div key={item.id} className={`accordion-item ${index === 0 ? 'active' : ''}`}>
                            <div className="accordion-header">
                                <h3>{item.title}</h3>
                                <span className="accordion-icon">▼</span>
                            </div>
                            <div className="accordion-content">
                                <div className="accordion-body">
                                    <p>{item.content}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // Timeline
    if (type === 'timeline') {
        return (
            <section id={sectionId} className="py-20 px-4" style={{ backgroundColor: data.backgroundColor }}>
                <div className="container max-w-4xl">
                    <h2 className="text-3xl font-bold mb-16 text-center">{data.heading}</h2>
                    <div className="space-y-12">
                        {(data.events || []).map((event, index) => (
                            <div key={event.id} className="flex gap-8">
                                <div className="flex-shrink-0 w-24 text-right">
                                    <div className="text-2xl font-bold text-primary">{event.year}</div>
                                </div>
                                <div className="flex-shrink-0 flex flex-col items-center">
                                    <div className="w-4 h-4 rounded-full bg-primary" />
                                    {index < (data.events.length - 1) && <div className="w-0.5 flex-1 bg-slate-200 mt-2" />}
                                </div>
                                <div className="flex-1 pb-8">
                                    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                                    <p className="text-slate-600">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        );
    }

    return null;
}
