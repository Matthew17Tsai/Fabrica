'use client';

interface HasAssets {
  flat_front: boolean;
  flat_back:  boolean;
}

interface Props {
  projectId:        string;
  hasAssets:        HasAssets;
  measurementCount: number;
}

interface ExportItem {
  label:           string;
  description:     string;
  href:            string;
  icon:            string;
  fileType:        string;
  disabled?:       boolean;
  disabledReason?: string;
}

export default function ExportTab({ projectId, hasAssets, measurementCount }: Props) {
  const base = `/api/projects/${projectId}/export`;

  const items: ExportItem[] = [
    {
      label:       'PDF Tech Pack',
      description: 'Complete spec document — cover page, flat sketches, measurements, BOM, and construction notes.',
      href:        `${base}/pdf`,
      icon:        '📄',
      fileType:    'PDF',
    },
    {
      label:       'Excel Workbook',
      description: 'Four-sheet workbook: Project Info, Measurements (in + cm), BOM, and Construction Notes.',
      href:        `${base}/excel`,
      icon:        '📊',
      fileType:    'XLSX',
    },
    {
      label:       'SVG — Front View',
      description: 'Editable vector flat sketch ready for Adobe Illustrator refinement.',
      href:        `${base}/svg?view=front`,
      icon:        '✏️',
      fileType:    'SVG',
      disabled:    !hasAssets.flat_front,
      disabledReason: 'Generate a flat sketch first.',
    },
    {
      label:       'SVG — Back View',
      description: 'Editable vector flat sketch — back view.',
      href:        `${base}/svg?view=back`,
      icon:        '✏️',
      fileType:    'SVG',
      disabled:    !hasAssets.flat_back,
      disabledReason: 'Generate a flat sketch first.',
    },
    {
      label:       'JSON Data',
      description: 'All project data as structured JSON — project info, measurements (in + cm), BOM, construction notes.',
      href:        `${base}/json`,
      icon:        '{ }',
      fileType:    'JSON',
    },
  ];

  return (
    <div className="space-y-6">

      {/* Summary chips */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Tech Pack Contents
        </h3>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Front Sketch',                ready: hasAssets.flat_front  },
            { label: 'Back Sketch',                 ready: hasAssets.flat_back   },
            { label: `${measurementCount} Measurements`, ready: measurementCount > 0 },
          ].map(({ label, ready }) => (
            <span
              key={label}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                ready
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-gray-50 text-gray-400 border border-gray-200'
              }`}
            >
              {ready ? '✓ ' : ''}{label}
            </span>
          ))}
        </div>

        {measurementCount === 0 && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Add measurements in the Measurements tab to include them in PDF and Excel exports.
          </p>
        )}
      </div>

      {/* Download cards */}
      <div className="grid sm:grid-cols-2 gap-4">
        {items.map((item) => (
          <div
            key={item.label}
            className={`bg-white rounded-xl border p-5 flex gap-4 transition ${
              item.disabled
                ? 'border-gray-100 opacity-60'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {/* Icon */}
            <div className="w-11 h-11 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-lg flex-shrink-0 font-mono text-sm select-none">
              {item.icon}
            </div>

            {/* Info + download */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900 text-sm">{item.label}</p>
                <span className="text-xs text-gray-400 font-mono">{item.fileType}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {item.disabled ? item.disabledReason : item.description}
              </p>
              {!item.disabled && (
                <a
                  href={item.href}
                  download
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition"
                >
                  <span>↓</span>
                  Download
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Files are generated fresh on each download — BOM, measurements, and construction notes reflect the latest saved state.
        SVG files require a flat sketch to be generated first.
      </p>
    </div>
  );
}
