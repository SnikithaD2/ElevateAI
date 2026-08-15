const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { getDb } = require('../db');
const { authenticateToken } = require('./auth');
const { exec } = require("child_process");
const FormData = require('form-data');


const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const TRANSCRIPTION_MODEL = 'whisper-large-v3-turbo';
const MAX_TRANSCRIPTION_FILE_BYTES = 8 * 1024 * 1024;
const TRANSCRIPTION_SEGMENT_SECONDS = 5 * 60;
const MAX_TRANSCRIPT_CHARS_PER_NOTES_REQUEST = 6000;

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /mp4|avi|mov|mkv|webm|flv|wmv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.startsWith('video/');
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'));
    }
  }
});

const pdfUpload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const extname = path.extname(file.originalname).toLowerCase() === '.pdf';
    const mimetype = file.mimetype === 'application/pdf';
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 32k "${audioPath}"`;

    exec(command, (err, stdout, stderr) => {
      if (err) {
        const details = stderr || stdout || err.message;
        return reject(new Error(`Audio extraction failed. Make sure FFmpeg is installed and available in PATH. ${details}`));
      }
      resolve(audioPath);
    });
  });
}

function splitAudio(audioPath, outputDir) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const command = `ffmpeg -y -i "${audioPath}" -f segment -segment_time ${TRANSCRIPTION_SEGMENT_SECONDS} -c copy "${path.join(outputDir, 'chunk-%03d.mp3')}"`;

    exec(command, (err, stdout, stderr) => {
      if (err) {
        const details = stderr || stdout || err.message;
        return reject(new Error(`Audio splitting failed. ${details}`));
      }

      const chunks = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.mp3'))
        .sort()
        .map(file => path.join(outputDir, file));

      if (!chunks.length) {
        return reject(new Error('Audio splitting did not produce any chunks.'));
      }

      resolve(chunks);
    });
  });
}

async function transcribeAudioFile(audioPath) {
  const audioBuffer = fs.readFileSync(audioPath);
  const form = new FormData();

  form.append('file', audioBuffer, {
    filename: path.basename(audioPath),
    contentType: 'audio/mpeg'
  });

  form.append('model', TRANSCRIPTION_MODEL);
  form.append('response_format', 'verbose_json');

  const response = await axios.post(
    `${GROQ_BASE_URL}/audio/transcriptions`,
    form,
    {
      headers: {
        ...form.getHeaders(),   // 🔥 VERY IMPORTANT
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 180000
    }
  );

  return response.data?.text?.trim() || '';
}

async function transcribeVideo(videoPath) {
  const audioPath = `${videoPath}.mp3`;
  const chunksDir = `${videoPath}-chunks`;

  try {
    await extractAudio(videoPath, audioPath);

    const audioSize = fs.statSync(audioPath).size;
    if (audioSize <= MAX_TRANSCRIPTION_FILE_BYTES) {
      return await transcribeAudioFile(audioPath);
    }

    const chunkPaths = await splitAudio(audioPath, chunksDir);
    const transcriptParts = [];

    for (const chunkPath of chunkPaths) {
      const chunkSize = fs.statSync(chunkPath).size;
      if (chunkSize > MAX_TRANSCRIPTION_FILE_BYTES) {
        throw new Error('Video audio is still too large after splitting. Please try a shorter video.');
      }

      const chunkTranscript = await transcribeAudioFile(chunkPath);
      if (chunkTranscript) {
        transcriptParts.push(chunkTranscript);
      }
    }

    return transcriptParts.join('\n\n').trim();
  } finally {
    try { fs.unlinkSync(audioPath); } catch (e) {}
    try { fs.rmSync(chunksDir, { recursive: true, force: true }); } catch (e) {}
  }
}

// Extract text from PDF using pdfparse
async function extractTextFromPDF(pdfPath) {
  const pdfParse = require('pdf-parse');
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  return data.text?.trim() || '';
}

function buildNotesPrompt(transcript, videoTitle) {
  return `You are an expert educational note-maker.

Create study notes strictly from the transcript below.

Rules:
- Use only the information present in the transcript
- Stay focused on the main topic actually discussed in the video
- Do not invent facts, examples, sections, or side topics
- Do not generate notes from the title alone
- If the transcript is unclear in a place, skip that part instead of guessing
- Keep the notes clean, structured, and useful for studying

Format exactly like this:
# ${videoTitle}

## Overview
[2-4 sentence summary of the actual video content]

## Key Concepts
### [Concept]
[Explanation based only on the transcript]

## Important Points
- [Point]

## Detailed Notes
[Well-structured notes based only on the transcript]

## Summary
[Short concluding summary]

VIDEO TRANSCRIPT:
${transcript}`;
}

function buildPDFNotesPrompt(pdfText, pdfTitle) {
  return `You are an expert educational note-maker and study material creator.

Simplify and create comprehensive study notes from the PDF content below.

Rules:
- Use only the information present in the PDF content
- Simplify complex concepts into easy-to-understand language
- Stay focused on the main topics actually discussed in the document
- Do not invent facts, examples, or information not in the source
- Break down jargon and technical terms with clear explanations
- Keep the notes clean, structured, and useful for studying

Format exactly like this:
# ${pdfTitle}

## Overview
[2-4 sentence summary of what this document covers]

## Key Concepts
### [Concept]
[Simplified explanation based only on the PDF content]

## Important Points
- [Point]

## Detailed Notes
[Well-structured, simplified study notes based only on the PDF content]

## Summary
[Short concluding summary]

PDF CONTENT:
${pdfText}`;
}

function chunkTranscript(transcript, maxChars = MAX_TRANSCRIPT_CHARS_PER_NOTES_REQUEST) {
  const cleaned = transcript.replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const paragraphs = cleaned.split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) {
      chunks.push(current);
      current = '';
    }

    if (paragraph.length <= maxChars) {
      current = paragraph;
      continue;
    }

    for (let i = 0; i < paragraph.length; i += maxChars) {
      chunks.push(paragraph.slice(i, i + maxChars));
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

async function generateNotesFromTranscript(transcript, videoTitle) {
  const transcriptChunks = chunkTranscript(transcript);
  if (!transcriptChunks.length) {
    throw new Error('Transcript was empty after processing.');
  }

  if (transcriptChunks.length === 1) {
    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: 'user',
            content: buildNotesPrompt(transcriptChunks[0], videoTitle)
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    return response.data.choices[0].message.content;
  }

  const sectionNotes = [];

  for (let index = 0; index < transcriptChunks.length; index++) {
    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: 'user',
            content: `You are creating study notes from one section of a video transcript.

Use only the transcript section below.
- Stay on the actual topic discussed
- Do not invent information
- Write concise but useful notes for this section

Format:
## Section ${index + 1}
- key idea 1
- key idea 2
- key idea 3

TRANSCRIPT SECTION:
${transcriptChunks[index]}`
          }
        ],
        max_tokens: 1200,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    sectionNotes.push(response.data.choices[0].message.content.trim());
  }

  const mergeResponse = await axios.post(
    `${GROQ_BASE_URL}/chat/completions`,
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: 'user',
          content: `Combine the section notes below into one clean study note document.

Rules:
- Use only the information in the section notes
- Stay focused on the video's real topic
- Remove repetition
- Keep it structured for studying

Format exactly like this:
# ${videoTitle}

## Overview
[2-4 sentence summary]

## Key Concepts
### [Concept]
[Explanation]

## Important Points
- [Point]

## Detailed Notes
[Organized study notes]

## Summary
[Short concluding summary]

SECTION NOTES:
${sectionNotes.join('\n\n')}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  return mergeResponse.data.choices[0].message.content;
}

async function generateNotesFromPDF(pdfText, pdfTitle) {
  const textChunks = chunkTranscript(pdfText);
  if (!textChunks.length) {
    throw new Error('PDF text was empty after processing.');
  }

  if (textChunks.length === 1) {
    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: 'user',
            content: buildPDFNotesPrompt(textChunks[0], pdfTitle)
          }
        ],
        max_tokens: 4000,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    return response.data.choices[0].message.content;
  }

  const sectionNotes = [];

  for (let index = 0; index < textChunks.length; index++) {
    const response = await axios.post(
      `${GROQ_BASE_URL}/chat/completions`,
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: 'user',
            content: `You are simplifying and creating study notes from one section of a PDF document.

Use only the section content below.
- Simplify complex ideas into plain language
- Stay on the actual topic discussed
- Do not invent information
- Write concise but useful notes for this section

Format:
## Section ${index + 1}
- key idea 1
- key idea 2
- key idea 3

PDF SECTION:
${textChunks[index]}`
          }
        ],
        max_tokens: 1200,
        temperature: 0.3
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 120000
      }
    );

    sectionNotes.push(response.data.choices[0].message.content.trim());
  }

  const mergeResponse = await axios.post(
    `${GROQ_BASE_URL}/chat/completions`,
    {
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: 'user',
          content: `Combine the section notes below into one clean, simplified study note document from a PDF.

Rules:
- Use only the information in the section notes
- Simplify and clarify all concepts
- Remove repetition
- Keep it structured for studying

Format exactly like this:
# ${pdfTitle}

## Overview
[2-4 sentence summary]

## Key Concepts
### [Concept]
[Simplified explanation]

## Important Points
- [Point]

## Detailed Notes
[Organized simplified study notes]

## Summary
[Short concluding summary]

SECTION NOTES:
${sectionNotes.join('\n\n')}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    },
    {
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 120000
    }
  );

  return mergeResponse.data.choices[0].message.content;
}

// POST /api/video/upload - Upload video and process
router.post('/upload', authenticateToken, upload.single('video'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }
  
  const videoTitle = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');
  const filePath = req.file.path;
  
  try {
    const transcript = await transcribeVideo(filePath);

    if (!transcript) {
      throw new Error('No spoken content could be extracted from the video.');
    }

    const generatedContent = await generateNotesFromTranscript(transcript, videoTitle);

    // Save to database
    const db = getDb();

    const result = db.prepare(
      'INSERT INTO videos (user_id, title, filename, content, source_type) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, videoTitle, req.file.filename, generatedContent, 'video');

    // Clean up uploaded file to save space
    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.log('Could not delete temp file:', e.message);
    }

    res.json({
      message: 'Video processed successfully',
      videoId: result.lastInsertRowid,
      title: videoTitle,
      content: generatedContent,
      sourceType: 'video'
    });

  } catch (error) {
    try { fs.unlinkSync(filePath); } catch (e) {}

    console.error('Video processing error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid GROQ API key. Please check your .env file.' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
    }
    if (error.response?.data?.error?.code === 'request_too_large') {
      return res.status(413).json({
        error: 'The processed video content is still too large for the AI request.',
        details: 'Try a shorter video, trim silence, or split the lecture into parts.'
      });
    }

    res.status(500).json({
      error: 'Failed to process video',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// POST /api/video/upload-pdf - Upload PDF and process
router.post('/upload-pdf', authenticateToken, pdfUpload.single('pdf'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No PDF file uploaded' });
  }

  const pdfTitle = req.body.title || req.file.originalname.replace(/\.[^/.]+$/, '');
  const filePath = req.file.path;

  try {
    const pdfText = await extractTextFromPDF(filePath);

    if (!pdfText) {
      throw new Error('No text content could be extracted from the PDF. The PDF may be scanned or image-based.');
    }

    const generatedContent = await generateNotesFromPDF(pdfText, pdfTitle);

    const db = getDb();
    const result = db.prepare(
      'INSERT INTO videos (user_id, title, filename, content, source_type) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, pdfTitle, req.file.filename, generatedContent, 'pdf');

    try {
      fs.unlinkSync(filePath);
    } catch (e) {
      console.log('Could not delete temp file:', e.message);
    }

    res.json({
      message: 'PDF processed successfully',
      videoId: result.lastInsertRowid,
      title: pdfTitle,
      content: generatedContent,
      sourceType: 'pdf'
    });

  } catch (error) {
    try { fs.unlinkSync(filePath); } catch (e) {}

    console.error('PDF processing error:', error.response?.data || error.message);

    if (error.response?.status === 401) {
      return res.status(401).json({ error: 'Invalid GROQ API key. Please check your .env file.' });
    }
    if (error.response?.status === 429) {
      return res.status(429).json({ error: 'API rate limit exceeded. Please try again later.' });
    }

    res.status(500).json({
      error: 'Failed to process PDF',
      details: error.response?.data?.error?.message || error.message
    });
  }
});

// GET /api/video/list - Get user's videos
router.get('/list', authenticateToken, (req, res) => {
  const db = getDb();
  const videos = db.prepare(
    'SELECT id, title, filename, source_type, created_at FROM videos WHERE user_id = ? ORDER BY created_at DESC'
  ).all(req.user.id);
  res.json({ videos });
});

function getFirstHeading(content) {
  if (!content) return 'notes';

  const lines = content.split('\n');

  for (const line of lines) {
    if (line.startsWith('# ')) {
      return line.replace('# ', '').trim();
    }
  }

  return 'notes';
}

router.get('/:id/pdf', authenticateToken, (req, res) => {
  const db = getDb();
  const video = db.prepare(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!video) return res.status(404).json({ error: 'Video not found' });

  try {
    const PDFDocument = require('pdfkit');
    const firstHeading = getFirstHeading(video.content);
    const safeFileName = firstHeading.replace(/[^a-zA-Z0-9]/g, '_');
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(safeFileName)}.pdf`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    doc.pipe(res);

    // PDF Header
    doc.fontSize(24).fillColor('#1a1a2e').font('Helvetica-Bold').text('ElevateAI', { align: 'center' });
    doc.fontSize(10).fillColor('#6b7280').font('Helvetica').text('AI-Powered Learning Platform', { align: 'center' });
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown();

    const content = video.content || '';
    const lines = content.split('\n');

    lines.forEach(line => {
      if (line.startsWith('# ')) {
        doc.moveDown(0.5);
        doc.fontSize(18).fillColor('#1a1a2e').font('Helvetica-Bold').text(line.replace('# ', ''));
        doc.moveDown(0.3);
      } else if (line.startsWith('## ')) {
        doc.moveDown(0.5);
        doc.fontSize(15).fillColor('#3b82f6').font('Helvetica-Bold').text(line.replace('## ', ''));
        doc.moveDown(0.3);
      } else if (line.startsWith('### ')) {
        doc.moveDown(0.3);
        doc.fontSize(13).fillColor('#374151').font('Helvetica-Bold').text(line.replace('### ', ''));
        doc.moveDown(0.2);
      } else if (line.startsWith('- ') || line.startsWith('* ')) {
        doc.fontSize(11).fillColor('#374151').font('Helvetica').text(`• ${line.replace(/^[-*] /, '')}`, { indent: 20 });
      } else if (line.trim() === '') {
        doc.moveDown(0.3);
      } else {
        doc.fontSize(11).fillColor('#374151').font('Helvetica').text(line, { align: 'justify' });
      }
    });

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#9ca3af').text('Generated by ElevateAI — AI-Powered Learning Platform', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// GET /api/video/:id - Get specific video with content
router.get('/:id', authenticateToken, (req, res) => {
  const db = getDb();
  const video = db.prepare(
    'SELECT * FROM videos WHERE id = ? AND user_id = ?'
  ).get(req.params.id, req.user.id);

  if (!video) return res.status(404).json({ error: 'Video not found' });
  res.json({ video });
});

module.exports = router;