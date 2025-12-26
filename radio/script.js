const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const logo = document.getElementById('logo');
const volumeSlider = document.getElementById('volume-slider');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');
const autoplayOverlay = document.getElementById('autoplay-overlay');

// SVG markup for play / pause states
const PLAY_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M5 3v18l15-9L5 3z" fill="#333"></path>
</svg>`;
const PAUSE_SVG = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <rect x="6" y="4" width="4" height="16" fill="#333"></rect>
    <rect x="14" y="4" width="4" height="16" fill="#333"></rect>
</svg>`;

const trackTitleEl = document.getElementById('track-title');
const trackArtistEl = document.getElementById('track-artist');
const trackCoverEl = document.getElementById('track-cover');

let isPlaying = false;
let trackPollInterval = 10000; // ms
let trackPollHandle = null;
const TRACK_API = 'https://api.radioking.io/widget/radio/radio-wiktowickie/track/current';

// Update UI state
function updateUI(playing) {
    isPlaying = playing;
    if (playing) {
        playIcon.innerHTML = PAUSE_SVG;
        logo.classList.add('playing');
        autoplayOverlay.setAttribute('aria-hidden', 'true');
    } else {
        playIcon.innerHTML = PLAY_SVG;
        logo.classList.remove('playing');
    }
}

// Play or Pause function
function togglePlay() {
    if (isPlaying) {
        pauseAudio();
    } else {
        // If overlay visible, hide it and start
        if (autoplayOverlay.getAttribute('aria-hidden') === 'false') {
            autoplayOverlay.setAttribute('aria-hidden', 'true');
        }
        playAudio(true);
    }
}

async function playAudio(userInitiated = false) {
    try {
        // try to play; keep muted=false only if userInitiated or autoplay succeeded
        if (!userInitiated) {
            audio.muted = true; // allow muted autoplay attempts
        }
        await audio.play();
        // If autoplayed silently, unmute gently
        if (!userInitiated) {
            // small delay to avoid abrupt sound
            setTimeout(() => { audio.muted = false; }, 300);
        } else {
            audio.muted = false;
        }
        updateUI(true);
        return true;
    } catch (err) {
        // blocked by browser
        console.log('Autoplay blocked:', err);
        return false;
    }
}

function pauseAudio() {
    audio.pause();
    updateUI(false);
}

// Update progress bar
function updateProgress(e) {
    if (isPlaying) {
        const { duration, currentTime } = e.srcElement;
        if (duration && isFinite(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            progressContainer.style.display = 'block';
        } else {
            progressBar.style.width = '100%';
            progressContainer.style.display = 'none';
        }
    }
}

// Set progress bar
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audio.duration;
    if (duration && isFinite(duration)) {
        audio.currentTime = (clickX / width) * duration;
    }
}

 // Volume control
 function handleVolumeChange() {
     audio.volume = volumeSlider.value;
     const volLow = document.getElementById('vol-low');
     const volHigh = document.getElementById('vol-high');
     const v = parseFloat(volumeSlider.value);
     if (v === 0) {
         volLow.style.opacity = '0.3';
         volHigh.style.opacity = '0.3';
     } else if (v < 0.5) {
         volLow.style.opacity = '1';
         volHigh.style.opacity = '0.4';
     } else {
         volLow.style.opacity = '0.6';
         volHigh.style.opacity = '1';
     }
 }

// Fetch current track info
async function fetchCurrentTrack() {
    try {
        const res = await fetch(TRACK_API, {cache: "no-store"});
        if (!res.ok) throw new Error('Network response not ok');
        const data = await res.json();
        const track = data.track || data.currentTrack || data.song || data;
        const title = track.title || track.name || track.trackTitle || '';
        const artist = track.artist || track.artists || track.author || '';
        let cover = track.cover || track.picture || track.artwork || '';
        if (typeof cover === 'object' && cover !== null) {
            cover = cover.url || cover.src || '';
        }
        updateTrackUI(title, artist, cover);
    } catch (err) {
        console.log('Błąd pobierania aktualnego utworu:', err);
        trackTitleEl.textContent = 'Brak danych';
        trackArtistEl.textContent = '';
    }
}

function updateTrackUI(title, artist, cover) {
    trackTitleEl.textContent = title || 'Nieznany tytuł';
    if (!cover) {
        trackArtistEl.textContent = 'Nieznany autor';
        trackCoverEl.src = 'brakikony.png';
    } else {
        trackArtistEl.textContent = artist || '';
        trackCoverEl.src = cover;
    }
}

// Start polling the track API
function startTrackPolling() {
    if (trackPollHandle) clearInterval(trackPollHandle);
    fetchCurrentTrack();
    trackPollHandle = setInterval(fetchCurrentTrack, trackPollInterval);
}

// Event Listeners
playBtn.addEventListener('click', () => togglePlay());
audio.addEventListener('timeupdate', updateProgress);
progressContainer.addEventListener('click', setProgress);
volumeSlider.addEventListener('input', handleVolumeChange);

// End of track handling (restart for demo purposes)
audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    playAudio();
});

// Set initial volume
audio.volume = volumeSlider.value;

// Autoplay handling + overlay fallback
window.addEventListener('load', () => {
    startTrackPolling();

    // immediate muted attempt (allowed in many browsers)
    let retryHandle = null;
    const RETRY_INTERVAL = 3000;
    let attempts = 0;
    const MAX_AUTOPLAY_ATTEMPTS = 6;

    async function attemptAutoplay() {
        attempts++;
        const ok = await playAudio(false);
        if (ok) {
            if (retryHandle) {
                clearInterval(retryHandle);
                retryHandle = null;
            }
            return;
        }
        if (attempts >= MAX_AUTOPLAY_ATTEMPTS) {
            // Show overlay prompting a simple click/tap to start (works on GitHub Pages too)
            autoplayOverlay.setAttribute('aria-hidden', 'false');
            if (retryHandle) {
                clearInterval(retryHandle);
                retryHandle = null;
            }
        } else {
            if (!retryHandle) {
                retryHandle = setInterval(attemptAutoplay, RETRY_INTERVAL);
            }
        }
    }

    attemptAutoplay();

    // When user interacts with the overlay, start playback with user gesture (unmuted)
    const startFromOverlay = async (e) => {
        e.preventDefault();
        autoplayOverlay.setAttribute('aria-hidden', 'true');
        const ok = await playAudio(true);
        if (!ok) {
            // if still blocked, show overlay again
            autoplayOverlay.setAttribute('aria-hidden', 'false');
        }
    };
    autoplayOverlay.addEventListener('click', startFromOverlay, { once: true });
    autoplayOverlay.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            startFromOverlay(e);
        }
    });

    // Try again when page becomes visible
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') attemptAutoplay();
    });

    // Also allow quick user gesture anywhere to start (helps on some restrictive browsers)
    const quickStart = async () => {
        const ok = await playAudio(true);
        if (ok) {
            autoplayOverlay.setAttribute('aria-hidden', 'true');
            window.removeEventListener('pointerdown', quickStart);
        }
    };
    window.addEventListener('pointerdown', quickStart, { once: true });
});

// Add a simple visual feedback for logo click
logo.addEventListener('click', () => {
    logo.style.transform = 'scale(1.1)';
    setTimeout(() => {
        logo.style.transform = 'scale(1)';
    }, 200);
});
