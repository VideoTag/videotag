/**
 * Vidlens - Video Reactions & Comments Application
 * 
 * A premium application for adding timestamped reactions
 * and comments to videos from multiple platforms.
 * 
 * @version 5.0.0 - Offline Pack ZIP (video + comments), direct video URLs,
 *                  real metadata, comment editing/search, keyboard shortcuts
 */

// ============================================
// 1. CONFIGURATION
// ============================================

const CONFIG = {
  MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024,      // 2 GB for local playback / ZIP
  EMBED_VIDEO_LIMIT: 150 * 1024 * 1024,       // base64-in-HTML export cap
  TIMELINE_UPDATE_INTERVAL: 500,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  METADATA_TIMEOUT: 6000,
  MAX_RECENT_VIDEOS: 6,
};

const DIRECT_VIDEO_EXTENSIONS = ['mp4', 'webm', 'ogv', 'ogg', 'mov', 'm4v'];

const VIDEO_PATTERNS = {
  youtube: [
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
    /^[a-zA-Z0-9_-]{11}$/,
  ],
  youtube_shorts: [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/i,
  ],
  tiktok: [
    /tiktok\.com\/@[^\/]+\/video\/(\d+)/i,
    /vm\.tiktok\.com\/([^\/]+)/i,
    /tiktok\.com\/.*?\/video\/(\d+)/i,
  ],
  vimeo: [
    /vimeo\.com\/([0-9]+)/i,
    /vimeo\.com\/channels\/[^\/]+\/([0-9]+)/i,
    /player\.vimeo\.com\/video\/([0-9]+)/i,
  ],
  dailymotion: [
    /dailymotion\.com\/video\/([a-zA-Z0-9]+)/i,
    /dai\.ly\/([a-zA-Z0-9]+)/i,
  ],
  twitch: [
    /twitch\.tv\/videos\/(\d+)/i,
    /clips\.twitch\.tv\/([a-zA-Z0-9-]+)/i,
  ],
  facebook: [
    /facebook\.com\/[^\/]+\/videos\/(\d+)/i,
    /facebook\.com\/watch\/\?v=(\d+)/i,
    /fb\.watch\/([a-zA-Z0-9_-]+)/i,
    /facebook\.com\/.*?\/videos\/(\d+)/i,
  ],
  instagram: [
    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/i,
    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/i,
    /instagram\.com\/reels\/([a-zA-Z0-9_-]+)/i,
  ],
  odysee: [
    /odysee\.com\/@[^\/]+\/([^\/\?]+)/i,
  ],
  vk: [
    /vk\.com\/video-?(\d+_\d+)/i,
  ],
};

const PROVIDER_NAMES = {
  youtube: 'YouTube',
  youtube_shorts: 'YouTube Shorts',
  tiktok: 'TikTok',
  vimeo: 'Vimeo',
  dailymotion: 'Dailymotion',
  twitch: 'Twitch',
  facebook: 'Facebook',
  instagram: 'Instagram',
  odysee: 'Odysee',
  vk: 'VK',
  upload: 'Local',
  direct: 'Direct Video',
};

const PLATFORM_ICONS = {
  youtube: '▶️',
  youtube_shorts: '📱',
  tiktok: '🎵',
  vimeo: '🎬',
  dailymotion: '📺',
  twitch: '🎮',
  facebook: '👤',
  instagram: '📷',
  odysee: '🌊',
  vk: '💬',
  upload: '📁',
  direct: '🎞️',
};

// ============================================
// 2. APPLICATION STATE
// ============================================

const state = {
  player: null,
  videoLoaded: false,
  currentVideoId: null,
  videoTitle: 'Video',
  currentProvider: 'youtube',
  uploadedVideo: null,
  sortOrder: 'desc',
  timelineInterval: null,
  ytPlayer: null,
  vimeoPlayer: null,
  currentTime: 0,
  videoDuration: 300,
  useIframeApi: false,
  videoAspectRatio: null,
  originalVideoUrl: null,
  videoAuthor: null,
  videoThumbnail: null,
  editingComment: null,
  includeReactionsInExport: true,
  packVideoFile: null,   // video the user downloaded for a platform video
};

// Transcription state
const transcriptionState = {
  isTranscribing: false,
  recognition: null,
  transcript: [],
  currentLanguage: 'en-US',
};

// ============================================
// 3. DOM REFERENCES
// ============================================

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

const elements = {};

function cacheElements() {
  const ids = [
    'videoLink', 'loadVideoBtn', 'videoContainer', 'reactionButtons',
    'commentsList', 'loadingSpinner', 'reactionModal', 'selectedEmoji',
    'selectedEmojiInput', 'reactionText', 'closeReactionModal', 'submitReaction',
    'cancelReaction', 'exportHTML', 'exportZIP', 'videoUpload', 'uploadedFileInfo', 'uploadedFileName',
    'uploadedFileSize', 'timelineProgress', 'timelineMarkers',
    'statsPanel', 'reactionSummary', 'reactionSummarySection', 'videoPanel',
    'commentsEmpty', 'totalCommentsValue', 'totalReactionsValue', 'avgTimeValue',
    'videoPlatform', 'videoTitleDisplay', 'currentTimeDisplay', 'timelineCurrent',
    'timelineDuration', 'modalTimestamp', 'charCount', 'exportDropdownBtn',
    'exportDropdownMenu', 'exportDropdown', 'pasteBtn', 'removeFile', 'addCommentBtn',
    'commentModal', 'closeCommentModal', 'commentText', 'commentModalTimestamp',
    'commentCharCount', 'submitComment', 'cancelComment', 'sortCommentsBtn',
    'clearAllBtn', 'confirmModal', 'confirmCancel', 'confirmOk', 'toastContainer',
    'timeline', 'uploadBtn', 'detectedPlatform', 'detectedIcon', 'detectedName',
    'featuresSection', 'changeVideoBtn', 'commentsSection', 'transcribeBtn',
    'transcriptSection', 'transcriptList', 'transcriptEmpty', 'transcriptCount',
    'importTranscriptBtn', 'copyTranscriptBtn', 'exportTranscriptBtn',
    'addAllTranscriptBtn', 'clearTranscriptBtn',
    'exportPDFBtn', 'exportCSVBtn', 'exportJSONBtn', 'exportTXTBtn', 'exportSRTBtn',
    'searchComments', 'recentVideos', 'recentVideosList', 'includeReactionsToggle',
    'downloadVideoBtn', 'subtitlesBtn', 'ccToggleBtn', 'subtitleOverlay', 'translateBtn', 'toggleOriginalBtn',
  ];

  ids.forEach(id => {
    elements[id] = document.getElementById(id);
  });

  elements.emojiButtons = $$('.emoji-btn:not(.emoji-btn--add)');
}

// ============================================
// 4. UTILITY FUNCTIONS
// ============================================

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const pad = n => n.toString().padStart(2, '0');
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;
}

function parseTimeToSeconds(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parseInt(timeStr) || 0;
}

function sanitizeHTML(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function sanitizeFileName(name) {
  return name.replace(/[^\w\s\.-]/gi, '').replace(/\s+/g, '_').substring(0, 100) || 'export';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function extractVideoID(url, provider) {
  if (!url) return null;
  const patterns = VIDEO_PATTERNS[provider] || [];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
}

function downloadFile(content, filename, contentType) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFileName(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = sanitizeFileName(filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function isLocalFile() {
  return window.location.protocol === 'file:';
}

function isNativeVideoProvider(provider = state.currentProvider) {
  return provider === 'upload' || provider === 'direct';
}

function getNativeVideoElement() {
  return $('#localVideo');
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function getUrlVideoExtension(url) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    const ext = pathname.split('.').pop();
    return DIRECT_VIDEO_EXTENSIONS.includes(ext) ? ext : null;
  } catch {
    return null;
  }
}

// Fetch real video metadata (title, author, thumbnail) via the CORS-friendly
// noembed.com oEmbed proxy. Fails silently — the app works fine without it.
async function fetchVideoMetadata(url) {
  if (!url || isNativeVideoProvider()) return;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.METADATA_TIMEOUT);
    const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!response.ok) return;

    const meta = await response.json();
    if (meta.error) return;

    if (meta.title) {
      state.videoTitle = meta.title;
      if (elements.videoTitleDisplay) elements.videoTitleDisplay.textContent = meta.title;
      document.title = `${meta.title} - Vidlens`;
    }
    if (meta.author_name) state.videoAuthor = meta.author_name;
    if (meta.thumbnail_url) state.videoThumbnail = meta.thumbnail_url;

    updateRecentVideoTitle(url, state.videoTitle);
  } catch {
    // Offline or provider not supported by noembed — keep the generic title
  }
}

function getVideoEmbedUrl() {
  switch (state.currentProvider) {
    case 'youtube':
    case 'youtube_shorts':
      return `https://www.youtube.com/embed/${state.currentVideoId}`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${state.currentVideoId}`;
    case 'dailymotion':
      return `https://www.dailymotion.com/embed/video/${state.currentVideoId}`;
    default:
      return state.originalVideoUrl || '';
  }
}

// ============================================
// 5. TOAST NOTIFICATIONS
// ============================================

function showToast(message, type = 'success') {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__icon">${icons[type] || icons.info}</span>
    <span class="toast__message">${sanitizeHTML(message)}</span>
  `;
  
  elements.toastContainer?.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'toastSlide 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.TOAST_DURATION);
}

// ============================================
// 6. PLATFORM DETECTION
// ============================================

function detectPlatform(url) {
  if (!url) return null;
  
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('youtube.com/shorts/')) {
    return 'youtube_shorts';
  }
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) {
    return 'youtube';
  }
  if (urlLower.includes('tiktok.com')) {
    return 'tiktok';
  }
  if (urlLower.includes('vimeo.com')) {
    return 'vimeo';
  }
  if (urlLower.includes('dailymotion.com') || urlLower.includes('dai.ly')) {
    return 'dailymotion';
  }
  if (urlLower.includes('twitch.tv')) {
    return 'twitch';
  }
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch')) {
    return 'facebook';
  }
  if (urlLower.includes('instagram.com')) {
    return 'instagram';
  }
  if (urlLower.includes('odysee.com')) {
    return 'odysee';
  }
  if (urlLower.includes('vk.com')) {
    return 'vk';
  }
  if (getUrlVideoExtension(url)) {
    return 'direct';
  }

  return null;
}

function updateDetectedPlatform(url) {
  const platform = detectPlatform(url);
  
  if (platform && elements.detectedPlatform) {
    elements.detectedPlatform.removeAttribute('hidden');
    elements.detectedIcon.textContent = PLATFORM_ICONS[platform] || '▶️';
    elements.detectedName.textContent = PROVIDER_NAMES[platform] || platform;
    state.currentProvider = platform;
  } else if (elements.detectedPlatform) {
    elements.detectedPlatform.setAttribute('hidden', '');
  }
  
  return platform;
}

// ============================================
// 7. UI MANAGEMENT
// ============================================

function toggleLoading(show) {
  if (show) {
    elements.loadingSpinner?.removeAttribute('hidden');
  } else {
    elements.loadingSpinner?.setAttribute('hidden', '');
  }
  
  if (elements.loadVideoBtn) elements.loadVideoBtn.disabled = show;
  if (elements.uploadBtn) elements.uploadBtn.disabled = show;
}

function showFeaturePanels(show) {
  const panels = [
    elements.videoPanel,
    elements.statsPanel,
    elements.reactionSummarySection,
    elements.commentsSection,
    elements.transcriptSection,
  ];
  
  panels.forEach(panel => {
    if (panel) {
      show ? panel.removeAttribute('hidden') : panel.setAttribute('hidden', '');
    }
  });
  
  if (elements.featuresSection) {
    show ? elements.featuresSection.setAttribute('hidden', '') : elements.featuresSection.removeAttribute('hidden');
  }
  
  updateCommentsEmptyState();
  updateTranscriptEmptyState();
}

function updateCommentsEmptyState() {
  const hasComments = elements.commentsList?.children.length > 0;
  if (elements.commentsEmpty) {
    hasComments 
      ? elements.commentsEmpty.setAttribute('hidden', '') 
      : elements.commentsEmpty.removeAttribute('hidden');
  }
}

function updateTranscriptEmptyState() {
  updateCaptionAvailability();
  const translated = transcriptionState.transcript.some(c => c.translated);
  if (elements.toggleOriginalBtn) {
    translated ? elements.toggleOriginalBtn.removeAttribute('hidden')
               : elements.toggleOriginalBtn.setAttribute('hidden', '');
  }
  const hasTranscript = transcriptionState.transcript.length > 0;
  if (elements.transcriptEmpty) {
    hasTranscript 
      ? elements.transcriptEmpty.setAttribute('hidden', '') 
      : elements.transcriptEmpty.removeAttribute('hidden');
  }
  if (elements.transcriptCount) {
    elements.transcriptCount.textContent = transcriptionState.transcript.length;
  }
}

function getCurrentTime() {
  try {
    if ((state.currentProvider === 'youtube' || state.currentProvider === 'youtube_shorts') && state.ytPlayer && typeof state.ytPlayer.getCurrentTime === 'function') {
      return state.ytPlayer.getCurrentTime() || 0;
    }
    if (state.currentProvider === 'vimeo' && state.vimeoPlayer) {
      return state.currentTime;
    }
    if (isNativeVideoProvider()) {
      const video = getNativeVideoElement();
      return video ? video.currentTime : 0;
    }
    return state.currentTime;
  } catch {
    return state.currentTime;
  }
}

function updateCurrentTimeDisplay() {
  const time = getCurrentTime();
  const formatted = formatTime(time);
  
  if (elements.currentTimeDisplay) {
    elements.currentTimeDisplay.textContent = formatted;
  }
  if (elements.timelineCurrent) {
    elements.timelineCurrent.textContent = formatted;
  }
}

// ============================================
// 8. MODAL MANAGEMENT
// ============================================

function showModal(modalElement) {
  modalElement?.removeAttribute('hidden');
  document.body.style.overflow = 'hidden';
}

function hideModal(modalElement) {
  modalElement?.setAttribute('hidden', '');
  document.body.style.overflow = '';
}

// Shared voice recorder strip, injected into the comment & reaction modals
function mountVoiceRecorder(modal, textarea) {
  modal.querySelector('.voice-rec')?.remove();
  resetVoiceRecorder();

  const strip = document.createElement('div');
  strip.className = 'voice-rec';
  strip.innerHTML = `
    <button type="button" class="voice-rec__btn" id="voiceRecBtn">
      <span class="voice-rec__dot"></span>
      <span id="voiceRecLabel">Record a voice note</span>
    </button>
    <span class="voice-rec__timer" id="voiceRecTimer" hidden>0:00</span>
    <span class="voice-rec__status" id="voiceRecStatus"></span>
    <div class="voice-rec__preview" id="voiceRecPreview" hidden>
      <audio id="voiceRecAudio" controls></audio>
      <button type="button" class="voice-rec__discard" id="voiceRecDiscard" title="Discard the recording">✕</button>
    </div>
  `;

  const body = modal.querySelector('.modal__body');
  body?.appendChild(strip);

  const button = strip.querySelector('#voiceRecBtn');
  const label = strip.querySelector('#voiceRecLabel');
  const timer = strip.querySelector('#voiceRecTimer');
  const status = strip.querySelector('#voiceRecStatus');
  const preview = strip.querySelector('#voiceRecPreview');
  const audioEl = strip.querySelector('#voiceRecAudio');

  strip.querySelector('#voiceRecDiscard').addEventListener('click', () => {
    resetVoiceRecorder();
    preview.hidden = true;
    audioEl.removeAttribute('src');
    status.textContent = '';
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    // Stop an in-progress recording
    if (voiceRecorder.media && voiceRecorder.media.state === 'recording') {
      button.classList.remove('voice-rec__btn--on');
      label.textContent = 'Record a voice note';
      timer.hidden = true;

      const blob = await stopVoiceRecording();
      if (!blob || !blob.size) {
        status.textContent = 'Nothing was recorded';
        return;
      }

      audioEl.src = URL.createObjectURL(blob);
      preview.hidden = false;
      button.hidden = true;

      // Keep the sound AND write the transcript
      status.textContent = '⏳ Transcribing on your device…';
      try {
        const text = await transcribeVoiceClip(blob, (s) => { status.textContent = `⏳ ${s}`; });
        if (text) {
          textarea.value = textarea.value.trim() ? `${textarea.value.trim()} ${text}` : text;
          textarea.dispatchEvent(new Event('input'));
          status.textContent = '✓ Audio kept + transcribed (edit the text if needed)';
        } else {
          status.textContent = '✓ Audio kept — no speech recognised, type a note if you like';
        }
      } catch (error) {
        console.warn('Voice transcription failed:', error);
        status.textContent = '✓ Audio kept — transcription unavailable, type a note instead';
      }
      return;
    }

    // Start recording
    try {
      status.textContent = '';
      await startVoiceRecording((seconds) => { timer.textContent = formatTime(seconds); });
      button.classList.add('voice-rec__btn--on');
      label.textContent = 'Stop recording';
      timer.hidden = false;
    } catch (error) {
      console.warn('Microphone unavailable:', error);
      status.textContent = 'Microphone access was denied';
    }
  });
}

// Persist the recorded clip against the freshly created comment
async function attachRecordedVoice(commentId) {
  if (!voiceRecorder.blob) return null;
  const meta = { mime: voiceRecorder.blob.type || 'audio/webm', duration: Math.round(voiceRecorder.duration) };
  await saveVoiceClip(commentId, voiceRecorder.blob);
  resetVoiceRecorder();
  return meta;
}

function showReactionModal(emoji) {
  if (elements.selectedEmoji) elements.selectedEmoji.textContent = emoji;
  if (elements.selectedEmojiInput) elements.selectedEmojiInput.value = emoji;
  if (elements.reactionText) elements.reactionText.value = '';
  if (elements.charCount) elements.charCount.textContent = '0';
  if (elements.modalTimestamp) elements.modalTimestamp.textContent = formatTime(getCurrentTime());
  
  mountVoiceRecorder(elements.reactionModal, elements.reactionText);
  showModal(elements.reactionModal);
  elements.reactionText?.focus();
}

function showCommentModal(prefillText = '', prefillTimestamp = null) {
  state.editingComment = null;
  if (elements.commentText) elements.commentText.value = prefillText;
  if (elements.commentCharCount) elements.commentCharCount.textContent = prefillText.length.toString();
  
  const timestamp = prefillTimestamp !== null ? prefillTimestamp : getCurrentTime();
  if (elements.commentModalTimestamp) {
    elements.commentModalTimestamp.textContent = formatTime(timestamp);
  }
  // Store the timestamp for later use
  if (elements.commentModal) {
    elements.commentModal.dataset.prefillTimestamp = timestamp;
  }
  
  mountVoiceRecorder(elements.commentModal, elements.commentText);
  showModal(elements.commentModal);
  elements.commentText?.focus();
}

let activeConfirmHandler = null;

function showConfirmModal(message, onConfirm) {
  const messageEl = $('#confirmMessage');
  if (messageEl) messageEl.textContent = message;

  // Drop any stale handler so callbacks never stack across confirm/cancel cycles
  if (activeConfirmHandler) {
    elements.confirmOk?.removeEventListener('click', activeConfirmHandler);
  }

  activeConfirmHandler = () => {
    hideModal(elements.confirmModal);
    elements.confirmOk?.removeEventListener('click', activeConfirmHandler);
    activeConfirmHandler = null;
    onConfirm();
  };

  elements.confirmOk?.addEventListener('click', activeConfirmHandler);
  showModal(elements.confirmModal);
}

// ============================================
// 9. YOUTUBE PLAYER
// ============================================

function loadYouTubeAPI() {
  return new Promise((resolve, reject) => {
    if (isLocalFile()) {
      reject(new Error('YouTube API requires HTTP/HTTPS'));
      return;
    }
    
    if (window.YT && window.YT.Player) {
      resolve();
      return;
    }
    
    if (document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const checkYT = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkYT);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkYT);
        reject(new Error('YouTube API load timeout'));
      }, 5000);
      return;
    }
    
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.onerror = () => reject(new Error('Failed to load YouTube API'));
    
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    window.onYouTubeIframeAPIReady = () => resolve();
    setTimeout(() => reject(new Error('YouTube API load timeout')), 5000);
  });
}

async function createYouTubePlayer(videoId, isShorts = false) {
  try {
    await loadYouTubeAPI();
    state.useIframeApi = true;
    
    return new Promise((resolve, reject) => {
      elements.videoContainer.innerHTML = '<div id="ytplayer"></div>';
      
      state.ytPlayer = new YT.Player('ytplayer', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          'playsinline': 1,
          'rel': 0,
          'modestbranding': 1,
          'enablejsapi': 1,
          'origin': window.location.origin,
        },
        events: {
          'onReady': (event) => {
            state.videoDuration = event.target.getDuration() || 300;
            if (elements.timelineDuration) {
              elements.timelineDuration.textContent = formatTime(state.videoDuration);
            }
            resolve(event.target);
          },
          'onError': (event) => {
            console.error('YouTube player error:', event.data);
            reject(new Error('YouTube player error: ' + event.data));
          },
          'onStateChange': (event) => {
            if (event.data === YT.PlayerState.PLAYING) {
              state.currentTime = state.ytPlayer.getCurrentTime();
            }
          }
        }
      });
    });
  } catch (error) {
    console.log('YouTube API not available, using simple embed:', error.message);
    state.useIframeApi = false;
    return createYouTubeSimpleEmbed(videoId, isShorts);
  }
}

function createYouTubeSimpleEmbed(videoId, isShorts = false) {
  state.useIframeApi = false;
  state.ytPlayer = null;
  state.videoDuration = isShorts ? 60 : 300;
  
  const maxWidth = isShorts ? 'max-width: 400px; margin: 0 auto;' : '';
  
  elements.videoContainer.innerHTML = `
    <div class="embed-wrapper" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column;${maxWidth}">
      <iframe 
        id="yt-iframe"
        src="https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1"
        style="width:100%;height:100%;border:none;border-radius:12px;"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
        allowfullscreen>
      </iframe>
      <div class="seek-controls">
        <span style="color:#fff;font-size:12px;white-space:nowrap;">⏱️ Jump to:</span>
        <input type="text" id="yt-seek-input" placeholder="0:00" style="padding:6px 10px;border:1px solid rgba(255,255,255,0.2);border-radius:6px;background:rgba(255,255,255,0.1);color:#fff;font-family:monospace;font-size:14px;width:70px;">
        <button id="yt-seek-btn" style="padding:6px 14px;background:linear-gradient(135deg,#6366f1,#ec4899);border:none;border-radius:6px;color:#fff;font-weight:600;cursor:pointer;">Go</button>
      </div>
    </div>
  `;
  
  const seekBtn = $('#yt-seek-btn');
  const seekInput = $('#yt-seek-input');
  
  if (seekBtn && seekInput) {
    const doSeek = () => {
      const timeStr = seekInput.value.trim();
      const seconds = parseTimeToSeconds(timeStr);
      if (seconds >= 0) {
        const iframe = $('#yt-iframe');
        if (iframe) {
          iframe.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&start=${seconds}&autoplay=1`;
          state.currentTime = seconds;
          showToast(`Jumped to ${formatTime(seconds)}`);
        }
      }
    };
    
    seekBtn.addEventListener('click', doSeek);
    seekInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doSeek();
    });
  }
  
  if (elements.timelineDuration) {
    elements.timelineDuration.textContent = formatTime(state.videoDuration);
  }
  
  return Promise.resolve(null);
}

// ============================================
// 10. VIMEO PLAYER
// ============================================

function loadVimeoAPI() {
  return new Promise((resolve, reject) => {
    if (window.Vimeo && window.Vimeo.Player) {
      resolve();
      return;
    }
    
    if (document.querySelector('script[src*="player.vimeo.com/api"]')) {
      const checkVimeo = setInterval(() => {
        if (window.Vimeo && window.Vimeo.Player) {
          clearInterval(checkVimeo);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkVimeo);
        reject(new Error('Vimeo API timeout'));
      }, 5000);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://player.vimeo.com/api/player.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Vimeo API'));
    document.head.appendChild(script);
  });
}

async function createVimeoPlayer(videoId) {
  try {
    await loadVimeoAPI();
    
    elements.videoContainer.innerHTML = `<div id="vimeoplayer" style="width:100%;height:100%;"></div>`;
    
    return new Promise((resolve) => {
      const player = new Vimeo.Player('vimeoplayer', {
        id: videoId,
        width: '100%',
        height: '100%',
      });
      
      state.vimeoPlayer = player;
      
      player.getDuration().then((duration) => {
        state.videoDuration = duration || 300;
        if (elements.timelineDuration) {
          elements.timelineDuration.textContent = formatTime(state.videoDuration);
        }
      });
      
      player.on('timeupdate', (data) => {
        state.currentTime = data.seconds;
      });
      
      player.ready().then(() => resolve(player));
    });
  } catch (error) {
    console.log('Vimeo API failed, using simple embed');
    return createVimeoSimpleEmbed(videoId);
  }
}

function createVimeoSimpleEmbed(videoId) {
  state.vimeoPlayer = null;
  state.videoDuration = 300;
  
  elements.videoContainer.innerHTML = `
    <iframe src="https://player.vimeo.com/video/${videoId}" 
      style="width:100%;height:100%;border:none;"
      allow="autoplay; fullscreen; picture-in-picture" 
      allowfullscreen>
    </iframe>
  `;
  
  return Promise.resolve(null);
}

// ============================================
// 11. SEEK FUNCTIONS
// ============================================

function seekToTime(seconds) {
  const time = parseFloat(seconds) || 0;
  
  switch (state.currentProvider) {
    case 'youtube':
    case 'youtube_shorts':
      if (state.useIframeApi && state.ytPlayer && typeof state.ytPlayer.seekTo === 'function') {
        try {
          state.ytPlayer.seekTo(time, true);
          state.ytPlayer.playVideo();
          showToast(`Jumped to ${formatTime(time)}`);
        } catch (e) {
          seekYouTubeViaUrl(time);
        }
      } else {
        seekYouTubeViaUrl(time);
      }
      break;
      
    case 'vimeo':
      if (state.vimeoPlayer) {
        state.vimeoPlayer.setCurrentTime(time).then(() => {
          state.vimeoPlayer.play();
          showToast(`Jumped to ${formatTime(time)}`);
        }).catch(() => {
          showToast('Could not seek video', 'error');
        });
      } else {
        showToast(`Seek to ${formatTime(time)} manually in the player`, 'info');
      }
      break;
      
    case 'upload':
    case 'direct':
      const video = getNativeVideoElement();
      if (video) {
        video.currentTime = time;
        video.play().catch(() => {});
        showToast(`Jumped to ${formatTime(time)}`);
      }
      break;
      
    case 'dailymotion':
      const dmIframe = elements.videoContainer.querySelector('iframe');
      if (dmIframe) {
        const currentSrc = dmIframe.src.split('?')[0];
        dmIframe.src = `${currentSrc}?start=${Math.floor(time)}&autoplay=1`;
        showToast(`Jumped to ${formatTime(time)}`);
      }
      break;
      
    default:
      showToast(`Seek to ${formatTime(time)} manually in the player`, 'info');
      break;
  }
  
  state.currentTime = time;
  updateCurrentTimeDisplay();
}

function seekYouTubeViaUrl(time) {
  const iframe = elements.videoContainer.querySelector('iframe');
  if (iframe && state.currentVideoId) {
    iframe.src = `https://www.youtube.com/embed/${state.currentVideoId}?rel=0&modestbranding=1&start=${Math.floor(time)}&autoplay=1`;
    state.currentTime = time;
    showToast(`Jumped to ${formatTime(time)}`);
  }
}

// ============================================
// 12. VIDEO ASPECT RATIO HANDLING
// ============================================

const PLATFORM_ASPECT_RATIOS = {
  youtube: 'horizontal',
  vimeo: 'horizontal',
  dailymotion: 'horizontal',
  twitch: 'horizontal',
  facebook: 'horizontal',
  odysee: 'horizontal',
  vk: 'horizontal',
  youtube_shorts: 'vertical',
  tiktok: 'vertical',
  instagram: 'vertical',
  upload: 'auto',
  direct: 'auto',
};

function clearVideoAspectClasses() {
  if (!elements.videoContainer) return;
  
  elements.videoContainer.classList.remove(
    'video-container--horizontal',
    'video-container--vertical',
    'video-container--square',
    'video-container--auto',
    'video-container--ultrawide'
  );
}

function setVideoAspectRatio(provider, customRatio = null) {
  if (!elements.videoContainer) return;
  
  clearVideoAspectClasses();
  
  if (customRatio !== null) {
    state.videoAspectRatio = customRatio;
    
    if (customRatio > 2.2) {
      elements.videoContainer.classList.add('video-container--ultrawide');
    } else if (customRatio > 1.2) {
      elements.videoContainer.classList.add('video-container--horizontal');
    } else if (customRatio < 0.8) {
      elements.videoContainer.classList.add('video-container--vertical');
    } else {
      elements.videoContainer.classList.add('video-container--square');
    }
    return;
  }
  
  const aspectRatio = PLATFORM_ASPECT_RATIOS[provider] || 'horizontal';
  elements.videoContainer.classList.add(`video-container--${aspectRatio}`);
}

function detectUploadedVideoAspectRatio(videoElement) {
  if (!videoElement || !elements.videoContainer) return;
  
  const handleMetadata = () => {
    const width = videoElement.videoWidth;
    const height = videoElement.videoHeight;
    
    if (width && height) {
      const ratio = width / height;
      setVideoAspectRatio('upload', ratio);
    }
  };
  
  if (videoElement.readyState >= 1) {
    handleMetadata();
  } else {
    videoElement.addEventListener('loadedmetadata', handleMetadata, { once: true });
  }
}

// ============================================
// 13. VIDEO PLAYER INITIALIZATION
// ============================================

function setupNativeVideo(src, type) {
  elements.videoContainer.innerHTML = `
    <video id="localVideo" controls playsinline preload="metadata" style="width:100%;height:100%;object-fit:contain;background:#000;">
      <source src="${src}" type="${type || 'video/mp4'}">
      Your browser does not support the video tag.
    </video>`;

  const video = getNativeVideoElement();
  if (!video) return;

  detectUploadedVideoAspectRatio(video);

  video.addEventListener('loadedmetadata', () => {
    state.videoDuration = video.duration || 300;
    if (elements.timelineDuration) {
      elements.timelineDuration.textContent = formatTime(video.duration);
    }
  });

  video.addEventListener('timeupdate', () => {
    state.currentTime = video.currentTime;
  });

  video.addEventListener('error', () => {
    showToast('Error playing video. Format may not be supported.', 'error');
  });
}

async function initializePlayer(videoId) {
  if (!videoId && state.currentProvider !== 'upload') {
    showToast('Invalid video URL', 'error');
    return;
  }
  
  try {
    toggleLoading(true);
    
    // Reset state
    state.ytPlayer = null;
    state.vimeoPlayer = null;
    state.currentTime = 0;
    state.useIframeApi = false;
    state.videoAspectRatio = null;
    state.videoAuthor = null;
    state.videoThumbnail = null;
    transcriptionState.transcript = [];
    transcriptionState.isTranscribing = false;
    
    setVideoAspectRatio(state.currentProvider);
    
    let duration = 300;
    
    switch (state.currentProvider) {
      case 'youtube':
        await createYouTubePlayer(videoId, false);
        state.videoTitle = 'YouTube Video';
        break;
        
      case 'youtube_shorts':
        setVideoAspectRatio('youtube_shorts');
        await createYouTubePlayer(videoId, true);
        state.videoTitle = 'YouTube Shorts';
        duration = 60;
        state.videoDuration = duration;
        break;
        
      case 'vimeo':
        await createVimeoPlayer(videoId);
        state.videoTitle = 'Vimeo Video';
        break;
        
      case 'tiktok':
        setVideoAspectRatio('tiktok');
        elements.videoContainer.innerHTML = `
          <div class="embed-wrapper vertical-embed">
            <iframe 
              src="https://www.tiktok.com/player/v1/${videoId}?music_info=1&description=1"
              style="width:100%;height:100%;max-width:400px;border:none;border-radius:12px;"
              allowfullscreen
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture">
            </iframe>
          </div>
        `;
        state.videoTitle = 'TikTok Video';
        duration = 180;
        state.videoDuration = duration;
        break;
        
      case 'dailymotion':
        setVideoAspectRatio('dailymotion');
        elements.videoContainer.innerHTML = `
          <iframe id="dmplayer" src="https://www.dailymotion.com/embed/video/${videoId}" 
            style="width:100%;height:100%;border:none;"
            allow="autoplay" allowfullscreen>
          </iframe>`;
        state.videoTitle = 'Dailymotion Video';
        state.videoDuration = 600;
        break;
        
      case 'twitch':
        setVideoAspectRatio('twitch');
        const parentDomain = window.location.hostname || 'localhost';
        elements.videoContainer.innerHTML = `
          <iframe src="https://player.twitch.tv/?video=${videoId}&parent=${parentDomain}" 
            style="width:100%;height:100%;border:none;" allowfullscreen>
          </iframe>`;
        state.videoTitle = 'Twitch Video';
        duration = 3600;
        state.videoDuration = duration;
        break;
        
      case 'facebook':
        setVideoAspectRatio('facebook');
        const fbVideoUrl = encodeURIComponent(`https://www.facebook.com/video.php?v=${videoId}`);
        elements.videoContainer.innerHTML = `
          <div class="embed-wrapper facebook-embed">
            <iframe 
              src="https://www.facebook.com/plugins/video.php?href=${fbVideoUrl}&show_text=false&width=560"
              style="width:100%;max-width:560px;height:315px;border:none;border-radius:12px;"
              scrolling="no" 
              frameborder="0" 
              allowfullscreen="true"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share">
            </iframe>
          </div>`;
        state.videoTitle = 'Facebook Video';
        state.videoDuration = 300;
        break;
        
      case 'instagram':
        setVideoAspectRatio('instagram');
        elements.videoContainer.innerHTML = `
          <div class="embed-wrapper vertical-embed">
            <iframe src="https://www.instagram.com/p/${videoId}/embed/" 
              style="width:100%;height:100%;max-width:400px;border:none;border-radius:12px;" 
              scrolling="no">
            </iframe>
          </div>`;
        state.videoTitle = 'Instagram Video';
        duration = 60;
        state.videoDuration = duration;
        break;
        
      case 'odysee':
        setVideoAspectRatio('odysee');
        elements.videoContainer.innerHTML = `
          <iframe src="https://odysee.com/$/embed/${videoId}" 
            style="width:100%;height:100%;border:none;" allowfullscreen>
          </iframe>`;
        state.videoTitle = 'Odysee Video';
        duration = 600;
        state.videoDuration = duration;
        break;
        
      case 'vk':
        setVideoAspectRatio('vk');
        elements.videoContainer.innerHTML = `
          <iframe src="https://vk.com/video_ext.php?oid=-1&id=${videoId}&hd=2" 
            style="width:100%;height:100%;border:none;" allowfullscreen>
          </iframe>`;
        state.videoTitle = 'VK Video';
        duration = 600;
        state.videoDuration = duration;
        break;
        
      case 'upload':
        if (!state.uploadedVideo) {
          showToast('Please select a video file', 'error');
          toggleLoading(false);
          return;
        }

        setVideoAspectRatio('upload');
        setupNativeVideo(URL.createObjectURL(state.uploadedVideo), state.uploadedVideo.type);
        state.videoTitle = state.uploadedVideo.name || 'Uploaded Video';
        break;

      case 'direct':
        setVideoAspectRatio('direct');
        setupNativeVideo(state.originalVideoUrl, `video/${getUrlVideoExtension(state.originalVideoUrl) === 'ogv' ? 'ogg' : (getUrlVideoExtension(state.originalVideoUrl) || 'mp4')}`);
        try {
          state.videoTitle = decodeURIComponent(new URL(state.originalVideoUrl).pathname.split('/').pop()) || 'Direct Video';
        } catch {
          state.videoTitle = 'Direct Video';
        }
        break;
        
      default:
        showToast('Unknown video provider', 'error');
        toggleLoading(false);
        return;
    }
    
    state.videoLoaded = true;
    state.currentVideoId = videoId || `local-${Date.now()}`;

    // Real title/author/thumbnail (async, non-blocking)
    if (!isNativeVideoProvider() && state.originalVideoUrl) {
      fetchVideoMetadata(state.originalVideoUrl);
    }
    if (state.originalVideoUrl && state.currentProvider !== 'upload') {
      addRecentVideo(state.originalVideoUrl, state.videoTitle, state.currentProvider);
    }

    if (elements.videoPlatform) {
      elements.videoPlatform.textContent = PROVIDER_NAMES[state.currentProvider];
    }
    if (elements.videoTitleDisplay) {
      elements.videoTitleDisplay.textContent = state.videoTitle;
    }
    if (elements.timelineDuration) {
      elements.timelineDuration.textContent = formatTime(state.videoDuration);
    }
    
    showFeaturePanels(true);
    loadComments(state.currentVideoId);
    loadTranscript(state.currentVideoId);
    startTimelineUpdates();
    updateUI();
    updateTranscriptDisplay();
    updateTranscribeButton(false);
    
    showToast('Video loaded successfully!');
    
  } catch (error) {
    console.error('Error loading video:', error);
    showToast('Error loading video: ' + error.message, 'error');
  } finally {
    toggleLoading(false);
  }
}

// ============================================
// 14. COMMENTS & REACTIONS
// ============================================

// ============================================
// 14a. VOICE NOTES (audio kept + transcribed)
// ============================================

const VOICE_DB = 'vidlens_voice';
const VOICE_STORE = 'clips';

function openVoiceDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(VOICE_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(VOICE_STORE)) {
        db.createObjectStore(VOICE_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function voiceTx(mode, run) {
  try {
    const db = await openVoiceDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(VOICE_STORE, mode);
      const store = tx.objectStore(VOICE_STORE);
      const request = run(store);
      tx.oncomplete = () => resolve(request?.result);
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.warn('Voice storage unavailable:', error?.message);
    return null;
  }
}

const voiceKey = (commentId) => `${state.currentVideoId}::${commentId}`;

const saveVoiceClip = (commentId, blob) => voiceTx('readwrite', s => s.put(blob, voiceKey(commentId)));
const loadVoiceClip = (commentId) => voiceTx('readonly', s => s.get(voiceKey(commentId)));
const deleteVoiceClip = (commentId) => voiceTx('readwrite', s => s.delete(voiceKey(commentId)));

async function deleteAllVoiceClips() {
  const prefix = `${state.currentVideoId}::`;
  await voiceTx('readwrite', (store) => {
    const cursorRequest = store.openCursor();
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) return;
      if (String(cursor.key).startsWith(prefix)) cursor.delete();
      cursor.continue();
    };
    return cursorRequest;
  });
}

// --- Recorder ---
const voiceRecorder = {
  media: null,
  stream: null,
  chunks: [],
  startedAt: 0,
  timer: null,
  blob: null,
  duration: 0,
};

function resetVoiceRecorder() {
  clearInterval(voiceRecorder.timer);
  voiceRecorder.stream?.getTracks().forEach(t => t.stop());
  Object.assign(voiceRecorder, {
    media: null, stream: null, chunks: [], startedAt: 0, timer: null, blob: null, duration: 0,
  });
}

function pickRecorderMime() {
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find(m => window.MediaRecorder?.isTypeSupported?.(m)) || '';
}

async function startVoiceRecording(onTick) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickRecorderMime();
  const media = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

  voiceRecorder.stream = stream;
  voiceRecorder.media = media;
  voiceRecorder.chunks = [];
  voiceRecorder.startedAt = Date.now();

  media.ondataavailable = (e) => {
    if (e.data.size) voiceRecorder.chunks.push(e.data);
  };
  media.start();

  voiceRecorder.timer = setInterval(() => {
    onTick?.((Date.now() - voiceRecorder.startedAt) / 1000);
  }, 200);

  return media;
}

function stopVoiceRecording() {
  return new Promise((resolve) => {
    const media = voiceRecorder.media;
    if (!media || media.state === 'inactive') return resolve(null);

    media.onstop = () => {
      clearInterval(voiceRecorder.timer);
      const blob = new Blob(voiceRecorder.chunks, { type: media.mimeType || 'audio/webm' });
      voiceRecorder.blob = blob;
      voiceRecorder.duration = (Date.now() - voiceRecorder.startedAt) / 1000;
      voiceRecorder.stream?.getTracks().forEach(t => t.stop());
      resolve(blob);
    };
    media.stop();
  });
}

// Transcribe a short clip with the same on-device Whisper pipeline
async function transcribeVoiceClip(blob, onStage) {
  const transformers = await import(ASR.LIB);
  const modelKey = 'tiny';   // clips are short — speed matters more here

  if (ASR.pipeKey !== modelKey) {
    onStage?.('Loading the speech model…');
    ASR.pipe = await transformers.pipeline('automatic-speech-recognition', ASR.MODELS[modelKey].id, {
      dtype: navigator.gpu ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : 'q8',
      device: navigator.gpu ? 'webgpu' : 'wasm',
    });
    ASR.pipeKey = modelKey;
  }

  onStage?.('Transcribing your note…');
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
  ctx.close();

  const offline = new OfflineAudioContext(1, Math.ceil(decoded.duration * 16000), 16000);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  const output = await ASR.pipe(rendered.getChannelData(0), {
    language: defaultAsrLanguage(),
    task: 'transcribe',
    temperature: 0,
    do_sample: false,
    max_new_tokens: 200,
  });

  return collapseRepeats((output.text || '').trim());
}

function getCommentPlainText(commentEl) {
  const textEl = commentEl.querySelector('.comment-text');
  if (!textEl) return '';
  const clone = textEl.cloneNode(true);
  clone.querySelector('.reaction-emoji')?.remove();
  return clone.textContent.trim();
}

function addComment({ text, timestamp, type = 'comment', emoji = null, id = null, voice = null }) {
  const comment = document.createElement('div');
  comment.className = `comment ${type === 'reaction' ? 'reaction' : ''}`;
  comment.dataset.timestamp = timestamp;
  comment.dataset.id = id || `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  if (voice) {
    comment.dataset.voice = JSON.stringify(voice);
    comment.classList.add('comment--voice');
  }

  const timeStr = formatTime(timestamp);
  let content = sanitizeHTML(text);

  if (type === 'reaction' && emoji) {
    content = `<span class="reaction-emoji">${emoji}</span>${content}`;
  }

  const voiceUI = voice ? `
      <div class="voice-note">
        <button class="voice-note__play" title="Play voice note" aria-label="Play voice note">▶</button>
        <span class="voice-note__wave"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></span>
        <span class="voice-note__time">${formatTime(voice.duration || 0)}</span>
        <span class="voice-note__tag" title="Transcribed on your device">transcript</span>
      </div>` : '';

  comment.innerHTML = `
    <span class="timestamp" data-time="${timestamp}" title="Click to jump to ${timeStr}">[${timeStr}]</span>
    <div class="comment-content">
      <span class="comment-text">${content}</span>
      ${voiceUI}
    </div>
    <button class="comment-edit" title="Edit">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
    </button>
    <button class="comment-delete" title="Delete">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  `;

  // Add delete handler
  comment.querySelector('.comment-delete')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (comment.dataset.voice) deleteVoiceClip(comment.dataset.id);
    comment.remove();
    saveComments();
    updateCommentsEmptyState();
    updateUI();
    showToast('Comment deleted');
  });

  // Play the recorded audio back
  comment.querySelector('.voice-note__play')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    const button = e.currentTarget;
    const note = button.closest('.voice-note');

    if (note.dataset.playing === '1') {
      note._audio?.pause();
      return;
    }

    const blob = await loadVoiceClip(comment.dataset.id);
    if (!blob) {
      showToast('The audio for this note is no longer stored on this device', 'error');
      return;
    }

    const audio = new Audio(URL.createObjectURL(blob));
    note._audio = audio;
    note.dataset.playing = '1';
    button.textContent = '⏸';
    note.classList.add('voice-note--playing');

    const finish = () => {
      note.dataset.playing = '0';
      button.textContent = '▶';
      note.classList.remove('voice-note--playing');
      URL.revokeObjectURL(audio.src);
    };
    audio.addEventListener('ended', finish);
    audio.addEventListener('pause', finish);
    audio.play().catch(() => {
      finish();
      showToast('Could not play the audio', 'error');
    });
  });

  // Edit handler — reuses the comment modal in edit mode
  comment.querySelector('.comment-edit')?.addEventListener('click', (e) => {
    e.stopPropagation();
    showCommentModal(getCommentPlainText(comment), parseInt(comment.dataset.timestamp) || 0);
    state.editingComment = comment;
  });

  if (state.sortOrder === 'desc') {
    elements.commentsList.insertBefore(comment, elements.commentsList.firstChild);
  } else {
    elements.commentsList.appendChild(comment);
  }
  
  saveComments();
  updateCommentsEmptyState();
  updateUI();
}

function saveComments() {
  const comments = Array.from(elements.commentsList.children).map(c => {
    const isReaction = c.classList.contains('reaction');
    const emojiEl = c.querySelector('.reaction-emoji');

    return {
      id: c.dataset.id,
      text: getCommentPlainText(c),
      timestamp: parseInt(c.dataset.timestamp) || 0,
      type: isReaction ? 'reaction' : 'comment',
      emoji: emojiEl?.textContent || null,
      voice: c.dataset.voice ? JSON.parse(c.dataset.voice) : null,
    };
  });
  
  try {
    localStorage.setItem(`reactvid_${state.currentVideoId}`, JSON.stringify(comments));
  } catch (e) {
    console.error('Save error:', e);
  }
}

function loadComments(videoId) {
  try {
    elements.commentsList.innerHTML = '';
    const saved = localStorage.getItem(`reactvid_${videoId}`);
    
    if (saved) {
      const comments = JSON.parse(saved);
      const sorted = state.sortOrder === 'desc' 
        ? comments.sort((a, b) => b.timestamp - a.timestamp)
        : comments.sort((a, b) => a.timestamp - b.timestamp);
      
      sorted.forEach(c => addComment(c));
    }
    
    updateCommentsEmptyState();
  } catch (e) {
    console.error('Load error:', e);
  }
}

function clearAllComments() {
  showConfirmModal('Are you sure you want to delete all comments and reactions?', () => {
    deleteAllVoiceClips();
    elements.commentsList.innerHTML = '';
    saveComments();
    updateCommentsEmptyState();
    updateUI();
    showToast('All comments cleared');
  });
}

function toggleSortOrder() {
  state.sortOrder = state.sortOrder === 'desc' ? 'asc' : 'desc';
  
  const comments = Array.from(elements.commentsList.children);
  const sorted = state.sortOrder === 'desc'
    ? comments.sort((a, b) => parseInt(b.dataset.timestamp) - parseInt(a.dataset.timestamp))
    : comments.sort((a, b) => parseInt(a.dataset.timestamp) - parseInt(b.dataset.timestamp));
  
  elements.commentsList.innerHTML = '';
  sorted.forEach(c => elements.commentsList.appendChild(c));

  showToast(`Sorted by time (${state.sortOrder === 'desc' ? 'newest first' : 'oldest first'})`);
}

function filterComments(query) {
  const q = (query || '').trim().toLowerCase();
  Array.from(elements.commentsList?.children || []).forEach(c => {
    const match = !q || getCommentPlainText(c).toLowerCase().includes(q) ||
      formatTime(parseInt(c.dataset.timestamp) || 0).includes(q);
    c.style.display = match ? '' : 'none';
  });
}

// ============================================
// 14b. RECENT VIDEOS
// ============================================

const RECENTS_KEY = 'reactvid_recent_videos';

function getRecentVideos() {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY)) || [];
  } catch {
    return [];
  }
}

function addRecentVideo(url, title, provider) {
  try {
    let recents = getRecentVideos().filter(r => r.url !== url);
    recents.unshift({ url, title, provider, date: Date.now() });
    recents = recents.slice(0, CONFIG.MAX_RECENT_VIDEOS);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
    renderRecentVideos();
  } catch {}
}

function updateRecentVideoTitle(url, title) {
  try {
    const recents = getRecentVideos();
    const entry = recents.find(r => r.url === url);
    if (entry && title) {
      entry.title = title;
      localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
      renderRecentVideos();
    }
  } catch {}
}

function renderRecentVideos() {
  const recents = getRecentVideos();
  if (!elements.recentVideos || !elements.recentVideosList) return;

  if (recents.length === 0) {
    elements.recentVideos.setAttribute('hidden', '');
    return;
  }

  elements.recentVideos.removeAttribute('hidden');
  elements.recentVideosList.innerHTML = '';

  recents.forEach(r => {
    const chip = document.createElement('button');
    chip.className = 'recent-chip';
    chip.title = r.url;
    chip.innerHTML = `
      <span class="recent-chip__icon">${PLATFORM_ICONS[r.provider] || '▶️'}</span>
      <span class="recent-chip__title">${sanitizeHTML((r.title || r.url).substring(0, 40))}</span>
    `;
    chip.addEventListener('click', () => {
      if (elements.videoLink) {
        elements.videoLink.value = r.url;
        updateDetectedPlatform(r.url);
        elements.loadVideoBtn?.click();
      }
    });
    elements.recentVideosList.appendChild(chip);
  });
}

// ============================================
// 15. TRANSCRIPTION FEATURES
// ============================================

function isSpeechRecognitionSupported() {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
}

function initSpeechRecognition() {
  if (!isSpeechRecognitionSupported()) {
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = transcriptionState.currentLanguage;
  
  recognition.onresult = (event) => {
    const video = $('#localVideo');
    const currentTime = video ? video.currentTime : state.currentTime;
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        const text = result[0].transcript.trim();
        if (text) {
          transcriptionState.transcript.push({
            timestamp: Math.floor(currentTime),
            text: text,
            confidence: result[0].confidence,
          });
          updateTranscriptDisplay();
          saveTranscript();
        }
      }
    }
  };
  
  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'not-allowed') {
      showToast('Microphone access denied. Please allow microphone access.', 'error');
      stopTranscription();
    } else if (event.error === 'no-speech') {
      // Ignore, this is normal
    } else {
      showToast(`Transcription error: ${event.error}`, 'error');
    }
  };
  
  recognition.onend = () => {
    if (transcriptionState.isTranscribing) {
      try {
        recognition.start();
      } catch (e) {
        // Already started or other error
      }
    }
  };
  
  return recognition;
}

function startTranscription() {
  if (state.currentProvider !== 'upload') {
    showManualTranscriptModal();
    return;
  }
  
  if (!isSpeechRecognitionSupported()) {
    showToast('Speech recognition not supported. Try Chrome or Edge.', 'error');
    showManualTranscriptModal();
    return;
  }
  
  if (!transcriptionState.recognition) {
    transcriptionState.recognition = initSpeechRecognition();
  }
  
  if (!transcriptionState.recognition) {
    showToast('Could not initialize speech recognition', 'error');
    return;
  }
  
  transcriptionState.isTranscribing = true;
  
  try {
    transcriptionState.recognition.start();
    showToast('🎤 Transcription started! Play the video.', 'success');
    updateTranscribeButton(true);
  } catch (e) {
    console.error('Failed to start transcription:', e);
    showToast('Failed to start transcription', 'error');
  }
}

function stopTranscription() {
  transcriptionState.isTranscribing = false;
  
  if (transcriptionState.recognition) {
    try {
      transcriptionState.recognition.stop();
    } catch (e) {
      // Ignore
    }
  }
  
  updateTranscribeButton(false);
  showToast('Transcription stopped', 'info');
}

function toggleTranscription() {
  if (transcriptionState.isTranscribing) {
    stopTranscription();
  } else {
    startTranscription();
  }
}

function updateTranscribeButton(isActive) {
  const btn = elements.transcribeBtn;
  if (!btn) return;
  
  btn.classList.toggle('btn--recording', isActive);
  
  if (isActive) {
    btn.innerHTML = `
      <span class="recording-dot"></span>
      <span>Stop</span>
    `;
  } else {
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="6" y1="15" x2="10" y2="15"/>
        <line x1="14" y1="15" x2="18" y2="15"/>
        <line x1="6" y1="11" x2="18" y2="11"/>
      </svg>
      <span>Transcribe</span>
      <span class="btn__badge">AI</span>
    `;
  }
}

function showManualTranscriptModal() {
  $('#manualTranscriptModal')?.remove();
  
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'manualTranscriptModal';
  modal.innerHTML = `
    <div class="modal" role="dialog">
      <div class="modal__header">
        <div class="modal__title-wrapper">
          <span class="modal__emoji">📝</span>
          <h3 class="modal__title">Import Transcript</h3>
        </div>
        <button class="modal__close" id="closeManualTranscript">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">
        <div class="transcript-help">
          <div class="transcript-help__item">
            <h4>📺 YouTube</h4>
            <p>Click "..." → "Show transcript" → Copy text</p>
          </div>
          <div class="transcript-help__item">
            <h4>🎤 Local Videos</h4>
            <p>Upload a video and use live transcription (Chrome/Edge)</p>
          </div>
        </div>
        
        <div class="modal__input-wrapper" style="margin-top: 1rem;">
          <label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.9rem;">Paste transcript:</label>
          <textarea 
            id="manualTranscriptInput" 
            class="modal__input" 
            rows="8" 
            placeholder="Paste transcript here...

Supported formats:
0:00 Text here
[0:00] Text here
0:00 - Text here
Or just plain text (will auto-assign timestamps)"
          ></textarea>
        </div>
        
        <div style="margin-top: 1rem;">
          <label style="display:block;margin-bottom:0.5rem;font-weight:500;font-size:0.9rem;">Language:</label>
          <select id="transcriptLanguage" class="modal__select" style="width:100%;padding:0.75rem;background:var(--color-surface-elevated);border:1px solid rgba(255,255,255,0.1);border-radius:var(--radius-md);color:var(--color-text);font-size:0.9rem;">
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="fr-FR">French</option>
            <option value="es-ES">Spanish</option>
            <option value="de-DE">German</option>
            <option value="it-IT">Italian</option>
            <option value="pt-BR">Portuguese (Brazil)</option>
            <option value="ja-JP">Japanese</option>
            <option value="ko-KR">Korean</option>
            <option value="zh-CN">Chinese (Simplified)</option>
          </select>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="cancelManualTranscript">Cancel</button>
        <button class="btn btn--primary" id="importManualTranscript">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/></svg>
          <span>Import</span>
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  $('#closeManualTranscript')?.addEventListener('click', () => modal.remove());
  $('#cancelManualTranscript')?.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
  
  $('#transcriptLanguage')?.addEventListener('change', (e) => {
    transcriptionState.currentLanguage = e.target.value;
  });
  
  $('#importManualTranscript')?.addEventListener('click', () => {
    importManualTranscript();
    modal.remove();
  });
  
  $('#manualTranscriptInput')?.focus();
}

function importManualTranscript() {
  const input = $('#manualTranscriptInput');
  const text = input?.value.trim();
  
  if (!text) {
    showToast('Please paste some transcript text', 'error');
    return;
  }
  
  const lines = text.split('\n').filter(line => line.trim());
  const parsed = [];
  
  const timestampPatterns = [
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s*[-–:]\s*(.+)/,
    /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*(.+)/,
    /^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)/,
  ];
  
  let lastTimestamp = 0;
  let lineIndex = 0;
  
  lines.forEach((line) => {
    let matched = false;
    
    for (const pattern of timestampPatterns) {
      const match = line.match(pattern);
      if (match) {
        const timestamp = parseTimeToSeconds(match[1]);
        const lineText = match[2].trim();
        if (lineText) {
          parsed.push({ timestamp, text: lineText });
          lastTimestamp = timestamp;
        }
        matched = true;
        break;
      }
    }
    
    if (!matched && line.trim()) {
      parsed.push({
        timestamp: lastTimestamp + (lineIndex * 3),
        text: line.trim(),
      });
      lineIndex++;
    }
  });
  
  if (parsed.length > 0) {
    transcriptionState.transcript = parsed;
    updateTranscriptDisplay();
    saveTranscript();
    showToast(`Imported ${parsed.length} transcript segments!`, 'success');
  } else {
    showToast('Could not parse transcript', 'error');
  }
}

function updateTranscriptDisplay() {
  const list = elements.transcriptList;
  if (!list) return;
  
  list.innerHTML = '';
  
  if (transcriptionState.transcript.length === 0) {
    updateTranscriptEmptyState();
    return;
  }
  
  updateTranscriptEmptyState();
  
  const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
  
  sorted.forEach((item, index) => {
    const div = document.createElement('div');
    div.className = 'transcript-item';
    div.dataset.timestamp = item.timestamp;
    div.dataset.index = index;
    const shown = (!captions.showOriginal && item.translated) ? item.translated : item.text;
    const secondary = item.translated
      ? `<span class="transcript-alt">${sanitizeHTML(captions.showOriginal ? item.translated : item.text)}</span>`
      : '';
    div.innerHTML = `
      <span class="transcript-time" data-time="${item.timestamp}" title="Click to jump">[${formatTime(item.timestamp)}]</span>
      <span class="transcript-text">${sanitizeHTML(shown)}${secondary}</span>
      <button class="transcript-add-btn" title="Add as comment" data-index="${index}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    `;
    list.appendChild(div);
  });
  
  list.querySelectorAll('.transcript-time').forEach(el => {
    el.addEventListener('click', () => {
      const time = parseInt(el.dataset.time) || 0;
      seekToTime(time);
    });
  });
  
  list.querySelectorAll('.transcript-add-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const index = parseInt(btn.dataset.index);
      const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
      const item = sorted[index];
      if (item) {
        showCommentModal(item.text, item.timestamp);
      }
    });
  });
  
  list.querySelectorAll('.transcript-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.closest('.transcript-time') || e.target.closest('.transcript-add-btn')) return;
      
      const index = parseInt(item.dataset.index);
      const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
      const data = sorted[index];
      if (data) {
        showCommentModal(data.text, data.timestamp);
      }
    });
  });
}

function saveTranscript() {
  if (!state.currentVideoId) return;
  
  try {
    localStorage.setItem(`reactvid_transcript_${state.currentVideoId}`, JSON.stringify(transcriptionState.transcript));
  } catch (e) {
    console.error('Save transcript error:', e);
  }
}

function loadTranscript(videoId) {
  try {
    const saved = localStorage.getItem(`reactvid_transcript_${videoId}`);
    if (saved) {
      transcriptionState.transcript = JSON.parse(saved);
    } else {
      transcriptionState.transcript = [];
    }
    updateTranscriptDisplay();
  } catch (e) {
    console.error('Load transcript error:', e);
    transcriptionState.transcript = [];
  }
}

function clearTranscript() {
  showConfirmModal('Are you sure you want to clear the transcript?', () => {
    transcriptionState.transcript = [];
    updateTranscriptDisplay();
    saveTranscript();
    showToast('Transcript cleared');
  });
}

function copyTranscript() {
  if (transcriptionState.transcript.length === 0) {
    showToast('No transcript to copy', 'error');
    return;
  }
  
  const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
  const text = sorted.map(item => `[${formatTime(item.timestamp)}] ${item.text}`).join('\n');
  
  navigator.clipboard.writeText(text).then(() => {
    showToast('Transcript copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Could not copy to clipboard', 'error');
  });
}

function exportTranscriptSRT() {
  if (transcriptionState.transcript.length === 0) {
    showToast('No transcript to export', 'error');
    return;
  }
  
  const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
  let srt = '';
  
  sorted.forEach((item, index) => {
    // Use the real sub-second cue bounds when we have them (imported or AI-generated)
    const startTime = formatSRTTime(item.start ?? item.timestamp);
    const endTime = formatSRTTime(item.end ?? item.timestamp + 3);
    // Export whichever version is currently on screen
    const line = (!captions.showOriginal && item.translated) ? item.translated : item.text;
    srt += `${index + 1}\n${startTime} --> ${endTime}\n${line}\n\n`;
  });
  
  downloadFile(srt, `${state.videoTitle}_transcript.srt`, 'text/plain');
  showToast('Transcript exported as SRT!', 'success');
}

function formatSRTTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function addAllTranscriptAsComments() {
  if (transcriptionState.transcript.length === 0) {
    showToast('No transcript to add', 'error');
    return;
  }
  
  showConfirmModal(`Add all ${transcriptionState.transcript.length} transcript items as comments?`, () => {
    transcriptionState.transcript.forEach(item => {
      addComment({
        text: item.text,
        timestamp: item.timestamp,
        type: 'comment',
      });
    });
    showToast(`Added ${transcriptionState.transcript.length} comments!`, 'success');
  });
}

// ============================================
// 15b. SUBTITLES: import, embedded tracks, on-device AI
// ============================================

const ASR = {
  LIB: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5',
  MODELS: {
    tiny: { id: 'onnx-community/whisper-tiny', label: 'Tiny — fastest (~50 MB)' },
    base: { id: 'onnx-community/whisper-base', label: 'Base — balanced (~90 MB)' },
    small: { id: 'onnx-community/whisper-small', label: 'Small — most accurate (~250 MB)' },
  },
  pipe: null,
  pipeKey: null,
  device: null,
  announced: false,
};

// --- Subtitle file parsing (SRT / WebVTT) — exact source timings kept ---
function parseCueTime(str) {
  const m = str.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/);
  if (!m) return null;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2]) * 60) + parseInt(m[3]) + (parseInt(m[4].padEnd(3, '0')) / 1000);
}

function parseSubtitleFile(content) {
  const text = content.replace(/\r/g, '');
  const cues = [];
  const blocks = text.split(/\n{2,}/);

  blocks.forEach(block => {
    const lines = block.split('\n').filter(l => l.trim() && !/^WEBVTT/i.test(l));
    const arrowIndex = lines.findIndex(l => l.includes('-->'));
    if (arrowIndex === -1) return;

    const [rawStart, rawEnd] = lines[arrowIndex].split('-->');
    const start = parseCueTime(rawStart);
    const end = parseCueTime(rawEnd || '');
    const body = lines.slice(arrowIndex + 1).join(' ')
      .replace(/<[^>]+>/g, '')          // strip styling tags
      .replace(/\{\\[^}]+\}/g, '')
      .trim();

    if (start !== null && body) {
      cues.push({ timestamp: Math.floor(start), start, end: end ?? start + 3, text: body });
    }
  });

  return cues;
}

function importSubtitleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const cues = parseSubtitleFile(String(reader.result));
    if (!cues.length) {
      showToast('No subtitle cues found in that file', 'error');
      return;
    }
    transcriptionState.transcript = cues;
    updateTranscriptDisplay();
    saveTranscript();
    showToast(`Imported ${cues.length} subtitle cues with their original timings`, 'success');
  };
  reader.onerror = () => showToast('Could not read that file', 'error');
  reader.readAsText(file);
}

// --- Subtitles already inside the video file (WebM/MP4 text tracks) ---
function extractEmbeddedTracks() {
  const video = getNativeVideoElement();
  const tracks = video ? Array.from(video.textTracks || []) : [];
  if (!tracks.length) return false;

  const track = tracks.find(t => t.kind === 'subtitles' || t.kind === 'captions') || tracks[0];
  track.mode = 'hidden';

  // Cues may not be parsed yet — give the browser a tick
  const collect = () => {
    const cues = Array.from(track.cues || []).map(c => ({
      timestamp: Math.floor(c.startTime),
      start: c.startTime,
      end: c.endTime,
      text: String(c.text).replace(/<[^>]+>/g, '').trim(),
    })).filter(c => c.text);

    if (!cues.length) return false;
    transcriptionState.transcript = cues;
    updateTranscriptDisplay();
    saveTranscript();
    showToast(`Loaded ${cues.length} cues from the video's own subtitle track`, 'success');
    return true;
  };

  if (collect()) return true;
  setTimeout(collect, 600);
  return true;
}

// --- Decode the video's audio to 16 kHz mono, what Whisper expects ---
// Rough on-disk size of each encoder in fp32. WebGPU has to hold the biggest
// single tensor in one buffer, so this decides what actually fits.
const ASR_ENCODER_FP32_BYTES = { tiny: 34e6, base: 80e6, small: 350e6 };

// What this machine can realistically run, so we never hand the GPU a buffer
// it cannot allocate (that is what takes browsers — and sometimes the whole
// machine — down).
async function probeAsrCapabilities(modelKey) {
  const need = ASR_ENCODER_FP32_BYTES[modelKey] || 80e6;
  const caps = {
    device: 'wasm',
    dtype: 'q8',
    label: 'CPU',
    deviceMemoryGB: navigator.deviceMemory || null,
    reason: 'WebGPU unavailable',
  };

  if (!navigator.gpu) return caps;

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return caps;

    const maxBuffer = adapter.limits?.maxBufferSize || 0;
    const maxBinding = adapter.limits?.maxStorageBufferBindingSize || 0;
    const headroom = Math.min(maxBuffer, maxBinding);

    if (headroom >= need * 1.25) {
      // Comfortable: full-precision encoder, quantised decoder — best quality
      return { ...caps, device: 'webgpu', dtype: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, label: 'GPU', reason: 'fits comfortably' };
    }
    if (headroom >= need * 0.45) {
      // Tight: quantised encoder still runs well on GPU
      return { ...caps, device: 'webgpu', dtype: 'q4', label: 'GPU (compact)', reason: 'limited GPU buffers' };
    }
    return { ...caps, reason: 'GPU buffers too small for this model' };
  } catch (error) {
    return { ...caps, reason: `GPU probe failed: ${error.message}` };
  }
}

// Decode straight to 16 kHz mono — what Whisper wants — instead of decoding at
// the file's native rate first. A 1-hour 48 kHz stereo track is ~1.4 GB when
// decoded natively; at 16 kHz mono it is ~230 MB, and we free the container
// bytes as soon as the decoder is done with them.
async function extractAudioSamples(onProgress, range = null) {
  let source = null;

  if (state.packVideoFile) {
    source = state.packVideoFile;
  } else if (state.currentProvider === 'upload' && state.uploadedVideo) {
    source = state.uploadedVideo;
  } else if (state.currentProvider === 'direct' && state.originalVideoUrl) {
    onProgress?.('Fetching the video…');
    const response = await fetch(state.originalVideoUrl);
    if (!response.ok) throw new Error('Could not fetch the video (the host may block cross-origin requests)');
    source = await response.blob();
  } else {
    throw new Error('NO_AUDIO_SOURCE');
  }

  if (source.size > 1.2e9) {
    throw new Error('This file is too large to decode in a browser (over ~1.2 GB). Export a shorter clip first.');
  }

  onProgress?.('Reading the audio track…');
  let arrayBuffer = await source.arrayBuffer();
  source = null;

  // Decoding inside a 16 kHz context makes the browser resample as it decodes
  const decodeCtx = new OfflineAudioContext(1, 1, 16000);
  let decoded;
  try {
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } finally {
    arrayBuffer = null;   // release the container bytes immediately
  }

  const sampleRate = decoded.sampleRate;
  const from = range ? Math.max(0, Math.floor(range.start * sampleRate)) : 0;
  const to = range ? Math.min(decoded.length, Math.ceil(range.end * sampleRate)) : decoded.length;
  const length = Math.max(0, to - from);
  if (!length) throw new Error('That time range contains no audio');

  onProgress?.('Preparing the audio…');

  // Downmix to mono in place rather than allocating another full graph
  const mono = new Float32Array(length);
  const channels = Math.min(decoded.numberOfChannels, 2);
  for (let ch = 0; ch < channels; ch++) {
    const data = decoded.getChannelData(ch);
    for (let i = 0; i < length; i++) mono[i] += data[from + i] / channels;
  }
  decoded = null;

  if (sampleRate === 16000) return mono;

  // Fallback: the browser ignored our context rate, so resample explicitly
  const ratio = 16000 / sampleRate;
  const out = new Float32Array(Math.floor(length * ratio));
  for (let i = 0; i < out.length; i++) {
    const pos = i / ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    out[i] = mono[idx] * (1 - frac) + (mono[idx + 1] || mono[idx]) * frac;
  }
  return out;
}

// Whisper's native window is 30 s, so we feed it exactly that and stitch the
// results. It gives honest progress, live text, and correct absolute times.
const ASR_CHUNK_SECONDS = 30;

// Whisper hallucinates loops on music/silence: the same phrase repeated for
// pages. Collapse those instead of showing the user a wall of nonsense.
function collapseRepeats(text) {
  let out = text.replace(/\s+/g, ' ').trim();

  // A longer phrase glued to itself three or more times. Deliberately
  // conservative: natural speech repeats short phrases all the time.
  for (let pass = 0; pass < 3; pass++) {
    const collapsed = out.replace(/(.{8,240}?)(?:\s*\1){2,}/g, '$1');
    if (collapsed === out) break;
    out = collapsed;
  }

  // The same word chanted over and over, punctuation and all
  // ("Merci. Merci. Merci." → "Merci.")
  const tokens = out.split(/\s+/);
  const deduped = [];
  const bare = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  tokens.forEach(token => {
    const prev = deduped[deduped.length - 1];
    if (prev && bare(prev) && bare(prev) === bare(token)) return;
    deduped.push(token);
  });
  out = deduped.join(' ');

  const words = out.split(' ');
  if (words.length > 25) {
    const unique = new Set(words.map(w => w.toLowerCase().replace(/[^\w]/g, '')));
    // Only a handful of distinct words across a long passage = degenerate
    if (unique.size / words.length < 0.15) return '';
  }
  return out.trim();
}

function cleanCues(cues, previous) {
  const normalize = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();

  const kept = [];
  let last = normalize(previous?.text || '');

  cues.forEach(cue => {
    const text = collapseRepeats(cue.text);
    if (!text || text.length < 2) return;

    const key = normalize(text);
    // Same words as the cue before, punctuation aside → stretch the previous
    // cue instead of repeating it ("Merci." × 12 during applause)
    if (key === last) {
      const target = kept[kept.length - 1] || previous;
      if (target) target.end = Math.max(target.end, cue.end);
      return;
    }

    last = key;
    kept.push({ ...cue, text });
  });

  return kept;
}

// Start on the user's own language — auto-detect is what produced
// "French speech transcribed as Korean"
function defaultAsrLanguage() {
  const map = {
    fr: 'french', en: 'english', es: 'spanish', de: 'german', it: 'italian',
    pt: 'portuguese', nl: 'dutch', ja: 'japanese', ko: 'korean', zh: 'chinese',
    ar: 'arabic', ru: 'russian',
  };
  return map[(navigator.language || 'en').slice(0, 2).toLowerCase()] || 'english';
}

// Free the ONNX session (and its GPU buffers) — transformers keeps them alive
// until explicitly disposed, which is how VRAM creeps up between runs.
async function releaseAsrPipeline() {
  try {
    await ASR.pipe?.dispose?.();
  } catch (error) {
    console.warn('Could not dispose the ASR pipeline:', error?.message);
  }
  ASR.pipe = null;
  ASR.pipeKey = null;
  ASR.announced = false;
}

async function generateSubtitlesFromAudio(modelKey, language, ui, range = null, translateToEnglish = false) {
  const { setStage, setProgress, onCues, shouldStop } = ui;

  setStage('Loading the speech model…');
  const transformers = await import(ASR.LIB);

  if (ASR.pipeKey !== modelKey) {
    // Ask the GPU what it can actually allocate before handing it a model.
    // Guessing here is what freezes machines: an encoder that does not fit
    // makes the driver thrash or fall over.
    const caps = await probeAsrCapabilities(modelKey);
    console.info('ASR backend:', caps.label, '-', caps.reason);

    const attempts = [caps];
    if (caps.device === 'webgpu') {
      attempts.push({ device: 'webgpu', dtype: 'q4', label: 'GPU (compact)' });
      attempts.push({ device: 'wasm', dtype: 'q8', label: 'CPU' });
    }

    // A half-initialised session keeps its GPU buffers; always let it go
    await releaseAsrPipeline();

    let lastError;
    for (const attempt of attempts) {
      try {
        setStage(`Preparing the model on your ${attempt.label}…`);
        ASR.pipe = await transformers.pipeline('automatic-speech-recognition', ASR.MODELS[modelKey].id, {
          dtype: attempt.dtype,
          device: attempt.device,
          progress_callback: (p) => {
            if (p.status === 'progress' && p.total) {
              // Cached files stream instantly; only a real network fetch crawls
              setProgress((p.loaded / p.total) * 100,
                `${p.loaded < p.total ? 'Loading' : 'Ready'} — ${formatFileSize(p.loaded)} / ${formatFileSize(p.total)}`);
            } else if (p.status === 'done' && !ASR.announced) {
              ASR.announced = true;
              setStage('Model ready (cached for next time) — preparing audio…');
            }
          },
        });
        ASR.device = attempt.label;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`ASR init failed on ${attempt.label}:`, error?.message || error);
        await releaseAsrPipeline();
        setStage(`${attempt.label} could not host the model — trying a lighter setup…`);
      }
    }
    if (lastError) throw lastError;
    ASR.pipeKey = modelKey;
  }

  setStage('Extracting the audio…');
  setProgress(0, null);
  const audio = await extractAudioSamples(setStage, range);

  const sampleRate = 16000;
  const baseOffset = range ? range.start : 0;
  const totalSeconds = audio.length / sampleRate;
  const chunkCount = Math.max(1, Math.ceil(totalSeconds / ASR_CHUNK_SECONDS));
  const cues = [];
  const startedAt = Date.now();
  let downgraded = false;

  setStage(`Transcribing ${formatTime(totalSeconds)} of audio on your ${ASR.device || 'CPU'}…`);

  for (let i = 0; i < chunkCount; i++) {
    if (shouldStop?.()) break;

    const offset = i * ASR_CHUNK_SECONDS;
    // slice(), not subarray(): a view shares the whole buffer and the GPU
    // backend then tries to upload the entire track for every chunk
    let slice = audio.slice(offset * sampleRate, Math.min((offset + ASR_CHUNK_SECONDS) * sampleRate, audio.length));
    if (slice.length < sampleRate * 0.2) continue;   // skip a sliver of trailing silence

    let output;
    try {
      output = await ASR.pipe(slice, {
      return_timestamps: true,
      language: language === 'auto' ? undefined : language,
      task: translateToEnglish ? 'translate' : 'transcribe',
      // Greedy decoding only. n-gram/repetition penalties also punish the
      // repeating timestamp tokens, which makes Whisper stop after a few
      // words — loops are handled afterwards in cleanCues() instead.
        temperature: 0,
        do_sample: false,
        max_new_tokens: 448,
      });
    } catch (error) {
      const message = String(error?.message || error);
      console.warn(`Chunk ${i + 1} failed:`, message);

      // Out of memory: drop the session, reload it smaller, retry this chunk
      if (/memory|allocat|buffer|size|device lost/i.test(message) && !downgraded) {
        downgraded = true;
        setStage('Ran low on memory — reloading the model in a lighter mode…');
        await releaseAsrPipeline();
        try {
          ASR.pipe = await transformers.pipeline('automatic-speech-recognition', ASR.MODELS[modelKey].id, {
            dtype: 'q8',
            device: 'wasm',
          });
          ASR.pipeKey = modelKey;
          ASR.device = 'CPU (safe mode)';
          i--;                       // retry the same chunk on the safe backend
          continue;
        } catch (fallbackError) {
          console.warn('Safe-mode reload failed:', fallbackError?.message);
          throw error;
        }
      }

      setStage(`Chunk ${i + 1} could not be transcribed — continuing…`);
      continue;
    } finally {
      // Hand the slice back before the next allocation
      slice = null;
    }

    // Let the browser breathe: repaint the live text and give GC a window
    await new Promise(resolve => setTimeout(resolve, 0));

    const parts = output.chunks?.length
      ? output.chunks
      : (output.text ? [{ timestamp: [0, Math.min(ASR_CHUNK_SECONDS, totalSeconds - offset)], text: output.text }] : []);

    const fresh = parts.map(part => {
      const [start, end] = part.timestamp || [];
      const absoluteStart = baseOffset + offset + (start || 0);
      return {
        timestamp: Math.floor(absoluteStart),
        start: absoluteStart,
        end: baseOffset + offset + (end ?? (start || 0) + 2),
        text: (part.text || '').trim(),
      };
    }).filter(c => c.text);

    cues.push(...cleanCues(fresh, cues[cues.length - 1]));

    const done = i + 1;
    const elapsed = (Date.now() - startedAt) / 1000;
    const remaining = done < chunkCount ? Math.round((elapsed / done) * (chunkCount - done)) : 0;
    setProgress((done / chunkCount) * 100,
      `${done} / ${chunkCount} chunks${remaining ? ` — about ${formatTime(remaining)} left` : ''}`);
    onCues?.(fresh, cues.length);
  }

  return cues;
}

// Friendly filler so a long transcription never feels like a frozen bar
const FUN_FACTS = [
  'Whisper listens in 30-second windows — that is why we feed it exactly that.',
  'Everything here runs on your machine. No upload, no account, no server.',
  'Tip: press <kbd>C</kbd> while watching to drop a comment at the current second.',
  'Idea: export <code>comments.srt</code> and open the video in VLC — your notes become subtitles.',
  'Tip: keys <kbd>1</kbd>–<kbd>0</kbd> fire the ten emoji reactions instantly.',
  'Idea: annotate a lecture, then export a PDF for revision week.',
  'The Offline Pack bundles video + notes + a viewer — perfect for a flight.',
  'Editors love the HTML report: one file, every note clickable to the frame.',
  'Fun fact: your notes never leave this browser unless you export them.',
  'Idea: mark every clip-worthy moment with 🔥 — the summary becomes your shortlist.',
  'Tip: drop a video file anywhere on the page to load it instantly.',
  'Try the Konami code (↑↑↓↓←→←→BA) — there is a small surprise.',
];

function showTranscribeProgressModal(onCancel) {
  $('#asrModal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'asrModal';
  modal.innerHTML = `
    <div class="modal asr" role="dialog" aria-modal="true" aria-labelledby="asrTitle">
      <div class="modal__header">
        <div class="modal__title-wrapper">
          <span class="asr__pulse">🎧</span>
          <h3 class="modal__title" id="asrTitle">Generating subtitles</h3>
        </div>
      </div>
      <div class="modal__body">
        <p class="asr__stage" id="asrStage">Starting…</p>
        <div class="asr__bar"><div class="asr__bar-fill" id="asrBar"></div></div>
        <div class="asr__meta">
          <span id="asrPct">0%</span>
          <span id="asrDetail"></span>
        </div>

        <div class="asr__live" id="asrLive" aria-live="polite">
          <p class="asr__placeholder" id="asrPlaceholder">Words will appear here as they are recognised…</p>
        </div>

        <p class="asr__fact" id="asrFact"></p>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="asrCancel">Stop</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const factEl = modal.querySelector('#asrFact');
  let factIndex = Math.floor(Math.random() * FUN_FACTS.length);
  const showFact = () => {
    factEl.classList.remove('asr__fact--in');
    setTimeout(() => {
      factEl.innerHTML = `💡 ${FUN_FACTS[factIndex % FUN_FACTS.length]}`;
      factEl.classList.add('asr__fact--in');
      factIndex++;
    }, 250);
  };
  showFact();
  const factTimer = setInterval(showFact, 7000);

  modal.querySelector('#asrCancel').addEventListener('click', () => {
    modal.querySelector('#asrCancel').disabled = true;
    modal.querySelector('#asrStage').textContent = 'Stopping after this chunk…';
    onCancel();
  });

  const live = modal.querySelector('#asrLive');
  const placeholder = modal.querySelector('#asrPlaceholder');

  return {
    setStage: (t) => { modal.querySelector('#asrStage').textContent = t; },
    setProgress: (pct, detail) => {
      if (pct !== null && pct !== undefined) {
        modal.querySelector('#asrBar').style.width = `${Math.min(pct, 100)}%`;
        modal.querySelector('#asrPct').textContent = `${Math.round(pct)}%`;
      }
      modal.querySelector('#asrDetail').textContent = detail || '';
    },
    addCues: (cues) => {
      placeholder?.remove();
      cues.forEach(cue => {
        const line = document.createElement('p');
        line.className = 'asr__line';
        line.innerHTML = `<span class="asr__time">${formatTime(cue.start)}</span>${sanitizeHTML(cue.text)}`;
        live.appendChild(line);
      });
      live.scrollTop = live.scrollHeight;
    },
    close: () => {
      clearInterval(factTimer);
      modal.remove();
      document.body.style.overflow = '';
    },
  };
}

// ============================================
// 15d. TRANSLATION (on-device)
// ============================================

// Small, focused models — a few tens of MB per pair, versus ~600 MB for a
// single multilingual one. Whisper covers "anything → English" for free.
const MT_PAIRS = {
  'fr>en': 'Xenova/opus-mt-fr-en', 'en>fr': 'Xenova/opus-mt-en-fr',
  'es>en': 'Xenova/opus-mt-es-en', 'en>es': 'Xenova/opus-mt-en-es',
  'de>en': 'Xenova/opus-mt-de-en', 'en>de': 'Xenova/opus-mt-en-de',
  'it>en': 'Xenova/opus-mt-it-en', 'en>it': 'Xenova/opus-mt-en-it',
  'ru>en': 'Xenova/opus-mt-ru-en', 'en>ru': 'Xenova/opus-mt-en-ru',
  'zh>en': 'Xenova/opus-mt-zh-en', 'en>zh': 'Xenova/opus-mt-en-zh',
  'nl>en': 'Xenova/opus-mt-nl-en', 'en>nl': 'Xenova/opus-mt-en-nl',
  'ar>en': 'Xenova/opus-mt-ar-en', 'en>ar': 'Xenova/opus-mt-en-ar',
};

const MT_LANGS = {
  en: 'English', fr: 'French', es: 'Spanish', de: 'German',
  it: 'Italian', ru: 'Russian', zh: 'Chinese', nl: 'Dutch', ar: 'Arabic',
};

const MT = { pipe: null, key: null };

async function releaseTranslator() {
  try {
    await MT.pipe?.dispose?.();
  } catch {}
  MT.pipe = null;
  MT.key = null;
}

async function translateTranscript(sourceLang, targetLang, ui) {
  const key = `${sourceLang}>${targetLang}`;
  const modelId = MT_PAIRS[key];
  if (!modelId) throw new Error(`No on-device model for ${MT_LANGS[sourceLang]} → ${MT_LANGS[targetLang]} yet`);

  const transformers = await import(ASR.LIB);

  if (MT.key !== key) {
    await releaseTranslator();
    ui.setStage(`Loading the ${MT_LANGS[sourceLang]} → ${MT_LANGS[targetLang]} model…`);
    MT.pipe = await transformers.pipeline('translation', modelId, {
      dtype: 'q8',
      device: 'wasm',            // these models are tiny; CPU avoids GPU pressure
      progress_callback: (p) => {
        if (p.status === 'progress' && p.total) {
          ui.setProgress((p.loaded / p.total) * 100, `Loading — ${formatFileSize(p.loaded)} / ${formatFileSize(p.total)}`);
        }
      },
    });
    MT.key = key;
  }

  const cues = transcriptionState.transcript;
  ui.setStage(`Translating ${cues.length} cues into ${MT_LANGS[targetLang]}…`);

  for (let i = 0; i < cues.length; i++) {
    if (ui.shouldStop?.()) break;
    const cue = cues[i];
    if (!cue.text?.trim()) continue;

    try {
      const output = await MT.pipe(cue.text, { max_new_tokens: 220 });
      const text = Array.isArray(output) ? output[0]?.translation_text : output?.translation_text;
      if (text) cue.translated = collapseRepeats(text.trim());
    } catch (error) {
      console.warn(`Translation failed on cue ${i}:`, error?.message);
    }

    ui.setProgress(((i + 1) / cues.length) * 100, `${i + 1} / ${cues.length}`);
    ui.addCues?.([{ start: cue.start ?? cue.timestamp, text: cue.translated || cue.text }]);
    await new Promise(resolve => setTimeout(resolve, 0));   // keep the UI alive
  }

  return cues.filter(c => c.translated).length;
}

function showTranslateModal() {
  if (!transcriptionState.transcript.length) {
    showToast('Generate or import subtitles first', 'info');
    return;
  }
  $('#translateModal')?.remove();

  const guess = (defaultAsrLanguage() || 'english').slice(0, 2);
  const sourceGuess = Object.keys(MT_LANGS).find(code => MT_LANGS[code].toLowerCase().startsWith(guess)) || 'fr';
  const options = (selected) => Object.entries(MT_LANGS)
    .map(([code, name]) => `<option value="${code}"${code === selected ? ' selected' : ''}>${name}</option>`).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'translateModal';
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="trTitle">
      <div class="modal__header">
        <div class="modal__title-wrapper">
          <span class="modal__emoji">🌍</span>
          <h3 class="modal__title" id="trTitle">Translate subtitles</h3>
        </div>
        <button class="modal__close" id="trClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">
        <p class="sub-lead">${transcriptionState.transcript.length} cues. Translation runs <strong>on your device</strong> — nothing is sent anywhere. The original text is kept, so you can switch back any time.</p>
        <div class="sub-controls">
          <label>From <select id="trFrom">${options(sourceGuess)}</select></label>
          <label>To <select id="trTo">${options('en')}</select></label>
        </div>
        <p class="sub-tip">Pairs to and from English are supported (a small model per pair, tens of MB). For other combinations, translate to English first.</p>
        <div class="sub-progress" id="trProgress" hidden>
          <p class="sub-stage" id="trStage"></p>
          <div class="sub-bar"><div class="sub-bar__fill" id="trBar"></div></div>
        </div>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="trCancel">Cancel</button>
        <button class="btn btn--primary" id="trGo">🌍 Translate</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };
  modal.querySelector('#trClose').addEventListener('click', close);
  modal.querySelector('#trCancel').addEventListener('click', close);

  modal.querySelector('#trGo').addEventListener('click', async () => {
    const from = modal.querySelector('#trFrom').value;
    const to = modal.querySelector('#trTo').value;

    if (from === to) {
      showToast('Pick two different languages', 'info');
      return;
    }

    const button = modal.querySelector('#trGo');
    const progress = modal.querySelector('#trProgress');
    button.disabled = true;
    progress.hidden = false;

    const ui = {
      setStage: (t) => { modal.querySelector('#trStage').textContent = t; },
      setProgress: (pct, detail) => {
        modal.querySelector('#trBar').style.width = `${Math.min(pct, 100)}%`;
        if (detail) modal.querySelector('#trStage').textContent = detail;
      },
      shouldStop: () => false,
    };

    try {
      const count = await translateTranscript(from, to, ui);
      captions.showOriginal = false;
      updateTranscriptDisplay();
      saveTranscript();
      close();
      showToast(`Translated ${count} cues into ${MT_LANGS[to]} — the original is kept`, 'success');
    } catch (error) {
      console.error('Translation failed:', error);
      showToast(`Could not translate: ${error.message}`, 'error');
      button.disabled = false;
      progress.hidden = true;
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

function showSubtitleModal() {
  $('#subtitleModal')?.remove();

  const canUseAudio = isNativeVideoProvider() || !!state.packVideoFile;
  const hasSubs = transcriptionState.transcript.length > 0;

  const aiCard = `
    <div class="sub-option sub-option--ai">
      <h4>🎧 Generate from the audio
        <span class="sub-badge">on-device AI</span>
        ${hasSubs ? '' : '<span class="sub-badge sub-badge--reco">recommended</span>'}
      </h4>
      <p>Whisper runs <strong>inside your browser</strong> — the audio never leaves your machine — and returns
      precisely timestamped cues.${navigator.gpu ? ' Your browser supports <strong>WebGPU</strong>, so this will be fast.' : ' Your browser will use the CPU, which is slower.'}</p>
      ${canUseAudio ? `
      <div class="sub-controls">
        <label>Model
          <select id="subModel">
            <option value="tiny">${ASR.MODELS.tiny.label}</option>
            <option value="base" selected>${ASR.MODELS.base.label}</option>
            <option value="small">${ASR.MODELS.small.label}</option>
          </select>
        </label>
        <label>Language <span class="sub-hint">pick it — auto-detect misfires</span>
          <select id="subLang">
            <option value="english">English</option>
            <option value="french">French</option>
            <option value="spanish">Spanish</option>
            <option value="german">German</option>
            <option value="italian">Italian</option>
            <option value="portuguese">Portuguese</option>
            <option value="dutch">Dutch</option>
            <option value="japanese">Japanese</option>
            <option value="korean">Korean</option>
            <option value="chinese">Chinese</option>
            <option value="arabic">Arabic</option>
            <option value="russian">Russian</option>
            <option value="auto">Auto-detect (less reliable)</option>
          </select>
        </label>
      </div>
      <p class="sub-tip">For anything other than English, <strong>Small</strong> is markedly more accurate than Tiny.</p>
      <label class="sub-check"><input type="checkbox" id="subTranslateEn"> Write the subtitles in <strong>English</strong> instead of the spoken language <span class="sub-hint">free — no extra model</span></label>
      <div class="sub-range">
        <label>From <input type="text" id="subFrom" value="0:00" size="6" inputmode="numeric"></label>
        <label>To <input type="text" id="subTo" value="${formatTime(state.videoDuration || 0)}" size="6" inputmode="numeric"></label>
        <button type="button" class="btn btn--ghost btn--sm" id="subWhole">Whole video</button>
      </div>
      <p class="sub-estimate" id="subEstimate"></p>
      <button class="btn btn--primary" id="subGenerate">✨ Generate subtitles</button>
      <button class="btn btn--ghost btn--sm" id="subFreeMem" title="Unload the speech model from memory">Free model memory</button>
      ` : `
      <p class="sub-note">Needs the actual video file. This is a platform video — use
      <strong>Download</strong> first, attach the file, then come back here.</p>
      <button class="btn btn--secondary btn--sm" id="subGetVideo">Get the video file</button>
      `}
    </div>`;

  const otherCards = `
    <div class="sub-option">
      <h4>📥 Import a subtitle file</h4>
      <p>An <code>.srt</code> or <code>.vtt</code> from the platform or your editor — original timings are kept exactly.</p>
      <button class="btn btn--secondary btn--sm" id="subImport">Choose file</button>
    </div>

    <div class="sub-option">
      <h4>🎬 Use the video's own track</h4>
      <p>If the loaded file already carries a subtitle track, pull its cues straight out.</p>
      <button class="btn btn--secondary btn--sm" id="subEmbedded">Extract embedded track</button>
    </div>

    <div class="sub-option">
      <h4>🎤 Live from the microphone</h4>
      <p>Dictate as the video plays, or capture a room. Uses the browser's speech engine — handy for quick notes, far less accurate than the AI option above.</p>
      <button class="btn btn--secondary btn--sm" id="subLive">${transcriptionState.isTranscribing ? 'Stop listening' : 'Start listening'}</button>
    </div>`;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'subtitleModal';
  modal.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="subModalTitle">
      <div class="modal__header">
        <div class="modal__title-wrapper">
          <span class="modal__emoji">💬</span>
          <h3 class="modal__title" id="subModalTitle">Subtitles</h3>
        </div>
        <button class="modal__close" id="subClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">
        ${hasSubs
          ? `<p class="sub-lead">This video already has ${transcriptionState.transcript.length} cues — generating or importing will replace them.</p>${otherCards}${aiCard}`
          : `<p class="sub-lead">No subtitles yet. Let the AI write them for you — right here, on your machine.</p>${aiCard}${otherCards}`}
      </div>
      <input type="file" id="subFileInput" accept=".srt,.vtt,.txt" hidden>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  modal.querySelector('#subClose').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });

  modal.querySelector('#subImport').addEventListener('click', () => modal.querySelector('#subFileInput').click());
  modal.querySelector('#subFileInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      importSubtitleFile(file);
      close();
    }
  });

  modal.querySelector('#subLive')?.addEventListener('click', () => {
    close();
    toggleTranscription();
  });

  modal.querySelector('#subEmbedded').addEventListener('click', () => {
    if (extractEmbeddedTracks()) {
      close();
    } else {
      showToast('This video has no embedded subtitle track', 'info');
    }
  });

  // Preselect the browser's language so French audio is not read as Korean
  const langSelect = modal.querySelector('#subLang');
  if (langSelect) langSelect.value = defaultAsrLanguage();

  // Live estimate of what the chosen range will cost in memory and time
  const fromField = modal.querySelector('#subFrom');
  const toField = modal.querySelector('#subTo');
  const estimateEl = modal.querySelector('#subEstimate');

  const readRange = () => {
    const start = Math.max(0, parseTimeToSeconds(fromField?.value || '0'));
    const rawEnd = parseTimeToSeconds(toField?.value || '0') || state.videoDuration || 0;
    const end = Math.max(start + 1, rawEnd);
    return { start, end };
  };

  const refreshEstimate = async () => {
    if (!estimateEl) return;
    const { start, end } = readRange();
    const seconds = Math.max(0, end - start);
    const audioMB = (seconds * 16000 * 4) / 1e6;
    const modelKey = modal.querySelector('#subModel')?.value || 'base';
    const caps = await probeAsrCapabilities(modelKey);
    // Rough throughput: GPU chews ~8x realtime, CPU ~1x for these model sizes
    const speed = caps.device === 'webgpu' ? 8 : 1;
    const minutes = Math.max(1, Math.round(seconds / speed / 60));

    estimateEl.innerHTML =
      `Selected: <strong>${formatTime(seconds)}</strong> · audio in memory ≈ <strong>${audioMB.toFixed(0)} MB</strong> · ` +
      `runs on <strong>${caps.label}</strong> · roughly <strong>${minutes} min</strong>` +
      (seconds > 1800
        ? '<br><span class="sub-warn">⚠ Over 30 minutes at once is heavy. Transcribe in chunks (set From/To) to keep your machine responsive.</span>'
        : '');
  };

  fromField?.addEventListener('input', refreshEstimate);
  toField?.addEventListener('input', refreshEstimate);
  modal.querySelector('#subModel')?.addEventListener('change', refreshEstimate);
  modal.querySelector('#subWhole')?.addEventListener('click', () => {
    if (fromField) fromField.value = '0:00';
    if (toField) toField.value = formatTime(state.videoDuration || 0);
    refreshEstimate();
  });
  refreshEstimate();

  modal.querySelector('#subFreeMem')?.addEventListener('click', async () => {
    await releaseAsrPipeline();
    showToast('Speech model unloaded — memory released', 'success');
  });

  modal.querySelector('#subGetVideo')?.addEventListener('click', () => {
    close();
    showDownloaderModal(state.originalVideoUrl || getVideoWatchUrl() || '', (file) => {
      state.packVideoFile = file;
      showToast('Video attached — open Subtitles again to transcribe it', 'success');
    });
  });

  modal.querySelector('#subGenerate')?.addEventListener('click', async () => {
    const modelKey = modal.querySelector('#subModel').value;
    const language = modal.querySelector('#subLang').value;
    const translateToEnglish = modal.querySelector('#subTranslateEn')?.checked;
    const picked = readRange();
    const whole = picked.start <= 0 && picked.end >= (state.videoDuration || 0) - 1;
    const range = whole ? null : picked;
    close();

    let stopped = false;
    const ui = showTranscribeProgressModal(() => { stopped = true; });

    try {
      const cues = await generateSubtitlesFromAudio(modelKey, language, {
        setStage: ui.setStage,
        setProgress: ui.setProgress,
        onCues: (fresh) => ui.addCues(fresh),
        shouldStop: () => stopped,
      }, range, translateToEnglish);

      ui.close();

      if (!cues.length) {
        showToast('No speech detected in this video', 'warning');
        return;
      }

      transcriptionState.transcript = cues;
      updateTranscriptDisplay();
      saveTranscript();
      showSubtitleSuccess(cues.length, stopped);
    } catch (error) {
      console.error('Subtitle generation failed:', error);
      ui.close();
      showToast(error.message === 'NO_AUDIO_SOURCE'
        ? 'Load a local video, a direct URL, or attach a downloaded file first'
        : `Could not generate subtitles: ${error.message}`, 'error');
    }
  });
}

// A small celebration — and the friendliest moment to ask for a star
function showSubtitleSuccess(count, wasStopped) {
  $('#subDoneModal')?.remove();

  const ideas = [
    'Export them as <strong>SRT</strong> and drop the file into VLC — instant subtitles.',
    'Click <strong>Add All</strong> in the transcript to turn every line into a comment.',
    'Click any line to jump straight to that moment in the video.',
    'Bundle everything into an <strong>Offline Pack</strong> and read it on a flight.',
  ];
  const idea = ideas[Math.floor(Math.random() * ideas.length)];

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'subDoneModal';
  modal.innerHTML = `
    <div class="modal modal--sm asr-done" role="dialog" aria-modal="true">
      <div class="asr-done__burst">✨</div>
      <div class="modal__body" style="text-align:center;">
        <h3 class="modal__title" style="margin-bottom:0.4rem;">
          ${wasStopped ? 'Stopped — kept what we had' : 'Subtitles ready!'}
        </h3>
        <p style="color:var(--color-text-secondary);font-size:0.9rem;">
          <strong>${count}</strong> perfectly timestamped cues, generated entirely on your machine.
          Nothing was uploaded anywhere.
        </p>
        <p class="asr-done__idea">💡 ${idea}</p>
        <p class="asr-done__ask">
          Vidlens is free and open source — built by one human and a lot of coffee.
          If it just saved you time, a star genuinely helps.
        </p>
      </div>
      <div class="modal__footer" style="justify-content:center;flex-wrap:wrap;">
        <a class="btn btn--ghost btn--sm" href="https://github.com/VideoTag/videotag/issues/new" target="_blank" rel="noopener">💬 Share feedback</a>
        <a class="btn btn--primary" id="subStar" href="https://github.com/VideoTag/videotag" target="_blank" rel="noopener">⭐ Star on GitHub</a>
        <button class="btn btn--ghost btn--sm" id="subDoneClose">Back to my video</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };
  modal.querySelector('#subDoneClose').addEventListener('click', close);
  modal.querySelector('#subStar').addEventListener('click', () => {
    markStarPrompt(true);
    setTimeout(close, 400);
  });
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

// ============================================
// 16. TIMELINE & STATS
// ============================================

// ============================================
// 15c. SUBTITLES ON THE PLAYER
// ============================================

const captions = { on: false, raf: null, lastIndex: -1, showOriginal: false };

function cueTextFor(cue) {
  if (!cue) return '';
  return (!captions.showOriginal && cue.translated) ? cue.translated : cue.text;
}

// Cues are sorted, so walk from the last hit instead of scanning every frame
function findCueAt(time) {
  const list = transcriptionState.transcript;
  if (!list.length) return null;

  const hit = (cue) => cue && time >= (cue.start ?? cue.timestamp) &&
    time < (cue.end ?? (cue.start ?? cue.timestamp) + 3);

  if (hit(list[captions.lastIndex])) return list[captions.lastIndex];
  if (hit(list[captions.lastIndex + 1])) {
    captions.lastIndex += 1;
    return list[captions.lastIndex];
  }

  let lo = 0, hi = list.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cue = list[mid];
    const start = cue.start ?? cue.timestamp;
    const end = cue.end ?? start + 3;
    if (time < start) hi = mid - 1;
    else if (time >= end) lo = mid + 1;
    else { captions.lastIndex = mid; return cue; }
  }
  return null;
}

function paintCaption() {
  if (!captions.on) return;
  const overlay = elements.subtitleOverlay;
  if (overlay) {
    const cue = findCueAt(getCurrentTime());
    const text = cueTextFor(cue);
    if (overlay.dataset.text !== text) {
      overlay.dataset.text = text;
      overlay.innerHTML = text ? `<span>${sanitizeHTML(text)}</span>` : '';
    }
  }
  captions.raf = requestAnimationFrame(paintCaption);
}

function setCaptions(on) {
  captions.on = on;
  captions.lastIndex = -1;
  cancelAnimationFrame(captions.raf);

  const overlay = elements.subtitleOverlay;
  const button = elements.ccToggleBtn;

  if (on) {
    overlay?.removeAttribute('hidden');
    button?.classList.add('btn--active');
    paintCaption();
  } else {
    overlay?.setAttribute('hidden', '');
    if (overlay) {
      overlay.innerHTML = '';
      delete overlay.dataset.text;
    }
    button?.classList.remove('btn--active');
  }
}

// The CC button only makes sense once there is something to show
function updateCaptionAvailability() {
  const has = transcriptionState.transcript.length > 0;
  if (!elements.ccToggleBtn) return;

  if (has) {
    elements.ccToggleBtn.removeAttribute('hidden');
  } else {
    elements.ccToggleBtn.setAttribute('hidden', '');
    if (captions.on) setCaptions(false);
  }
}

function startTimelineUpdates() {
  if (state.timelineInterval) clearInterval(state.timelineInterval);
  
  state.timelineInterval = setInterval(() => {
    if (!state.videoLoaded) return;
    
    updateCurrentTimeDisplay();
    
    try {
      const duration = state.videoDuration || 1;
      const current = getCurrentTime();
      const progress = Math.min((current / duration) * 100, 100);
      
      if (elements.timelineProgress) {
        elements.timelineProgress.style.width = `${progress}%`;
      }
    } catch {}
  }, CONFIG.TIMELINE_UPDATE_INTERVAL);
}

function createTimelineMarkers() {
  if (!elements.timelineMarkers) return;
  elements.timelineMarkers.innerHTML = '';
  
  const comments = Array.from(elements.commentsList?.children || []);
  const duration = state.videoDuration || 600;
  
  comments.forEach(c => {
    const timestamp = parseInt(c.dataset.timestamp) || 0;
    const position = Math.min((timestamp / duration) * 100, 100);
    const type = c.classList.contains('reaction') ? 'reaction' : 'comment';
    const text = c.querySelector('.comment-text')?.textContent || '';
    
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.dataset.type = type;
    marker.dataset.time = timestamp;
    marker.style.left = `${position}%`;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    tooltip.textContent = `${formatTime(timestamp)} - ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`;
    marker.appendChild(tooltip);
    
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      seekToTime(timestamp);
    });
    
    elements.timelineMarkers.appendChild(marker);
  });
}

function updateStats() {
  const comments = Array.from(elements.commentsList?.children || []);
  const reactions = comments.filter(c => c.classList.contains('reaction'));
  const textComments = comments.filter(c => !c.classList.contains('reaction'));
  
  if (elements.totalCommentsValue) {
    elements.totalCommentsValue.textContent = textComments.length;
  }
  if (elements.totalReactionsValue) {
    elements.totalReactionsValue.textContent = reactions.length;
  }
  
  const timestamps = comments.map(c => parseInt(c.dataset.timestamp) || 0);
  const avg = timestamps.length 
    ? Math.floor(timestamps.reduce((a, b) => a + b, 0) / timestamps.length)
    : 0;
  
  if (elements.avgTimeValue) {
    elements.avgTimeValue.textContent = formatTime(avg);
  }
  
  if (elements.reactionSummary) {
    elements.reactionSummary.innerHTML = '';
    
    const counts = {};
    reactions.forEach(r => {
      const emoji = r.querySelector('.reaction-emoji')?.textContent || '👍';
      counts[emoji] = (counts[emoji] || 0) + 1;
    });
    
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([emoji, count]) => {
        const stat = document.createElement('div');
        stat.className = 'reaction-stat';
        stat.innerHTML = `
          <span class="reaction-emoji">${emoji}</span>
          <span class="reaction-count">${count}</span>
        `;
        elements.reactionSummary.appendChild(stat);
      });
    
    if (Object.keys(counts).length > 0) {
      elements.reactionSummarySection?.removeAttribute('hidden');
    } else {
      elements.reactionSummarySection?.setAttribute('hidden', '');
    }
  }
}

function updateUI() {
  createTimelineMarkers();
  updateStats();
}

// ============================================
// 17. EXPORT FUNCTIONS
// ============================================

function getCommentsData() {
  const items = Array.from(elements.commentsList?.children || []).map(c => ({
    id: c.dataset.id || null,
    timestamp: parseInt(c.dataset.timestamp) || 0,
    time: formatTime(parseInt(c.dataset.timestamp) || 0),
    type: c.classList.contains('reaction') ? 'reaction' : 'comment',
    emoji: c.querySelector('.reaction-emoji')?.textContent || null,
    text: getCommentPlainText(c),
    voice: c.dataset.voice ? JSON.parse(c.dataset.voice) : null,
  }));

  // "Include reactions" export toggle — off means text comments only
  return state.includeReactionsInExport ? items : items.filter(i => i.type !== 'reaction');
}

function exportCSV() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments included — exporting metadata only', 'info');
  }
  
  let csv = 'timestamp,time,type,emoji,text\n';
  
  data.forEach(d => {
    csv += `${d.timestamp},"${d.time}","${d.type}","${d.emoji || ''}","${d.text.replace(/"/g, '""')}"\n`;
  });
  
  downloadFile(csv, `${state.videoTitle}_comments.csv`, 'text/csv');
  showToast('Exported as CSV!', 'success');
}

function exportText() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments included — exporting metadata only', 'info');
  }
  
  let text = `Vidlens Export\n`;
  text += `Video: ${state.videoTitle}\n`;
  text += `Platform: ${PROVIDER_NAMES[state.currentProvider]}\n`;
  text += `Date: ${new Date().toLocaleString()}\n`;
  text += `${'='.repeat(50)}\n\n`;
  
  data.forEach(d => {
    text += `[${d.time}] ${d.type === 'reaction' ? d.emoji + ' ' : ''}${d.text}\n\n`;
  });
  
  downloadFile(text, `${state.videoTitle}_comments.txt`, 'text/plain');
  showToast('Exported as Text!', 'success');
}

async function exportPDF() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments included — exporting metadata only', 'info');
  }

  try {
    await loadJsPDF();
  } catch (error) {
    showToast(error.message, 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241);
  doc.text('Vidlens Export', 20, 25);
  
  // Video info
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(`Video: ${state.videoTitle}`, 20, 38);
  doc.text(`Platform: ${PROVIDER_NAMES[state.currentProvider]}`, 20, 46);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 54);
  doc.text(`Total items: ${data.length}`, 20, 62);
  
  // Line separator
  doc.setDrawColor(200);
  doc.line(20, 70, 190, 70);
  
  let y = 82;
  doc.setTextColor(0);
  
  data.forEach(d => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    // Timestamp badge
    doc.setFillColor(99, 102, 241);
    doc.roundedRect(20, y - 5, 25, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.setTextColor(255);
    doc.text(`[${d.time}]`, 22, y);
    
    // Content
    doc.setFontSize(11);
    doc.setTextColor(50);
    const contentText = `${d.emoji || ''} ${d.text}`.trim();
    const lines = doc.splitTextToSize(contentText, 140);
    doc.text(lines, 50, y);
    
    y += 12 + (lines.length * 5);
  });
  
  doc.save(`${sanitizeFileName(state.videoTitle)}_comments.pdf`);
  showToast('Exported as PDF!', 'success');
}

function exportJSON() {
  const data = {
    video: {
      title: state.videoTitle,
      provider: state.currentProvider,
      id: state.currentVideoId,
      url: state.originalVideoUrl || getVideoEmbedUrl(),
    },
    exportDate: new Date().toISOString(),
    comments: getCommentsData(),
    transcript: transcriptionState.transcript,
    stats: {
      totalComments: getCommentsData().filter(c => c.type === 'comment').length,
      totalReactions: getCommentsData().filter(c => c.type === 'reaction').length,
    }
  };
  
  downloadFile(JSON.stringify(data, null, 2), `${state.videoTitle}_comments.json`, 'application/json');
  showToast('Exported as JSON!', 'success');
}

// Comments as SRT subtitles — open the video in VLC & co. with your notes overlaid
function buildCommentsSRT(data) {
  const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
  let srt = '';
  sorted.forEach((d, index) => {
    const next = sorted[index + 1];
    const end = Math.min(d.timestamp + 5, next ? Math.max(next.timestamp - 0.2, d.timestamp + 1) : d.timestamp + 5);
    const label = d.type === 'reaction' && d.emoji ? `${d.emoji} ` : '';
    srt += `${index + 1}\n${formatSRTTime(d.timestamp)} --> ${formatSRTTime(end)}\n${label}${d.text}\n\n`;
  });
  return srt;
}

function exportCommentsSRT() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments included — exporting metadata only', 'info');
  }
  downloadFile(buildCommentsSRT(data), `${state.videoTitle}_comments.srt`, 'text/plain');
  showToast('Comments exported as SRT subtitles!', 'success');
}

// Load jsPDF on demand so the app stays light
function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf?.jsPDF) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = () => window.jspdf?.jsPDF ? resolve() : reject(new Error('jsPDF failed to initialize'));
    script.onerror = () => reject(new Error('Could not load the PDF library (are you offline?)'));
    document.head.appendChild(script);
  });
}

function getYouTubeWatchUrl() {
  if (state.currentProvider === 'youtube' || state.currentProvider === 'youtube_shorts') {
    return `https://www.youtube.com/watch?v=${state.currentVideoId}`;
  }
  return null;
}

function getVideoWatchUrl() {
  switch (state.currentProvider) {
    case 'youtube':
    case 'youtube_shorts':
      return `https://www.youtube.com/watch?v=${state.currentVideoId}`;
    case 'vimeo':
      return `https://vimeo.com/${state.currentVideoId}`;
    case 'dailymotion':
      return `https://www.dailymotion.com/video/${state.currentVideoId}`;
    case 'tiktok':
      return state.originalVideoUrl || `https://www.tiktok.com/video/${state.currentVideoId}`;
    default:
      return state.originalVideoUrl || '';
  }
}

// Builds a provider-aware seek URL (embed reload with a start offset)
function getSeekableEmbedInfo() {
  const videoId = state.currentVideoId;
  switch (state.currentProvider) {
    case 'youtube':
    case 'youtube_shorts':
      return { embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`, seekTemplate: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&autoplay=1&start={s}` };
    case 'vimeo':
      return { embedUrl: `https://player.vimeo.com/video/${videoId}`, seekTemplate: `https://player.vimeo.com/video/${videoId}?autoplay=1#t={s}s` };
    case 'dailymotion':
      return { embedUrl: `https://www.dailymotion.com/embed/video/${videoId}`, seekTemplate: `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1&start={s}` };
    default:
      return { embedUrl: getVideoEmbedUrl(), seekTemplate: null };
  }
}

// Main HTML generator for online videos (YouTube, Vimeo, etc.)
// Ways to obtain a video file, ranked: official routes first, a local tool
// second (no third-party website involved), a downloader site last.
function getDownloadRoutes(watchUrl, providerName) {
  const url = watchUrl || '';
  return [
    {
      icon: '✅',
      title: `${providerName}'s own download`,
      body: `The safest route: use the platform's official download / offline feature (e.g. YouTube Premium offline, or YouTube Studio for videos you uploaded yourself).`,
      command: null,
      link: url,
      linkLabel: 'Open the video',
    },
    {
      icon: '⌨️',
      title: 'yt-dlp (local tool, nothing leaves your machine)',
      body: 'Free and open source. Install it once, then run this command in a terminal — no website involved.',
      command: url ? `yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "video.mp4" "${url}"` : null,
      link: 'https://github.com/yt-dlp/yt-dlp#installation',
      linkLabel: 'Install yt-dlp',
    },
    {
      icon: '🌐',
      title: 'A downloader website',
      body: 'If you prefer not to install anything, an open-source web downloader such as cobalt can fetch the file for you. Third-party site — use at your own discretion.',
      command: null,
      link: 'https://cobalt.tools/',
      linkLabel: 'Open cobalt.tools',
    },
  ];
}

// Cache of commentId → data URL, used to inline audio in the HTML report
const voiceDataUrls = new Map();

async function inlineVoiceNotes() {
  const withVoice = getCommentsData().filter(d => d.voice && d.id);
  for (const item of withVoice) {
    if (voiceDataUrls.has(item.id)) continue;
    const blob = await loadVoiceClip(item.id);
    if (!blob) continue;
    voiceDataUrls.set(item.id, await fileToBase64(blob));
  }
}

function buildReportPayload() {
  const { embedUrl, seekTemplate } = getSeekableEmbedInfo();
  // attach the inlined audio so each note plays straight from the file
  const comments = getCommentsData().map(c => (
    c.voice && voiceDataUrls.has(c.id) ? { ...c, voiceData: voiceDataUrls.get(c.id) } : c
  ));
  return {
    title: state.videoTitle,
    author: state.videoAuthor,
    provider: state.currentProvider,
    providerName: PROVIDER_NAMES[state.currentProvider] || state.currentProvider,
    watchUrl: getVideoWatchUrl() || null,
    embedUrl: isNativeVideoProvider() ? null : embedUrl,
    seekTemplate: seekTemplate,
    duration: state.videoDuration,
    exportDate: new Date().toISOString(),
    comments,
    transcript: [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp),
    directUrl: state.currentProvider === 'direct' ? state.originalVideoUrl : null,
  };
}

// One self-contained HTML report for every source type.
// embeddedVideo: { dataUrl, type } when the video is inlined (local uploads),
// otherwise the report offers the platform embed plus "load your own file".
function generateReportHTML(embeddedVideo = null, thumbDataUrl = null) {
  const payload = buildReportPayload();
  payload.thumb = thumbDataUrl;
  const routes = payload.watchUrl || payload.embedUrl ? getDownloadRoutes(payload.watchUrl, payload.providerName) : [];
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<meta name="generator" content="Vidlens — https://vidlens.net/">
<title>${sanitizeHTML(payload.title)} — Vidlens report</title>
<style>
  :root {
    --primary: #6366f1; --primary-light: #818cf8; --secondary: #ec4899;
    --bg: #05050a; --surface: #0f0f1a; --surface-2: #151522; --surface-3: #1a1a2a;
    --text: #fff; --text-2: #a0a0b8; --muted: #5a5a70;
    --yellow: #fbbf24; --cyan: #22d3ee; --green: #10b981;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.6;
    padding: 1.5rem; max-width: 1400px; margin: 0 auto;
  }
  header { text-align: center; margin-bottom: 1.5rem; }
  h1 {
    font-size: clamp(1.3rem, 3vw, 1.8rem); margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .meta { color: var(--muted); font-size: 0.82rem; }
  .meta span { display: inline-block; padding: 0.2rem 0.7rem; background: var(--surface); border-radius: 20px; margin: 0.2rem; }
  .badge-offline { color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
  .layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1.5rem; align-items: start; }
  @media (max-width: 950px) { .layout { grid-template-columns: 1fr; } .left { position: static !important; } }
  .left { position: sticky; top: 1rem; }
  .box { background: var(--surface); border-radius: 16px; padding: 1rem; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .stage { position: relative; width: 100%; border-radius: 12px; overflow: hidden; background: #000; }
  .stage video { width: 100%; max-height: 62vh; display: block; background: #000; }
  .stage iframe { width: 100%; aspect-ratio: 16/9; border: 0; display: block; }
  .stage.vertical iframe { aspect-ratio: 9/16; max-height: 70vh; margin: 0 auto; width: auto; }
  .srcbar { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; margin-top: 0.75rem; }
  .btn {
    display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.55rem 1rem;
    background: linear-gradient(135deg, #6366f1, #ec4899); color: #fff; border: none;
    border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer;
    text-decoration: none; font-family: inherit;
  }
  .btn:hover { opacity: 0.92; }
  .btn--ghost { background: var(--surface-2); border: 1px solid rgba(255,255,255,0.12); color: var(--text); }
  .btn--sm { padding: 0.35rem 0.7rem; font-size: 0.78rem; }
  .srcbar__hint { color: var(--muted); font-size: 0.75rem; flex: 1; min-width: 160px; }
  .timerow { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; font-family: Consolas, monospace; font-size: 0.8rem; color: var(--text-2); }
  .timeline { flex: 1; position: relative; height: 24px; cursor: pointer; }
  .track { position: absolute; top: 50%; left: 0; right: 0; height: 6px; transform: translateY(-50%); background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
  .fill { height: 100%; width: 0; background: linear-gradient(90deg, var(--primary), var(--secondary)); }
  .marker { position: absolute; top: 50%; width: 10px; height: 10px; margin-left: -5px; transform: translateY(-50%); border-radius: 50%; cursor: pointer; z-index: 5; }
  .marker:hover { transform: translateY(-50%) scale(1.5); }
  .marker.reaction { background: var(--yellow); box-shadow: 0 0 8px rgba(251,191,36,0.5); }
  .marker.comment { background: var(--cyan); box-shadow: 0 0 8px rgba(34,211,238,0.5); }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 1rem; }
  .stat { padding: 0.85rem; background: var(--surface); border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
  .stat b { display: block; font-size: 1.3rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .stat span { font-size: 0.68rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  details.get { margin-top: 1rem; background: var(--surface-2); border: 1px solid rgba(255,255,255,0.07); border-radius: 12px; }
  details.get > summary { cursor: pointer; padding: 0.8rem 1rem; font-weight: 600; font-size: 0.86rem; list-style: none; }
  details.get > summary::-webkit-details-marker { display: none; }
  details.get > summary::before { content: '▸ '; color: var(--primary-light); }
  details.get[open] > summary::before { content: '▾ '; }
  .routes { padding: 0 1rem 1rem; display: flex; flex-direction: column; gap: 0.7rem; }
  .route { padding: 0.8rem; background: var(--surface); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); }
  .route h4 { font-size: 0.85rem; margin-bottom: 0.25rem; }
  .route p { font-size: 0.76rem; color: var(--muted); margin-bottom: 0.5rem; }
  .cmd { display: flex; gap: 0.4rem; align-items: stretch; }
  .cmd code { flex: 1; background: #000; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 0.5rem 0.6rem; font-family: Consolas, monospace; font-size: 0.7rem; color: var(--cyan); overflow-x: auto; white-space: nowrap; }
  .warn { margin-top: 0.6rem; font-size: 0.72rem; color: var(--muted); border-left: 2px solid var(--yellow); padding-left: 0.6rem; }
  .panel { background: var(--surface); border-radius: 16px; padding: 1.1rem; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .panel h2 { font-size: 1rem; margin-bottom: 0.9rem; display: flex; align-items: center; gap: 0.5rem; }
  .panel h2::before { content: ''; width: 4px; height: 18px; background: var(--primary); border-radius: 2px; }
  .tools { display: flex; gap: 0.5rem; margin-bottom: 0.9rem; flex-wrap: wrap; }
  .tools input { flex: 1; min-width: 130px; padding: 0.45rem 0.8rem; background: var(--surface-2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text); font-size: 0.82rem; font-family: inherit; }
  .tools input:focus { outline: none; border-color: var(--primary); }
  .chip { padding: 0.4rem 0.85rem; background: var(--surface-2); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; color: var(--text-2); font-size: 0.76rem; cursor: pointer; font-family: inherit; }
  .chip.on { background: var(--primary); color: #fff; border-color: var(--primary); }
  .list { display: flex; flex-direction: column; gap: 0.55rem; max-height: 62vh; overflow-y: auto; padding-right: 0.25rem; }
  .list::-webkit-scrollbar { width: 8px; }
  .list::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 4px; }
  .item { display: flex; gap: 0.7rem; padding: 0.7rem 0.9rem; background: var(--surface-2); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s; }
  .item:hover { transform: translateX(3px); border-color: var(--primary); }
  .item.reaction { border-left: 3px solid var(--yellow); }
  .item.active { border-color: var(--primary); background: var(--surface-3); box-shadow: 0 0 16px rgba(99,102,241,0.25); }
  .ts { padding: 0.25rem 0.55rem; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 6px; font-family: Consolas, monospace; font-size: 0.72rem; font-weight: 600; color: #fff; flex-shrink: 0; align-self: flex-start; border: none; cursor: pointer; }
  .txt { flex: 1; color: var(--text-2); font-size: 0.87rem; word-break: break-word; }
  .emo { font-size: 1.05rem; margin-right: 0.35rem; }
  .voice { display: block; width: 100%; max-width: 320px; height: 34px; margin-top: 0.5rem; }
  .empty { text-align: center; color: var(--muted); padding: 1.5rem; font-size: 0.85rem; }
  .tline { display: flex; gap: 0.5rem; padding: 0.4rem 0.7rem; background: var(--surface-2); border-radius: 8px; font-size: 0.82rem; cursor: pointer; }
  .tline:hover { background: var(--surface-3); }
  footer { text-align: center; margin-top: 2rem; padding-top: 1.25rem; border-top: 1px solid rgba(255,255,255,0.05); color: var(--muted); font-size: 0.78rem; }
  footer a { color: var(--primary-light); text-decoration: none; }
  .toast { position: fixed; left: 50%; bottom: 1.5rem; transform: translateX(-50%); background: var(--surface-3); border: 1px solid rgba(255,255,255,0.15); padding: 0.6rem 1.2rem; border-radius: 10px; font-size: 0.82rem; opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 50; }
  .toast.show { opacity: 1; }
  body.drag::after { content: '📂 Drop the video file to play it here'; position: fixed; inset: 0; background: rgba(5,5,10,0.85); border: 3px dashed var(--primary); display: flex; align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 700; z-index: 100; }
  .dlmodal { position: fixed; inset: 0; background: rgba(0,0,0,0.75); display: flex; align-items: center; justify-content: center; padding: 1rem; z-index: 200; }
  .dlmodal__box { background: var(--surface); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 1.1rem; width: min(960px, 96vw); max-height: 94vh; overflow-y: auto; }
  .dlmodal__head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.6rem; }
  .dlmodal__hint { font-size: 0.78rem; color: var(--text-2); margin-bottom: 0.6rem; }
  .dlmodal__frame { width: 100%; height: min(55vh, 520px); border: 0; border-radius: 12px; background: #fff; display: block; margin-top: 0.6rem; }
  .dlmodal__credit { font-size: 0.72rem; color: var(--muted); margin-top: 0.6rem; }
  .dlmodal__credit a { color: var(--primary-light); }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
</head>
<body>
<header>
  <h1 id="title"></h1>
  <p class="meta" id="meta"></p>
</header>

<div class="layout">
  <div class="left">
    <div class="box">
      <div class="stage" id="stage"></div>

      <div class="srcbar">
        <button class="btn" id="dlBtn">⬇ Download video</button>
        <button class="btn btn--ghost btn--sm" id="pick">📂 Load video file</button>
        <button class="btn btn--ghost btn--sm" id="urlBtn">🔗 Direct URL</button>
        <button class="btn btn--ghost btn--sm" id="backBtn" style="display:none">↩ Online player</button>
        <a class="btn btn--ghost btn--sm" id="watch" target="_blank" rel="noopener" style="display:none">▶ Watch online</a>
        <span class="srcbar__hint" id="hint2">Load a copy of the video for real seeking — it plays offline, synced with your notes.</span>
      </div>
      <input type="file" id="file" accept="video/*" hidden>

      <div class="timerow">
        <span id="cur">0:00</span>
        <div class="timeline" id="tl">
          <div class="track"><div class="fill" id="fill"></div></div>
          <div id="marks"></div>
        </div>
        <span id="dur">0:00</span>
      </div>

      ${routes.length ? `
      <details class="get"${embeddedVideo ? '' : ' open'}>
        <summary>📥 How to get the video file for offline playback</summary>
        <div class="routes">
          ${routes.map((r, i) => `
          <div class="route">
            <h4>${r.icon} ${sanitizeHTML(r.title)}</h4>
            <p>${sanitizeHTML(r.body)}</p>
            ${r.command ? `<div class="cmd"><code id="cmd${i}">${sanitizeHTML(r.command)}</code><button class="btn btn--ghost btn--sm" data-copy="cmd${i}">Copy</button></div>` : ''}
            ${r.link ? `<a class="btn btn--ghost btn--sm" style="margin-top:0.5rem;" href="${r.link}" target="_blank" rel="noopener">${sanitizeHTML(r.linkLabel)}</a>` : ''}
          </div>`).join('')}
          <p class="warn">Only download videos you have the right to save — your own uploads, Creative-Commons content, or where the platform's terms allow offline copies. Respect creators and local law.</p>
        </div>
      </details>` : ''}
    </div>

    <div class="stats">
      <div class="stat"><b id="sc">0</b><span>Comments</span></div>
      <div class="stat"><b id="sr">0</b><span>Reactions</span></div>
      <div class="stat"><b id="sd">0:00</b><span>Duration</span></div>
    </div>
  </div>

  <div class="panel">
    <h2>Comments &amp; Reactions</h2>
    <div class="tools">
      <input type="search" id="q" placeholder="Search notes...">
      <button class="chip on" data-f="all">All</button>
      <button class="chip" data-f="comment">💬</button>
      <button class="chip" data-f="reaction">⚡</button>
    </div>
    <div class="list" id="list"></div>
    <details id="tbox" style="display:none;margin-top:1rem;">
      <summary style="cursor:pointer;font-weight:600;font-size:0.85rem;">📝 Transcript (<span id="tc">0</span> lines)</summary>
      <div class="list" style="margin-top:0.6rem;max-height:35vh;" id="tlist"></div>
    </details>
  </div>
</div>

<footer>
  <p>Exported from <strong>Vidlens</strong> — <a href="https://vidlens.net/" target="_blank" rel="noopener">vidlens.net</a></p>
  <p style="margin-top:0.3rem;">Click any timestamp to jump · Space play/pause · ← → seek 5s (when a video file is loaded)</p>
</footer>

<div class="toast" id="toast"></div>

<script>
var R = ${json};
var EMBEDDED = ${embeddedVideo ? 'true' : 'false'};
var video = null, ready = false, filter = 'all', query = '';

function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  s = Math.floor(s);
  var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  var p = function (n) { return (n < 10 ? '0' : '') + n; };
  return h > 0 ? h + ':' + p(m) + ':' + p(x) : m + ':' + p(x);
}
function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function toast(m) {
  var el = document.getElementById('toast');
  el.textContent = m; el.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
}

// ---------- header ----------
document.getElementById('title').textContent = R.title;
document.title = R.title + ' — Vidlens report';
var bits = ['<span>📺 ' + esc(R.providerName) + '</span>'];
if (R.author) bits.push('<span>👤 ' + esc(R.author) + '</span>');
bits.push('<span>📅 ' + new Date(R.exportDate).toLocaleDateString() + '</span>');
bits.push('<span>💬 ' + R.comments.length + ' notes</span>');
bits.push('<span class="badge-offline">● Notes readable offline</span>');
document.getElementById('meta').innerHTML = bits.join('');
document.getElementById('sc').textContent = R.comments.filter(function (c) { return c.type === 'comment'; }).length;
document.getElementById('sr').textContent = R.comments.filter(function (c) { return c.type === 'reaction'; }).length;
document.getElementById('sd').textContent = fmt(R.duration);
document.getElementById('dur').textContent = fmt(R.duration);
if (R.watchUrl) { var w = document.getElementById('watch'); w.href = R.watchUrl; w.style.display = ''; }

// ---------- player ----------
var stage = document.getElementById('stage');

function attach(v) {
  video = v; ready = false;
  v.addEventListener('loadedmetadata', function () {
    ready = true;
    if (v.duration && isFinite(v.duration)) {
      R.duration = v.duration;
      document.getElementById('dur').textContent = fmt(v.duration);
      document.getElementById('sd').textContent = fmt(v.duration);
      marks();
    }
  });
  v.addEventListener('timeupdate', tick);
}

// Platforms refuse to embed when the page is opened straight from disk
// (file:// has a null origin — YouTube answers "Error 153"), so show a
// poster card with real actions instead of a broken player.
var IS_FILE = location.protocol === 'file:';

function showEmbed() {
  if (!R.embedUrl) { showNoVideo(); return; }

  if (IS_FILE) { showPoster(); return; }

  stage.className = 'stage' + (R.provider === 'tiktok' || R.provider === 'instagram' || R.provider === 'youtube_shorts' ? ' vertical' : '');
  stage.innerHTML = '<iframe src="' + R.embedUrl + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  video = null; ready = false;
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('hint2').textContent = 'Online player. Load a video file for real seeking and offline playback.';
}

function showPoster() {
  stage.className = 'stage';
  video = null; ready = false;
  var thumb = R.thumb ? '<img src="' + R.thumb + '" alt="" style="width:100%;display:block;opacity:.45;">' : '';
  stage.innerHTML =
    '<div style="position:relative;min-height:220px;background:#000;">' + thumb +
    '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:1.5rem;gap:0.8rem;">' +
      '<div style="font-size:2.4rem;">🎬</div>' +
      '<p style="font-size:0.92rem;font-weight:600;">' + esc(R.providerName) + ' does not allow playback inside a file opened from your computer.</p>' +
      '<p style="font-size:0.78rem;color:var(--muted);max-width:420px;">Load your copy of the video below for full offline playback with synced notes — or watch it online.</p>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;justify-content:center;">' +
        '<button class="btn" id="posterLoad">📂 Load video file</button>' +
        (R.watchUrl ? '<a class="btn btn--ghost" href="' + R.watchUrl + '" target="_blank" rel="noopener">▶ Watch online</a>' : '') +
      '</div>' +
    '</div></div>';
  var pl = document.getElementById('posterLoad');
  if (pl) pl.addEventListener('click', function () { document.getElementById('file').click(); });
  document.getElementById('backBtn').style.display = 'none';
  document.getElementById('hint2').textContent = 'Opened from your computer — load the video file to play it here.';
}

function showNoVideo() {
  stage.className = 'stage';
  stage.innerHTML = '<div style="padding:2.5rem 1rem;text-align:center;color:var(--muted);font-size:0.9rem;">No video attached.<br>Use <strong>Load video file</strong> or drop a file anywhere on this page.</div>';
  video = null; ready = false;
}

function useFile(file) {
  if (file.type && file.type.indexOf('video/') !== 0) { toast('That is not a video file'); return; }
  var url = URL.createObjectURL(file);
  DL_SRC = url;
  pickedName = file.name;
  playSrc(url, file.type);
  toast('Playing: ' + file.name);
}

function playSrc(src, type) {
  stage.className = 'stage';
  stage.innerHTML = '';
  var v = document.createElement('video');
  v.controls = true; v.playsInline = true; v.preload = 'metadata';
  v.src = src;
  if (type) v.type = type;
  v.addEventListener('error', function () { toast('Could not play that video source'); });
  stage.appendChild(v);
  attach(v);
  if (R.embedUrl) document.getElementById('backBtn').style.display = '';
  document.getElementById('hint2').textContent = 'Playing your local copy — timestamps seek for real.';
}

// Download: a real file download whenever a file source exists, otherwise
// open the "how to get it" routes (a static page cannot pull a protected
// platform stream — no server, and the stream URLs are ciphered).
var DL_SRC = ${embeddedVideo ? JSON.stringify(embeddedVideo.dataUrl) : 'null'};
var pickedName = null;

function safeName(ext) {
  return (R.title || 'video').replace(/[^\\w\\s.-]/g, '').replace(/\\s+/g, '_').substring(0, 80) + (ext || '.mp4');
}

function triggerDownload(href, name) {
  var a = document.createElement('a');
  a.href = href; a.download = name; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}

document.getElementById('dlBtn').addEventListener('click', function () {
  if (DL_SRC) {
    triggerDownload(DL_SRC, pickedName || safeName('.mp4'));
    toast('Downloading the video file...');
    return;
  }
  if (R.directUrl) {
    triggerDownload(R.directUrl, safeName('.mp4'));
    toast('Downloading from the direct URL...');
    return;
  }
  if (R.watchUrl && !IS_FILE) {
    openDownloader();
    return;
  }
  var box = document.querySelector('details.get');
  if (box) {
    box.open = true;
    box.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (R.watchUrl && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(R.watchUrl).then(function () {
        toast('Video URL copied — pick a download route below');
      }, function () { toast('Pick a download route below'); });
    } else { toast('Pick a download route below'); }
  } else {
    toast('No downloadable source for this video');
  }
});

// Embedded downloader, same as on vidlens.net. Browsers block third-party
// frames from file:// pages, so there we fall back to the routes panel.
function openDownloader() {
  var back = document.createElement('div');
  back.className = 'dlmodal';
  back.innerHTML =
    '<div class="dlmodal__box">' +
      '<div class="dlmodal__head">' +
        '<strong>⬇ Download the video</strong>' +
        '<button class="btn btn--ghost btn--sm" id="dlmClose">Close</button>' +
      '</div>' +
      '<p class="dlmodal__hint">Link copied — paste it below (Ctrl+V), download, then use <em>Load video file</em> to play it here with your notes.</p>' +
      '<div class="cmd"><code id="dlmUrl"></code><button class="btn btn--ghost btn--sm" id="dlmCopy">Copy</button></div>' +
      '<iframe class="dlmodal__frame" src="https://cobalt.tools/" allow="clipboard-read; clipboard-write; downloads" referrerpolicy="no-referrer" title="Video downloader"></iframe>' +
      '<p class="dlmodal__credit">Embedded: <a href="https://cobalt.tools/" target="_blank" rel="noopener">cobalt.tools</a>, a free open-source third-party service. Only download videos you have the right to save.</p>' +
      '<div style="margin-top:0.6rem;"><button class="btn" id="dlmLoad">📂 I downloaded it — load the file</button></div>' +
    '</div>';
  document.body.appendChild(back);
  document.getElementById('dlmUrl').textContent = R.watchUrl;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(R.watchUrl).then(function () { toast('Link copied — paste it in the downloader'); }, function () {});
  }
  document.getElementById('dlmCopy').addEventListener('click', function () {
    if (navigator.clipboard) navigator.clipboard.writeText(R.watchUrl).then(function () { toast('Link copied'); }, function () {});
  });
  document.getElementById('dlmLoad').addEventListener('click', function () {
    document.getElementById('file').click();
  });
  var close = function () { back.remove(); };
  document.getElementById('dlmClose').addEventListener('click', close);
  back.addEventListener('click', function (e) { if (e.target === back) close(); });
}

document.getElementById('pick').addEventListener('click', function () { document.getElementById('file').click(); });
document.getElementById('file').addEventListener('change', function (e) {
  var f = e.target.files && e.target.files[0];
  if (f) useFile(f);
});
document.getElementById('urlBtn').addEventListener('click', function () {
  var u = prompt('Paste a direct video URL (.mp4, .webm ...):', R.directUrl || '');
  if (u) { R.directUrl = u.trim(); playSrc(R.directUrl, ''); }
});
document.getElementById('backBtn').addEventListener('click', showEmbed);

// drag & drop anywhere
['dragenter', 'dragover'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { e.preventDefault(); document.body.classList.add('drag'); });
});
['dragleave', 'dragend'].forEach(function (ev) {
  document.addEventListener(ev, function (e) { if (e.relatedTarget === null) document.body.classList.remove('drag'); });
});
document.addEventListener('drop', function (e) {
  e.preventDefault(); document.body.classList.remove('drag');
  var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) useFile(f);
});

// copy buttons for commands
Array.prototype.forEach.call(document.querySelectorAll('[data-copy]'), function (b) {
  b.addEventListener('click', function () {
    var el = document.getElementById(b.getAttribute('data-copy'));
    if (!el) return;
    var t = el.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { toast('Command copied'); }, function () { fallbackCopy(t); });
    } else { fallbackCopy(t); }
  });
});
function fallbackCopy(t) {
  var ta = document.createElement('textarea');
  ta.value = t; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); toast('Command copied'); } catch (e) { toast('Copy failed — select it manually'); }
  ta.remove();
}

// ---------- seeking ----------
function seek(t) {
  if (ready && video) {
    video.currentTime = t;
    video.play().catch(function () {});
    if (window.innerWidth <= 950) video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  if (R.seekTemplate) {
    var f = stage.querySelector('iframe');
    if (f) { f.src = R.seekTemplate.replace('{s}', Math.floor(t)); return; }
  }
  if (R.watchUrl) {
    var sep = R.watchUrl.indexOf('?') === -1 ? '?' : '&';
    var u = (R.provider === 'youtube' || R.provider === 'youtube_shorts') ? R.watchUrl + sep + 't=' + Math.floor(t) + 's'
          : (R.provider === 'vimeo' ? R.watchUrl + '#t=' + Math.floor(t) + 's' : R.watchUrl);
    window.open(u, '_blank', 'noopener');
    return;
  }
  toast('Load the video file to jump to ' + fmt(t));
}

function marks() {
  var wrap = document.getElementById('marks');
  wrap.innerHTML = '';
  var d = R.duration || 1;
  R.comments.forEach(function (c) {
    var m = document.createElement('div');
    m.className = 'marker ' + c.type;
    m.style.left = Math.min((c.timestamp / d) * 100, 100) + '%';
    m.title = '[' + c.time + '] ' + c.text.substring(0, 60);
    m.addEventListener('click', function (e) { e.stopPropagation(); seek(c.timestamp); });
    wrap.appendChild(m);
  });
}
document.getElementById('tl').addEventListener('click', function (e) {
  if (e.target.className.indexOf('marker') !== -1) return;
  var r = this.getBoundingClientRect();
  seek(((e.clientX - r.left) / r.width) * (R.duration || 0));
});

function tick() {
  if (!video) return;
  var t = video.currentTime;
  document.getElementById('cur').textContent = fmt(t);
  document.getElementById('fill').style.width = Math.min((t / (R.duration || 1)) * 100, 100) + '%';
  Array.prototype.forEach.call(document.querySelectorAll('#list .item'), function (row) {
    var rt = parseFloat(row.getAttribute('data-t'));
    if (t >= rt && t < rt + 4) row.classList.add('active'); else row.classList.remove('active');
  });
}

// ---------- notes ----------
function render() {
  var box = document.getElementById('list');
  box.innerHTML = '';
  var q = query.toLowerCase(), n = 0;
  R.comments.slice().sort(function (a, b) { return a.timestamp - b.timestamp; }).forEach(function (c) {
    if (filter !== 'all' && c.type !== filter) return;
    if (q && c.text.toLowerCase().indexOf(q) === -1 && c.time.indexOf(q) === -1) return;
    n++;
    var row = document.createElement('div');
    row.className = 'item' + (c.type === 'reaction' ? ' reaction' : '');
    row.setAttribute('data-t', c.timestamp);
    row.innerHTML = '<button class="ts">[' + c.time + ']</button><span class="txt">' +
      (c.emoji ? '<span class="emo">' + c.emoji + '</span>' : '') + esc(c.text) +
      (c.voiceData ? '<audio class="voice" controls preload="none" src="' + c.voiceData + '"></audio>' : '') +
      '</span>';
    row.addEventListener('click', function () { seek(c.timestamp); });
    box.appendChild(row);
  });
  if (!n) box.innerHTML = '<div class="empty">No notes match.</div>';
}
document.getElementById('q').addEventListener('input', function (e) { query = e.target.value; render(); });
Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
  c.addEventListener('click', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (x) { x.classList.remove('on'); });
    c.classList.add('on'); filter = c.getAttribute('data-f'); render();
  });
});

if (R.transcript.length) {
  document.getElementById('tbox').style.display = '';
  document.getElementById('tc').textContent = R.transcript.length;
  var tl = document.getElementById('tlist');
  R.transcript.forEach(function (line) {
    var el = document.createElement('div');
    el.className = 'tline';
    el.innerHTML = '<span class="ts">[' + fmt(line.timestamp) + ']</span><span>' + esc(line.text) + '</span>';
    el.addEventListener('click', function () { seek(line.timestamp); });
    tl.appendChild(el);
  });
}

document.addEventListener('keydown', function (e) {
  var tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || !ready || !video) return;
  if (e.code === 'Space') { e.preventDefault(); video.paused ? video.play() : video.pause(); }
  else if (e.key === 'ArrowRight') { video.currentTime = Math.min(video.currentTime + 5, video.duration || 1e9); }
  else if (e.key === 'ArrowLeft') { video.currentTime = Math.max(video.currentTime - 5, 0); }
});

// ---------- boot ----------
${embeddedVideo ? `(function () {
  var v = document.createElement('video');
  v.controls = true; v.playsInline = true; v.preload = 'metadata';
  v.src = ${JSON.stringify(embeddedVideo.dataUrl)};
  stage.appendChild(v);
  attach(v);
  document.getElementById('hint2').textContent = 'The video is embedded in this file — it plays offline.';
})();` : 'showEmbed();'}
marks();
render();
</script>
</body>
</html>`;
}

async function exportHTML() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments included — exporting metadata only', 'info');
  }

  const isLocalVideo = state.currentProvider === 'upload' && state.uploadedVideo;

  // Voice notes ride along inside the file, so the report stays self-contained
  await inlineVoiceNotes();

  // Inline the poster so the report still looks right with no network
  let thumbDataUrl = null;
  if (!isLocalVideo) {
    try {
      const thumb = await fetchThumbnailForPack();
      if (thumb) thumbDataUrl = await fileToBase64(thumb.blob);
    } catch {
      // no thumbnail — the report falls back to a plain poster card
    }
  }

  if (isLocalVideo) {
    if (state.uploadedVideo.size > CONFIG.EMBED_VIDEO_LIMIT) {
      showToast(`Video too large to embed in one HTML file (max ${formatFileSize(CONFIG.EMBED_VIDEO_LIMIT)}). Exporting the report — load the file in it, or use the Offline Pack (ZIP).`, 'warning');
      downloadFile(generateReportHTML(null, thumbDataUrl), `${state.videoTitle}_report.html`, 'text/html');
      return;
    }

    showToast('Embedding video into the HTML file...', 'info');
    try {
      const dataUrl = await fileToBase64(state.uploadedVideo);
      const html = generateReportHTML({ dataUrl, type: state.uploadedVideo.type });
      downloadFile(html, `${state.videoTitle}_report.html`, 'text/html');
      showToast('HTML report exported with the video inside!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export: ' + error.message, 'error');
    }
    return;
  }

  downloadFile(generateReportHTML(null, thumbDataUrl), `${state.videoTitle}_report.html`, 'text/html');
  showToast('HTML report exported!', 'success');
}

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

// Try to download a direct video URL into memory (works when the host allows CORS)
async function fetchDirectVideoBlob(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    if (blob.size === 0) return null;
    return { blob, ext: getUrlVideoExtension(url) || 'mp4' };
  } catch {
    return null;
  }
}

// Best-effort thumbnail download for platform videos (silent on CORS failure)
async function fetchThumbnailForPack() {
  const candidates = [];
  if (state.videoThumbnail) candidates.push(state.videoThumbnail);
  if (state.currentProvider === 'youtube' || state.currentProvider === 'youtube_shorts') {
    candidates.push(`https://i.ytimg.com/vi/${state.currentVideoId}/maxresdefault.jpg`);
    candidates.push(`https://i.ytimg.com/vi/${state.currentVideoId}/hqdefault.jpg`);
  }

  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const blob = await response.blob();
      if (blob.size < 1024) continue; // skip placeholder images
      const type = blob.type || 'image/jpeg';
      const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
      return { blob, filename: `thumbnail.${ext}` };
    } catch {
      // CORS blocked or offline — try the next candidate
    }
  }
  return null;
}

// Downloading a platform video from a static page needs an API that will
// resolve the stream. Public ones are gone (the main cobalt instance
// disabled YouTube; community instances are dead or JWT-gated), so the
// reliable path is the user's own instance — then it is genuinely one click.
const DOWNLOADER_URL = 'https://cobalt.tools/';
const DOWNLOADER_API_KEY = 'vidlens_downloader_api';

function getDownloaderApi() {
  try {
    return localStorage.getItem(DOWNLOADER_API_KEY) || '';
  } catch {
    return '';
  }
}

function setDownloaderApi(url) {
  try {
    url ? localStorage.setItem(DOWNLOADER_API_KEY, url) : localStorage.removeItem(DOWNLOADER_API_KEY);
  } catch {}
}

// Ask the configured instance for a stream URL, then pull the bytes here.
async function fetchViaOwnApi(videoUrl, quality, onProgress) {
  const api = getDownloaderApi();
  if (!api) throw new Error('No downloader API configured');

  onProgress?.('Asking your instance to resolve the video...');
  const response = await fetch(api.replace(/\/+$/, '') + '/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ url: videoUrl, videoQuality: quality, filenameStyle: 'basic' }),
  });

  const data = await response.json().catch(() => ({}));

  if (data.status === 'error') {
    throw new Error(data.error?.code || 'the instance refused this link');
  }
  if (data.status === 'picker') {
    throw new Error('this link returns multiple items — not supported yet');
  }

  const fileUrl = data.url;
  if (!fileUrl) throw new Error('the instance returned no file URL');

  onProgress?.('Downloading the video...');
  const fileResponse = await fetch(fileUrl);
  if (!fileResponse.ok) throw new Error(`download failed (HTTP ${fileResponse.status})`);

  const total = Number(fileResponse.headers.get('content-length')) || 0;
  const reader = fileResponse.body?.getReader();
  const chunks = [];
  let received = 0;

  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress?.(total
        ? `Downloading... ${Math.round((received / total) * 100)}% (${formatFileSize(received)})`
        : `Downloading... ${formatFileSize(received)}`);
    }
  } else {
    chunks.push(new Uint8Array(await fileResponse.arrayBuffer()));
  }

  const blob = new Blob(chunks, { type: 'video/mp4' });
  const name = (data.filename || `${sanitizeFileName(state.videoTitle) || 'video'}.mp4`).replace(/[\\/:*?"<>|]/g, '_');
  return new File([blob], name, { type: 'video/mp4' });
}

function showDownloaderModal(videoUrl, onFile) {
  $('#downloaderModal')?.remove();

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'downloaderModal';
  modal.innerHTML = `
    <div class="modal modal--wide" role="dialog" aria-modal="true" aria-labelledby="dlModalTitle">
      <div class="modal__header">
        <div class="modal__title-wrapper">
          <span class="modal__emoji">⬇</span>
          <h3 class="modal__title" id="dlModalTitle">Download the video</h3>
        </div>
        <button class="modal__close" id="dlClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body modal__body--flush">
        <div class="dl-url">
          <input type="text" id="dlUrlField" readonly value="${sanitizeHTML(videoUrl)}">
          <button class="btn btn--ghost btn--sm" id="dlCopy">Copy link</button>
        </div>

        <!-- 1. One click, when an instance is connected -->
        <div class="dl-card dl-card--primary">
          <h4>⚡ One-click download <span class="sub-badge" id="dlApiState">${getDownloaderApi() ? 'connected' : 'needs setup'}</span></h4>
          <p>Vidlens has no server, so it borrows one: connect a <strong>downloader API</strong> (your own
          <a href="https://github.com/imputnet/cobalt/blob/main/docs/run-an-instance.md" target="_blank" rel="noopener">cobalt instance</a>
          — free to self-host) and the video is fetched, saved and attached here in a single click.
          <a href="self-host.html" target="_blank">Setup guide →</a></p>
          <div class="dl-api-row">
            <input type="url" id="dlApiField" placeholder="https://your-instance.example.com" value="${sanitizeHTML(getDownloaderApi())}">
            <select id="dlQuality" title="Preferred quality">
              <option value="1080">1080p</option>
              <option value="720" selected>720p</option>
              <option value="480">480p</option>
              <option value="max">Best</option>
            </select>
            <button class="btn btn--primary btn--sm" id="dlFetchNow">Download &amp; attach</button>
          </div>
          <div class="sub-progress" id="dlApiProgress" hidden>
            <p class="sub-stage" id="dlApiStage"></p>
            <div class="sub-bar"><div class="sub-bar__fill sub-bar__fill--indeterminate" style="width:100%"></div></div>
          </div>
        </div>

        <!-- 2. Manual route, embedded when the provider allows it -->
        <details class="dl-card" id="dlManual" ${getDownloaderApi() ? '' : 'open'}>
          <summary>🌐 Or use a public downloader (manual)</summary>
          <div class="dl-steps">
            <span class="dl-step"><b>1</b> Link copied — paste it below (<kbd>Ctrl</kbd>+<kbd>V</kbd>)</span>
            <span class="dl-step"><b>2</b> Download</span>
            <span class="dl-step"><b>3</b> Attach it here 👇</span>
          </div>
          <p class="dl-note">Heads-up: the embedded instance below <strong>no longer supports YouTube</strong>
          (it still handles TikTok, Instagram, Twitter/X, Vimeo and others). For YouTube use the one-click
          option above, or one of these in a new tab:
          <a href="https://cobalt.canine.tools/" target="_blank" rel="noopener">cobalt.canine.tools</a> ·
          <a href="https://github.com/yt-dlp/yt-dlp#installation" target="_blank" rel="noopener">yt-dlp</a>.</p>
          <div class="dl-frame-wrap">
            <iframe id="dlFrame" class="dl-frame" src="${DOWNLOADER_URL}"
              allow="clipboard-read; clipboard-write; downloads"
              referrerpolicy="no-referrer"
              title="Video downloader"></iframe>
            <div class="dl-frame-fallback" id="dlFallback" hidden>
              <p>The embedded downloader could not load here.</p>
              <a class="btn btn--primary btn--sm" href="${DOWNLOADER_URL}" target="_blank" rel="noopener">Open it in a new tab</a>
            </div>
          </div>
          <p class="dl-credit">
            Embedded: <a href="${DOWNLOADER_URL}" target="_blank" rel="noopener">cobalt.tools</a> —
            a free, open-source third-party service. Vidlens never sees your video.
            Only download videos you have the right to save.
          </p>
        </details>
      </div>
      <div class="modal__footer">
        <button class="btn btn--ghost" id="dlDone">Close</button>
        <button class="btn btn--primary" id="dlAttach">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>Attach downloaded file</span>
        </button>
      </div>
      <input type="file" id="dlAttachInput" accept="video/*" hidden>
    </div>
  `;
  document.body.appendChild(modal);
  document.body.style.overflow = 'hidden';

  const close = () => {
    modal.remove();
    document.body.style.overflow = '';
  };

  // Pre-copy the link so pasting is the only thing left to do
  navigator.clipboard?.writeText(videoUrl).then(
    () => showToast('Link copied — paste it in the downloader', 'success'),
    () => showToast('Copy the link above, then paste it in the downloader', 'info')
  );

  modal.querySelector('#dlCopy').addEventListener('click', async () => {
    const field = modal.querySelector('#dlUrlField');
    field.select();
    try {
      await navigator.clipboard.writeText(videoUrl);
      showToast('Link copied', 'success');
    } catch {
      showToast('Press Ctrl+C to copy', 'info');
    }
  });

  // One-click path via the user's own instance
  modal.querySelector('#dlFetchNow').addEventListener('click', async () => {
    const apiField = modal.querySelector('#dlApiField');
    const api = apiField.value.trim();
    if (!api) {
      apiField.focus();
      showToast('Add your downloader API URL first — see the setup guide', 'info');
      return;
    }

    setDownloaderApi(api);
    const btn = modal.querySelector('#dlFetchNow');
    const progress = modal.querySelector('#dlApiProgress');
    const stage = modal.querySelector('#dlApiStage');
    btn.disabled = true;
    progress.hidden = false;

    try {
      const file = await fetchViaOwnApi(
        videoUrl,
        modal.querySelector('#dlQuality').value,
        (t) => { stage.textContent = t; }
      );
      downloadBlob(file, file.name);   // save a copy for the user
      close();
      showToast(`Downloaded "${file.name}" (${formatFileSize(file.size)}) and attached it`, 'success');
      onFile?.(file);
    } catch (error) {
      console.error('One-click download failed:', error);
      showToast(`Could not download: ${error.message}`, 'error');
      btn.disabled = false;
      progress.hidden = true;
      modal.querySelector('#dlManual').open = true;
    }
  });

  // If the third-party page refuses to render, fall back to a new tab
  const frame = modal.querySelector('#dlFrame');
  let loaded = false;
  frame.addEventListener('load', () => { loaded = true; });
  setTimeout(() => {
    if (!loaded) {
      frame.hidden = true;
      modal.querySelector('#dlFallback').hidden = false;
    }
  }, 9000);

  modal.querySelector('#dlAttach').addEventListener('click', () => {
    modal.querySelector('#dlAttachInput').click();
  });
  modal.querySelector('#dlAttachInput').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      showToast('Please choose a video file', 'error');
      return;
    }
    close();
    onFile?.(file);
  });

  modal.querySelector('#dlClose').addEventListener('click', close);
  modal.querySelector('#dlDone').addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) close();
  });
}

// For platform videos (whose streams a browser cannot download), offer to
// bundle a local copy of the video the user already has into the pack.
function askForPackVideo() {
  return new Promise((resolve) => {
    $('#packVideoModal')?.remove();

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'packVideoModal';
    modal.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal__header">
          <div class="modal__title-wrapper">
            <span class="modal__emoji">📦</span>
            <h3 class="modal__title">Include the video file?</h3>
          </div>
          <button class="modal__close" id="packVideoClose" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="modal__body">
          <p style="margin-bottom:0.75rem;">To get the <strong>actual video (MP4)</strong> inside your Offline Pack, pick a copy from your computer — it will play fully offline, synced with all your comments.</p>
          <p style="color:var(--color-text-muted);font-size:0.85rem;margin-bottom:1rem;">Streaming platforms don't let web apps grab their video streams directly. Get a copy first, then attach it here:</p>
          <div class="pack-video-steps">
            <div class="pack-video-step">
              <span class="pack-video-step__num">1</span>
              <div>
                <strong>Don't have the file yet? Pick a route:</strong>
                <p><strong>✅ Official</strong> — the platform's own download / offline feature (best option).</p>
                <p><strong>⌨️ yt-dlp</strong> — a local open-source tool, no website involved:</p>
                <div class="pack-video-cmd">
                  <code id="packYtdlp">${sanitizeHTML(`yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "video.mp4" "${state.originalVideoUrl || getVideoWatchUrl() || ''}"`)}</code>
                  <button class="btn btn--ghost btn--sm" id="packCopyCmd">Copy</button>
                </div>
                <p style="margin-top:0.5rem;"><strong>🌐 Downloader site</strong> — if you'd rather not install anything:</p>
                <button class="btn btn--secondary btn--sm" id="packVideoDownloader">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Open cobalt.tools</span>
                </button>
              </div>
            </div>
            <div class="pack-video-step">
              <span class="pack-video-step__num">2</span>
              <div>
                <strong>Attach the file</strong>
                <p>It goes straight into the ZIP and plays offline in the pack's viewer.</p>
              </div>
            </div>
          </div>
          <p style="color:var(--color-text-muted);font-size:0.78rem;margin-top:0.75rem;">Only download content you have the right to save (your own uploads, Creative Commons, or where the platform permits it). You can also skip and drop a <code>video.mp4</code> next to <code>viewer.html</code> later.</p>
        </div>
        <div class="modal__footer">
          <button class="btn btn--ghost" id="packVideoSkip">Skip — pack without video</button>
          <button class="btn btn--primary" id="packVideoChoose">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <span>Attach video file</span>
          </button>
        </div>
        <input type="file" id="packVideoInput" accept="video/*" hidden>
      </div>
    `;
    document.body.appendChild(modal);

    const finish = (file) => {
      modal.remove();
      resolve(file);
    };

    modal.querySelector('#packVideoChoose').addEventListener('click', () => {
      modal.querySelector('#packVideoInput').click();
    });
    modal.querySelector('#packCopyCmd')?.addEventListener('click', async () => {
      const cmd = modal.querySelector('#packYtdlp')?.textContent || '';
      try {
        await navigator.clipboard.writeText(cmd);
        showToast('yt-dlp command copied — run it in a terminal', 'success');
      } catch {
        showToast('Select the command and copy it manually', 'info');
      }
    });
    modal.querySelector('#packVideoDownloader')?.addEventListener('click', () => {
      const url = state.originalVideoUrl || getVideoWatchUrl() || '';
      // Downloading and attaching happen in one flow, without leaving the page
      showDownloaderModal(url, (file) => finish(file));
    });
    modal.querySelector('#packVideoInput').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('video/')) {
        finish(file);
      } else if (file) {
        showToast('Please choose a video file', 'error');
      }
    });
    modal.querySelector('#packVideoSkip').addEventListener('click', () => finish(null));
    modal.querySelector('#packVideoClose').addEventListener('click', () => finish(null));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) finish(null);
    });
  });
}

async function exportZIP() {
  const data = getCommentsData();
  const hasTranscript = transcriptionState.transcript.length > 0;
  const isLocalVideo = state.currentProvider === 'upload' && state.uploadedVideo;
  const isDirectVideo = state.currentProvider === 'direct' && state.originalVideoUrl;

  if (typeof JSZip === 'undefined') {
    showToast('ZIP library not loaded. Please refresh the page.', 'error');
    return;
  }

  showToast('Building your Offline Pack...', 'info');

  try {
    const zip = new JSZip();
    const folderName = sanitizeFileName(state.videoTitle.replace(/\.(mp4|webm|ogv|ogg|mov|m4v|mkv|avi)$/i, '')) || 'reactvid_export';
    const folder = zip.folder(folderName);

    let videoFileName = null;
    let videoIncluded = false;
    let thumbnailFile = null;

    if (isLocalVideo) {
      videoFileName = sanitizeFileName(state.uploadedVideo.name) || 'video.mp4';
      // Video is already compressed — STORE it instead of re-deflating
      folder.file(videoFileName, state.uploadedVideo, { compression: 'STORE' });
      videoIncluded = true;
    } else if (isDirectVideo) {
      showToast('Downloading the video into the pack — this can take a while...', 'info');
      const result = await fetchDirectVideoBlob(state.originalVideoUrl);
      if (result) {
        videoFileName = `video.${result.ext}`;
        folder.file(videoFileName, result.blob, { compression: 'STORE' });
        videoIncluded = true;
      } else {
        showToast('The video host blocks direct downloads — pack will include everything else.', 'warning');
      }
    } else {
      // Platform video (YouTube & co.): browsers can't fetch their streams,
      // so bundle the copy grabbed via the downloader, or ask for one.
      const localCopy = state.packVideoFile || await askForPackVideo();
      if (localCopy) {
        const ext = (localCopy.name.split('.').pop() || 'mp4').toLowerCase();
        videoFileName = `video.${DIRECT_VIDEO_EXTENSIONS.includes(ext) ? ext : 'mp4'}`;
        folder.file(videoFileName, localCopy, { compression: 'STORE' });
        videoIncluded = true;
        showToast(`Video "${localCopy.name}" added to the pack`, 'success');
      }

      // Grab the thumbnail for the offline viewer when possible
      thumbnailFile = await fetchThumbnailForPack();
      if (thumbnailFile) {
        folder.file(thumbnailFile.filename, thumbnailFile.blob, { compression: 'STORE' });
      }
    }

    // Voice notes: the recordings travel with the pack
    const voiceItems = data.filter(d => d.voice && d.id);
    if (voiceItems.length) {
      showToast(`Adding ${voiceItems.length} voice note${voiceItems.length > 1 ? 's' : ''}…`, 'info');
      for (const item of voiceItems) {
        const blob = await loadVoiceClip(item.id);
        if (!blob) continue;
        const ext = (item.voice.mime || '').includes('mp4') ? 'm4a' : (item.voice.mime || '').includes('ogg') ? 'ogg' : 'webm';
        item.voiceFile = `voice/${item.id}.${ext}`;
        folder.file(item.voiceFile, blob, { compression: 'STORE' });
      }
    }

    // Interactive offline viewer
    folder.file('viewer.html', generateOfflineViewerHTML({
      videoFileName,
      videoIncluded,
      thumbnailFileName: thumbnailFile ? thumbnailFile.filename : null,
    }));

    // Machine-readable data
    const jsonData = {
      video: {
        title: state.videoTitle,
        author: state.videoAuthor,
        provider: state.currentProvider,
        providerName: PROVIDER_NAMES[state.currentProvider],
        id: state.currentVideoId,
        url: state.originalVideoUrl || getVideoEmbedUrl(),
        watchUrl: getVideoWatchUrl() || null,
        duration: state.videoDuration,
        localFile: videoFileName,
        videoIncluded,
      },
      exportDate: new Date().toISOString(),
      exportVersion: '5.0.0',
      comments: data,
      transcript: transcriptionState.transcript,
      stats: {
        totalComments: data.filter(c => c.type === 'comment').length,
        totalReactions: data.filter(c => c.type === 'reaction').length,
        avgTimestamp: data.length > 0
          ? Math.floor(data.reduce((sum, c) => sum + c.timestamp, 0) / data.length)
          : 0,
      },
    };
    folder.file('data.json', JSON.stringify(jsonData, null, 2));

    if (data.length > 0) {
      // CSV
      let csv = 'timestamp,time,type,emoji,text\n';
      data.forEach(d => {
        csv += `${d.timestamp},"${d.time}","${d.type}","${d.emoji || ''}","${d.text.replace(/"/g, '""')}"\n`;
      });
      folder.file('comments.csv', csv);

      // Plain text
      let textContent = `Vidlens Offline Pack\n${'='.repeat(50)}\n\n`;
      textContent += `Video: ${state.videoTitle}\n`;
      if (state.videoAuthor) textContent += `Author: ${state.videoAuthor}\n`;
      textContent += `Platform: ${PROVIDER_NAMES[state.currentProvider]}\n`;
      textContent += `Duration: ${formatTime(state.videoDuration)}\n`;
      textContent += `Export Date: ${new Date().toLocaleString()}\n`;
      textContent += `Total Items: ${data.length}\n\n`;
      textContent += `${'='.repeat(50)}\n\nCOMMENTS & REACTIONS\n${'-'.repeat(50)}\n\n`;
      data.forEach(d => {
        textContent += `[${d.time}] ${d.type === 'reaction' ? d.emoji + ' ' : ''}${d.text}\n\n`;
      });
      folder.file('comments.txt', textContent);

      // Comments as SRT subtitles — drop onto the video in VLC/mpv
      folder.file('comments.srt', buildCommentsSRT(data));
    }

    // Transcript as SRT
    if (hasTranscript) {
      const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
      let srt = '';
      sorted.forEach((item, index) => {
        const line = (!captions.showOriginal && item.translated) ? item.translated : item.text;
        srt += `${index + 1}\n${formatSRTTime(item.start ?? item.timestamp)} --> ${formatSRTTime(item.end ?? item.timestamp + 3)}\n${line}\n\n`;
      });
      folder.file('transcript.srt', srt);
    }

    // README
    const watchUrl = getVideoWatchUrl();
    const readme = `# Vidlens Offline Pack

## ${state.videoTitle}
${state.videoAuthor ? `**Author:** ${state.videoAuthor}\n` : ''}
**Platform:** ${PROVIDER_NAMES[state.currentProvider]}
**Export Date:** ${new Date().toLocaleString()}
${watchUrl ? `**Watch online:** ${watchUrl}\n` : ''}
## Start here

Open **viewer.html** in any browser — it works completely offline and shows the
video (when available) side by side with every comment and reaction, synced to
playback.

## Files included

- \`viewer.html\` — interactive offline viewer (open this!)
${videoIncluded ? `- \`${videoFileName}\` — the video file\n` : ''}${thumbnailFile ? `- \`${thumbnailFile.filename}\` — video thumbnail\n` : ''}- \`data.json\` — complete data (comments, transcript, metadata)
${data.length > 0 ? '- `comments.csv` — spreadsheet format (Excel / Google Sheets)\n- `comments.txt` — plain text\n- `comments.srt` — your comments as subtitles: open the video in VLC and load this file to see your notes on top of the video\n' : ''}${hasTranscript ? '- `transcript.srt` — transcript in SRT format\n' : ''}${!videoIncluded && !isNativeVideoProvider() ? '- `GET-THE-VIDEO.md` — how to add the video for full offline playback\n' : ''}
## Statistics

- **Comments:** ${data.filter(c => c.type === 'comment').length}
- **Reactions:** ${data.filter(c => c.type === 'reaction').length}
- **Duration:** ${formatTime(state.videoDuration)}

---
*Exported with Vidlens — https://vidlens.net/*
`;
    folder.file('README.md', readme);

    // Honest guidance when the video itself couldn't be bundled
    if (!videoIncluded) {
      const getVideo = `# Adding the video for full offline playback

Web pages cannot download videos from streaming platforms like ${PROVIDER_NAMES[state.currentProvider]} —
their streams are protected and their terms of service restrict downloading.

If you have the right to an offline copy (it's your own upload, it's
Creative-Commons licensed, or the platform offers an official download /
offline feature), here is how to get the file:

- **Official routes:** the platform's download / offline feature
  (e.g. YouTube Premium offline, YouTube Studio for your own videos).
- **Open-source tools:** [cobalt.tools](https://cobalt.tools) (web, paste the
  URL) or [yt-dlp](https://github.com/yt-dlp/yt-dlp) (command line) can save a
  copy — use them only for content you have the right to download.

Then save the file **in this folder** named:

- \`video.mp4\` (or \`video.webm\`, \`video.m4v\`, \`video.mov\`)

Then reopen **viewer.html** — it detects the file automatically and plays it
with all your comments synced. You can also click "Load video file" inside the
viewer and pick a copy from anywhere on your computer.

Tip: \`comments.srt\` can be loaded as a subtitle track in VLC or mpv to see
your comments directly on top of the video.
${watchUrl ? `\nOriginal video: ${watchUrl}\n` : ''}`;
      folder.file('GET-THE-VIDEO.md', getVideo);
    }

    showToast('Compressing files...', 'info');
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
      streamFiles: true,
    });

    downloadBlob(content, `${folderName}_offline_pack.zip`);
    showToast('Offline Pack exported successfully!', 'success');

  } catch (error) {
    console.error('ZIP export error:', error);
    showToast('Failed to create Offline Pack: ' + error.message, 'error');
  }
}

// Self-contained offline viewer bundled inside the Offline Pack.
// No external requests: works from file:// with zero network access.
function generateOfflineViewerHTML({ videoFileName, videoIncluded, thumbnailFileName }) {
  const data = getCommentsData();
  const watchUrl = getVideoWatchUrl();

  const pack = {
    title: state.videoTitle,
    author: state.videoAuthor,
    provider: state.currentProvider,
    providerName: PROVIDER_NAMES[state.currentProvider],
    watchUrl: watchUrl || null,
    duration: state.videoDuration,
    exportDate: new Date().toISOString(),
    videoFile: videoFileName,
    videoIncluded,
    thumbnail: thumbnailFileName,
    comments: data,
    transcript: [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp),
  };

  const packJSON = JSON.stringify(pack).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${sanitizeHTML(state.videoTitle)} — Vidlens Offline Pack</title>
<style>
  :root {
    --primary: #6366f1; --primary-light: #818cf8; --secondary: #ec4899;
    --bg: #05050a; --surface: #0f0f1a; --surface-2: #151522; --surface-3: #1a1a2a;
    --text: #fff; --text-2: #a0a0b8; --muted: #5a5a70;
    --yellow: #fbbf24; --cyan: #22d3ee; --green: #10b981;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Segoe UI', system-ui, sans-serif;
    background: var(--bg); color: var(--text); line-height: 1.6;
    padding: 1.5rem; max-width: 1400px; margin: 0 auto;
  }
  header { text-align: center; margin-bottom: 1.5rem; }
  h1 {
    font-size: 1.75rem; margin-bottom: 0.5rem;
    background: linear-gradient(135deg, #6366f1, #ec4899);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .meta { color: var(--muted); font-size: 0.85rem; }
  .meta span { display: inline-block; padding: 0.25rem 0.75rem; background: var(--surface); border-radius: 20px; margin: 0.2rem; }
  .offline-badge { color: var(--green); border: 1px solid rgba(16,185,129,0.3); }
  .layout { display: grid; grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 1.5rem; align-items: start; }
  @media (max-width: 950px) { .layout { grid-template-columns: 1fr; } .player-col { position: static !important; } }
  .player-col { position: sticky; top: 1rem; }
  .player-box { background: var(--surface); border-radius: 16px; padding: 1rem; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
  .player-box video { width: 100%; max-height: 62vh; border-radius: 12px; background: #000; display: block; }
  .fallback { text-align: center; padding: 1.5rem 1rem; border: 2px dashed rgba(255,255,255,0.12); border-radius: 12px; }
  .fallback img { max-width: 100%; border-radius: 10px; margin-bottom: 1rem; opacity: 0.9; }
  .fallback h3 { margin-bottom: 0.5rem; font-size: 1.05rem; }
  .fallback p { color: var(--text-2); font-size: 0.85rem; margin-bottom: 1rem; }
  .fallback.dragover { border-color: var(--primary); background: rgba(99,102,241,0.08); }
  .btn {
    display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.6rem 1.25rem;
    background: linear-gradient(135deg, #6366f1, #ec4899); color: #fff; border: none;
    border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; text-decoration: none;
  }
  .btn:hover { opacity: 0.92; }
  .btn--ghost { background: var(--surface-2); border: 1px solid rgba(255,255,255,0.1); }
  .player-tools { display: flex; gap: 0.5rem; justify-content: center; margin-top: 0.75rem; flex-wrap: wrap; }
  .time-row { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.75rem; font-family: 'Consolas', monospace; font-size: 0.85rem; color: var(--text-2); }
  .timeline { flex: 1; position: relative; height: 26px; cursor: pointer; }
  .timeline-track { position: absolute; top: 50%; left: 0; right: 0; height: 6px; transform: translateY(-50%); background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
  .timeline-progress { height: 100%; width: 0; background: linear-gradient(90deg, var(--primary), var(--secondary)); }
  .marker { position: absolute; top: 50%; width: 10px; height: 10px; margin-left: -5px; transform: translateY(-50%); border-radius: 50%; cursor: pointer; z-index: 5; }
  .marker:hover { transform: translateY(-50%) scale(1.5); }
  .marker.reaction { background: var(--yellow); box-shadow: 0 0 8px rgba(251,191,36,0.5); }
  .marker.comment { background: var(--cyan); box-shadow: 0 0 8px rgba(34,211,238,0.5); }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-top: 1rem; }
  .stat { padding: 0.9rem; background: var(--surface); border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
  .stat-value { font-size: 1.4rem; font-weight: 700; background: linear-gradient(135deg, var(--primary), var(--secondary)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
  .stat-label { font-size: 0.7rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
  .panel { background: var(--surface); border-radius: 16px; padding: 1.25rem; box-shadow: 0 8px 32px rgba(0,0,0,0.4); }
  .panel h2 { font-size: 1.1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
  .panel h2::before { content: ''; width: 4px; height: 20px; background: var(--primary); border-radius: 2px; }
  .toolbar { display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .toolbar input {
    flex: 1; min-width: 140px; padding: 0.5rem 0.85rem; background: var(--surface-2);
    border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: var(--text); font-size: 0.85rem;
  }
  .toolbar input:focus { outline: none; border-color: var(--primary); }
  .chip { padding: 0.45rem 0.9rem; background: var(--surface-2); border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; color: var(--text-2); font-size: 0.8rem; cursor: pointer; }
  .chip.active { background: var(--primary); color: #fff; border-color: var(--primary); }
  .comments { display: flex; flex-direction: column; gap: 0.6rem; max-height: 65vh; overflow-y: auto; padding-right: 0.25rem; }
  .comments::-webkit-scrollbar { width: 8px; }
  .comments::-webkit-scrollbar-thumb { background: var(--surface-3); border-radius: 4px; }
  .comment {
    display: flex; gap: 0.75rem; padding: 0.8rem 1rem; background: var(--surface-2);
    border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.15s;
  }
  .comment:hover { transform: translateX(3px); border-color: var(--primary); }
  .comment.reaction { border-left: 3px solid var(--yellow); }
  .comment.active { border-color: var(--primary); background: var(--surface-3); box-shadow: 0 0 16px rgba(99,102,241,0.25); }
  .ts {
    padding: 0.3rem 0.6rem; background: linear-gradient(135deg, var(--primary), var(--secondary));
    border-radius: 6px; font-family: 'Consolas', monospace; font-size: 0.75rem;
    font-weight: 600; color: #fff; flex-shrink: 0; align-self: flex-start; border: none; cursor: pointer;
  }
  .ctext { flex: 1; color: var(--text-2); font-size: 0.9rem; word-break: break-word; }
  .emoji { font-size: 1.1rem; margin-right: 0.4rem; }
  .voice { display: block; width: 100%; max-width: 320px; height: 34px; margin-top: 0.5rem; }
  details { margin-top: 1.5rem; }
  details summary { cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: var(--surface); border-radius: 10px; }
  .transcript { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; max-height: 40vh; overflow-y: auto; }
  .tline { display: flex; gap: 0.6rem; padding: 0.45rem 0.75rem; background: var(--surface-2); border-radius: 8px; font-size: 0.85rem; cursor: pointer; }
  .tline:hover { background: var(--surface-3); }
  .tline .ts { font-size: 0.7rem; padding: 0.2rem 0.45rem; }
  .empty { text-align: center; color: var(--muted); padding: 2rem 1rem; }
  footer { text-align: center; margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(255,255,255,0.05); color: var(--muted); font-size: 0.8rem; }
  footer a { color: var(--primary-light); text-decoration: none; }
  .hint { position: fixed; left: 50%; bottom: 1.5rem; transform: translateX(-50%); background: var(--surface-3); border: 1px solid rgba(255,255,255,0.15); padding: 0.6rem 1.2rem; border-radius: 10px; font-size: 0.85rem; opacity: 0; pointer-events: none; transition: opacity 0.3s; z-index: 50; }
  .hint.show { opacity: 1; }
</style>
</head>
<body>
<header>
  <h1 id="title"></h1>
  <p class="meta" id="meta"></p>
</header>

<div class="layout">
  <div class="player-col">
    <div class="player-box">
      <div id="playerBox"></div>
      <div class="time-row">
        <span id="curTime">0:00</span>
        <div class="timeline" id="timeline">
          <div class="timeline-track"><div class="timeline-progress" id="progress"></div></div>
          <div id="markers"></div>
        </div>
        <span id="durTime">0:00</span>
      </div>
      <div class="player-tools">
        <button class="btn btn--ghost" id="pickBtn">📂 Load video file</button>
        <a class="btn btn--ghost" id="watchLink" target="_blank" rel="noopener" style="display:none">🔗 Watch online</a>
      </div>
      <input type="file" id="filePick" accept="video/*" hidden>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-value" id="statC">0</div><div class="stat-label">Comments</div></div>
      <div class="stat"><div class="stat-value" id="statR">0</div><div class="stat-label">Reactions</div></div>
      <div class="stat"><div class="stat-value" id="statD">0:00</div><div class="stat-label">Duration</div></div>
    </div>
  </div>

  <div class="panel">
    <h2>Comments &amp; Reactions</h2>
    <div class="toolbar">
      <input type="search" id="search" placeholder="Search comments...">
      <button class="chip active" data-f="all">All</button>
      <button class="chip" data-f="comment">💬 Comments</button>
      <button class="chip" data-f="reaction">⚡ Reactions</button>
    </div>
    <div class="comments" id="comments"></div>
    <details id="transcriptBox" style="display:none">
      <summary>📝 Transcript (<span id="tCount">0</span> lines)</summary>
      <div class="transcript" id="transcript"></div>
    </details>
  </div>
</div>

<footer>
  <p>Offline Pack exported from <strong>Vidlens</strong> — <a href="https://vidlens.net/" target="_blank" rel="noopener">vidlens.net</a></p>
  <p>Space: play/pause &nbsp;·&nbsp; ← → : seek 5s &nbsp;·&nbsp; Click a timestamp to jump</p>
</footer>

<div class="hint" id="hint"></div>

<script>
var PACK = ${packJSON};
var video = null;
var videoReady = false;
var filter = 'all';
var query = '';

function fmt(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  sec = Math.floor(sec);
  var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  var p = function(n) { return (n < 10 ? '0' : '') + n; };
  return h > 0 ? h + ':' + p(m) + ':' + p(s) : m + ':' + p(s);
}

function esc(t) {
  var d = document.createElement('div');
  d.textContent = t;
  return d.innerHTML;
}

function hint(msg) {
  var el = document.getElementById('hint');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(hint._t);
  hint._t = setTimeout(function() { el.classList.remove('show'); }, 2600);
}

// ---- Header ----
document.getElementById('title').textContent = PACK.title;
document.title = PACK.title + ' — Vidlens Offline Pack';
var metaBits = ['<span>📺 ' + esc(PACK.providerName) + '</span>'];
if (PACK.author) metaBits.push('<span>👤 ' + esc(PACK.author) + '</span>');
metaBits.push('<span>📅 ' + new Date(PACK.exportDate).toLocaleDateString() + '</span>');
metaBits.push('<span>💬 ' + PACK.comments.length + ' items</span>');
metaBits.push('<span class="offline-badge">● Works offline</span>');
document.getElementById('meta').innerHTML = metaBits.join('');

// ---- Stats ----
document.getElementById('statC').textContent = PACK.comments.filter(function(c) { return c.type === 'comment'; }).length;
document.getElementById('statR').textContent = PACK.comments.filter(function(c) { return c.type === 'reaction'; }).length;
document.getElementById('statD').textContent = fmt(PACK.duration);
document.getElementById('durTime').textContent = fmt(PACK.duration);

if (PACK.watchUrl) {
  var wl = document.getElementById('watchLink');
  wl.href = PACK.watchUrl;
  wl.style.display = '';
}

// ---- Video setup: bundled file, sibling video.* probe, or manual pick ----
function candidateSources() {
  if (PACK.videoFile) return [PACK.videoFile];
  return ['video.mp4', 'video.webm', 'video.m4v', 'video.mov', 'video.ogv'];
}

function showFallback() {
  var box = document.getElementById('playerBox');
  var thumb = PACK.thumbnail ? '<img src="' + PACK.thumbnail + '" alt="Video thumbnail" onerror="this.remove()">' : '';
  box.innerHTML =
    '<div class="fallback" id="dropzone">' + thumb +
    '<h3>Video file not found</h3>' +
    '<p>Drop a copy of the video here (or use “Load video file”) and it plays fully offline, synced with your comments.<br>' +
    'See <strong>GET-THE-VIDEO.md</strong> in this folder for details.</p>' +
    '<div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;">' +
    (PACK.watchUrl ? '<a class="btn" href="' + PACK.watchUrl + '" target="_blank" rel="noopener">▶ Watch online</a>' : '') +
    (PACK.watchUrl ? '<button class="btn btn--ghost" id="dlHelpBtn">📥 How to get the file</button>' : '') +
    '</div>' +
    (PACK.watchUrl ?
      '<div id="dlRoutes" style="display:none;margin-top:0.9rem;text-align:left;font-size:0.78rem;color:var(--text-2);">' +
      '<p style="margin-bottom:0.4rem;"><strong>✅ Official:</strong> the platform\\'s own download / offline feature.</p>' +
      '<p style="margin-bottom:0.3rem;"><strong>⌨️ yt-dlp</strong> (local tool, no website):</p>' +
      '<div style="display:flex;gap:0.4rem;margin-bottom:0.5rem;">' +
      '<code id="ytdlpCmd" style="flex:1;background:#000;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:0.45rem;font-size:0.68rem;color:var(--cyan);overflow-x:auto;white-space:nowrap;"></code>' +
      '<button class="btn btn--ghost" id="copyCmdBtn" style="padding:0.3rem 0.6rem;font-size:0.72rem;">Copy</button></div>' +
      '<p><strong>🌐 Downloader site:</strong> <a href="https://cobalt.tools/" target="_blank" rel="noopener" style="color:var(--primary-light);">cobalt.tools</a> — third-party, your discretion.</p>' +
      '<p style="margin-top:0.5rem;color:var(--muted);font-size:0.72rem;">Only save videos you have the right to download. Then drop the file here.</p>' +
      '</div>' : '') +
    '</div>';

  var dlBtn = document.getElementById('dlHelpBtn');
  if (dlBtn) {
    var cmdEl = document.getElementById('ytdlpCmd');
    if (cmdEl) cmdEl.textContent = 'yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" -o "video.mp4" "' + PACK.watchUrl + '"';
    dlBtn.addEventListener('click', function() {
      var box = document.getElementById('dlRoutes');
      if (box) box.style.display = box.style.display === 'none' ? 'block' : 'none';
    });
    var copyBtn = document.getElementById('copyCmdBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        var t = document.getElementById('ytdlpCmd').textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(t).then(function() { hint('Command copied'); }, function() { hint('Copy failed'); });
        }
      });
    }
  }

  var dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', function(e) { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', function() { dz.classList.remove('dragover'); });
  dz.addEventListener('drop', function(e) {
    e.preventDefault();
    dz.classList.remove('dragover');
    var f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) loadPickedFile(f);
  });
}

function attachVideo(v) {
  video = v;
  video.addEventListener('loadedmetadata', function() {
    videoReady = true;
    if (video.duration && isFinite(video.duration)) {
      PACK.duration = video.duration;
      document.getElementById('durTime').textContent = fmt(video.duration);
      document.getElementById('statD').textContent = fmt(video.duration);
      renderMarkers();
    }
  });
  video.addEventListener('timeupdate', tick);
}

function buildVideo() {
  var box = document.getElementById('playerBox');
  var v = document.createElement('video');
  v.controls = true;
  v.playsInline = true;
  v.preload = 'metadata';

  var sources = candidateSources();
  sources.forEach(function(src, i) {
    var s = document.createElement('source');
    s.src = src;
    if (i === sources.length - 1) {
      s.addEventListener('error', function() { videoReady = false; showFallback(); });
    }
    v.appendChild(s);
  });

  box.innerHTML = '';
  box.appendChild(v);
  attachVideo(v);
}

function loadPickedFile(file) {
  if (file.type && file.type.indexOf('video/') !== 0) {
    hint('That does not look like a video file');
    return;
  }
  var box = document.getElementById('playerBox');
  var v = document.createElement('video');
  v.controls = true;
  v.playsInline = true;
  v.src = URL.createObjectURL(file);
  box.innerHTML = '';
  box.appendChild(v);
  attachVideo(v);
  videoReady = true;
  hint('Loaded: ' + file.name);
}

document.getElementById('pickBtn').addEventListener('click', function() {
  document.getElementById('filePick').click();
});
document.getElementById('filePick').addEventListener('change', function(e) {
  var f = e.target.files && e.target.files[0];
  if (f) loadPickedFile(f);
});

buildVideo();

// ---- Seek ----
function seekTo(t) {
  if (videoReady && video) {
    video.currentTime = t;
    video.play().catch(function() {});
    if (window.innerWidth <= 950) video.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } else if (PACK.watchUrl && (PACK.provider === 'youtube' || PACK.provider === 'youtube_shorts')) {
    window.open(PACK.watchUrl + '&t=' + Math.floor(t) + 's', '_blank');
  } else if (PACK.watchUrl && PACK.provider === 'vimeo') {
    window.open(PACK.watchUrl + '#t=' + Math.floor(t) + 's', '_blank');
  } else {
    hint('Load the video file to enable seeking');
  }
}

// ---- Timeline ----
function renderMarkers() {
  var wrap = document.getElementById('markers');
  wrap.innerHTML = '';
  var dur = PACK.duration || 1;
  PACK.comments.forEach(function(c) {
    var m = document.createElement('div');
    m.className = 'marker ' + c.type;
    m.style.left = Math.min((c.timestamp / dur) * 100, 100) + '%';
    m.title = '[' + c.time + '] ' + c.text.substring(0, 60);
    m.addEventListener('click', function(e) { e.stopPropagation(); seekTo(c.timestamp); });
    wrap.appendChild(m);
  });
}

document.getElementById('timeline').addEventListener('click', function(e) {
  var rect = this.getBoundingClientRect();
  seekTo(((e.clientX - rect.left) / rect.width) * (PACK.duration || 0));
});

function tick() {
  if (!video) return;
  var t = video.currentTime;
  document.getElementById('curTime').textContent = fmt(t);
  document.getElementById('progress').style.width = Math.min((t / (PACK.duration || 1)) * 100, 100) + '%';
  var rows = document.querySelectorAll('#comments .comment');
  rows.forEach(function(row) {
    var rt = parseFloat(row.getAttribute('data-t'));
    if (t >= rt && t < rt + 4) row.classList.add('active');
    else row.classList.remove('active');
  });
}

// ---- Comments ----
function renderComments() {
  var box = document.getElementById('comments');
  box.innerHTML = '';
  var q = query.toLowerCase();
  var shown = 0;

  var sorted = PACK.comments.slice().sort(function(a, b) { return a.timestamp - b.timestamp; });
  sorted.forEach(function(c) {
    if (filter !== 'all' && c.type !== filter) return;
    if (q && c.text.toLowerCase().indexOf(q) === -1 && c.time.indexOf(q) === -1) return;
    shown++;

    var row = document.createElement('div');
    row.className = 'comment' + (c.type === 'reaction' ? ' reaction' : '');
    row.setAttribute('data-t', c.timestamp);
    row.innerHTML =
      '<button class="ts">[' + c.time + ']</button>' +
      '<span class="ctext">' + (c.emoji ? '<span class="emoji">' + c.emoji + '</span>' : '') + esc(c.text) +
      (c.voiceFile ? '<audio class="voice" controls preload="none" src="' + c.voiceFile + '"></audio>' : '') +
      '</span>';
    row.addEventListener('click', function() { seekTo(c.timestamp); });
    box.appendChild(row);
  });

  if (shown === 0) {
    box.innerHTML = '<div class="empty">No comments match.</div>';
  }
}

document.getElementById('search').addEventListener('input', function(e) {
  query = e.target.value;
  renderComments();
});
document.querySelectorAll('.chip').forEach(function(chip) {
  chip.addEventListener('click', function() {
    document.querySelectorAll('.chip').forEach(function(x) { x.classList.remove('active'); });
    chip.classList.add('active');
    filter = chip.getAttribute('data-f');
    renderComments();
  });
});

// ---- Transcript ----
if (PACK.transcript.length > 0) {
  document.getElementById('transcriptBox').style.display = '';
  document.getElementById('tCount').textContent = PACK.transcript.length;
  var tBox = document.getElementById('transcript');
  PACK.transcript.forEach(function(line) {
    var el = document.createElement('div');
    el.className = 'tline';
    el.innerHTML = '<span class="ts">[' + fmt(line.timestamp) + ']</span><span>' + esc(line.text) + '</span>';
    el.addEventListener('click', function() { seekTo(line.timestamp); });
    tBox.appendChild(el);
  });
}

// ---- Keyboard ----
document.addEventListener('keydown', function(e) {
  var tag = (e.target.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea') return;
  if (!videoReady || !video) return;
  if (e.code === 'Space') {
    e.preventDefault();
    video.paused ? video.play() : video.pause();
  } else if (e.key === 'ArrowRight') {
    video.currentTime = Math.min(video.currentTime + 5, video.duration || 1e9);
  } else if (e.key === 'ArrowLeft') {
    video.currentTime = Math.max(video.currentTime - 5, 0);
  }
});

renderMarkers();
renderComments();
</script>
</body>
</html>`;
}

// ============================================
// 18. FILE UPLOAD
// ============================================

function handleFileSelect(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  
  if (!file.type.startsWith('video/')) {
    showToast('Please select a valid video file', 'error');
    return;
  }
  
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showToast('File size exceeds 100MB limit', 'error');
    return;
  }
  
  state.uploadedVideo = file;
  state.currentProvider = 'upload';

  if (elements.uploadedFileName) elements.uploadedFileName.textContent = file.name;
  if (elements.uploadedFileSize) elements.uploadedFileSize.textContent = formatFileSize(file.size);
  elements.uploadedFileInfo?.removeAttribute('hidden');

  showToast('Video file selected, loading...');
  // Stable ID so comments persist across sessions for the same file
  initializePlayer(`upload_${hashString(`${file.name}_${file.size}`)}`);
}

function removeUploadedFile() {
  state.uploadedVideo = null;
  if (elements.videoUpload) elements.videoUpload.value = '';
  elements.uploadedFileInfo?.setAttribute('hidden', '');
}

// ============================================
// 19. EVENT LISTENERS
// ============================================

function initEventListeners() {
  // Auto-detect platform on input
  elements.videoLink?.addEventListener('input', (e) => {
    updateDetectedPlatform(e.target.value);
  });
  
  // Load video button
  elements.loadVideoBtn?.addEventListener('click', () => {
    const url = elements.videoLink?.value.trim();
    
    if (!url) {
      showToast('Please enter a video URL', 'error');
      return;
    }
    
    state.originalVideoUrl = url;
    
    const platform = detectPlatform(url);
    if (platform) {
      state.currentProvider = platform;
    } else {
      showToast('Could not detect video platform. Please check the URL.', 'error');
      return;
    }
    
    const videoId = state.currentProvider === 'direct'
      ? `direct_${hashString(url)}`
      : extractVideoID(url, state.currentProvider);

    if (videoId) {
      initializePlayer(videoId);
    } else {
      showToast('Could not extract video ID from URL', 'error');
    }
  });
  
  elements.videoLink?.addEventListener('keypress', e => {
    if (e.key === 'Enter') elements.loadVideoBtn?.click();
  });
  
  // Paste button
  elements.pasteBtn?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (elements.videoLink) {
        elements.videoLink.value = text;
        updateDetectedPlatform(text);
      }
      showToast('Pasted from clipboard');
    } catch {
      showToast('Could not access clipboard', 'error');
    }
  });
  
  // Upload button
  elements.uploadBtn?.addEventListener('click', () => {
    elements.videoUpload?.click();
  });
  
  elements.videoUpload?.addEventListener('change', handleFileSelect);
  elements.removeFile?.addEventListener('click', removeUploadedFile);
  
  // Download the video: direct file when we have one, guided routes otherwise
  elements.downloadVideoBtn?.addEventListener('click', () => {
    if (!state.videoLoaded) {
      showToast('Please load a video first', 'error');
      return;
    }

    if (state.currentProvider === 'upload' && state.uploadedVideo) {
      downloadBlob(state.uploadedVideo, state.uploadedVideo.name || 'video.mp4');
      showToast('Downloading your video file...', 'success');
      return;
    }

    if (state.currentProvider === 'direct' && state.originalVideoUrl) {
      const link = document.createElement('a');
      link.href = state.originalVideoUrl;
      link.download = sanitizeFileName(state.videoTitle) || 'video.mp4';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Downloading from the direct URL...', 'success');
      return;
    }

    // Platform video: open the embedded downloader right here
    showDownloaderModal(state.originalVideoUrl || getVideoWatchUrl() || '', (file) => {
      state.packVideoFile = file;
      showToast(`"${file.name}" ready — it will be bundled in your next Offline Pack`, 'success');
    });
  });

  // Change video button
  elements.changeVideoBtn?.addEventListener('click', () => {
    state.videoLoaded = false;
    state.ytPlayer = null;
    state.vimeoPlayer = null;
    state.videoAspectRatio = null;
    state.originalVideoUrl = null;
    state.videoAuthor = null;
    state.videoThumbnail = null;
    document.title = 'Vidlens - Video Reactions & Comments';
    if (elements.searchComments) elements.searchComments.value = '';
    renderRecentVideos();
    stopTranscription();
    showFeaturePanels(false);
    if (elements.videoLink) elements.videoLink.value = '';
    elements.detectedPlatform?.setAttribute('hidden', '');
    clearVideoAspectClasses();
    elements.videoLink?.focus();
  });
  
  // Emoji buttons
  elements.emojiButtons?.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!state.videoLoaded) {
        showToast('Please load a video first', 'error');
        return;
      }
      showReactionModal(btn.dataset.emoji);
    });
  });
  
  // Add comment button
  elements.addCommentBtn?.addEventListener('click', () => {
    if (!state.videoLoaded) {
      showToast('Please load a video first', 'error');
      return;
    }
    showCommentModal();
  });
  
  // Reaction modal
  elements.closeReactionModal?.addEventListener('click', () => hideModal(elements.reactionModal));
  elements.cancelReaction?.addEventListener('click', () => hideModal(elements.reactionModal));
  
  elements.reactionText?.addEventListener('input', () => {
    if (elements.charCount) {
      elements.charCount.textContent = elements.reactionText.value.length;
    }
  });
  
  elements.submitReaction?.addEventListener('click', async () => {
    const text = elements.reactionText?.value.trim();
    const hasVoice = !!voiceRecorder.blob;

    if (!text && !hasVoice) {
      showToast('Add some text or record a voice note', 'error');
      return;
    }

    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const voice = hasVoice ? await attachRecordedVoice(id) : null;

    addComment({
      id,
      voice,
      text: text || 'Voice reaction',
      timestamp: Math.floor(getCurrentTime()),
      type: 'reaction',
      emoji: elements.selectedEmojiInput?.value,
    });

    hideModal(elements.reactionModal);
    showToast(hasVoice ? 'Voice reaction added!' : 'Reaction added!');
  });
  
  // Comment modal
  elements.closeCommentModal?.addEventListener('click', () => hideModal(elements.commentModal));
  elements.cancelComment?.addEventListener('click', () => hideModal(elements.commentModal));
  
  elements.commentText?.addEventListener('input', () => {
    if (elements.commentCharCount) {
      elements.commentCharCount.textContent = elements.commentText.value.length;
    }
  });
  
  elements.submitComment?.addEventListener('click', async () => {
    const text = elements.commentText?.value.trim() || (voiceRecorder.blob ? 'Voice note' : '');
    if (!text) {
      showToast('Add some text or record a voice note', 'error');
      return;
    }

    // Edit mode: update the existing comment in place
    if (state.editingComment && state.editingComment.isConnected) {
      const textEl = state.editingComment.querySelector('.comment-text');
      if (textEl) {
        const emojiEl = textEl.querySelector('.reaction-emoji');
        textEl.innerHTML = (emojiEl ? emojiEl.outerHTML : '') + sanitizeHTML(text);
        saveComments();
        updateUI();
      }
      state.editingComment = null;
      hideModal(elements.commentModal);
      showToast('Comment updated!');
      return;
    }

    const prefillTimestamp = elements.commentModal?.dataset.prefillTimestamp;
    const timestamp = prefillTimestamp ? parseInt(prefillTimestamp) : Math.floor(getCurrentTime());

    const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    const voice = voiceRecorder.blob ? await attachRecordedVoice(id) : null;

    addComment({
      id,
      voice,
      text,
      timestamp,
      type: 'comment',
    });

    delete elements.commentModal?.dataset.prefillTimestamp;

    hideModal(elements.commentModal);
    showToast('Comment added!');
  });
  
  // Confirm modal
  elements.confirmCancel?.addEventListener('click', () => hideModal(elements.confirmModal));
  
  // Click timestamp to seek
  elements.commentsList?.addEventListener('click', e => {
    const timestamp = e.target.closest('.timestamp');
    if (timestamp && state.videoLoaded) {
      const time = parseInt(timestamp.dataset.time) || 0;
      seekToTime(time);
    }
  });
  
  // Timeline click to seek
  elements.timeline?.addEventListener('click', e => {
    if (!state.videoLoaded) return;
    if (e.target.closest('.timeline-marker')) return;
    
    const rect = elements.timeline.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const seekTime = percentage * state.videoDuration;
    
    seekToTime(seekTime);
  });
  
  // Sort and clear buttons
  elements.sortCommentsBtn?.addEventListener('click', toggleSortOrder);
  elements.clearAllBtn?.addEventListener('click', clearAllComments);
  
  // Export dropdown - FIXED
  elements.exportDropdownBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const dropdown = elements.exportDropdown || elements.exportDropdownBtn?.closest('.export-dropdown');
    if (dropdown) {
      dropdown.classList.toggle('open');
    }
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('.export-dropdown')) {
      const dropdown = elements.exportDropdown || $('.export-dropdown');
      dropdown?.classList.remove('open');
    }
  });
  
  // Export handlers
  elements.exportHTML?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportHTML();
    closeExportDropdown();
  });

  // The Offline Pack is useful even with zero comments (video + metadata),
  // so it only requires a loaded video
  elements.exportZIP?.addEventListener('click', () => {
    if (!state.videoLoaded) {
      showToast('Please load a video first', 'error');
      return;
    }
    exportZIP();
    closeExportDropdown();
  });

  elements.exportPDFBtn?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportPDF();
    closeExportDropdown();
  });

  elements.exportCSVBtn?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportCSV();
    closeExportDropdown();
  });

  elements.exportJSONBtn?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportJSON();
    closeExportDropdown();
  });

  elements.exportTXTBtn?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportText();
    closeExportDropdown();
  });

  elements.exportSRTBtn?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportCommentsSRT();
    closeExportDropdown();
  });

  // Comment search
  elements.searchComments?.addEventListener('input', debounce((e) => {
    filterComments(e.target.value);
  }, 150));

  // "Include reactions" export toggle
  elements.includeReactionsToggle?.addEventListener('change', (e) => {
    state.includeReactionsInExport = e.target.checked;
    showToast(e.target.checked
      ? 'Exports will include reactions'
      : 'Exports will contain text comments only', 'info');
  });
  
  // Modal overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) hideModal(overlay);
    });
  });
  
  // Keyboard shortcuts
  const EMOJI_KEYS = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '💡', '🎯', '❓'];

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => hideModal(m));
      $('#manualTranscriptModal')?.remove();
      closeExportDropdown();
      return;
    }

    // Ctrl/Cmd+Enter submits the open modal
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      if (!elements.reactionModal?.hasAttribute('hidden')) {
        e.preventDefault();
        elements.submitReaction?.click();
        return;
      }
      if (!elements.commentModal?.hasAttribute('hidden')) {
        e.preventDefault();
        elements.submitComment?.click();
        return;
      }
    }

    // Global shortcuts — only when a video is loaded, no modal open, not typing
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const modalOpen = document.querySelector('.modal-overlay:not([hidden])') || $('#manualTranscriptModal');
    if (!state.videoLoaded || typing || modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;

    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      showCommentModal();
      return;
    }

    // 1–9 and 0 trigger the ten reaction emojis
    if (/^[0-9]$/.test(e.key)) {
      const index = e.key === '0' ? 9 : parseInt(e.key) - 1;
      const emoji = EMOJI_KEYS[index];
      if (emoji) {
        e.preventDefault();
        showReactionModal(emoji);
      }
      return;
    }

    // Playback controls for native video (uploads & direct URLs)
    if (isNativeVideoProvider()) {
      const video = getNativeVideoElement();
      if (!video) return;
      if (e.code === 'Space') {
        e.preventDefault();
        video.paused ? video.play().catch(() => {}) : video.pause();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        video.currentTime = Math.min(video.currentTime + 5, video.duration || Infinity);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        video.currentTime = Math.max(video.currentTime - 5, 0);
      }
    }
  });

  // Drag & drop a video file anywhere on the input card
  const inputSection = $('.input-section');
  if (inputSection) {
    ['dragover', 'dragenter'].forEach(evt => {
      inputSection.addEventListener(evt, (e) => {
        e.preventDefault();
        inputSection.classList.add('drop-active');
      });
    });
    ['dragleave', 'dragend'].forEach(evt => {
      inputSection.addEventListener(evt, () => inputSection.classList.remove('drop-active'));
    });
    inputSection.addEventListener('drop', (e) => {
      e.preventDefault();
      inputSection.classList.remove('drop-active');
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('video/')) {
        handleFileSelect({ target: { files: [file] } });
      } else if (file) {
        showToast('Please drop a video file', 'error');
      }
    });
  }
  
  // Transcribe button
  elements.transcribeBtn?.addEventListener('click', () => {
    if (!state.videoLoaded) {
      showToast('Please load a video first', 'error');
      return;
    }
    // While the microphone path is running, this button stops it
    if (transcriptionState.isTranscribing) {
      stopTranscription();
      return;
    }
    // Otherwise: AI subtitles, import, or the video's own track
    showSubtitleModal();
  });
  
  // Transcript actions
  elements.copyTranscriptBtn?.addEventListener('click', copyTranscript);
  elements.exportTranscriptBtn?.addEventListener('click', exportTranscriptSRT);
  elements.clearTranscriptBtn?.addEventListener('click', clearTranscript);
  elements.addAllTranscriptBtn?.addEventListener('click', addAllTranscriptAsComments);
  elements.importTranscriptBtn?.addEventListener('click', showManualTranscriptModal);
  elements.translateBtn?.addEventListener('click', showTranslateModal);

  elements.toggleOriginalBtn?.addEventListener('click', () => {
    captions.showOriginal = !captions.showOriginal;
    elements.toggleOriginalBtn.querySelector('span').textContent = captions.showOriginal ? 'Translation' : 'Original';
    updateTranscriptDisplay();
    showToast(captions.showOriginal ? 'Showing the original text' : 'Showing the translation', 'info');
  });

  elements.ccToggleBtn?.addEventListener('click', () => {
    if (!transcriptionState.transcript.length) {
      showToast('Generate or import subtitles first', 'info');
      return;
    }
    setCaptions(!captions.on);
    showToast(captions.on ? 'Subtitles on' : 'Subtitles off', 'info');
  });

  elements.subtitlesBtn?.addEventListener('click', () => {
    if (!state.videoLoaded) {
      showToast('Please load a video first', 'error');
      return;
    }
    showSubtitleModal();
  });
  
  // Handle resize
  window.addEventListener('resize', debounce(() => {
    if (state.videoLoaded && state.videoAspectRatio) {
      // Re-apply aspect ratio if needed
    }
  }, 250));
}

function closeExportDropdown() {
  const dropdown = elements.exportDropdown || $('.export-dropdown');
  dropdown?.classList.remove('open');
}

function validateExport() {
  if (!state.videoLoaded) {
    showToast('Please load a video first', 'error');
    return false;
  }
  return true;
}

// ============================================
// 19b. STAR PROMPT & EASTER EGGS
// ============================================

const STAR_KEY = 'reactvid_star_prompt';
const GITHUB_REPO_URL = 'https://github.com/VideoTag/videotag';

function shouldShowStarPrompt() {
  try {
    const s = JSON.parse(localStorage.getItem(STAR_KEY) || '{}');
    if (s.starred) return false;
    if (s.last && Date.now() - s.last < 14 * 24 * 3600 * 1000) return false;
  } catch {}
  // Only nudge people who actually used the app this session
  return state.videoLoaded;
}

function markStarPrompt(starred) {
  try {
    localStorage.setItem(STAR_KEY, JSON.stringify({ last: Date.now(), starred: !!starred }));
  } catch {}
}

function showStarModal() {
  if ($('#starModal')) return;

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'starModal';
  modal.innerHTML = `
    <div class="modal modal--sm star-modal" role="dialog" aria-modal="true" aria-labelledby="starModalTitle">
      <div class="star-modal__star">⭐</div>
      <div class="modal__body" style="text-align:center;">
        <h3 class="modal__title" id="starModalTitle" style="margin-bottom:0.5rem;">Leaving already?</h3>
        <p style="color:var(--color-text-secondary);font-size:0.9rem;">
          If Vidlens saved your timestamps today, a star on GitHub keeps this
          free &amp; open-source project alive. It takes 2 seconds — we counted.
        </p>
      </div>
      <div class="modal__footer" style="justify-content:center;">
        <button class="btn btn--ghost" id="starLater">Maybe later</button>
        <a class="btn btn--primary" id="starGo" href="${GITHUB_REPO_URL}" target="_blank" rel="noopener">
          <span>⭐ Star on GitHub</span>
        </a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  markStarPrompt(false);

  modal.querySelector('#starGo').addEventListener('click', () => {
    markStarPrompt(true);
    modal.remove();
    showToast('You are a legend ⭐ Thank you!', 'success');
  });
  modal.querySelector('#starLater').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

function initStarPrompt() {
  // Exit intent: cursor leaves through the top of the viewport
  document.addEventListener('mouseout', (e) => {
    if (!e.relatedTarget && e.clientY <= 0 && shouldShowStarPrompt()) {
      showStarModal();
    }
  });
}

// Konami code (↑↑↓↓←→←→BA) → reaction storm
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let konamiPos = 0;

function emojiRain() {
  const emojis = ['👍', '❤️', '😂', '😮', '🔥', '💡', '🎯', '🎬', '⭐', '🍿'];
  for (let i = 0; i < 48; i++) {
    const drop = document.createElement('span');
    drop.className = 'emoji-rain';
    drop.textContent = emojis[i % emojis.length];
    drop.style.left = `${Math.random() * 100}vw`;
    drop.style.animationDelay = `${Math.random() * 1.2}s`;
    drop.style.fontSize = `${1 + Math.random() * 1.6}rem`;
    document.body.appendChild(drop);
    setTimeout(() => drop.remove(), 4500);
  }
  showToast('🍿 Reaction storm unlocked!', 'success');
}

// Rotating tips in the footer — ideas, fun facts, and a nudge for feedback
function initFunTips() {
  const el = $('#funTip');
  if (!el) return;

  const tips = FUN_FACTS.concat([
    'Got an idea or a bug? <a href="https://github.com/VideoTag/videotag/issues/new" target="_blank" rel="noopener">Tell us on GitHub</a> — every issue gets read.',
    'Enjoying Vidlens? <a href="https://github.com/VideoTag/videotag" target="_blank" rel="noopener">Star the project</a> — it is the whole business model.',
    'Idea: give a client a single HTML report — no login, no upload, just their video and your notes.',
  ]);

  let i = Math.floor(Math.random() * tips.length);
  const show = () => {
    el.classList.remove('footer__tip--in');
    setTimeout(() => {
      el.innerHTML = tips[i % tips.length];
      el.classList.add('footer__tip--in');
      i++;
    }, 300);
  };

  show();
  setInterval(show, 9000);
}

function initKonami() {
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : (key === KONAMI[0] ? 1 : 0);
    if (konamiPos === KONAMI.length) {
      konamiPos = 0;
      emojiRain();
    }
  });
}

// ============================================
// 20. INITIALIZATION
// ============================================

function init() {
  cacheElements();
  initEventListeners();
  renderRecentVideos();
  initStarPrompt();
  initKonami();
  initFunTips();

  if (isLocalFile()) {
    console.log('Running from file:// - some features may be limited');
  }
  
  // Handle URL params for direct video loading
  const params = new URLSearchParams(location.search);
  const videoUrl = params.get('url') || params.get('v');
  
  if (videoUrl) {
    if (elements.videoLink) {
      elements.videoLink.value = videoUrl.includes('://') ? videoUrl : `https://youtu.be/${videoUrl}`;
      updateDetectedPlatform(elements.videoLink.value);
    }
    setTimeout(() => elements.loadVideoBtn?.click(), 500);
  }
}

// Suppress MetaMask and other extension errors
window.addEventListener('error', (e) => {
  if (e.message && (e.message.includes('MetaMask') || e.message.includes('extension'))) {
    e.preventDefault();
    return true;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  if (e.reason && e.reason.message && (e.reason.message.includes('MetaMask') || e.reason.message.includes('extension'))) {
    e.preventDefault();
    return true;
  }
});

document.addEventListener('DOMContentLoaded', init);