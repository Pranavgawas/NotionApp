import React, { useState, useEffect } from 'react';
import { Upload, Image, Video, Link, AlertCircle, CheckCircle2, Loader2, Server, Trash2, ExternalLink } from 'lucide-react';

export default function NotionUploader() {
  const [activeTab, setActiveTab] = useState('image');
  const [selectedFile, setSelectedFile] = useState(null);
  const [url, setUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [serverStatus, setServerStatus] = useState('checking');
  // Detect the correct backend URL based on environment
  const [backendUrl] = useState(() => {
    // Check for environment variable first
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    
    // If running in GitHub Codespaces or similar
    if (window.location.hostname.includes('github.dev')) {
      // Replace port 3000 with 3001 in the hostname
      const backendHost = window.location.hostname.replace('-3000.', '-3001.');
      return `${window.location.protocol}//${backendHost}`;
    }
    
    // Default to localhost
    return 'http://localhost:3001';
  });
  const [pages, setPages] = useState([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [externalUrl, setExternalUrl] = useState('');
  const [useExternalUrl, setUseExternalUrl] = useState(false);

  const tabs = [
    { id: 'image', label: 'Image Upload', icon: Image },
    { id: 'video', label: 'Video Upload', icon: Video },
    { id: 'url', label: 'URL Content', icon: Link }
  ];

  // Check server health on mount
  useEffect(() => {
    checkServerHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkServerHealth = async () => {
    console.log('Checking server health at:', `${backendUrl}/api/health`);
    try {
      const response = await fetch(`${backendUrl}/api/health`);
      console.log('Health check response:', response.status, response.ok);
      if (response.ok) {
        setServerStatus('connected');
        console.log('✓ Backend connected successfully');
      } else {
        setServerStatus('error');
        console.error('Backend returned error:', response.status);
      }
    } catch (error) {
      console.error('Failed to connect to backend:', error.message);
      setServerStatus('offline');
    }
  };

  const fetchPages = async () => {
    if (serverStatus !== 'connected') {
      setMessage({ type: 'error', text: 'Backend server is not running.' });
      return;
    }

    setLoadingPages(true);
    try {
      const response = await fetch(`${backendUrl}/api/pages`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pages');
      }

      setPages(data.pages);
      setShowGallery(true);
      setMessage({ type: 'success', text: `Loaded ${data.pages.length} pages from Notion` });
    } catch (error) {
      console.error('Fetch pages error:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to fetch pages: ${error.message}` 
      });
    } finally {
      setLoadingPages(false);
    }
  };

  const deletePage = async (pageId, pageTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${pageTitle}"?`)) {
      return;
    }

    try {
      const response = await fetch(`${backendUrl}/api/pages/${pageId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete page');
      }

      setMessage({ type: 'success', text: `"${pageTitle}" deleted successfully` });
      
      // Refresh the gallery
      fetchPages();
    } catch (error) {
      console.error('Delete error:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to delete: ${error.message}` 
      });
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (activeTab === 'image') {
        if (!file.type.startsWith('image/')) {
          setMessage({ type: 'error', text: 'Please select an image file (JPEG, PNG, GIF)' });
          return;
        }
      } else if (activeTab === 'video') {
        if (!file.type.startsWith('video/')) {
          setMessage({ type: 'error', text: 'Please select a video file' });
          return;
        }
      }
      
      if (file.size > 20 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size exceeds 20MB. Please use a smaller file.' });
        return;
      }
      
      setSelectedFile(file);
      setMessage({ type: '', text: '' });
    }
  };

  const uploadToNotion = async () => {
    if (serverStatus !== 'connected') {
      setMessage({ type: 'error', text: 'Backend server is not running. Please start the server first.' });
      return;
    }

    if (useExternalUrl && !externalUrl) {
      setMessage({ type: 'error', text: 'Please enter an external URL' });
      return;
    }

    if (!useExternalUrl && !selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file to upload or use an external URL' });
      return;
    }

    if (!title) {
      setMessage({ type: 'error', text: 'Please enter a title for the page' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      if (useExternalUrl) {
        formData.append('externalUrl', externalUrl);
      } else {
        formData.append('file', selectedFile);
      }
      formData.append('title', title);
      formData.append('caption', caption);
      formData.append('type', activeTab);

      const response = await fetch(`${backendUrl}/api/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload to Notion');
      }

      setMessage({ 
        type: 'success', 
        text: `${activeTab === 'image' ? 'Image' : 'Video'} uploaded successfully to Notion database!` 
      });
      setSelectedFile(null);
      setCaption('');
      setTitle('');
      
      // Refresh gallery if it's open
      if (showGallery) {
        fetchPages();
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      setMessage({ 
        type: 'error', 
        text: `Upload failed: ${error.message}` 
      });
    } finally {
      setUploading(false);
    }
  };

  const addUrlToNotion = async () => {
    if (serverStatus !== 'connected') {
      setMessage({ type: 'error', text: 'Backend server is not running. Please start the server first.' });
      return;
    }

    if (!url) {
      setMessage({ type: 'error', text: 'Please enter a URL' });
      return;
    }

    if (!title) {
      setMessage({ type: 'error', text: 'Please enter a title for the page' });
      return;
    }

    setUploading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`${backendUrl}/api/add-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          url,
          caption
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add URL to Notion');
      }

      setMessage({ type: 'success', text: 'URL content added successfully to Notion database!' });
      setUrl('');
      setCaption('');
      setTitle('');
      
      // Refresh gallery if it's open
      if (showGallery) {
        fetchPages();
      }
      
    } catch (error) {
      console.error('URL add error:', error);
      setMessage({ 
        type: 'error', 
        text: `Failed to add URL: ${error.message}` 
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Upload className="w-8 h-8" />
                  Notion Media Uploader
                </h1>
                <p className="mt-2 text-blue-100">Upload images, videos, or add URL content to your Notion database</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg">
                <Server className="w-4 h-4" />
                <span className="text-sm">
                  {serverStatus === 'checking' && 'Checking...'}
                  {serverStatus === 'connected' && '✓ Connected'}
                  {serverStatus === 'offline' && '✗ Offline'}
                  {serverStatus === 'error' && '✗ Error'}
                </span>
              </div>
            </div>
          </div>

          {/* Server Status Alert */}
          {serverStatus !== 'connected' && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-800 font-medium">
                    Backend server is not running
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Please start the backend server on port 3001 to use this app.
                  </p>
                  <button
                    onClick={checkServerHealth}
                    className="mt-2 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSelectedFile(null);
                    setUrl('');
                    setMessage({ type: '', text: '' });
                  }}
                  className={`flex-1 px-6 py-4 font-medium transition-colors flex items-center justify-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-white text-blue-600 border-b-2 border-blue-600'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="p-6">
            {(activeTab === 'image' || activeTab === 'video') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for this page"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Toggle between file upload and URL */}
                <div className="flex items-center justify-center gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setUseExternalUrl(false);
                      setExternalUrl('');
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      !useExternalUrl
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Upload File
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUseExternalUrl(true);
                      setSelectedFile(null);
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      useExternalUrl
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Use External URL
                  </button>
                </div>

                {useExternalUrl ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      External {activeTab === 'image' ? 'Image' : 'Video'} URL *
                    </label>
                    <input
                      type="url"
                      value={externalUrl}
                      onChange={(e) => setExternalUrl(e.target.value)}
                      placeholder={`https://example.com/${activeTab}.${activeTab === 'image' ? 'jpg' : 'mp4'}`}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="mt-2 text-xs text-gray-600">
                      💡 Recommended: Upload your file to Imgur, Cloudinary, or similar service and paste the direct URL here
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select {activeTab === 'image' ? 'Image' : 'Video'} File *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        accept={activeTab === 'image' ? 'image/*' : 'video/*'}
                        className="hidden"
                        id="file-upload"
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        {activeTab === 'image' ? (
                          <Image className="w-12 h-12 text-gray-400 mb-3" />
                        ) : (
                          <Video className="w-12 h-12 text-gray-400 mb-3" />
                        )}
                        <span className="text-sm text-gray-600">
                          Click to select {activeTab === 'image' ? 'an image' : 'a video'}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          Max file size: 5MB (Notion API limit)
                        </span>
                      </label>
                    </div>
                    {selectedFile && (
                      <p className="mt-2 text-sm text-green-600 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    <p className="mt-2 text-xs text-yellow-600">
                      ⚠️ Note: Large files may fail due to Notion API limits. Use "External URL" option for better results.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption for your file"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={uploadToNotion}
                  disabled={uploading || (!selectedFile && !externalUrl) || !title || serverStatus !== 'connected'}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {useExternalUrl ? 'Adding...' : 'Uploading...'}
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" />
                      {useExternalUrl ? 'Add to Notion Database' : 'Upload to Notion Database'}
                    </>
                  )}
                </button>
              </div>
            )}

            {activeTab === 'url' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Page Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a title for this page"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    URL *
                  </label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption (Optional)
                  </label>
                  <input
                    type="text"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Add a caption for your URL"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <button
                  onClick={addUrlToNotion}
                  disabled={uploading || !url || !title || serverStatus !== 'connected'}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Link className="w-5 h-5" />
                      Add to Notion Database
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Message Display */}
            {message.text && (
              <div
                className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm">{message.text}</span>
              </div>
            )}
          </div>

          {/* View Gallery Button */}
          <div className="p-6 border-t">
            <button
              onClick={() => {
                if (showGallery) {
                  setShowGallery(false);
                } else {
                  fetchPages();
                }
              }}
              disabled={loadingPages || serverStatus !== 'connected'}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {loadingPages ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading...
                </>
              ) : showGallery ? (
                <>Hide Gallery</>
              ) : (
                <>View All Uploads</>
              )}
            </button>
          </div>

          {/* Gallery Section */}
          {showGallery && (
            <div className="p-6 border-t bg-gray-50">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Gallery ({pages.length} items)
              </h3>
              
              {pages.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Image className="w-16 h-16 mx-auto mb-3 text-gray-300" />
                  <p>No uploads yet. Start by uploading an image, video, or URL!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pages.map((page) => (
                    <div key={page.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow relative group">
                      {/* Delete Button - appears on hover */}
                      <button
                        onClick={() => deletePage(page.id, page.title)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-red-600"
                        title="Delete page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Media Display */}
                      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden relative">
                        {page.media?.type === 'image' && (
                          <>
                            <img 
                              src={page.media.url} 
                              alt={page.title}
                              className="w-full h-full object-cover cursor-pointer"
                              onClick={() => window.open(page.media.url, '_blank')}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                              }}
                            />
                            <a
                              href={page.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 left-2 bg-white/80 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-700" />
                            </a>
                          </>
                        )}
                        {page.media?.type === 'video' && (
                          <>
                            <video 
                              src={page.media.url} 
                              controls
                              className="w-full h-full"
                            />
                            <a
                              href={page.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute top-2 left-2 bg-white/80 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                              title="Open in new tab"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-700" />
                            </a>
                          </>
                        )}
                        {page.media?.type === 'bookmark' && (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <Link className="w-12 h-12 text-blue-500 mb-2" />
                            <a 
                              href={page.media.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline break-all max-w-full px-2"
                            >
                              {page.media.url}
                            </a>
                          </div>
                        )}
                        {!page.media && (
                          <div className="text-gray-400 flex flex-col items-center">
                            <AlertCircle className="w-12 h-12 mb-2" />
                            <span className="text-xs">No media</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Page Info */}
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-1 truncate" title={page.title}>{page.title}</h4>
                        {page.media?.caption && (
                          <p className="text-sm text-gray-600 mb-2 line-clamp-2">{page.media.caption}</p>
                        )}
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                          <span className="flex items-center gap-1">
                            {page.media?.type === 'image' && <Image className="w-3 h-3" />}
                            {page.media?.type === 'video' && <Video className="w-3 h-3" />}
                            {page.media?.type === 'bookmark' && <Link className="w-3 h-3" />}
                            <span className="capitalize">{page.media?.type || 'Page'}</span>
                          </span>
                          <span>{new Date(page.createdTime).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info Section */}
          <div className="bg-blue-50 p-6 border-t">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Setup Instructions
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 ml-7">
              <li>• Make sure the backend server is running on port 3001</li>
              <li>• Your integration must have access to the database</li>
              <li>• The database must have a "Name" property (title type)</li>
              <li>• Files under 20MB are supported</li>
              <li>• Each upload creates a new page in your database</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
