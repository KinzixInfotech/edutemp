import { withSchoolAccess } from "@/lib/api-auth"; // ═══════════════════════════════════════════════════════════════
// FILE: app/api/schools/fee/assign/status/route.js
//
// Server-Sent Events — client opens ONE connection.
// Server checks Redis every 800ms and pushes only when
// done/failed/status actually changes. Closes when job finishes.
// Zero polling overhead on the client side.
// ═══════════════════════════════════════════════════════════════

import { getJob } from '../route';

export const dynamic = 'force-dynamic';

export const GET = withSchoolAccess(async function GET(req) {
  const { searchParams } = new URL(req.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return new Response('jobId required', { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {

          // Controller already closed
        }};

      // ── Send initial state immediately ─────────────────
      const initial = await getJob(jobId);
      if (!initial) {
        send({ error: 'Job not found' });
        controller.close();
        return;
      }

      send({
        jobId: initial.jobId,
        status: initial.status,
        total: initial.total,
        done: initial.done,
        failed: initial.failed,
        skipped: initial.skipped
      });

      // Already finished on first read
      if (initial.status === 'done' || initial.status === 'error') {
        controller.close();
        return;
      }

      // ── Watch for changes ──────────────────────────────
      let lastDone = initial.done;
      let lastFailed = initial.failed;
      let lastStatus = initial.status;
      let closed = false;

      // Close when client disconnects
      req.signal.addEventListener('abort', () => {closed = true;});

      while (!closed) {
        await sleep(800);
        if (closed) break;

        let job;
        try {
          job = await getJob(jobId);
        } catch {
          break; // Redis hiccup — close gracefully
        }

        if (!job) break;

        // Only push when something changed — avoids noise
        const changed =
        job.done !== lastDone ||
        job.failed !== lastFailed ||
        job.status !== lastStatus;

        if (changed) {
          send({
            jobId: job.jobId,
            status: job.status,
            total: job.total,
            done: job.done,
            failed: job.failed,
            skipped: job.skipped
          });

          lastDone = job.done;
          lastFailed = job.failed;
          lastStatus = job.status;
        }

        // Job finished — close stream
        if (job.status === 'done' || job.status === 'error') {
          closed = true;
          break;
        }
      }

      try {controller.close();} catch {}
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no' // disable Nginx buffering if behind proxy
    }
  });
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));