const audio = document.getElementById('audio-player');
const playBtn = document.getElementById('play-btn');
const playIcon = document.getElementById('play-icon');
const logo = document.getElementById('logo');
const volumeSlider = document.getElementById('volume-slider');
const progressBar = document.getElementById('progress-bar');
const progressContainer = document.getElementById('progress-container');

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
        // show pause svg when playing
        playIcon.innerHTML = PAUSE_SVG;
        logo.classList.add('playing');
    } else {
        // show play svg when paused
        playIcon.innerHTML = PLAY_SVG;
        logo.classList.remove('playing');
    }
}

// Play or Pause function
function togglePlay() {
    if (isPlaying) {
        pauseAudio();
    } else {
        playAudio();
    }
}

function playAudio() {
    audio.play().then(() => {
        updateUI(true);
    }).catch(error => {
        console.log("Odtwarzanie zablokowane przez przeglądarkę. Czekam na interakcję.");
    });
}

function pauseAudio() {
    audio.pause();
    updateUI(false);
}

// Update progress bar
function updateProgress(e) {
    if (isPlaying) {
        const { duration, currentTime } = e.srcElement;
        // Check if it's a live stream (Infinity duration)
        if (duration && isFinite(duration)) {
            const progressPercent = (currentTime / duration) * 100;
            progressBar.style.width = `${progressPercent}%`;
            progressContainer.style.display = 'block';
        } else {
            // Live stream handling
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
     // Optional: adjust visual emphasis between low/high icons
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

        // Radioking widget returns structure like: { track: { title, artist, cover } } or similar.
        // We'll attempt to safely read common fields.
        const track = data.track || data.currentTrack || data.song || data;
        const title = track.title || track.name || track.trackTitle || '';
        const artist = track.artist || track.artists || track.author || '';
        let cover = track.cover || track.picture || track.artwork || '';

        // Radioking sometimes returns full URLs or objects - if object, try to get url property
        if (typeof cover === 'object' && cover !== null) {
            cover = cover.url || cover.src || '';
        }

        updateTrackUI(title, artist, cover);
    } catch (err) {
        // On error, keep existing UI but mark as unavailable
        console.log('Błąd pobierania aktualnego utworu:', err);
        trackTitleEl.textContent = 'Brak danych';
        trackArtistEl.textContent = '';
        // don't change cover on transient errors
    }
}

function updateTrackUI(title, artist, cover) {
    trackTitleEl.textContent = title || 'Nieznany tytuł';
    // If no cover provided, treat artist as unknown and use fallback icon
    if (!cover) {
        trackArtistEl.textContent = 'Nieznany autor';
        trackCoverEl.src = 'brakikony.png';
    } else {
        trackArtistEl.textContent = artist || '';
        // Use cover directly; for security browsers will fetch it.
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
playBtn.addEventListener('click', togglePlay);
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

 // Start polling track info once the page loads and handle autoplay fallback.
window.addEventListener('load', () => {
    startTrackPolling();

    // Strategy: start muted playback immediately (muted autoplay is allowed in most browsers),
    // then keep retrying play() while muted every few seconds and on visibilitychange.
    // Once play() succeeds, unmute and update UI.
    audio.muted = true; // ensure muted so autoplay is more likely to succeed
    let retryHandle = null;
    const RETRY_INTERVAL = 3000;

    async function tryPlayOnce() {
        try {
            await audio.play();
            // playback started (muted). Unmute after a short fade to avoid abruptness.
            audio.muted = false;
            updateUI(true);
            if (retryHandle) {
                clearInterval(retryHandle);
                retryHandle = null;
            }
            document.removeEventListener('visibilitychange', onVisibility);
        } catch (err) {
            // still blocked; will retry
            // console.debug('play() blocked, will retry', err);
        }
    }

    // Visibility handler: attempt to play when page becomes visible
    function onVisibility() {
        if (document.visibilityState === 'visible') {
            tryPlayOnce();
        }
    }

    // Start immediate attempt, then schedule retries if needed
    tryPlayOnce().then(() => {
        // if first attempt failed, schedule retries
        if (!isPlaying && !retryHandle) {
            retryHandle = setInterval(tryPlayOnce, RETRY_INTERVAL);
            document.addEventListener('visibilitychange', onVisibility);
        }
    });

    // As a final measure also attempt to play when the user focuses or interacts in any way
    // without showing UI -- this keeps interaction minimal but helps when browsers require a gesture.
    const minimalInteraction = () => {
        tryPlayOnce();
    };
    window.addEventListener('focus', minimalInteraction);
    window.addEventListener('mousemove', minimalInteraction);
    window.addEventListener('keydown', minimalInteraction, { once: true });

    // Clean up listeners when we successfully start playing
    const checkStarted = setInterval(() => {
        if (isPlaying) {
            window.removeEventListener('focus', minimalInteraction);
            window.removeEventListener('mousemove', minimalInteraction);
            window.removeEventListener('keydown', minimalInteraction);
            clearInterval(checkStarted);
        }
    }, 500);
});

// Add a simple visual feedback for logo click
logo.addEventListener('click', () => {
    logo.style.transform = 'scale(1.1)';
    setTimeout(() => {
        logo.style.transform = 'scale(1)';
    }, 200);
});
