/**
 * VideoLens - Video Reactions & Comments Application
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
      document.title = `${meta.title} - VideoLens`;
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

function showReactionModal(emoji) {
  if (elements.selectedEmoji) elements.selectedEmoji.textContent = emoji;
  if (elements.selectedEmojiInput) elements.selectedEmojiInput.value = emoji;
  if (elements.reactionText) elements.reactionText.value = '';
  if (elements.charCount) elements.charCount.textContent = '0';
  if (elements.modalTimestamp) elements.modalTimestamp.textContent = formatTime(getCurrentTime());
  
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

function getCommentPlainText(commentEl) {
  const textEl = commentEl.querySelector('.comment-text');
  if (!textEl) return '';
  const clone = textEl.cloneNode(true);
  clone.querySelector('.reaction-emoji')?.remove();
  return clone.textContent.trim();
}

function addComment({ text, timestamp, type = 'comment', emoji = null }) {
  const comment = document.createElement('div');
  comment.className = `comment ${type === 'reaction' ? 'reaction' : ''}`;
  comment.dataset.timestamp = timestamp;

  const timeStr = formatTime(timestamp);
  let content = sanitizeHTML(text);

  if (type === 'reaction' && emoji) {
    content = `<span class="reaction-emoji">${emoji}</span>${content}`;
  }

  comment.innerHTML = `
    <span class="timestamp" data-time="${timestamp}" title="Click to jump to ${timeStr}">[${timeStr}]</span>
    <div class="comment-content">
      <span class="comment-text">${content}</span>
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
    comment.remove();
    saveComments();
    updateCommentsEmptyState();
    updateUI();
    showToast('Comment deleted');
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
      text: getCommentPlainText(c),
      timestamp: parseInt(c.dataset.timestamp) || 0,
      type: isReaction ? 'reaction' : 'comment',
      emoji: emojiEl?.textContent || null,
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
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
      <span>Transcribe</span>
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
    div.innerHTML = `
      <span class="transcript-time" data-time="${item.timestamp}" title="Click to jump">[${formatTime(item.timestamp)}]</span>
      <span class="transcript-text">${sanitizeHTML(item.text)}</span>
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
    const startTime = formatSRTTime(item.timestamp);
    const endTime = formatSRTTime(item.timestamp + 3);
    srt += `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n\n`;
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
// 16. TIMELINE & STATS
// ============================================

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
    timestamp: parseInt(c.dataset.timestamp) || 0,
    time: formatTime(parseInt(c.dataset.timestamp) || 0),
    type: c.classList.contains('reaction') ? 'reaction' : 'comment',
    emoji: c.querySelector('.reaction-emoji')?.textContent || null,
    text: getCommentPlainText(c),
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
  
  let text = `VideoLens Export\n`;
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
  doc.text('VideoLens Export', 20, 25);
  
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

// Generate timeline markers data for HTML export
function getTimelineMarkersData() {
  const data = getCommentsData();
  const duration = state.videoDuration || 300;
  return data.map((d, i) => ({
    index: i,
    timestamp: d.timestamp,
    position: Math.min((d.timestamp / duration) * 100, 100),
    type: d.type,
    text: d.text.substring(0, 30) + (d.text.length > 30 ? '...' : ''),
    time: d.time
  }));
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
function generateHTMLContent() {
  const data = getCommentsData();
  const markers = getTimelineMarkersData();
  const videoId = state.currentVideoId;
  const { embedUrl, seekTemplate } = getSeekableEmbedInfo();
  const watchUrl = getVideoWatchUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(state.videoTitle)} - VideoLens Export</title>
  <style>
    :root { 
      --primary: #6366f1; 
      --primary-light: #818cf8;
      --secondary: #ec4899;
      --bg: #05050a; 
      --surface: #0f0f1a; 
      --surface-elevated: #151522;
      --text: #fff; 
      --text-secondary: #a0a0b8;
      --muted: #5a5a70;
      --yellow: #fbbf24;
      --cyan: #22d3ee;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      background: var(--bg); 
      color: var(--text); 
      line-height: 1.6; 
      padding: 2rem; 
      max-width: 1000px; 
      margin: 0 auto; 
    }
    .header { text-align: center; margin-bottom: 2rem; }
    h1 { 
      font-size: 2rem; 
      margin-bottom: 0.5rem; 
      background: linear-gradient(135deg, #6366f1, #ec4899); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem; }
    .meta span {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--surface);
      border-radius: 20px;
      margin: 0.25rem;
    }
    .video-section {
      background: var(--surface);
      border-radius: 16px;
      padding: 1rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .embed-wrapper {
      width: 100%;
      aspect-ratio: 16/9;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
    }
    .embed-wrapper iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    }
    .seek-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      background: var(--surface-elevated);
      border-radius: 8px;
    }
    .seek-controls span {
      color: #fff;
      font-size: 12px;
      white-space: nowrap;
    }
    .seek-controls input {
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      background: rgba(255,255,255,0.1);
      color: #fff;
      font-family: monospace;
      font-size: 14px;
      width: 70px;
    }
    .seek-controls button {
      padding: 6px 14px;
      background: linear-gradient(135deg, #6366f1, #ec4899);
      border: none;
      border-radius: 6px;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .seek-controls button:hover { opacity: 0.9; }
    .getvideo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-top: 0.75rem;
      padding: 0.75rem;
      background: var(--surface-elevated);
      border: 1px dashed rgba(255,255,255,0.15);
      border-radius: 8px;
    }
    .getvideo button {
      padding: 6px 14px;
      background: transparent;
      border: 1px solid var(--primary);
      border-radius: 6px;
      color: var(--primary-light);
      font-weight: 600;
      cursor: pointer;
    }
    .getvideo button:hover { background: rgba(99,102,241,0.15); }
    .getvideo small { color: var(--muted); font-size: 0.72rem; line-height: 1.4; flex: 1; min-width: 200px; }
    .timeline {
      flex: 1;
      position: relative;
      height: 30px;
      cursor: pointer;
      margin-left: 1rem;
    }
    .timeline-track {
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 6px;
      transform: translateY(-50%);
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
    }
    .timeline-markers { position: absolute; inset: 0; }
    .timeline-marker {
      position: absolute;
      top: 50%;
      width: 12px;
      height: 12px;
      margin-left: -6px;
      transform: translateY(-50%);
      border-radius: 50%;
      cursor: pointer;
      transition: transform 0.2s;
      z-index: 10;
    }
    .timeline-marker:hover { transform: translateY(-50%) scale(1.5); }
    .timeline-marker.reaction {
      background: var(--yellow);
      box-shadow: 0 0 10px rgba(251, 191, 36, 0.5);
    }
    .timeline-marker.comment {
      background: var(--cyan);
      box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
    }
    .timeline-marker .tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      padding: 0.5rem 0.75rem;
      background: var(--surface-elevated);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      font-size: 0.75rem;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s;
      pointer-events: none;
    }
    .timeline-marker:hover .tooltip { opacity: 1; visibility: visible; }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat {
      padding: 1.25rem;
      background: var(--surface);
      border-radius: 12px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h2::before {
      content: '';
      display: block;
      width: 4px;
      height: 24px;
      background: var(--primary);
      border-radius: 2px;
    }
    .comments-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .comment { 
      display: flex; 
      gap: 1rem; 
      padding: 1rem 1.25rem; 
      background: var(--surface); 
      border-radius: 12px; 
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.2s;
      cursor: pointer;
    }
    .comment:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      border-color: var(--primary);
    }
    .comment.reaction { border-left: 3px solid var(--yellow); }
    .timestamp { 
      padding: 0.35rem 0.75rem; 
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 8px; 
      font-family: 'SF Mono', 'Fira Code', monospace; 
      font-size: 0.8rem; 
      flex-shrink: 0;
      font-weight: 600;
      color: white;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .timestamp:hover { transform: scale(1.05); }
    .text { flex: 1; color: var(--text-secondary); }
    .emoji { font-size: 1.25rem; margin-right: 0.5rem; }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      color: var(--muted);
      font-size: 0.875rem;
    }
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .comment { flex-direction: column; gap: 0.5rem; }
      .timestamp { align-self: flex-start; }
      .seek-controls { flex-wrap: wrap; }
      .timeline { width: 100%; margin: 0.5rem 0 0 0; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${sanitizeHTML(state.videoTitle)}</h1>
    <p class="meta">
      <span>📺 ${PROVIDER_NAMES[state.currentProvider]}</span>
      <span>📅 ${new Date().toLocaleDateString()}</span>
      <span>💬 ${data.length} items</span>
    </p>
  </div>
  
  <div class="video-section">
    <div class="embed-wrapper">
      <iframe
        id="yt-iframe"
        src="${embedUrl}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    </div>

    <div class="seek-controls"${seekTemplate ? '' : ' style="display:none"'}>
      <span>⏱️ Jump to:</span>
      <input type="text" id="seek-input" placeholder="0:00">
      <button id="seek-btn">Go</button>
      
      <div class="timeline" id="timeline">
        <div class="timeline-track"></div>
        <div class="timeline-markers">
          ${markers.map(m => `
          <div class="timeline-marker ${m.type}" style="left: ${m.position}%" data-time="${m.timestamp}">
            <div class="tooltip">[${m.time}] ${sanitizeHTML(m.text)}</div>
          </div>
          `).join('')}
        </div>
      </div>
    </div>

    ${watchUrl ? `
    <div class="getvideo">
      <button id="getvideo-btn">⬇ Download video for offline</button>
      <small>Copies the video URL and opens an external downloader (cobalt.tools) in a new tab.
      Only save videos you have the right to download — your own uploads, Creative Commons,
      or where the platform's terms allow it.</small>
    </div>
    ` : ''}
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${data.filter(d => d.type === 'comment').length}</div>
      <div class="stat-label">Comments</div>
    </div>
    <div class="stat">
      <div class="stat-value">${data.filter(d => d.type === 'reaction').length}</div>
      <div class="stat-label">Reactions</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatTime(state.videoDuration)}</div>
      <div class="stat-label">Duration</div>
    </div>
  </div>

  <h2>Comments & Reactions</h2>
  <div class="comments-list">
    ${data.map((d, i) => `
    <div class="comment${d.type === 'reaction' ? ' reaction' : ''}" data-time="${d.timestamp}">
      <button class="timestamp">[${d.time}]</button>
      <span class="text">${d.emoji ? `<span class="emoji">${d.emoji}</span>` : ''}${sanitizeHTML(d.text)}</span>
    </div>`).join('')}
  </div>

  <div class="footer">
    <p>Exported from <strong>VideoLens</strong></p>
  </div>

  <script>
    const duration = ${state.videoDuration};
    const seekTemplate = ${JSON.stringify(seekTemplate)};
    const iframe = document.getElementById('yt-iframe');
    const seekBtn = document.getElementById('seek-btn');
    const seekInput = document.getElementById('seek-input');

    function parseTime(str) {
      if (!str) return 0;
      const parts = str.split(':').map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return parseInt(str) || 0;
    }

    function formatTime(sec) {
      if (!sec || isNaN(sec)) return '0:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const pad = n => n.toString().padStart(2, '0');
      return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }

    function seekTo(seconds) {
      if (!seekTemplate) return;
      iframe.src = seekTemplate.replace('{s}', Math.floor(seconds));
    }

    seekBtn.addEventListener('click', function() {
      var seconds = parseTime(seekInput.value);
      if (seconds >= 0) seekTo(seconds);
    });
    
    seekInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        var seconds = parseTime(seekInput.value);
        if (seconds >= 0) seekTo(seconds);
      }
    });
    
    // Timeline click
    document.getElementById('timeline').addEventListener('click', function(e) {
      if (e.target.closest('.timeline-marker')) return;
      var rect = this.getBoundingClientRect();
      var percent = (e.clientX - rect.left) / rect.width;
      seekTo(percent * duration);
    });
    
    // Marker clicks
    document.querySelectorAll('.timeline-marker').forEach(function(m) {
      m.addEventListener('click', function() {
        seekTo(parseInt(this.dataset.time));
      });
    });
    
    // Comment clicks
    document.querySelectorAll('.comment').forEach(function(c) {
      c.addEventListener('click', function() {
        seekTo(parseInt(this.dataset.time));
      });
    });

    // Download-video helper (external open-source downloader)
    var gvBtn = document.getElementById('getvideo-btn');
    if (gvBtn) {
      gvBtn.addEventListener('click', function() {
        var u = ${JSON.stringify(watchUrl || '')};
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(u).catch(function() {});
        }
        window.open('https://cobalt.tools/', '_blank', 'noopener');
        gvBtn.textContent = '✓ URL copied — paste it in the downloader tab';
        setTimeout(function() { gvBtn.textContent = '⬇ Download video for offline'; }, 4000);
      });
    }
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

  if (isLocalVideo) {
    if (state.uploadedVideo.size > CONFIG.EMBED_VIDEO_LIMIT) {
      showToast(`Video is too large to embed in a single HTML file (max ${formatFileSize(CONFIG.EMBED_VIDEO_LIMIT)}). Use the Offline Pack (ZIP) instead.`, 'warning');
      return;
    }
    // For local videos, embed as base64
    showToast('Creating HTML with embedded video...', 'info');
    
    try {
      const videoBase64 = await fileToBase64(state.uploadedVideo);
      const html = generateHTMLWithEmbeddedVideo(videoBase64, state.uploadedVideo.type);
      downloadFile(html, `${state.videoTitle}_export.html`, 'text/html');
      showToast('HTML exported with video!', 'success');
    } catch (error) {
      console.error('Export error:', error);
      showToast('Failed to export: ' + error.message, 'error');
    }
  } else {
    // For online videos, use thumbnail + link
    const html = generateHTMLContent();
    downloadFile(html, `${state.videoTitle}_export.html`, 'text/html');
    showToast('HTML exported!', 'success');
  }
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

// Generate HTML with embedded base64 video
function generateHTMLWithEmbeddedVideo(videoBase64, videoType) {
  const data = getCommentsData();
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(state.videoTitle)} - VideoLens Export</title>
  <style>
    :root { 
      --primary: #6366f1; 
      --primary-light: #818cf8;
      --secondary: #ec4899;
      --bg: #05050a; 
      --surface: #0f0f1a; 
      --surface-elevated: #151522;
      --text: #fff; 
      --text-secondary: #a0a0b8;
      --muted: #5a5a70; 
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      background: var(--bg); 
      color: var(--text); 
      line-height: 1.6; 
      padding: 2rem; 
      max-width: 1000px; 
      margin: 0 auto; 
    }
    .header { text-align: center; margin-bottom: 2rem; }
    h1 { 
      font-size: 2rem; 
      margin-bottom: 0.5rem; 
      background: linear-gradient(135deg, #6366f1, #ec4899); 
      -webkit-background-clip: text; 
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .meta { color: var(--muted); font-size: 0.875rem; margin-bottom: 1rem; }
    .meta span {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      background: var(--surface);
      border-radius: 20px;
      margin: 0.25rem;
    }
    .video-section {
      background: var(--surface);
      border-radius: 16px;
      padding: 1rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .video-container { 
      background: #000; 
      border-radius: 12px; 
      overflow: hidden;
      margin-bottom: 1rem;
    }
    .video-container video {
      width: 100%;
      max-height: 70vh;
      display: block;
    }
    .time-display {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--surface-elevated);
      border-radius: 8px;
      font-family: 'SF Mono', 'Fira Code', monospace;
    }
    .time-display .current {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--primary-light);
    }
    .time-display .duration {
      color: var(--muted);
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .stat {
      padding: 1.25rem;
      background: var(--surface);
      border-radius: 12px;
      text-align: center;
      border: 1px solid rgba(255,255,255,0.05);
    }
    .stat-value {
      font-size: 1.75rem;
      font-weight: 700;
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .stat-label {
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    h2 {
      font-size: 1.25rem;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    h2::before {
      content: '';
      display: block;
      width: 4px;
      height: 24px;
      background: var(--primary);
      border-radius: 2px;
    }
    .comments-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .comment { 
      display: flex; 
      gap: 1rem; 
      padding: 1rem 1.25rem; 
      background: var(--surface); 
      border-radius: 12px; 
      border: 1px solid rgba(255,255,255,0.05);
      transition: all 0.2s;
      cursor: pointer;
    }
    .comment:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      border-color: var(--primary);
    }
    .comment.active {
      border-color: var(--primary);
      background: var(--surface-elevated);
      box-shadow: 0 0 20px rgba(99, 102, 241, 0.2);
    }
    .comment.reaction { border-left: 3px solid #fbbf24; }
    .timestamp { 
      padding: 0.35rem 0.75rem; 
      background: linear-gradient(135deg, var(--primary), var(--secondary));
      border-radius: 8px; 
      font-family: 'SF Mono', 'Fira Code', monospace; 
      font-size: 0.8rem; 
      flex-shrink: 0;
      font-weight: 600;
      color: white;
      border: none;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .timestamp:hover { transform: scale(1.05); }
    .text { flex: 1; color: var(--text-secondary); }
    .emoji { font-size: 1.25rem; margin-right: 0.5rem; }
    .footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 2rem;
      border-top: 1px solid rgba(255,255,255,0.05);
      color: var(--muted);
      font-size: 0.875rem;
    }
    @media (max-width: 600px) {
      body { padding: 1rem; }
      .comment { flex-direction: column; gap: 0.5rem; }
      .timestamp { align-self: flex-start; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${sanitizeHTML(state.videoTitle)}</h1>
    <p class="meta">
      <span>📺 Local Video</span>
      <span>📅 ${new Date().toLocaleDateString()}</span>
      <span>💬 ${data.length} items</span>
    </p>
  </div>
  
  <div class="video-section">
    <div class="video-container">
      <video id="video" controls>
        <source src="${videoBase64}" type="${videoType}">
        Your browser does not support video.
      </video>
    </div>
    <div class="time-display">
      <span class="current" id="currentTime">0:00</span>
      <span class="duration">/ ${formatTime(state.videoDuration)}</span>
    </div>
  </div>

  <div class="stats">
    <div class="stat">
      <div class="stat-value">${data.filter(d => d.type === 'comment').length}</div>
      <div class="stat-label">Comments</div>
    </div>
    <div class="stat">
      <div class="stat-value">${data.filter(d => d.type === 'reaction').length}</div>
      <div class="stat-label">Reactions</div>
    </div>
    <div class="stat">
      <div class="stat-value">${formatTime(state.videoDuration)}</div>
      <div class="stat-label">Duration</div>
    </div>
  </div>

  <h2>Comments & Reactions</h2>
  <div class="comments-list" id="commentsList">
    ${data.map((d, i) => `
    <div class="comment${d.type === 'reaction' ? ' reaction' : ''}" data-time="${d.timestamp}" data-index="${i}">
      <button class="timestamp" onclick="seekTo(${d.timestamp})">[${d.time}]</button>
      <span class="text">${d.emoji ? `<span class="emoji">${d.emoji}</span>` : ''}${sanitizeHTML(d.text)}</span>
    </div>`).join('')}
  </div>

  <div class="footer">
    <p>Exported from <strong>VideoLens</strong> — Video Reactions & Comments Tool</p>
  </div>

  <script>
    const video = document.getElementById('video');
    const currentTimeEl = document.getElementById('currentTime');
    const comments = document.querySelectorAll('.comment');
    
    function formatTime(sec) {
      if (!sec || isNaN(sec)) return '0:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const pad = n => n.toString().padStart(2, '0');
      return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }
    
    function seekTo(time) {
      video.currentTime = time;
      video.play();
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    video.addEventListener('timeupdate', () => {
      currentTimeEl.textContent = formatTime(video.currentTime);
      
      // Highlight active comments
      const ct = video.currentTime;
      comments.forEach(c => {
        const t = parseInt(c.dataset.time);
        if (ct >= t && ct < t + 3) {
          c.classList.add('active');
        } else {
          c.classList.remove('active');
        }
      });
    });
    
    // Click comment to seek
    comments.forEach(c => {
      c.addEventListener('click', () => {
        seekTo(parseInt(c.dataset.time));
      });
    });
  </script>
</body>
</html>`;
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
                <strong>Don't have the file yet?</strong>
                <p>Use the platform's official download/offline feature, or an external downloader — this button copies the video URL and opens one in a new tab.</p>
                <button class="btn btn--secondary btn--sm" id="packVideoDownloader">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Open video downloader</span>
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
    modal.querySelector('#packVideoDownloader')?.addEventListener('click', async () => {
      const url = state.originalVideoUrl || getVideoWatchUrl();
      try {
        if (url) await navigator.clipboard.writeText(url);
        showToast('Video URL copied — paste it in the downloader, then come back and attach the file', 'info');
      } catch {
        showToast('Paste the video URL in the downloader, then come back and attach the file', 'info');
      }
      window.open('https://cobalt.tools/', '_blank', 'noopener');
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
      // so offer to bundle a local copy the user already has.
      const localCopy = await askForPackVideo();
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
      let textContent = `VideoLens Offline Pack\n${'='.repeat(50)}\n\n`;
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
        srt += `${index + 1}\n${formatSRTTime(item.timestamp)} --> ${formatSRTTime(item.timestamp + 3)}\n${item.text}\n\n`;
      });
      folder.file('transcript.srt', srt);
    }

    // README
    const watchUrl = getVideoWatchUrl();
    const readme = `# VideoLens Offline Pack

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
*Exported with VideoLens — https://vidlens.net/*
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
<title>${sanitizeHTML(state.videoTitle)} — VideoLens Offline Pack</title>
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
  <p>Offline Pack exported from <strong>VideoLens</strong> — <a href="https://vidlens.net/" target="_blank" rel="noopener">vidlens.net</a></p>
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
document.title = PACK.title + ' — VideoLens Offline Pack';
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
    (PACK.watchUrl ? '<button class="btn btn--ghost" id="dlHelpBtn">⬇ Open video downloader</button>' : '') +
    '</div>' +
    (PACK.watchUrl ? '<p style="margin-top:0.75rem;font-size:0.72rem;color:var(--muted);">The downloader button copies the video URL and opens cobalt.tools in a new tab. Only save videos you have the right to download.</p>' : '') +
    '</div>';

  var dlBtn = document.getElementById('dlHelpBtn');
  if (dlBtn) {
    dlBtn.addEventListener('click', function() {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(PACK.watchUrl).catch(function() {});
      }
      window.open('https://cobalt.tools/', '_blank', 'noopener');
      hint('Video URL copied — paste it in the downloader, then drop the file here');
    });
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
      '<span class="ctext">' + (c.emoji ? '<span class="emoji">' + c.emoji + '</span>' : '') + esc(c.text) + '</span>';
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
  
  // Change video button
  elements.changeVideoBtn?.addEventListener('click', () => {
    state.videoLoaded = false;
    state.ytPlayer = null;
    state.vimeoPlayer = null;
    state.videoAspectRatio = null;
    state.originalVideoUrl = null;
    state.videoAuthor = null;
    state.videoThumbnail = null;
    document.title = 'VideoLens - Video Reactions & Comments';
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
  
  elements.submitReaction?.addEventListener('click', () => {
    const text = elements.reactionText?.value.trim();
    if (!text) {
      showToast('Please enter some text', 'error');
      return;
    }
    
    addComment({
      text,
      timestamp: Math.floor(getCurrentTime()),
      type: 'reaction',
      emoji: elements.selectedEmojiInput?.value,
    });
    
    hideModal(elements.reactionModal);
    showToast('Reaction added!');
  });
  
  // Comment modal
  elements.closeCommentModal?.addEventListener('click', () => hideModal(elements.commentModal));
  elements.cancelComment?.addEventListener('click', () => hideModal(elements.commentModal));
  
  elements.commentText?.addEventListener('input', () => {
    if (elements.commentCharCount) {
      elements.commentCharCount.textContent = elements.commentText.value.length;
    }
  });
  
  elements.submitComment?.addEventListener('click', () => {
    const text = elements.commentText?.value.trim();
    if (!text) {
      showToast('Please enter some text', 'error');
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

    addComment({
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
    toggleTranscription();
  });
  
  // Transcript actions
  elements.copyTranscriptBtn?.addEventListener('click', copyTranscript);
  elements.exportTranscriptBtn?.addEventListener('click', exportTranscriptSRT);
  elements.clearTranscriptBtn?.addEventListener('click', clearTranscript);
  elements.addAllTranscriptBtn?.addEventListener('click', addAllTranscriptAsComments);
  elements.importTranscriptBtn?.addEventListener('click', showManualTranscriptModal);
  
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
          If VideoLens saved your timestamps today, a star on GitHub keeps this
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