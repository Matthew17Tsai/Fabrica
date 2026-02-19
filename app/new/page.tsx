'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewProjectPage() {
  const router   = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');
  const [preview,   setPreview]   = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setUploading(true);

    const formData = new FormData(e.currentTarget);

    try {
      const response = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Upload failed');
      router.push(`/project/${data.projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">New project</h1>
      <p className="text-gray-500 mb-8">Upload your inspiration image and we'll generate a flat sketch and tech pack.</p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Project title
          </label>
          <input
            type="text" id="title" name="title" required
            placeholder="e.g. Oversized Hoodie SS25"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            Garment category
          </label>
          <select
            id="category" name="category" required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">Select category</option>
            <option value="hoodie">Hoodie</option>
            <option value="sweatshirt">Crewneck sweatshirt</option>
            <option value="sweatpants">Sweatpants</option>
          </select>
        </div>

        {/* Base size + Fit (side by side) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="base_size" className="block text-sm font-medium text-gray-700 mb-1">
              Base size
            </label>
            <select
              id="base_size" name="base_size" defaultValue="M"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="XS">XS</option>
              <option value="S">S</option>
              <option value="M">M</option>
              <option value="L">L</option>
              <option value="XL">XL</option>
              <option value="XXL">XXL</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">Measurements will pre-fill for this size</p>
          </div>
          <div>
            <label htmlFor="fit" className="block text-sm font-medium text-gray-700 mb-1">
              Fit
            </label>
            <select
              id="fit" name="fit" defaultValue="regular"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="oversized">Oversized</option>
              <option value="regular">Regular</option>
              <option value="slim">Slim fit</option>
            </select>
          </div>
        </div>

        {/* Image upload */}
        <div>
          <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">
            Inspiration image
          </label>
          <input
            type="file" id="file" name="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            required
            onChange={handleFileChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          <p className="mt-1 text-xs text-gray-500">
            Photo of garment, hand sketch, mood board, or AI-generated render — PNG / JPG / WEBP
          </p>
        </div>

        {/* Image preview */}
        {preview && (
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
            <img
              src={preview}
              alt="Preview"
              className="max-h-48 mx-auto object-contain p-3"
            />
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={uploading}
          className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? 'Creating project…' : 'Create project'}
        </button>
      </form>
    </div>
  );
}
