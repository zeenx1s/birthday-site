// ==== MATRIX ====
const canvas = document.getElementById("matrixCanvas");
const ctx = canvas.getContext("2d");
const starField = document.getElementById("starField");
const bgMusic = document.getElementById("bgMusic");

function startBackgroundMusic() {
  if (!bgMusic) return;
  bgMusic.volume = 0.55;
  let startedAtOffset = false;
  let musicStarted = false;

  const removeInteractionListeners = () => {
    window.removeEventListener("click", tryPlay);
    window.removeEventListener("touchstart", tryPlay);
    window.removeEventListener("keydown", tryPlay);
  };

  const tryPlay = () => {
    if (musicStarted) return;
    if (!startedAtOffset) {
      try {
        bgMusic.currentTime = 10;
        startedAtOffset = true;
      } catch (_) {
        // Some browsers require metadata before seeking.
      }
    }
    bgMusic.play().then(() => {
      musicStarted = true;
      removeInteractionListeners();
    }).catch(() => {
      // Browser blocked autoplay; keep retry points active.
    });
  };

  bgMusic.addEventListener("loadedmetadata", () => {
    if (!startedAtOffset) {
      bgMusic.currentTime = Math.min(10, Math.max(0, (bgMusic.duration || 10) - 0.25));
      startedAtOffset = true;
    }
    tryPlay();
  });

  bgMusic.addEventListener("canplay", tryPlay);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") tryPlay();
  });

  tryPlay();
  window.addEventListener("click", tryPlay);
  window.addEventListener("touchstart", tryPlay);
  window.addEventListener("keydown", tryPlay);
}

startBackgroundMusic();

const letters = ["H", "A", "P", "P", "Y", "B", "I", "R", "T", "H", "D", "A", "Y"];
const fontSize = 20;
let columns = 0;
let drops = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const newColumns = Math.max(1, Math.floor(canvas.width / fontSize));
  if (newColumns !== columns) {
    const nextDrops = Array(newColumns).fill(0);
    for (let i = 0; i < Math.min(drops.length, nextDrops.length); i++) {
      nextDrops[i] = drops[i];
    }
    drops = nextDrops;
    columns = newColumns;
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function buildStarField() {
  if (!starField) return;
  starField.innerHTML = "";

  const starSymbols = ["✦", "✧", "⋆", "☆", "✶"];
  const starCount = Math.max(70, Math.floor((window.innerWidth * window.innerHeight) / 17000));

  for (let i = 0; i < starCount; i++) {
    const star = document.createElement("span");
    star.className = "bg-star";
    star.textContent = starSymbols[Math.floor(Math.random() * starSymbols.length)];
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.fontSize = `${Math.random() * 14 + 8}px`;
    star.style.opacity = (Math.random() * 0.7 + 0.2).toFixed(2);
    star.style.animationDuration = `${Math.random() * 2 + 1.8}s`;
    star.style.animationDelay = `${Math.random() * 2.5}s`;
    starField.appendChild(star);
  }
}

window.addEventListener("resize", buildStarField);
buildStarField();

function drawMatrix() {
  ctx.fillStyle = "rgba(0,0,0,0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ff69b4";
  ctx.font = fontSize + "px monospace";

  drops.forEach((y, i) => {
    ctx.fillText(letters[Math.floor(Math.random() * letters.length)], i * fontSize, y * fontSize);
    drops[i] = y * fontSize > canvas.height && Math.random() > 0.975 ? 0 : y + 1;
  });

  requestAnimationFrame(drawMatrix);
}

drawMatrix();

// ==== COMPTEUR + MESSAGE ====
let count = 3;
const countdown = document.getElementById("countdown");
const message = document.getElementById("message");
const words = ["HAPPY", "BIRTHDAY", "PRINCESS"];
let idx = 0;

const timer = setInterval(() => {
  count--;
  countdown.textContent = count;

  if (count === 0) {
    clearInterval(timer);
    countdown.style.display = "none";
    message.style.display = "block";

    function showNext() {
      if (idx >= words.length) {
        initHeartParticles();
        return;
      }

      animateMainMessage(words[idx++], message, 1200, showNext);
    }

    showNext();
  }
}, 1000);

function animateMainMessage(text, container, duration, callback) {
  container.classList.remove("message-pop");
  container.textContent = text;
  // Force reflow so the CSS animation restarts each time.
  void container.offsetWidth;
  container.classList.add("message-pop");
  setTimeout(() => {
    if (callback) callback();
  }, duration);
}

// ==== Typing effect ====
let typingToken = 0;
function typeText(text, container, speed, callback) {
  const token = ++typingToken;
  container.textContent = "";
  let i = 0;

  function type() {
    if (token !== typingToken) return;
    if (i < text.length) {
      container.textContent += text[i++];
      setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }

  type();
}

// ==== 3D HEART PARTICLES ====
let heartCanvas;
let heartAnimFrame;
let heartResizeHandler;
let heartGeometry;
let heartMaterial;
let heartRenderer;
let rotationTween;
let heartPulseTween;
let heartRainInterval = null;

function cleanupHeartParticles() {
  if (heartAnimFrame) {
    cancelAnimationFrame(heartAnimFrame);
    heartAnimFrame = null;
  }

  if (heartResizeHandler) {
    window.removeEventListener("resize", heartResizeHandler);
    heartResizeHandler = null;
  }

  if (rotationTween) {
    rotationTween.kill();
    rotationTween = null;
  }

  if (heartPulseTween) {
    heartPulseTween.kill();
    heartPulseTween = null;
  }

  if (heartGeometry) {
    heartGeometry.dispose();
    heartGeometry = null;
  }

  if (heartMaterial) {
    heartMaterial.dispose();
    heartMaterial = null;
  }

  if (heartRenderer) {
    heartRenderer.dispose();
    if (heartRenderer.domElement && heartRenderer.domElement.parentNode) {
      heartRenderer.domElement.parentNode.removeChild(heartRenderer.domElement);
    }
    heartRenderer = null;
  }

  heartCanvas = null;
}

function initHeartParticles() {
  cleanupHeartParticles();

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
  camera.position.z = 500;

  const renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  heartRenderer = renderer;
  heartCanvas = renderer.domElement;

  const path = document.querySelector("path");
  const length = path.getTotalLength();
  const pointStep = 0.8;
  const vertices = [];

  for (let i = 0; i < length; i += pointStep) {
    const point = path.getPointAtLength(i);
    const vector = new THREE.Vector3(point.x, -point.y, 0);
    vector.x += (Math.random() - 0.5) * 30;
    vector.y += (Math.random() - 0.5) * 30;
    vector.z += (Math.random() - 0.5) * 70;
    vertices.push(vector);
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
  const material = new THREE.PointsMaterial({ color: 0xee5282, blending: THREE.AdditiveBlending, size: 3 });
  const particles = new THREE.Points(geometry, material);
  particles.position.x -= 600 / 2;
  particles.position.y += 552 / 2;
  scene.add(particles);

  heartGeometry = geometry;
  heartMaterial = material;

  rotationTween = gsap.fromTo(scene.rotation, { y: -0.2 }, { y: 0.2, repeat: -1, yoyo: true, ease: "power2.inOut", duration: 3 });
  heartPulseTween = gsap.fromTo(
    particles.scale,
    { x: 0.96, y: 0.96, z: 0.96 },
    { x: 1.04, y: 1.04, z: 1.04, repeat: -1, yoyo: true, ease: "sine.inOut", duration: 1.8 }
  );

  heartResizeHandler = () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
  };

  window.addEventListener("resize", heartResizeHandler);

  function animate() {
    heartAnimFrame = requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }

  animate();

  // Lancer scene finale apres 6s
  setTimeout(startFinalScene, 6000);
}

// ==== SCENE FINALE GIF + COEURS ====
function startFinalScene() {
  canvas.style.display = "none";
  message.style.display = "none";
  cleanupHeartParticles();

  const finalStage = document.getElementById("finalStage");
  finalStage.style.display = "flex";

  startHeartRain();

  // Afficher cover apres 3s
  setTimeout(() => {
    finalStage.style.display = "none";
    startAlbumTransition();
  }, 3000);
}

function startHeartRain() {
  const heartContainer = document.getElementById("heartRain");
  if (heartRainInterval) return;
  const heartChoices = ["\u2764\uFE0F", "\uD83E\uDE77", "\uD83D\uDC99", "\uD83D\uDC95"];

  heartRainInterval = setInterval(() => {
    // Slightly denser rain for a richer final look.
    const burstCount = Math.random() > 0.45 ? 2 : 1;
    for (let i = 0; i < burstCount; i++) {
      const heart = document.createElement("div");
      heart.textContent = heartChoices[Math.floor(Math.random() * heartChoices.length)];
      heart.style.position = "absolute";
      heart.style.left = Math.random() * window.innerWidth + "px";
      heart.style.bottom = "-50px";
      heart.style.fontSize = Math.random() * 34 + 18 + "px";
      heart.style.opacity = (Math.random() * 0.45 + 0.4).toFixed(2);
      heart.style.zIndex = 9;
      heart.style.fontFamily = "\"Apple Color Emoji\", \"Segoe UI Emoji\", \"Noto Color Emoji\", sans-serif";
      heartContainer.appendChild(heart);

      const duration = 2800 + Math.random() * 1800;
      heart.animate(
        [{ transform: "translateY(0)" }, { transform: `translateY(-${window.innerHeight + 50}px)` }],
        { duration: duration, easing: "linear" }
      );

      setTimeout(() => heart.remove(), duration);
    }
  }, 130);
}

function stopHeartRain() {
  if (heartRainInterval) {
    clearInterval(heartRainInterval);
    heartRainInterval = null;
  }
  const heartContainer = document.getElementById("heartRain");
  if (heartContainer) {
    heartContainer.innerHTML = "";
  }
}

function startAlbumTransition() {
  const overlay = document.getElementById("transitionOverlay");
  const albumContainer = document.getElementById("albumContainer");
  const albumCover = document.getElementById("albumCover");
  const albumContent = document.getElementById("album");

  overlay.classList.remove("active");
  void overlay.offsetWidth;
  overlay.classList.add("active");

  albumContainer.style.display = "flex";
  albumContainer.classList.remove("enter");
  void albumContainer.offsetWidth;
  albumContainer.classList.add("enter");

  albumCover.style.display = "flex";
  albumContent.style.display = "none";
}

// ==== ALBUM ====
const photos = [
  ["photo1.png", "photo2.png"],
  ["photo3.png", "photo4.png"],
  ["photo5.png", "photo6.png"]
];
const texts = [
  "Happy 20th Birthday, Khadija. Honestly, i've been thinking all day about what to write to u, but no words seem to be enough to describe how much u mean to me. 20 is such a beautiful age just like u, and i want to wish u a happy birthday with all ur wishes .",
  "i want u to know that u r not just my friend; u r my safe place and my greatest joy. i hope this year treats u with the same kindness you show to me.",
  "i'm looking forward to every single moment we r going to spend together in this new chapter of ur life. may ur day be as bright and beautiful as ur soul. with all the love"
];
let page = 0;
let finalSequenceStarted = false;

const cover = document.getElementById("albumCover");
const album = document.getElementById("album");
const coverText = cover.querySelector("p");
const useSwipeToOpen = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
let albumOpened = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

if (coverText) {
  coverText.textContent = useSwipeToOpen ? "Swipe to open ❤️" : "Click to open ❤️";
}

function openAlbumFromCover() {
  if (albumOpened) return;
  albumOpened = true;

  cover.classList.remove("opening");
  void cover.offsetWidth;
  cover.classList.add("opening");

  setTimeout(() => {
    cover.style.display = "none";
    album.style.display = "flex";
    loadPage();
  }, 860);
}

if (useSwipeToOpen) {
  cover.addEventListener("touchstart", (event) => {
    if (!event.touches.length) return;
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  cover.addEventListener("touchend", (event) => {
    if (!event.changedTouches.length) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    const isHorizontalSwipe = Math.abs(dx) > 38 && Math.abs(dx) > Math.abs(dy) * 0.9;
    const isFastEnough = dt < 1200;
    if (isHorizontalSwipe && isFastEnough) {
      openAlbumFromCover();
    }
  }, { passive: true });
} else {
  cover.addEventListener("click", openAlbumFromCover);
}

// Typing sur album
function loadPage() {
  const left = document.getElementById("leftPhoto");
  const right = document.getElementById("rightPhoto");
  const textContainer = document.getElementById("albumText");
  left.src = photos[page][0];
  right.src = photos[page][1];
  typeText(texts[page], textContainer, 50);
}

let isPageTurning = false;

function animatePageTurn(direction, onMiddle, onDone) {
  if (isPageTurning) return;
  isPageTurning = true;

  const outClass = direction === "left" ? "page-turn-out-left" : "page-turn-out-right";
  const inClass = direction === "left" ? "page-turn-in-left" : "page-turn-in-right";

  album.classList.remove("page-turn-out-left", "page-turn-out-right", "page-turn-in-left", "page-turn-in-right");
  void album.offsetWidth;
  album.classList.add(outClass);

  setTimeout(() => {
    album.classList.remove(outClass);
    if (onMiddle) onMiddle();
    void album.offsetWidth;
    album.classList.add(inClass);

    setTimeout(() => {
      album.classList.remove(inClass);
      isPageTurning = false;
      if (onDone) onDone();
    }, 560);
  }, 560);
}

document.getElementById("nextPage").onclick = () => {
  goToNextPage();
};

function goToNextPage() {
  if (isPageTurning) return;
  const nextPage = page + 1;
  if (nextPage >= photos.length) {
    startAlbumEndingSequence();
    return;
  }

  animatePageTurn("left", () => {
    page = nextPage;
    loadPage();
  });
}

function startAlbumEndingSequence() {
  if (finalSequenceStarted) return;
  finalSequenceStarted = true;

  animatePageTurn("left", null, () => {
    album.style.display = "none";
    cover.style.display = "flex";
    cover.classList.remove("opening");
    void cover.offsetWidth;
    cover.classList.add("closing");

    setTimeout(() => {
      document.getElementById("albumContainer").style.display = "none";
      startPhotoHeartScene();
    }, 1000);
  });
}

function startPhotoHeartScene() {
  const scene = document.getElementById("photoHeartScene");
  const canvas = document.getElementById("photoHeartCanvas");
  if (!scene || !canvas) return;

  scene.style.display = "block";
  canvas.innerHTML = "";
  canvas.classList.remove("is-beating");

  const photoList = photos.flat();
  const tileCount = 54;
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight * 0.56;
  const heartScale = Math.min(window.innerWidth, window.innerHeight) * 0.018;

  const targets = [];
  for (let i = 0; i < tileCount; i++) {
    const t = (Math.PI * 2 * i) / tileCount;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    targets.push({
      x: centerX + x * heartScale,
      y: centerY - y * heartScale
    });
  }

  targets.forEach((target, i) => {
    const tile = document.createElement("div");
    tile.className = "photo-heart-tile";

    const img = document.createElement("img");
    img.src = photoList[i % photoList.length];
    img.alt = "Memory photo";
    tile.appendChild(img);

    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;
    tile.style.left = `${startX}px`;
    tile.style.top = `${startY}px`;
    canvas.appendChild(tile);

    setTimeout(() => {
      tile.style.opacity = "1";
      tile.style.left = `${target.x}px`;
      tile.style.top = `${target.y}px`;
      tile.style.transform = `translate(-50%, -50%) scale(1) rotate(${(Math.random() - 0.5) * 10}deg)`;
    }, 30 + i * 22);
  });

  const beatStartDelay = 30 + tileCount * 22 + 900;
  setTimeout(() => {
    canvas.classList.add("is-beating");
  }, beatStartDelay);
}

function goToPrevPage() {
  if (isPageTurning) return;
  const prevPage = page - 1;
  if (prevPage < 0) return;

  animatePageTurn("right", () => {
    page = prevPage;
    loadPage();
  });
}

let pageSwipeStartX = 0;
let pageSwipeStartY = 0;
let pageSwipeStartTime = 0;

album.addEventListener("touchstart", (event) => {
  if (!event.touches.length) return;
  const touch = event.touches[0];
  pageSwipeStartX = touch.clientX;
  pageSwipeStartY = touch.clientY;
  pageSwipeStartTime = Date.now();
}, { passive: true });

album.addEventListener("touchend", (event) => {
  if (!event.changedTouches.length || album.style.display !== "flex") return;

  const touch = event.changedTouches[0];
  const dx = touch.clientX - pageSwipeStartX;
  const dy = touch.clientY - pageSwipeStartY;
  const dt = Date.now() - pageSwipeStartTime;

  const isHorizontal = Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy) * 0.8;
  const isQuickEnough = dt < 1200;
  if (!isHorizontal || !isQuickEnough) return;

  if (dx < 0) {
    // Swipe left -> next page
    goToNextPage();
  } else {
    // Swipe right -> previous page
    goToPrevPage();
  }
}, { passive: true });
