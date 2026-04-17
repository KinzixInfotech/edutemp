'use client';

import React, { useMemo } from "react";

// ─── SPEED CONFIG ─────────────────────────────────────────────────────────────
const MARQUEE_SPEED_A = 180; // seconds — columns scrolling UP   (cols 0, 2, 4)
const MARQUEE_SPEED_B = 140; // seconds — columns scrolling DOWN (cols 1, 3)
const HOVER_SCALE = 1.05;
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

// Build a flat list, then split into 4 columns (round-robin)
const ALL_IMAGES = Array.from({ length: 15 }, (_, i) => ({
    id: `img-${i + 1}`,
    src: `./images_screenshot/${i + 1}.png`,
}));
const NUM_COLS = 4;
const COLUMNS = Array.from({ length: NUM_COLS }, (_, col) =>
    ALL_IMAGES.filter((_, idx) => idx % NUM_COLS === col)
);

function Placeholder({ idx }) {
    const palettes = [
        { bg: "#dbeafe", fg: "#3b82f6" },
        { bg: "#fce7f3", fg: "#ec4899" },
        { bg: "#d1fae5", fg: "#10b981" },
        { bg: "#fef3c7", fg: "#f59e0b" },
        { bg: "#ede9fe", fg: "#8b5cf6" },
        { bg: "#fee2e2", fg: "#ef4444" },
    ];
    const heights = [160, 210, 140, 240, 180, 120, 200];
    const p = palettes[idx % palettes.length];
    const h = heights[idx % heights.length];
    return (
        <div style={{ width: "100%", height: h, background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: p.fg }}>IMG {idx + 1}</span>
        </div>
    );
}

function MarqueeColumn({ images, direction, speed, colIndex }) {
    const doubled = [...images, ...images];
    const animName = direction === "up" ? `mq-up-${colIndex}` : `mq-dn-${colIndex}`;

    return (
        <div
            style={{ display: "flex", flexDirection: "column", gap: 8, animation: `${animName} ${speed}s linear infinite`, willChange: "transform" }}
            onMouseEnter={(e) => (e.currentTarget.style.animationPlayState = "paused")}
            onMouseLeave={(e) => (e.currentTarget.style.animationPlayState = "running")}
        >
            {doubled.map((img, idx) => (
                <div
                    key={`${img.id}-${idx}`}
                    style={{ flexShrink: 0, overflow: "hidden", borderRadius: 24, border: "2px solid #000000ff", boxShadow: "0 1px 6px rgba(0,0,0,0.1)", transition: "transform 0.2s ease, box-shadow 0.2s ease", cursor: "pointer", position: "relative" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = `scale(${HOVER_SCALE})`; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)"; e.currentTarget.style.zIndex = "20"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,0.1)"; e.currentTarget.style.zIndex = "auto"; }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={img.src}
                        alt=""
                        loading="lazy"
                        style={{ display: "block", width: "100%", height: "auto" }}
                        onError={(e) => { e.currentTarget.style.display = "none"; const sib = e.currentTarget.nextSibling; if (sib) sib.style.display = "flex"; }}
                    />
                    <div style={{ display: "none" }}>
                        <Placeholder idx={idx % images.length} />
                    </div>
                </div>
            ))}
        </div>
    );
}

export default function ImageMarquee() {
    // Shuffle each column's images once per mount (= once per page load/reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const shuffledColumns = useMemo(() => COLUMNS.map((col) => shuffle(col)), []);

    const keyframes = shuffledColumns.map((_, i) =>
        i % 2 === 0
            ? `@keyframes mq-up-${i}{ from{transform:translateY(0)} to{transform:translateY(-50%)} }`
            : `@keyframes mq-dn-${i}{ from{transform:translateY(-50%)} to{transform:translateY(0)} }`
    ).join("\n");

    return (
        <>
            <style>{keyframes}</style>
            <div
                className="hidden lg:block"
                style={{ flex: 1, position: "relative", overflow: "hidden", background: "#eef0f3" }}
            >
                <div
                    style={{ position: "absolute", inset: "-15% -10%", transform: "rotate(-6deg)", display: "flex", gap: 8, alignItems: "flex-start" }}
                >
                    {shuffledColumns.map((col, i) => (
                        <div key={i} style={{ flex: "1 1 0", minWidth: 0, overflow: "hidden" }}>
                            <MarqueeColumn
                                images={col}
                                direction={i % 2 === 0 ? "up" : "down"}
                                speed={i % 2 === 0 ? MARQUEE_SPEED_A : MARQUEE_SPEED_B}
                                colIndex={i}
                            />
                        </div>
                    ))}
                </div>
                {/* <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 5, background: "linear-gradient(to bottom, #eef0f3 0%, transparent 18%, transparent 82%, #eef0f3 100%)" }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 120, pointerEvents: "none", zIndex: 5, background: "linear-gradient(to right, transparent, #eef0f3)" }} />
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 30, pointerEvents: "none", zIndex: 5, background: "linear-gradient(to left, transparent, #eef0f3)" }} /> */}
            </div>
        </>
    );
}