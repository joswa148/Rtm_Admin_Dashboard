import React, { useCallback, useEffect, useRef, useState } from 'react';
import './ImageUploader.css';

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;

const formatBytes = (n) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
};

/**
 * Reusable image uploader.
 *
 * Props:
 *   uploadUrl       string  endpoint receiving multipart/form-data
 *   fieldName       string  multipart field name (default "logo")
 *   token           string  bearer token for Authorization
 *   currentImageUrl string  absolute URL to existing image (or null)
 *   onUploaded      fn(serverResponse) called on success
 *   onRemoved       fn() called after a successful remove
 *   removeUrl       string  optional DELETE endpoint to clear the image
 *   accept          string[] allowed mime types
 *   maxBytes        number   client-side size cap
 *   size            number   square render size in px (default 56)
 *   alt             string   accessible label for the current image
 */
const ImageUploader = ({
  uploadUrl,
  fieldName = 'logo',
  token,
  currentImageUrl = null,
  onUploaded,
  onRemoved,
  removeUrl,
  accept = DEFAULT_ACCEPT,
  maxBytes = DEFAULT_MAX_BYTES,
  size = 56,
  alt = 'Uploaded image',
}) => {
  const inputRef = useRef(null);
  const xhrRef = useRef(null);
  const previewUrlRef = useRef(null);

  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | uploading | error
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (xhrRef.current) xhrRef.current.abort();
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const validate = useCallback((file) => {
    if (!accept.includes(file.type)) {
      return `Unsupported file type. Allowed: ${accept.map((t) => t.split('/')[1]).join(', ')}.`;
    }
    if (file.size > maxBytes) {
      return `File is too large (${formatBytes(file.size)}). Max ${formatBytes(maxBytes)}.`;
    }
    return null;
  }, [accept, maxBytes]);

  const setLocalPreview = (file) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);
  };

  const startUpload = useCallback((file) => {
    const validationError = validate(file);
    if (validationError) {
      setStatus('error');
      setError(validationError);
      return;
    }
    setError('');
    setStatus('uploading');
    setProgress(0);
    setLocalPreview(file);

    const form = new FormData();
    form.append(fieldName, file);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open('POST', uploadUrl);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      xhrRef.current = null;
      let body = {};
      try { body = JSON.parse(xhr.responseText || '{}'); } catch (_) {}
      if (xhr.status >= 200 && xhr.status < 300) {
        setStatus('idle');
        setProgress(100);
        if (previewUrlRef.current) {
          URL.revokeObjectURL(previewUrlRef.current);
          previewUrlRef.current = null;
        }
        setPreview(null);
        if (onUploaded) onUploaded(body);
      } else {
        setStatus('error');
        setError(body.message || `Upload failed (${xhr.status}).`);
      }
    };

    xhr.onerror = () => {
      xhrRef.current = null;
      setStatus('error');
      setError('Network error during upload.');
    };

    xhr.onabort = () => {
      xhrRef.current = null;
      setStatus('idle');
      setProgress(0);
      setPreview(null);
    };

    xhr.send(form);
  }, [uploadUrl, fieldName, token, validate, onUploaded]);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (file) startUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) startUpload(file);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  const cancel = () => xhrRef.current?.abort();

  const remove = async () => {
    if (!removeUrl) return;
    try {
      const res = await fetch(removeUrl, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Failed (${res.status})`);
      }
      if (onRemoved) onRemoved();
    } catch (err) {
      setStatus('error');
      setError(err.message);
    }
  };

  const showImage = preview || currentImageUrl;
  const isUploading = status === 'uploading';

  return (
    <div className="img-uploader" style={{ width: size, height: size }}>
      <div
        className={`img-uploader__drop ${dragOver ? 'is-dragover' : ''} ${showImage ? 'has-image' : 'is-empty'}`}
        role="button"
        tabIndex={0}
        aria-label={showImage ? 'Replace image' : 'Upload image'}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={onKeyDown}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        {showImage ? (
          <img src={showImage} alt={alt} className="img-uploader__image" />
        ) : (
          <span className="img-uploader__plus" aria-hidden="true">+</span>
        )}

        {isUploading && (
          <div className="img-uploader__overlay" aria-live="polite">
            <div className="img-uploader__progress-ring">
              <svg viewBox="0 0 36 36">
                <path className="img-uploader__progress-bg" d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0-31.831" />
                <path
                  className="img-uploader__progress-fg"
                  strokeDasharray={`${progress}, 100`}
                  d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831a15.9155 15.9155 0 1 1 0-31.831"
                />
              </svg>
              <span className="img-uploader__progress-text">{progress}%</span>
            </div>
          </div>
        )}

        {!isUploading && showImage && (
          <div className="img-uploader__hover-overlay">
            <span>Replace</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        className="img-uploader__input"
        onChange={onFileSelect}
        aria-hidden="true"
        tabIndex={-1}
      />

      {isUploading && (
        <button type="button" className="img-uploader__btn img-uploader__btn--ghost" onClick={cancel}>
          Cancel
        </button>
      )}

      {!isUploading && currentImageUrl && removeUrl && (
        <button type="button" className="img-uploader__btn img-uploader__btn--danger" onClick={remove} aria-label="Remove image">
          ×
        </button>
      )}

      {status === 'error' && (
        <div role="alert" className="img-uploader__error" title={error}>{error}</div>
      )}
    </div>
  );
};

export default ImageUploader;
