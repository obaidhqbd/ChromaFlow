/**
 * ChromaFlow - Premium Color Palette Generator
 * Pure Vanilla JS Implementation
 * Focus: Performance, Accessibility, UX Polish
 */

// ===== State Management =====
const state = {
  palette: [],
  locked: [],
  history: [],
  historyIndex: -1,
  favorites: [],
  settings: {
    theme: localStorage.getItem('theme') || 'light',
    sound: localStorage.getItem('sound') === 'true',
    animations: localStorage.getItem('animations') !== 'false',
    autoSave: localStorage.getItem('autoSave') !== 'false',
    paletteSize: parseInt(localStorage.getItem('paletteSize')) || 5
  },
  selectedColors: [] // For contrast checking
};

// ===== DOM Elements =====
const elements = {
  paletteContainer: document.getElementById('palette-container'),
  generateBtn: document.getElementById('generate-btn'),
  themeToggle: document.getElementById('theme-toggle'),
  fullscreenBtn: document.getElementById('fullscreen-btn'),
  settingsBtn: document.getElementById('settings-btn'),
  exportModal: document.getElementById('export-modal'),
  settingsModal: document.getElementById('settings-modal'),
  toastContainer: document.getElementById('toast-container'),
  onboardingTooltip: document.getElementById('onboarding-tooltip'),
  tooltipClose: document.getElementById('tooltip-close'),
  sound: document.getElementById('click-sound'),
  canvas: document.getElementById('export-canvas')
};

// ===== Color Utilities =====
const ColorUtils = {
  // Generate random hex color
  randomHex() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
  },
  
  // Hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  },
  
  // RGB to HSL
  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  },
  
  // HSL to Hex
  hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r, g, b;
    
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    
    r = Math.round((r + m) * 255).toString(16).padStart(2, '0');
    g = Math.round((g + m) * 255).toString(16).padStart(2, '0');
    b = Math.round((b + m) * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  },
  
  // Adjust color by HSB values
  adjustColor(hex, hue = 0, saturation = 0, brightness = 0) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return hex;
    
    const hsl = this.rgbToHsl(rgb.r, rgb.g, rgb.b);
    let newH = (hsl.h + hue) % 360;
    if (newH < 0) newH += 360;
    let newS = Math.max(0, Math.min(100, hsl.s + saturation));
    let newL = Math.max(0, Math.min(100, hsl.l + brightness));
    
    return this.hslToHex(newH, newS, newL);
  },
  
  // WCAG Contrast Ratio
  getContrastRatio(hex1, hex2) {
    const getLuminance = (hex) => {
      const rgb = this.hexToRgb(hex);
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(c => {
        c = c / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    
    const l1 = getLuminance(hex1);
    const l2 = getLuminance(hex2);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return ((lighter + 0.05) / (darker + 0.05)).toFixed(2);
  },
  
  // Generate palette based on color theory
  generateByRule(baseHex, rule, count = 5) {
    const baseRgb = this.hexToRgb(baseHex);
    const baseHsl = this.rgbToHsl(baseRgb.r, baseRgb.g, baseRgb.b);
    const colors = [baseHex];
    
    switch (rule) {
      case 'complementary':
        for (let i = 1; i < count; i++) {
          const h = (baseHsl.h + (i % 2 === 0 ? 180 : 0)) % 360;
          colors.push(this.hslToHex(h, baseHsl.s, baseHsl.l));
        }
        break;
      case 'analogous':
        for (let i = 1; i < count; i++) {
          const h = (baseHsl.h + (i - 2) * 30 + 360) % 360;
          colors.push(this.hslToHex(h, baseHsl.s, baseHsl.l));
        }
        break;
      case 'triadic':
        for (let i = 1; i < count; i++) {
          const h = (baseHsl.h + i * 120) % 360;
          colors.push(this.hslToHex(h, baseHsl.s, baseHsl.l));
        }
        break;
      case 'monochromatic':
        for (let i = 1; i < count; i++) {
          const l = Math.max(20, Math.min(80, baseHsl.l + (i - 2) * 15));
          colors.push(this.hslToHex(baseHsl.h, baseHsl.s, l));
        }
        break;
      default:
        while (colors.length < count) colors.push(this.randomHex());
    }
    return colors;
  }
};

// ===== Palette Generation =====
function generatePalette() {
  const size = state.settings.paletteSize;
  const newPalette = [];
  
  for (let i = 0; i < size; i++) {
    if (state.locked[i] && state.palette[i]) {
      newPalette.push(state.palette[i]);
    } else {
      newPalette.push(ColorUtils.randomHex());
    }
  }
  
  return newPalette;
}

// ===== Render Palette =====
function renderPalette(palette = state.palette) {
  elements.paletteContainer.innerHTML = '';
  
  palette.forEach((color, index) => {
    const slot = document.createElement('div');
    slot.className = `color-slot ${state.locked[index] ? 'locked' : ''}`;
    slot.style.backgroundColor = color;
    slot.dataset.index = index;
    slot.draggable = true;
    slot.setAttribute('role', 'button');
    slot.setAttribute('tabindex', '0');
    slot.setAttribute('aria-label', `Color ${index + 1}: ${color}. Double-click to lock.`);
    
    const rgb = ColorUtils.hexToRgb(color);
    const hsl = ColorUtils.rgbToHsl(rgb.r, rgb.g, rgb.b);
    
    slot.innerHTML = `
      <div class="color-slot__actions">
        <button class="color-slot__action lock-btn" title="Lock color" aria-label="Lock color ${index + 1}">
          ${state.locked[index] ? '🔓' : '🔒'}
        </button>
        <button class="color-slot__action copy-btn" title="Copy HEX" aria-label="Copy ${color}">
          📋
        </button>
      </div>
      <div class="color-slot__info">
        <div class="color-slot__hex">${color.toUpperCase()}</div>
        <div class="color-slot__values">
          RGB: ${rgb.r}, ${rgb.g}, ${rgb.b}<br/>
          HSL: ${hsl.h}°, ${hsl.s}%, ${hsl.l}%
        </div>
      </div>
    `;
    
    // Event Listeners
    slot.querySelector('.lock-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      toggleLock(index);
    });
    
    slot.querySelector('.copy-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      copyToClipboard(color);
    });
    
    slot.addEventListener('click', () => {
      handleColorSelect(color, slot);
    });
    
    slot.addEventListener('dblclick', () => {
      toggleLock(index);
    });
    
    slot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleLock(index);
      }
    });
    
    // Drag events
    slot.addEventListener('dragstart', handleDragStart);
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('drop', handleDrop);
    slot.addEventListener('dragend', handleDragEnd);
    
    elements.paletteContainer.appendChild(slot);
  });
  
  // Add to history
  addToHistory(palette);
  
  // Auto-save if enabled
  if (state.settings.autoSave) {
    savePaletteToLocal(palette);
  }
}

// ===== Lock/Unlock Color =====
function toggleLock(index) {
  state.locked[index] = !state.locked[index];
  renderPalette();
  playSound();
}

// ===== Copy to Clipboard =====
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(`Copied ${text}!`, 'success');
    playSound();
  } catch (err) {
    showToast('Failed to copy', 'error');
  }
}

// ===== History Management =====
function addToHistory(palette) {
  // Remove any redo states
  state.history = state.history.slice(0, state.historyIndex + 1);
  
  // Add new state
  state.history.push([...palette]);
  state.historyIndex = state.history.length - 1;
  
  // Limit history size
  if (state.history.length > 20) {
    state.history.shift();
    state.historyIndex--;
  }
  
  updateUndoRedoButtons();
}

function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    state.palette = [...state.history[state.historyIndex]];
    renderPalette();
    updateUndoRedoButtons();
    playSound();
  }
}

function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    state.palette = [...state.history[state.historyIndex]];
    renderPalette();
    updateUndoRedoButtons();
    playSound();
  }
}

function updateUndoRedoButtons() {
  document.getElementById('undo-btn').disabled = state.historyIndex <= 0;
  document.getElementById('redo-btn').disabled = state.historyIndex >= state.history.length - 1;
}

// ===== Drag and Drop =====
let draggedIndex = null;

function handleDragStart(e) {
  draggedIndex = parseInt(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedIndex);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  const fromIndex = draggedIndex;
  const toIndex = parseInt(this.dataset.index);
  
  if (fromIndex !== toIndex) {
    // Swap colors and lock states
    [state.palette[fromIndex], state.palette[toIndex]] = 
    [state.palette[toIndex], state.palette[fromIndex]];
    [state.locked[fromIndex], state.locked[toIndex]] = 
    [state.locked[toIndex], state.locked[fromIndex]];
    
    renderPalette();
    playSound();
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  document.querySelectorAll('.color-slot').forEach(slot => 
    slot.classList.remove('drag-over')
  );
}

// ===== Color Selection for Contrast =====
function handleColorSelect(color, slot) {
  // Toggle selection
  const index = state.selectedColors.indexOf(color);
  if (index > -1) {
    state.selectedColors.splice(index, 1);
    slot.style.outline = 'none';
  } else {
    if (state.selectedColors.length >= 2) {
      // Deselect first
      const firstColor = state.selectedColors.shift();
      document.querySelectorAll('.color-slot').forEach(s => {
        if (s.style.backgroundColor === firstColor) {
          s.style.outline = 'none';
        }
      });
    }
    state.selectedColors.push(color);
    slot.style.outline = '3px solid var(--accent)';
    slot.style.outlineOffset = '-3px';
  }
  
  // Check contrast if two colors selected
  if (state.selectedColors.length === 2) {
    checkContrast(state.selectedColors[0], state.selectedColors[1]);
  }
}

// ===== Contrast Checker =====
function checkContrast(color1, color2) {
  const ratio = ColorUtils.getContrastRatio(color1, color2);
  const results = document.getElementById('contrast-results');
  
  let message, className;
  if (ratio >= 7) {
    message = `✓ AAA: ${ratio}:1 (Excellent)`;
    className = 'contrast-pass';
  } else if (ratio >= 4.5) {
    message = `✓ AA: ${ratio}:1 (Good)`;
    className = 'contrast-pass';
  } else if (ratio >= 3) {
    message = `⚠ ${ratio}:1 (Large text only)`;
    className = 'contrast-fail';
  } else {
    message = `✗ ${ratio}:1 (Insufficient)`;
    className = 'contrast-fail';
  }
  
  results.innerHTML = `
    <p class="${className}">${message}</p>
    <small style="color: var(--text-secondary)">
      WCAG requires 4.5:1 for normal text, 3:1 for large text
    </small>
  `;
}

// ===== Export Functions =====
function exportAsPNG() {
  const canvas = elements.canvas;
  const ctx = canvas.getContext('2d');
  const width = state.palette.length * 200;
  const height = 300;
  
  canvas.width = width;
  canvas.height = height;
  
  // Draw colors
  state.palette.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(i * 200, 0, 200, 200);
    
    // Draw text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(color.toUpperCase(), i * 200 + 100, 220);
    
    const rgb = ColorUtils.hexToRgb(color);
    ctx.font = '12px JetBrains Mono';
    ctx.fillText(`RGB: ${rgb.r},${rgb.g},${rgb.b}`, i * 200 + 100, 245);
  });
  
  // Draw brand
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 250, width, 50);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px Inter';
  ctx.fillText('Generated with ChromaFlow', width / 2, 280);
  
  // Download
  canvas.toBlob(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chromaflow-palette-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('PNG exported!', 'success');
  });
}

function exportAsCSS() {
  const css = state.palette.map((color, i) => 
    `--color-${i + 1}: ${color};`
  ).join('\n');
  
  return `:root {\n  ${css}\n}`;
}

function exportAsJSON() {
  return JSON.stringify({
    colors: state.palette,
    generated: new Date().toISOString(),
    metadata: {
      tool: 'ChromaFlow',
      version: '1.0'
    }
  }, null, 2);
}

function generateShareableLink() {
  const params = new URLSearchParams();
  params.set('colors', state.palette.join(','));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// ===== Local Storage =====
function savePaletteToLocal(palette) {
  const saved = JSON.parse(localStorage.getItem('chromaflow_palettes') || '[]');
  saved.unshift({
    colors: palette,
    timestamp: Date.now(),
    id: Date.now()
  });
  
  // Limit to 50 saved palettes
  if (saved.length > 50) saved.pop();
  
  localStorage.setItem('chromaflow_palettes', JSON.stringify(saved));
  renderFavorites();
}

function loadFavorites() {
  state.favorites = JSON.parse(localStorage.getItem('chromaflow_favorites') || '[]');
  renderFavorites();
}

function toggleFavorite(palette) {
  const id = palette.join('-');
  const index = state.favorites.findIndex(f => f.colors.join('-') === id);
  
  if (index > -1) {
    state.favorites.splice(index, 1);
    showToast('Removed from favorites', 'success');
  } else {
    state.favorites.unshift({
      colors: palette,
      timestamp: Date.now(),
      id: Date.now()
    });
    showToast('Added to favorites! ⭐', 'success');
  }
  
  localStorage.setItem('chromaflow_favorites', JSON.stringify(state.favorites));
  renderFavorites();
}

function renderFavorites() {
  const container = document.getElementById('favorites-list');
  container.innerHTML = '';
  
  if (state.favorites.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No favorites yet</p>';
    return;
  }
  
  state.favorites.forEach(fav => {
    const item = document.createElement('div');
    item.className = 'favorite-item';
    item.innerHTML = `
      <div class="favorite-item__colors">
        ${fav.colors.map(c => 
          `<div class="favorite-item__color" style="background: ${c}"></div>`
        ).join('')}
      </div>
      <div class="history-item__meta">
        ${new Date(fav.timestamp).toLocaleDateString()}
      </div>
    `;
    item.addEventListener('click', () => {
      state.palette = [...fav.colors];
      state.locked = new Array(fav.colors.length).fill(false);
      renderPalette();
      showToast('Palette loaded!', 'success');
    });
    container.appendChild(item);
  });
}

// ===== Toast Notifications =====
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '✗'}</span>
    <span>${message}</span>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  // Auto-remove
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== Sound Feedback =====
function playSound() {
  if (state.settings.sound && elements.sound) {
    elements.sound.currentTime = 0;
    elements.sound.play().catch(() => {}); // Ignore autoplay errors
  }
}

// ===== Theme Toggle =====
function toggleTheme() {
  state.settings.theme = state.settings.theme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  localStorage.setItem('theme', state.settings.theme);
  playSound();
}

// ===== Fullscreen Toggle =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast('Fullscreen not supported', 'error');
    });
  } else {
    document.exitFullscreen();
  }
  playSound();
}

// ===== Keyboard Shortcuts =====
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    switch (e.key) {
      case ' ':
        e.preventDefault();
        generateAndRender();
        break;
      case 'l':
      case 'L':
        // Lock first unlocked color
        const unlockedIndex = state.locked.findIndex(l => !l);
        if (unlockedIndex > -1) toggleLock(unlockedIndex);
        break;
      case 'c':
      case 'C':
        // Copy first color
        if (state.palette[0]) copyToClipboard(state.palette[0]);
        break;
      case 'z':
      case 'Z':
        if (e.ctrlKey || e.metaKey) undo();
        break;
      case 'y':
      case 'Y':
        if (e.ctrlKey || e.metaKey) redo();
        break;
      case 'Escape':
        // Close modals
        elements.exportModal.close();
        elements.settingsModal.close();
        break;
    }
  });
}

// ===== Image Upload & Color Extraction =====
function setupImageUpload() {
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('image-upload');
  const preview = document.getElementById('image-preview');
  
  uploadBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Simple color extraction (dominant colors)
        const colors = extractColorsFromImage(img);
        state.palette = colors.slice(0, state.settings.paletteSize);
        state.locked = new Array(state.palette.length).fill(false);
        renderPalette();
        
        preview.style.backgroundImage = `url(${event.target.result})`;
        preview.classList.remove('hidden');
        showToast('Colors extracted!', 'success');
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// Simple color extraction using canvas
function extractColorsFromImage(img) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = 100; // Downsample for performance
  canvas.width = size;
  canvas.height = size;
  
  ctx.drawImage(img, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size).data;
  
  // Sample colors at intervals
  const colors = [];
  const step = 10;
  
  for (let i = 0; i < imageData.length; i += 4 * step) {
    const r = imageData[i];
    const g = imageData[i + 1];
    const b = imageData[i + 2];
    const a = imageData[i + 3];
    
    if (a > 128) { // Skip transparent
      colors.push(`#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`);
    }
  }
  
  // Return unique colors (simplified)
  return [...new Set(colors)].slice(0, 10);
}

// ===== Gradient Generator =====
function updateGradientPreview() {
  const preview = document.getElementById('gradient-preview');
  if (state.palette.length >= 2) {
    const gradient = `linear-gradient(90deg, ${state.palette.slice(0, 3).join(', ')})`;
    preview.style.background = gradient;
  }
}

// ===== Onboarding Tooltip =====
function showOnboardingTooltip() {
  const hasSeen = localStorage.getItem('chromaflow_onboarded');
  if (!hasSeen) {
    setTimeout(() => {
      elements.onboardingTooltip.classList.add('show');
    }, 2000);
  }
  
  elements.tooltipClose.addEventListener('click', () => {
    elements.onboardingTooltip.classList.remove('show');
    localStorage.setItem('chromaflow_onboarded', 'true');
  });
}

// ===== Initialize =====
function init() {
  // Apply saved theme
  document.documentElement.setAttribute('data-theme', state.settings.theme);
  
  // Load favorites
  loadFavorites();
  
  // Generate initial palette
  generateAndRender();
  
  // Load palette from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('colors')) {
    const colors = urlParams.get('colors').split(',');
    if (colors.length >= 4) {
      state.palette = colors;
      state.locked = new Array(colors.length).fill(false);
      renderPalette();
    }
  }
  
  // Event Listeners
  elements.generateBtn.addEventListener('click', generateAndRender);
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
  elements.settingsBtn.addEventListener('click', () => elements.settingsModal.showModal());
  
  // Undo/Redo
  document.getElementById('undo-btn').addEventListener('click', undo);
  document.getElementById('redo-btn').addEventListener('click', redo);
  
  // Export modal
  document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const format = btn.dataset.format;
      let output = '';
      
      switch (format) {
        case 'png':
          exportAsPNG();
          elements.exportModal.close();
          return;
        case 'css':
          output = exportAsCSS();
          break;
        case 'json':
          output = exportAsJSON();
          break;
        case 'link':
          output = generateShareableLink();
          break;
      }
      
      document.getElementById('export-code').textContent = output;
      document.getElementById('export-output').classList.remove('hidden');
    });
  });
  
  document.getElementById('copy-export').addEventListener('click', () => {
    const code = document.getElementById('export-code').textContent;
    copyToClipboard(code);
  });
  
  document.getElementById('close-export').addEventListener('click', () => {
    elements.exportModal.close();
    document.getElementById('export-output').classList.add('hidden');
  });
  
  // Settings
  document.getElementById('close-settings').addEventListener('click', () => {
    elements.settingsModal.close();
  });
  
  document.getElementById('sound-toggle').checked = state.settings.sound;
  document.getElementById('animations-toggle').checked = state.settings.animations;
  document.getElementById('auto-save-toggle').checked = state.settings.autoSave;
  document.getElementById('palette-size').value = state.settings.paletteSize;
  
  document.getElementById('sound-toggle').addEventListener('change', (e) => {
    state.settings.sound = e.target.checked;
    localStorage.setItem('sound', state.settings.sound);
  });
  
  document.getElementById('animations-toggle').addEventListener('change', (e) => {
    state.settings.animations = e.target.checked;
    localStorage.setItem('animations', state.settings.animations);
    document.body.style.setProperty('--transition-normal', 
      state.settings.animations ? '300ms cubic-bezier(0.4, 0, 0.2, 1)' : '0.01ms');
  });
  
  document.getElementById('auto-save-toggle').addEventListener('change', (e) => {
    state.settings.autoSave = e.target.checked;
    localStorage.setItem('autoSave', state.settings.autoSave);
  });
  
  document.getElementById('palette-size').addEventListener('change', (e) => {
    state.settings.paletteSize = parseInt(e.target.value);
    localStorage.setItem('paletteSize', state.settings.paletteSize);
    state.locked = new Array(state.settings.paletteSize).fill(false);
    generateAndRender();
  });
  
  // Color theory chips
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      const rule = chip.dataset.rule;
      const baseColor = state.palette[0] || ColorUtils.randomHex();
      state.palette = ColorUtils.generateByRule(baseColor, rule, state.settings.paletteSize);
      state.locked = new Array(state.palette.length).fill(false);
      renderPalette();
      showToast(`${rule} palette generated!`, 'success');
    });
  });
  
  // HSB Sliders
  document.getElementById('hue-slider').addEventListener('input', (e) => {
    adjustAllColors('hue', parseInt(e.target.value));
  });
  document.getElementById('saturation-slider').addEventListener('input', (e) => {
    adjustAllColors('saturation', parseInt(e.target.value) - 100);
  });
  document.getElementById('brightness-slider').addEventListener('input', (e) => {
    adjustAllColors('brightness', parseInt(e.target.value) - 100);
  });
  
  // Copy gradient
  document.getElementById('copy-gradient').addEventListener('click', () => {
    const gradient = `linear-gradient(90deg, ${state.palette.slice(0, 3).join(', ')})`;
    copyToClipboard(gradient);
  });
  
  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-content`).classList.add('active');
    });
  });
  
  // Keyboard shortcuts
  setupKeyboardShortcuts();
  
  // Image upload
  setupImageUpload();
  
  // Onboarding
  showOnboardingTooltip();
  
  // Update gradient preview on palette change
  const originalRender = renderPalette;
  renderPalette = function(...args) {
    originalRender.apply(this, args);
    updateGradientPreview();
  };
  
  // Initial gradient
  updateGradientPreview();
  
  console.log('🎨 ChromaFlow initialized');
}

// ===== Helper Functions =====
function generateAndRender() {
  state.palette = generatePalette();
  renderPalette();
  playSound();
}

function adjustAllColors(type, value) {
  if (value === 0 && type !== 'hue') return;
  
  state.palette = state.palette.map(color => 
    ColorUtils.adjustColor(color, 
      type === 'hue' ? value : 0,
      type === 'saturation' ? value : 0,
      type === 'brightness' ? value : 0
    )
  );
  renderPalette();
}

// ===== Start Application =====
document.addEventListener('DOMContentLoaded', init);

// Handle export modal close on backdrop click
elements.exportModal.addEventListener('click', (e) => {
  if (e.target === elements.exportModal) elements.exportModal.close();
});

elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) elements.settingsModal.close();
});
