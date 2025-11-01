import React, { useRef } from 'react';
import { Upload, X, Music } from 'lucide-react';

export default function AudioUploader({ audioFile, onFileSelect, onRemove }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full p-4 bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg border-2 border-gray-700">
      <div className="text-center mb-3">
        <h3 className="text-xs md:text-sm text-gray-300 font-bold tracking-wider">
          AUDIO SOURCE
        </h3>
      </div>

      {!audioFile ? (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full p-6 md:p-8 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 transition-colors bg-gradient-to-b from-gray-900 to-gray-800 group"
        >
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 md:w-12 md:h-12 text-gray-500 group-hover:text-blue-400 transition-colors" />
            <div>
              <p className="text-sm md:text-base text-gray-300 font-semibold mb-1">
                Upload Audio File
              </p>
              <p className="text-xs text-gray-500">
                MP3, WAV, FLAC, OGG supported
              </p>
            </div>
          </div>
        </button>
      ) : (
        <div className="p-4 bg-gradient-to-b from-gray-900 to-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                <Music className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <div>
                <p className="text-sm md:text-base text-gray-200 font-semibold truncate max-w-[200px]">
                  {audioFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={onRemove}
              className="p-2 hover:bg-red-600/20 rounded-lg transition-colors group"
            >
              <X className="w-5 h-5 text-gray-400 group-hover:text-red-400" />
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}