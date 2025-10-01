let images = [];
let currentIndex = 0;
let viewMode = 'reader'; // 'reader' or 'grid'

// 画像データを読み込み
chrome.storage.local.get(['chiikawaImages'], (result) => {
  if (result.chiikawaImages && result.chiikawaImages.length > 0) {
    images = result.chiikawaImages;
    initViewer();
  } else {
    showNoImages();
  }
});

function initViewer() {
  updateDisplay();
  setupEventListeners();
}

function updateDisplay() {
  if (images.length === 0) return;
  
  const pageInfo = document.getElementById('pageInfo');
  pageInfo.textContent = `${currentIndex + 1} / ${images.length}`;
  
  const currentImage = document.getElementById('currentImage');
  currentImage.src = images[currentIndex];
  
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const footerPrevBtn = document.getElementById('footerPrevBtn');
  const footerNextBtn = document.getElementById('footerNextBtn');
  
  prevBtn.disabled = currentIndex === 0;
  footerPrevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === images.length - 1;
  footerNextBtn.disabled = currentIndex === images.length - 1;
}

function goToNext() {
  if (currentIndex < images.length - 1) {
    currentIndex++;
    updateDisplay();
  }
}

function goToPrev() {
  if (currentIndex > 0) {
    currentIndex--;
    updateDisplay();
  }
}

function showGridView() {
  viewMode = 'grid';
  document.getElementById('readerView').style.display = 'none';
  document.getElementById('gridView').style.display = 'block';
  
  const gridTitle = document.getElementById('gridTitle');
  gridTitle.textContent = `メディア一覧 (${images.length}枚)`;
  
  const gridContainer = document.getElementById('gridContainer');
  gridContainer.innerHTML = '';
  
  images.forEach((src, idx) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.onclick = () => {
      currentIndex = idx;
      showReaderView();
    };
    
    item.innerHTML = `
      <img src="${src}" alt="メディア ${idx + 1}">
      <div class="grid-item-info">#${idx + 1}</div>
    `;
    
    gridContainer.appendChild(item);
  });
}

function showReaderView() {
  viewMode = 'reader';
  document.getElementById('readerView').style.display = 'flex';
  document.getElementById('gridView').style.display = 'none';
  updateDisplay();
}

function setupEventListeners() {
  document.getElementById('prevBtn').addEventListener('click', goToPrev);
  document.getElementById('nextBtn').addEventListener('click', goToNext);
  document.getElementById('footerPrevBtn').addEventListener('click', goToPrev);
  document.getElementById('footerNextBtn').addEventListener('click', goToNext);
  
  document.getElementById('viewToggle').addEventListener('click', showGridView);
  document.getElementById('backToReader').addEventListener('click', showReaderView);
  
  // キーボード操作
  document.addEventListener('keydown', (e) => {
    if (viewMode === 'reader') {
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'ArrowLeft') goToPrev();
    }
  });
}

function showNoImages() {
  document.getElementById('readerView').innerHTML = `
    <div class="no-images">
      <h2>画像がまだ収集されていないよ!</h2>
      <p>拡張機能のポップアップから画像を収集してね</p>
    </div>
  `;
}