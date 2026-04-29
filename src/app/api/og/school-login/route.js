import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const schoolName = searchParams.get('name') || 'School Portal';
    const schoolCode = searchParams.get('code') || 'EduBreezy';

    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    padding: '64px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 52%, #dbeafe 100%)',
                    color: 'white',
                    fontFamily: 'sans-serif',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '999px', background: '#f59e0b' }} />
                    <div style={{ fontSize: 32, opacity: 0.92 }}>EduBreezy ERP Login</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '900px' }}>
                    <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{schoolName}</div>
                    <div style={{ fontSize: 30, opacity: 0.88 }}>
                        Secure school admin login portal powered by EduBreezy
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 28, opacity: 0.92 }}>School Code: {schoolCode}</div>
                    <div
                        style={{
                            display: 'flex',
                            padding: '14px 24px',
                            borderRadius: '999px',
                            background: 'rgba(255,255,255,0.14)',
                            fontSize: 24,
                        }}
                    >
                        Login to Dashboard
                    </div>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        },
    );
}
