'use client';

import React, { useMemo } from "react";

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MARQUEE_SPEED_ROW1 = 40; // seconds — first row (scroll left)
const MARQUEE_SPEED_ROW2 = 50; // seconds — second row (scroll right)
const HOVER_SCALE = 1.04;
// ──────────────────────────────────────────────────────────────────────────────

// Fisher-Yates shuffle
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// All available images
const ALL_IMAGES = Array.from({ length: 15 }, (_, i) => ({
    id: `img-${i + 1}`,
    src: `./images_screenshot/${i + 1}.png`,
}));

function MarqueeRow({ images, direction, speed, rowIndex }) {
    // Triple the images for seamless looping
    const tripled = [...images, ...images, ...images];
    const animName = direction === "left" ? `hmq-left-${rowIndex}` : `hmq-right-${rowIndex}`;

    return (
        <div
            className="flex gap-3 md:gap-4"
            style={{
                animation: `${animName} ${speed}s linear infinite`,
                willChange: "transform",
                width: "fit-content",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
            {tripled.map((img, idx) => (
                <div
                    key={`${img.id}-${idx}`}
                    className="flex-shrink-0 w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] rounded-2xl md:rounded-3xl overflow-hidden border-2 border-black/90 shadow-md"
                    style={{
                        transition: "transform 0.25s ease, box-shadow 0.25s ease",
                        cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = `scale(${HOVER_SCALE})`;
                        e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.2)";
                        e.currentTarget.style.zIndex = "20";
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "scale(1)";
                        e.currentTarget.style.boxShadow = "";
                        e.currentTarget.style.zIndex = "auto";
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={img.src}
                        alt=""
                        loading="lazy"
                        className="block w-full h-auto"
                    />
                </div>
            ))}
        </div>
    );
}

export default function HorizontalImageMarquee() {
    // Shuffle and split images into two rows on mount
    const { row1, row2 } = useMemo(() => {
        const shuffled = shuffle(ALL_IMAGES);
        const mid = Math.ceil(shuffled.length / 2);
        return {
            row1: shuffled.slice(0, mid),
            row2: shuffled.slice(mid),
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const keyframes = `
        @keyframes hmq-left-0 {
            from { transform: translateX(0); }
            to   { transform: translateX(-33.333%); }
        }
        @keyframes hmq-right-1 {
            from { transform: translateX(-33.333%); }
            to   { transform: translateX(0); }
        }
    `;

    return (
        <div className="relative w-full overflow-hidden py-4 md:py-6">
            <style>{keyframes}</style>

            {/* Row 1 — scrolls left */}
            <div className="mb-3 md:mb-4 overflow-hidden">
                <MarqueeRow
                    images={row1}
                    direction="left"
                    speed={MARQUEE_SPEED_ROW1}
                    rowIndex={0}
                />
            </div>

            {/* Row 2 — scrolls right */}
            <div className="overflow-hidden">
                <MarqueeRow
                    images={row2}
                    direction="right"
                    speed={MARQUEE_SPEED_ROW2}
                    rowIndex={1}
                />
            </div>

            {/* Edge fade overlays */}
            <div className="absolute top-0 bottom-0 left-0 w-12 md:w-20 pointer-events-none z-10 bg-gradient-to-r from-white to-transparent" />
            <div className="absolute top-0 bottom-0 right-0 w-12 md:w-20 pointer-events-none z-10 bg-gradient-to-l from-white to-transparent" />
        </div>
    );
}
