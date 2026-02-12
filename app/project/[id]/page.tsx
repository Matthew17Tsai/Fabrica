'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProjectStatus {
  project: {
    id: string;
    title: string;
    category: string;
    status: string;
    error_message: string | null;
  };
  job: {
    status: string;
    step: string;
    progress: number;
    error_message: string | null;
  } | null;
  hasAssets: {
    svg: boolean;
    techpack_json: boolean;
  };
}

export default function ProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<ProjectStatus | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/projects/${params.id}/status`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch status');
        }

        setStatus(data);

        // Trigger job runner if there's a queued job
        if (data.job?.status === 'queued') {
          fetch('/api/jobs/run', { method: 'POST' }).catch(console.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load project');
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [params.id]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          Go home
        </Link>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  const { project, job, hasAssets } = status;

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-2">{project.title}</h1>
      <p className="text-gray-600 mb-8 capitalize">{project.category}</p>

      {/* Status Display */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Processing Status</h2>

        {project.status === 'error' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            Error: {project.error_message || 'Processing failed'}
          </div>
        )}

        {project.status === 'processing' && job && (
          <div>
            <div className="mb-2">
              <span className="font-medium">Step:</span> {job.step}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
              <div
                className="bg-primary h-4 rounded-full transition-all duration-300"
                style={{ width: `${job.progress}%` }}
              />
            </div>
            <div className="text-sm text-gray-600">
              {job.progress}% complete
            </div>
          </div>
        )}

        {project.status === 'ready' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            ✓ Processing complete!
          </div>
        )}

        {project.status === 'uploaded' && (
          <div className="text-gray-600">
            Waiting to start processing...
          </div>
        )}
      </div>

      {/* Navigation Links */}
      {project.status === 'ready' && (
        <div className="space-y-4">
          {hasAssets.svg && (
            <Link
              href={`/project/${params.id}/edit`}
              className="block w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold text-center hover:bg-blue-700 transition"
            >
              Edit flat sketch
            </Link>
          )}

          <Link
            href={`/project/${params.id}/techpack`}
            className="block w-full px-6 py-3 bg-white border-2 border-primary text-primary rounded-lg font-semibold text-center hover:bg-blue-50 transition"
          >
            {hasAssets.techpack_json ? 'Edit tech pack' : 'Create tech pack'}
          </Link>

          {hasAssets.techpack_json && (
            <Link
              href={`/project/${params.id}/export`}
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold text-center hover:bg-gray-200 transition"
            >
              Export
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
