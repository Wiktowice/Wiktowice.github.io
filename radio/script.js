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

// Autoplay logic and interaction fallback
const initAutoplay = () => {
    audio.play()
        .then(() => {
            updateUI(true);
            removeInteractionListeners();
        })
        .catch(() => {
            // Wait for user interaction if autoplay is blocked
            console.log("Autoplay failed, waiting for interaction.");
        });
};

const removeInteractionListeners = () => {
    document.removeEventListener('click', initAutoplay);
    document.removeEventListener('touchstart', initAutoplay);
};

document.addEventListener('click', initAutoplay);
document.addEventListener('touchstart', initAutoplay);

// Try immediately on load
window.addEventListener('load', () => {
    initAutoplay();
    startTrackPolling();
});

// Add a simple visual feedback for logo click
logo.addEventListener('click', () => {
    logo.style.transform = 'scale(1.1)';
    setTimeout(() => {
        logo.style.transform = 'scale(1)';
    }, 200);
});