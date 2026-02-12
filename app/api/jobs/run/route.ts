import { NextRequest, NextResponse } from 'next/server';
import { getNextQueuedJob, updateJob } from '@/lib/db';
import { processJob } from '@/lib/jobs/processor';

export async function POST(request: NextRequest) {
  try {
    const job = getNextQueuedJob();

    if (!job) {
      return NextResponse.json({ message: 'No queued jobs' });
    }

    // Mark job as running
    updateJob(job.id, { status: 'running' });

    // Process the job
    await processJob(job);
    
    return NextResponse.json({ 
      message: 'Job processed',
      jobId: job.id,
      step: job.step
    });
  } catch (error) {
    console.error('Job processing error:', error);
    return NextResponse.json(
      { error: 'Job processing failed' },
      { status: 500 }
    );
  }
}
