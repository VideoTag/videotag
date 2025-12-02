/**
 * ReactVid - Video Reactions & Comments Application
 * 
 * A premium application for adding timestamped reactions
 * and comments to videos from multiple platforms.
 * 
 * @version 4.0.0 - Added ZIP export, fixed exports, improved video embeds
 */

// ============================================
// 1. CONFIGURATION
// ============================================

const CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  TIMELINE_UPDATE_INTERVAL: 500,
  TOAST_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
};

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
    if (state.currentProvider === 'upload') {
      const video = $('#localVideo');
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

function showConfirmModal(message, onConfirm) {
  const messageEl = $('#confirmMessage');
  if (messageEl) messageEl.textContent = message;
  
  showModal(elements.confirmModal);
  
  const handleConfirm = () => {
    hideModal(elements.confirmModal);
    onConfirm();
    elements.confirmOk?.removeEventListener('click', handleConfirm);
  };
  
  elements.confirmOk?.addEventListener('click', handleConfirm);
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
      const video = $('#localVideo');
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
        const videoURL = URL.createObjectURL(state.uploadedVideo);
        elements.videoContainer.innerHTML = `
          <video id="localVideo" controls playsinline style="width:100%;height:100%;object-fit:contain;background:#000;">
            <source src="${videoURL}" type="${state.uploadedVideo.type}">
            Your browser does not support the video tag.
          </video>`;
        state.videoTitle = state.uploadedVideo.name || 'Uploaded Video';
        
        const video = $('#localVideo');
        if (video) {
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
        break;
        
      default:
        showToast('Unknown video provider', 'error');
        toggleLoading(false);
        return;
    }
    
    state.videoLoaded = true;
    state.currentVideoId = videoId || `local-${Date.now()}`;
    
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
    const textEl = c.querySelector('.comment-text');
    const emojiEl = textEl?.querySelector('.reaction-emoji');
    
    return {
      text: textEl?.textContent.replace(emojiEl?.textContent || '', '').trim() || '',
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
  return Array.from(elements.commentsList?.children || []).map(c => ({
    timestamp: parseInt(c.dataset.timestamp) || 0,
    time: formatTime(parseInt(c.dataset.timestamp) || 0),
    type: c.classList.contains('reaction') ? 'reaction' : 'comment',
    emoji: c.querySelector('.reaction-emoji')?.textContent || null,
    text: c.querySelector('.comment-text')?.textContent.replace(/^[\u{1F300}-\u{1F9FF}]/u, '').trim() || '',
  }));
}

function exportCSV() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments to export', 'error');
    return;
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
    showToast('No comments to export', 'error');
    return;
  }
  
  let text = `ReactVid Export\n`;
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

function exportPDF() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments to export', 'error');
    return;
  }
  
  if (typeof window.jspdf === 'undefined') {
    showToast('PDF library not loaded. Please refresh the page.', 'error');
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(24);
  doc.setTextColor(99, 102, 241);
  doc.text('ReactVid Export', 20, 25);
  
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

// Main HTML generator for online videos (YouTube, Vimeo, etc.)
function generateHTMLContent() {
  const data = getCommentsData();
  const markers = getTimelineMarkersData();
  const isYouTube = state.currentProvider === 'youtube' || state.currentProvider === 'youtube_shorts';
  const isVimeo = state.currentProvider === 'vimeo';
  const videoId = state.currentVideoId;
  
  // Simple embed URL like main app
  let embedUrl = '';
  if (isYouTube) {
    embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  } else if (isVimeo) {
    embedUrl = `https://player.vimeo.com/video/${videoId}`;
  } else if (state.currentProvider === 'dailymotion') {
    embedUrl = `https://www.dailymotion.com/embed/video/${videoId}`;
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(state.videoTitle)} - ReactVid Export</title>
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
    .video-container { 
      position: relative;
      background: #000; 
      border-radius: 12px; 
      overflow: hidden;
      margin-bottom: 1rem;
      aspect-ratio: 16/9;
    }
    .video-container iframe {
      width: 100%;
      height: 100%;
      border: none;
      border-radius: 12px;
    }
    .controls {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: var(--surface-elevated);
      border-radius: 8px;
    }
    .time-display {
      font-family: 'SF Mono', 'Fira Code', monospace;
      font-size: 1rem;
      min-width: 100px;
    }
    .time-display .current { font-weight: 700; color: var(--primary-light); }
    .time-display .duration { color: var(--muted); }
    .timeline {
      flex: 1;
      position: relative;
      height: 40px;
      cursor: pointer;
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
      .controls { flex-direction: column; }
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
    <div class="video-container">
      <iframe 
        id="player"
        src="${embedUrl}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
    </div>
    
    <div class="controls">
      <div class="time-display">
        <span class="current" id="currentTime">0:00</span>
        <span class="duration">/ ${formatTime(state.videoDuration)}</span>
      </div>
      
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
    <p>Exported from <strong>ReactVid</strong></p>
  </div>

  <script>
    const duration = ${state.videoDuration};
    const videoId = '${videoId}';
    const isYouTube = ${isYouTube};
    const iframe = document.getElementById('player');
    
    function formatTime(sec) {
      if (!sec || isNaN(sec)) return '0:00';
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const pad = n => n.toString().padStart(2, '0');
      return h > 0 ? h + ':' + pad(m) + ':' + pad(s) : m + ':' + pad(s);
    }
    
    function seekTo(seconds) {
      if (isYouTube) {
        iframe.src = 'https://www.youtube.com/embed/' + videoId + '?rel=0&modestbranding=1&start=' + Math.floor(seconds) + '&autoplay=1';
      } else {
        iframe.src = iframe.src.split('?')[0] + '?start=' + Math.floor(seconds) + '&autoplay=1';
      }
      document.getElementById('currentTime').textContent = formatTime(seconds);
      document.querySelector('.video-section').scrollIntoView({ behavior: 'smooth' });
    }
    
    // Timeline click
    document.getElementById('timeline').addEventListener('click', e => {
      if (e.target.closest('.timeline-marker')) return;
      const rect = e.currentTarget.getBoundingClientRect();
      seekTo(((e.clientX - rect.left) / rect.width) * duration);
    });
    
    // Marker clicks
    document.querySelectorAll('.timeline-marker').forEach(m => {
      m.addEventListener('click', () => seekTo(parseInt(m.dataset.time)));
    });
    
    // Comment clicks
    document.querySelectorAll('.comment').forEach(c => {
      c.addEventListener('click', () => seekTo(parseInt(c.dataset.time)));
    });
  </script>
</body>
</html>`;
}

async function exportHTML() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments to export', 'error');
    return;
  }
  
  const isLocalVideo = state.currentProvider === 'upload' && state.uploadedVideo;
  
  if (isLocalVideo) {
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
  <title>${sanitizeHTML(state.videoTitle)} - ReactVid Export</title>
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
    <p>Exported from <strong>ReactVid</strong> — Video Reactions & Comments Tool</p>
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

async function exportZIP() {
  const data = getCommentsData();
  if (data.length === 0) {
    showToast('No comments to export', 'error');
    return;
  }
  
  if (typeof JSZip === 'undefined') {
    showToast('ZIP library not loaded. Please refresh the page.', 'error');
    return;
  }
  
  showToast('Creating ZIP package...', 'info');
  
  try {
    const zip = new JSZip();
    const folderName = sanitizeFileName(state.videoTitle) || 'reactvid_export';
    const folder = zip.folder(folderName);
    
    // For local uploads, include the video file
    let videoFileName = null;
    const isLocalVideo = state.currentProvider === 'upload' && state.uploadedVideo;
    
    if (isLocalVideo) {
      showToast('Adding video to ZIP (this may take a moment)...', 'info');
      videoFileName = sanitizeFileName(state.uploadedVideo.name) || 'video.mp4';
      
      // Add video file to ZIP
      const videoData = await state.uploadedVideo.arrayBuffer();
      folder.file(videoFileName, videoData);
    }
    
    // Add HTML file with embedded video (use local file for uploads)
    const htmlContent = generateHTMLContentForZIP(videoFileName);
    folder.file('index.html', htmlContent);
    
    // Add JSON data
    const jsonData = {
      video: {
        title: state.videoTitle,
        provider: state.currentProvider,
        id: state.currentVideoId,
        url: state.originalVideoUrl || getVideoEmbedUrl(),
        duration: state.videoDuration,
        localFile: videoFileName || null,
      },
      exportDate: new Date().toISOString(),
      exportVersion: '4.0.0',
      comments: data,
      transcript: transcriptionState.transcript,
      stats: {
        totalComments: data.filter(c => c.type === 'comment').length,
        totalReactions: data.filter(c => c.type === 'reaction').length,
        avgTimestamp: data.length > 0 
          ? Math.floor(data.reduce((sum, c) => sum + c.timestamp, 0) / data.length)
          : 0,
      }
    };
    folder.file('data.json', JSON.stringify(jsonData, null, 2));
    
    // Add CSV file
    let csv = 'timestamp,time,type,emoji,text\n';
    data.forEach(d => {
      csv += `${d.timestamp},"${d.time}","${d.type}","${d.emoji || ''}","${d.text.replace(/"/g, '""')}"\n`;
    });
    folder.file('comments.csv', csv);
    
    // Add plain text file
    let textContent = `ReactVid Export\n`;
    textContent += `${'='.repeat(50)}\n\n`;
    textContent += `Video: ${state.videoTitle}\n`;
    textContent += `Platform: ${PROVIDER_NAMES[state.currentProvider]}\n`;
    textContent += `Duration: ${formatTime(state.videoDuration)}\n`;
    textContent += `Export Date: ${new Date().toLocaleString()}\n`;
    textContent += `Total Items: ${data.length}\n\n`;
    textContent += `${'='.repeat(50)}\n\n`;
    textContent += `COMMENTS & REACTIONS\n`;
    textContent += `${'-'.repeat(50)}\n\n`;
    
    data.forEach(d => {
      textContent += `[${d.time}] ${d.type === 'reaction' ? d.emoji + ' ' : ''}${d.text}\n\n`;
    });
    folder.file('comments.txt', textContent);
    
    // Add SRT transcript if available
    if (transcriptionState.transcript.length > 0) {
      const sorted = [...transcriptionState.transcript].sort((a, b) => a.timestamp - b.timestamp);
      let srt = '';
      sorted.forEach((item, index) => {
        const startTime = formatSRTTime(item.timestamp);
        const endTime = formatSRTTime(item.timestamp + 3);
        srt += `${index + 1}\n${startTime} --> ${endTime}\n${item.text}\n\n`;
      });
      folder.file('transcript.srt', srt);
    }
    
    // Add README
    const readme = `# ReactVid Export

## ${state.videoTitle}

**Platform:** ${PROVIDER_NAMES[state.currentProvider]}
**Export Date:** ${new Date().toLocaleString()}

## Files Included

- \`index.html\` - Interactive HTML viewer with video player
${isLocalVideo ? `- \`${videoFileName}\` - The video file` : ''}
- \`data.json\` - Complete data in JSON format
- \`comments.csv\` - Spreadsheet-compatible format
- \`comments.txt\` - Plain text format
${transcriptionState.transcript.length > 0 ? '- `transcript.srt` - Video transcript in SRT format' : ''}

## Statistics

- **Total Comments:** ${data.filter(c => c.type === 'comment').length}
- **Total Reactions:** ${data.filter(c => c.type === 'reaction').length}
- **Video Duration:** ${formatTime(state.videoDuration)}

## Usage

1. Open \`index.html\` in any web browser
2. Click timestamps to jump to that moment in the video
3. Import \`data.json\` into other applications
4. Open \`comments.csv\` in Excel or Google Sheets

${isLocalVideo ? '**Note:** Keep the video file in the same folder as index.html!' : ''}

---
*Exported with ReactVid*
`;
    folder.file('README.md', readme);
    
    // Generate ZIP
    showToast('Compressing files...', 'info');
    const content = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    }, (metadata) => {
      // Progress callback
      if (metadata.percent) {
        const percent = Math.round(metadata.percent);
        if (percent % 20 === 0) {
          console.log(`ZIP progress: ${percent}%`);
        }
      }
    });
    
    downloadBlob(content, `${folderName}.zip`);
    showToast('ZIP package exported successfully!', 'success');
    
  } catch (error) {
    console.error('ZIP export error:', error);
    showToast('Failed to create ZIP package: ' + error.message, 'error');
  }
}

// Generate HTML specifically for ZIP export (with local video support)
function generateHTMLContentForZIP(localVideoFile = null) {
  const data = getCommentsData();
  const watchUrl = getVideoWatchUrl();
  const isYouTube = state.currentProvider === 'youtube' || state.currentProvider === 'youtube_shorts';
  const isLocalVideo = localVideoFile !== null;
  
  const thumbnailUrl = isYouTube 
    ? `https://img.youtube.com/vi/${state.currentVideoId}/maxresdefault.jpg`
    : null;
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHTML(state.videoTitle)} - ReactVid Export</title>
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
      max-width: 900px; 
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
    .video-container { 
      background: #000; 
      border-radius: 16px; 
      overflow: hidden; 
      margin-bottom: 2rem; 
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }
    .video-container video {
      width: 100%;
      display: block;
      max-height: 70vh;
    }
    .video-card { 
      position: relative;
      aspect-ratio: 16/9; 
      background: #000; 
      border-radius: 16px; 
      overflow: hidden; 
      margin-bottom: 2rem; 
      max-width: 720px;
      margin-left: auto;
      margin-right: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      display: block;
      text-decoration: none;
    }
    .video-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .video-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.4);
      transition: background 0.3s;
    }
    .video-card:hover .video-overlay { background: rgba(0,0,0,0.6); }
    .play-button {
      width: 80px;
      height: 80px;
      background: var(--primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1rem;
      transition: transform 0.3s, box-shadow 0.3s;
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.5);
    }
    .video-card:hover .play-button {
      transform: scale(1.1);
      box-shadow: 0 8px 30px rgba(99, 102, 241, 0.7);
    }
    .play-button svg { width: 32px; height: 32px; fill: white; margin-left: 4px; }
    .video-link {
      color: white;
      font-weight: 600;
      font-size: 1.1rem;
      padding: 0.5rem 1.5rem;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
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
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .comment:hover {
      transform: translateX(4px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
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
      cursor: pointer;
      text-decoration: none;
      color: white;
      border: none;
    }
    .timestamp:hover { opacity: 0.9; transform: scale(1.05); }
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
    .footer a { color: var(--primary-light); text-decoration: none; }
    .current-time-display {
      text-align: center;
      padding: 0.5rem;
      background: var(--surface);
      border-radius: 8px;
      margin-bottom: 1rem;
      font-family: monospace;
      font-size: 1.2rem;
      color: var(--primary-light);
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
      <span>📺 ${PROVIDER_NAMES[state.currentProvider]}</span>
      <span>📅 ${new Date().toLocaleDateString()}</span>
      <span>💬 ${data.length} items</span>
    </p>
  </div>
  
  ${isLocalVideo ? `
  <!-- Local Video Player -->
  <div class="video-container">
    <video id="videoPlayer" controls>
      <source src="${localVideoFile}" type="${state.uploadedVideo?.type || 'video/mp4'}">
      Your browser does not support the video tag.
    </video>
  </div>
  <div class="current-time-display">Current: <span id="currentTime">0:00</span> / ${formatTime(state.videoDuration)}</div>
  ` : (watchUrl ? `
  <!-- Online Video Link -->
  <a href="${watchUrl}" target="_blank" rel="noopener" class="video-card">
    ${thumbnailUrl ? `<img src="${thumbnailUrl}" alt="Video thumbnail" onerror="this.style.display='none'">` : ''}
    <div class="video-overlay">
      <div class="play-button">
        <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
      </div>
      <span class="video-link">▶ Watch on ${PROVIDER_NAMES[state.currentProvider]}</span>
    </div>
  </a>
  ` : `
  <div class="video-card">
    <div class="video-overlay" style="background: linear-gradient(135deg, var(--surface), var(--surface-elevated));">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:48px;height:48px;opacity:0.5;margin-bottom:1rem;">
        <polygon points="5 3 19 12 5 21 5 3"></polygon>
      </svg>
      <p>Video not available</p>
    </div>
  </div>
  `)}

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
    ${data.map(d => {
      const timeLink = isYouTube 
        ? `https://www.youtube.com/watch?v=${state.currentVideoId}&t=${d.timestamp}s`
        : (state.currentProvider === 'vimeo' 
          ? `https://vimeo.com/${state.currentVideoId}#t=${d.timestamp}s`
          : watchUrl);
      
      if (isLocalVideo) {
        return `
    <div class="comment${d.type === 'reaction' ? ' reaction' : ''}">
      <button class="timestamp" onclick="seekTo(${d.timestamp})" title="Jump to ${d.time}">[${d.time}]</button>
      <span class="text">${d.emoji ? `<span class="emoji">${d.emoji}</span>` : ''}${sanitizeHTML(d.text)}</span>
    </div>`;
      } else {
        return `
    <div class="comment${d.type === 'reaction' ? ' reaction' : ''}">
      <a href="${timeLink || '#'}" target="_blank" rel="noopener" class="timestamp" title="Watch at ${d.time}">[${d.time}]</a>
      <span class="text">${d.emoji ? `<span class="emoji">${d.emoji}</span>` : ''}${sanitizeHTML(d.text)}</span>
    </div>`;
      }
    }).join('')}
  </div>

  <div class="footer">
    <p>Exported from <strong>ReactVid</strong> — Video Reactions & Comments Tool</p>
    ${!isLocalVideo && watchUrl ? `<p style="margin-top:0.5rem;"><a href="${watchUrl}" target="_blank">🔗 Watch full video on ${PROVIDER_NAMES[state.currentProvider]}</a></p>` : ''}
  </div>

  ${isLocalVideo ? `
  <script>
    const video = document.getElementById('videoPlayer');
    const currentTimeDisplay = document.getElementById('currentTime');
    
    // Format seconds to MM:SS or HH:MM:SS
    function formatTime(seconds) {
      if (!seconds || isNaN(seconds)) return '0:00';
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      const secs = Math.floor(seconds % 60);
      const pad = n => n.toString().padStart(2, '0');
      return hrs > 0 ? hrs + ':' + pad(mins) + ':' + pad(secs) : mins + ':' + pad(secs);
    }
    
    // Update current time display
    video.addEventListener('timeupdate', function() {
      currentTimeDisplay.textContent = formatTime(video.currentTime);
    });
    
    // Seek to specific time
    function seekTo(seconds) {
      video.currentTime = seconds;
      video.play();
      
      // Scroll video into view
      video.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    
    // Highlight current comment based on video time
    video.addEventListener('timeupdate', function() {
      const currentTime = video.currentTime;
      document.querySelectorAll('.comment').forEach(comment => {
        const btn = comment.querySelector('.timestamp');
        if (btn) {
          const time = parseInt(btn.getAttribute('onclick').match(/\\d+/)[0]);
          if (Math.abs(currentTime - time) < 2) {
            comment.style.borderColor = 'var(--primary)';
            comment.style.background = 'var(--surface-elevated)';
          } else {
            comment.style.borderColor = '';
            comment.style.background = '';
          }
        }
      });
    });
  </script>
  ` : ''}
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
  initializePlayer(null);
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
    
    const videoId = extractVideoID(url, state.currentProvider);
    
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
  
  // Export handlers - only HTML and ZIP
  elements.exportHTML?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportHTML();
    closeExportDropdown();
  });
  
  elements.exportZIP?.addEventListener('click', () => {
    if (!validateExport()) return;
    exportZIP();
    closeExportDropdown();
  });
  
  // Modal overlays
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) hideModal(overlay);
    });
  });
  
  // Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay:not([hidden])').forEach(m => hideModal(m));
      $('#manualTranscriptModal')?.remove();
      closeExportDropdown();
    }
  });
  
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
  if (!elements.commentsList?.children.length) {
    showToast('No comments to export', 'error');
    return false;
  }
  return true;
}

// ============================================
// 20. INITIALIZATION
// ============================================

function init() {
  cacheElements();
  initEventListeners();
  
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