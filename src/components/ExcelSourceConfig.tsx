import { useState, useRef, useCallback } from 'react';

interface ExcelSourceConfigProps {
  onLoadFile: (file: File) => Promise<void>;
  onLoadUrl: (url: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  lastLoaded: Date | null;
  dataLoaded: boolean;
  rateCount: number;
}

export default function ExcelSourceConfig({
  onLoadFile, onLoadUrl, loading, error, lastLoaded, dataLoaded, rateCount,
}: ExcelSourceConfigProps) {
  const [url, setUrl] = useState(() => localStorage.getItem('rateTableUrl') ?? '');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onLoadFile(file);
  }, [onLoadFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onLoadFile(file);
  }, [onLoadFile]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Data Source</h3>

        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsm,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="text-gray-400 mb-2">
            <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Drop your Rate Table file here, or click to browse</p>
          <p className="text-gray-400 text-sm mt-1">Supports .xlsm, .xlsx, .xls files</p>
        </div>

        <div className="mt-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Or Load from URL (SharePoint)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://company.sharepoint.com/sites/.../Rate Table.xlsm"
            />
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              onClick={() => url && onLoadUrl(url)}
              disabled={!url || loading}
            >
              {loading ? 'Loading...' : 'Load'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {dataLoaded && lastLoaded && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            Data loaded successfully. {rateCount} rates found. Last loaded: {lastLoaded.toLocaleString()}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">SharePoint Integration</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>To use this app with SharePoint:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-500">
            <li>Upload the Rate Table .xlsm file to a SharePoint document library</li>
            <li>Copy the direct download link for the file</li>
            <li>Paste the URL above and click Load</li>
            <li>The URL will be saved for future visits</li>
          </ol>
          <p className="mt-3">To embed this app in SharePoint:</p>
          <ol className="list-decimal list-inside space-y-1 text-gray-500">
            <li>Deploy the built app to a web host or SharePoint site</li>
            <li>Add an Embed web part to your SharePoint page</li>
            <li>Paste the app URL into the embed configuration</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
