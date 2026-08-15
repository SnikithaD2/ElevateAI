import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { API } from '../context/AuthContext';

function MarkdownRenderer({ content }) {
  const renderLine = (line, idx) => {
    if (line.startsWith('# ')) return <h1 key={idx}>{line.replace('# ', '')}</h1>;
    if (line.startsWith('## ')) return <h2 key={idx}>{line.replace('## ', '')}</h2>;
    if (line.startsWith('### ')) return <h3 key={idx}>{line.replace('### ', '')}</h3>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <li key={idx}>{line.replace(/^[-*] /, '')}</li>;
    if (line.trim() === '') return <br key={idx} />;
    return <p key={idx}>{line}</p>;
  };

  const lines = content.split('\n');
  return <>{lines.map((line, i) => renderLine(line, i))}</>;
}

export default function Home() {
  const [dragOverVideo, setDragOverVideo] = useState(false);
  const [dragOverPDF, setDragOverPDF] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [uploadType, setUploadType] = useState(''); // 'video' | 'pdf'
  const [title, setTitle] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const videoInputRef = useRef();
  const pdfInputRef = useRef();
  const navigate = useNavigate();

  const startProgress = (messages) => {
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 85) { clearInterval(progressInterval); return prev; }
        const increment = prev < 30 ? 8 : prev < 60 ? 4 : 2;
        return prev + increment;
      });
    }, 800);

    const msgInterval = setInterval(() => {
      setProgress(prev => {
        const msg = messages.find(m => m.at <= prev);
        if (msg) setProgressMsg(msg.msg);
        return prev;
      });
    }, 500);

    return () => {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
    };
  };

  const processVideo = useCallback(async (file) => {
    if (!file || !file.type.startsWith('video/')) {
      setError('Please select a valid video file (MP4, AVI, MOV, MKV, etc.)');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('File size must be under 500MB');
      return;
    }

    setError('');
    setResult(null);
    setUploading(true);
    setUploadType('video');
    setProgress(5);
    setProgressMsg('Uploading video...');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));

    const stopProgress = startProgress([
      { at: 10, msg: 'Uploading video...' },
      { at: 25, msg: 'Sending to analyze...' },
      { at: 40, msg: 'Analyzing video content...' },
      { at: 60, msg: 'Extracting key concepts...' },
      { at: 75, msg: 'Formatting study material...' },
      { at: 85, msg: 'Finalizing content...' },
    ]);

    try {
      const res = await API.post('/api/video/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });
      stopProgress();
      setProgress(100);
      setProgressMsg('Content generated!');
      setTimeout(() => { setResult(res.data); setUploading(false); }, 500);
    } catch (err) {
      stopProgress();
      setUploading(false);
      setProgress(0);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to process video. Please check your API key.');
    }
  }, [title]);

  const processPDF = useCallback(async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please select a valid PDF file.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('PDF file size must be under 50MB');
      return;
    }

    setError('');
    setResult(null);
    setUploading(true);
    setUploadType('pdf');
    setProgress(5);
    setProgressMsg('Uploading PDF...');

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('title', title || file.name.replace(/\.[^/.]+$/, ''));

    const stopProgress = startProgress([
      { at: 10, msg: 'Uploading PDF...' },
      { at: 25, msg: 'Extracting text from PDF...' },
      { at: 45, msg: 'Simplifying content...' },
      { at: 65, msg: 'Creating study notes...' },
      { at: 80, msg: 'Formatting material...' },
      { at: 88, msg: 'Finalizing content...' },
    ]);

    try {
      const res = await API.post('/api/video/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 180000
      });
      stopProgress();
      setProgress(100);
      setProgressMsg('Notes generated!');
      setTimeout(() => { setResult(res.data); setUploading(false); }, 500);
    } catch (err) {
      stopProgress();
      setUploading(false);
      setProgress(0);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to process PDF. Please try again.');
    }
  }, [title]);

  const handleVideoDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverVideo(false);
    const file = e.dataTransfer.files[0];
    if (file) processVideo(file);
  }, [processVideo]);

  const handlePDFDrop = useCallback((e) => {
    e.preventDefault();
    setDragOverPDF(false);
    const file = e.dataTransfer.files[0];
    if (file) processPDF(file);
  }, [processPDF]);

  const handleDownloadPDF = async () => {
    try {
      const res = await API.get(`/api/video/${result.videoId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const fileUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = fileUrl;

      const contentDisposition = res.headers['content-disposition'];
      let fileName = 'notes.pdf';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*?=(?:UTF-8''|")?([^;"\n]+)/);
        if (match?.[1]) fileName = decodeURIComponent(match[1].replace(/"/g, ''));
      }

      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(fileUrl), 60000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to download PDF notes.');
    }
  };

  const handleGenerateQuiz = () => {
    navigate('/quiz/generate', { state: { videoId: result.videoId, title: result.title, content: result.content } });
  };

  const handleNewUpload = () => {
    setResult(null);
    setProgress(0);
    setTitle('');
    setError('');
    setUploadType('');
  };

  const uploadSteps = uploadType === 'pdf'
    ? ['📤 Uploading', '📄 Extracting', '✍️ Simplifying', '✅ Done']
    : ['📤 Uploading', '🔍 Analyzing', '✍️ Generating', '✅ Done'];

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">🏠 Home</h1>
        <p className="page-subtitle">Upload a video or PDF and let AI generate comprehensive study materials</p>
      </div>

      <div className="page-body">
        {!result && !uploading && (
          <div className="fade-in">
            {error && <div className="error-msg" style={{ marginBottom: 20 }}>⚠️ {error}</div>}

            <div className="card mb-6">
              <div className="section-title">Title (Optional)</div>
              <input
                type="text"
                placeholder="Enter a title for your study material..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                  color: 'var(--text-primary)',
                  fontSize: '15px',
                  outline: 'none',
                  fontFamily: 'var(--font-body)'
                }}
              />
            </div>

            {/* Side-by-side upload zones */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              {/* Video Upload */}
              <div
                className={`upload-zone ${dragOverVideo ? 'dragging' : ''}`}
                style={{ margin: 0 }}
                onDragOver={e => { e.preventDefault(); setDragOverVideo(true); }}
                onDragLeave={() => setDragOverVideo(false)}
                onDrop={handleVideoDrop}
                onClick={() => videoInputRef.current.click()}
              >
                <div className="upload-icon">🎬</div>
                <div className="upload-title">Drop your video here</div>
                <div className="upload-subtitle">or click to browse files</div>
                <div className="upload-meta">MP4, AVI, MOV, MKV, WebM • Max 500MB</div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={e => { const f = e.target.files[0]; if (f) processVideo(f); }}
                  style={{ display: 'none' }}
                />
              </div>

              {/* PDF Upload */}
              <div
                className={`upload-zone ${dragOverPDF ? 'dragging' : ''}`}
                style={{ margin: 0 }}
                onDragOver={e => { e.preventDefault(); setDragOverPDF(true); }}
                onDragLeave={() => setDragOverPDF(false)}
                onDrop={handlePDFDrop}
                onClick={() => pdfInputRef.current.click()}
              >
                <div className="upload-icon">📄</div>
                <div className="upload-title">Drop your PDF here</div>
                <div className="upload-subtitle">or click to browse files</div>
                <div className="upload-meta">PDF documents only • Max 50MB</div>
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={e => { const f = e.target.files[0]; if (f) processPDF(f); }}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { icon: '🧠', title: 'AI-Powered Analysis', desc: 'AI extracts and simplifies all content' },
                { icon: '📝', title: 'Structured Notes', desc: 'Headings, key points, detailed explanations' },
                { icon: '🎯', title: 'Smart Quizzes', desc: 'Generate adaptive MCQ quizzes at 3 difficulty levels' },
              ].map((f, i) => (
                <div key={i} className="card-sm" style={{ flex: 1 }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{f.title}</div>
                  <div className="text-secondary text-sm">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="card fade-in" style={{ textAlign: 'center', padding: '60px 40px' }}>
            <div style={{ fontSize: 56, marginBottom: 24 }}>
              {uploadType === 'pdf' ? '📄' : '🤖'}
            </div>
            <div className="section-title" style={{ fontSize: 20, marginBottom: 8 }}>
              {uploadType === 'pdf' ? 'Simplifying your PDF...' : 'Analyzing your video...'}
            </div>
            <p className="text-secondary" style={{ marginBottom: 32 }}>{progressMsg}</p>

            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span className="text-muted text-sm">Processing</span>
              <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 15 }}>{progress}%</span>
            </div>

            <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              {uploadSteps.map((step, i) => (
                <div key={i} style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 13,
                  background: progress > i * 25 ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                  color: progress > i * 25 ? 'var(--accent)' : 'var(--text-muted)',
                  border: `1px solid ${progress > i * 25 ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                  transition: 'all 0.3s'
                }}>
                  {step}
                </div>
              ))}
            </div>
          </div>
        )}

        {result && (
          <div className="fade-in">
            <div className="content-viewer">
              <div className="content-viewer-header">
                <div>
                  <div className="content-viewer-title">
                    {result.sourceType === 'pdf' ? '📄' : '📚'} {result.title}
                  </div>
                  <div className="text-muted text-sm" style={{ marginTop: 4 }}>
                    {result.sourceType === 'pdf' ? 'PDF simplified • Ready to study' : 'Ready to study'}
                  </div>
                </div>
                <div className="content-viewer-actions">
                  <button className="btn-secondary" onClick={handleNewUpload}>
                    ↑ New Upload
                  </button>
                  <button className="btn-secondary" onClick={handleDownloadPDF}>
                    📄 Download PDF
                  </button>
                  <button className="btn-primary" style={{ width: 'auto', padding: '10px 20px' }} onClick={handleGenerateQuiz}>
                    🎯 Generate Quiz
                  </button>
                </div>
              </div>
              <div className="content-body">
                <MarkdownRenderer content={result.content} />
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}