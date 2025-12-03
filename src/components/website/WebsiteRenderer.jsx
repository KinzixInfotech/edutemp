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
        const css = sections.map(section => {
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
                :root {
                    --primary: ${config.global?.colors?.primary || '#2563eb'};
                    --secondary: ${config.global?.colors?.secondary || '#1e293b'};
                }
                ${config.global?.customCss || ''}
                ${css}
            `}} />
        );
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
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

    return null;
}
