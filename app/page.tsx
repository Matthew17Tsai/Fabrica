import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">
          Transform Sketches into Tech Packs
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload your design, get an editable flat sketch and complete tech pack in minutes
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link
            href="/new"
            className="px-8 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Upload design
          </Link>
          
          <button
            className="px-8 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:border-gray-400 transition"
            onClick={() => {
              // TODO: Implement sample gallery in Step 7
              alert('Sample gallery coming soon!');
            }}
          >
            Try sample
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📤</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Upload</h3>
          <p className="text-gray-600">
            Upload your sketch or design image
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✏️</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Edit</h3>
          <p className="text-gray-600">
            Adjust the flat sketch and add callouts
          </p>
        </div>

        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-semibold text-lg mb-2">Export</h3>
          <p className="text-gray-600">
            Generate tech packs as PDF, Excel, or JSON
          </p>
        </div>
      </div>

      <div className="mt-16 p-6 bg-white rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Supported Categories</h2>
        <ul className="space-y-2 text-gray-700">
          <li>• Hoodie</li>
          <li>• Sweatshirt</li>
          <li>• Sweatpants</li>
        </ul>
      </div>
    </div>
  );
}
