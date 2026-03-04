'use client';

import { useEffect, useState } from 'react';

export default function GlobalError({ error, reset }) {
  const [errorRef] = useState(() =>
    `ERR-${Math.floor(1000 + Math.random() * 9000)}`
  );

  useEffect(() => {
    console.error('[Global Error]', errorRef, error);
  }, [error, errorRef]);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something broke — EduBreezy</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif;
            background: linear-gradient(135deg, #f0f4ff 0%, #e8eeff 50%, #f5f0ff 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            color: #1e293b;
          }
          .card {
            background: rgba(255,255,255,0.85);
            backdrop-filter: blur(16px);
            border: 1px solid rgba(99,102,241,0.12);
            border-radius: 24px;
            padding: 3rem 2.5rem;
            max-width: 480px;
            width: 100%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(99,102,241,0.1), 0 4px 16px rgba(0,0,0,0.06);
          }
          .logo-wrap { margin-bottom: 2rem; }
          .logo-wrap img { height: 48px; width: auto; }
          .logo-text {
            font-size: 1.5rem;
            font-weight: 800;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }
          .icon-ring {
            width: 80px; height: 80px;
            background: #fee2e2;
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 1.75rem;
            animation: pulse 2s ease-in-out infinite;
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.25); }
            50%       { box-shadow: 0 0 0 12px rgba(239,68,68,0); }
          }
          .icon-ring svg { width: 38px; height: 38px; }
          h1 { font-size: 1.75rem; font-weight: 800; margin-bottom: 0.75rem; color: #0f172a; }
          .subtitle {
            color: #64748b;
            line-height: 1.7;
            font-size: 0.95rem;
            margin-bottom: 0.5rem;
          }
          .err-badge {
            display: inline-block;
            margin-bottom: 1.75rem;
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            color: #94a3b8;
            font-size: 0.75rem;
            font-family: monospace;
            padding: 0.3rem 0.75rem;
            border-radius: 99px;
          }
          .actions {
            display: flex; gap: 0.75rem; flex-wrap: wrap;
            justify-content: center;
            margin-bottom: 1.75rem;
          }
          .btn-primary {
            display: inline-flex; align-items: center; gap: 0.4rem;
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: #fff;
            font-weight: 600; font-size: 0.875rem;
            padding: 0.65rem 1.4rem;
            border-radius: 99px;
            border: none; cursor: pointer;
            transition: opacity 0.15s, transform 0.15s;
          }
          .btn-primary:hover { opacity: 0.92; transform: translateY(-1px); }
          .btn-secondary {
            display: inline-flex; align-items: center; gap: 0.4rem;
            background: #fff;
            color: #475569;
            font-weight: 600; font-size: 0.875rem;
            padding: 0.65rem 1.4rem;
            border-radius: 99px;
            border: 1px solid #e2e8f0; cursor: pointer;
            transition: background 0.15s, transform 0.15s;
            text-decoration: none;
          }
          .btn-secondary:hover { background: #f8fafc; transform: translateY(-1px); }
          .contact { font-size: 0.82rem; color: #94a3b8; }
          .contact a { color: #4f46e5; text-decoration: underline; text-underline-offset: 2px; font-weight: 500; }
          @media (max-width: 480px) {
            .card { padding: 2rem 1.5rem; }
            h1 { font-size: 1.4rem; }
          }
        `}</style>
      </head>
      <body>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', margin: 'auto' }}>

          {/* Logo */}
          <div style={{ marginBottom: '2rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/edu.png" alt="EduBreezy" style={{ height: '48px', width: 'auto', margin: '0 auto' }} />
          </div>

          {/* Icon */}
          <div className="icon-ring">
            <svg viewBox="0 0 38 38" fill="none">
              <circle cx="19" cy="19" r="17" fill="#FEE2E2" />
              <path d="M19 10v10" stroke="#EF4444" strokeWidth="2.8" strokeLinecap="round" />
              <circle cx="19" cy="26" r="1.8" fill="#EF4444" />
            </svg>
          </div>

          {/* Heading */}
          <h1>Something just broke</h1>
          <p className="subtitle">
            Don&apos;t panic — it&apos;s not you, it&apos;s us. Something got broken on our end.
            You can try refreshing, or reach out to our team and we&apos;ll look into it right away.
          </p>

          {/* Error code badge */}
          <div>
            <span className="err-badge">Ref: {errorRef}</span>
          </div>

          {/* Actions */}
          <div className="actions">
            <button className="btn-primary" onClick={() => reset()}>
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
            <a className="btn-secondary" href="/dashboard">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go to Dashboard
            </a>
          </div>

          {/* Contact */}
          <p className="contact">
            Still seeing this? Inform our team at{' '}
            <a href={`mailto:hello@edubreezy.com?subject=Error Report ${errorRef}&body=Hi EduBreezy team, I encountered error ${errorRef} while using the app.`}>
              hello@edubreezy.com
            </a>
          </p>

        </div>
      </body>
    </html>
  );
}
