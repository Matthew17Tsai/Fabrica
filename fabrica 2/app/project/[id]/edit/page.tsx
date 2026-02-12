'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const FlatSketchEditor = dynamic(() => import('@/components/FlatSketchEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
        <p className="text-sm text-gray-500">Loading editor...</p>
      </div>
    </div>
  ),
});

export default function EditPage({ params }: { params: { id: string } }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [projectTitle, setProjectTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Load SVG
        const svgRes = await fetch(`/api/projects/${params.id}/svg`);
        if (!svgRes.ok) throw new Error('SVG not ready yet. Go back and wait for processing to complete.');
        const svgData = await svgRes.json();
        setSvgContent(svgData.svg);

        // Load project info for title
        const statusRes = await fetch(`/api/projects/${params.id}/status`);
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setProjectTitle(statusData.project?.title || '');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load flat sketch');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [params.id]);

  const handleSave = async (updatedSVG: string) => {
    const response = await fetch('/api/editor/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: params.id, svg: updatedSVG }),
    });
    if (!response.ok) throw new Error('Failed to save');
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-gray-500">Loading flat sketch...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">{error}</div>
        <Link href={`/project/${params.id}`} className="text-primary hover:underline">
          Back to project
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Edit flat sketch</h1>
          {projectTitle && <p className="text-gray-500 text-sm mt-0.5">{projectTitle}</p>}
        </div>
        <div className="flex gap-3">
          <Link
            href={`/project/${params.id}`}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            Back
          </Link>
          <Link
            href={`/project/${params.id}/techpack`}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition"
          >
            Tech pack →
          </Link>
        </div>
      </div>

      {/* Editor */}
      <FlatSketchEditor
        projectId={params.id}
        svgContent={svgContent}
        onSave={handleSave}
      />
    </div>
  );
}
