// Xのページから画像を収集するスクリプト
let isCollecting = false;
let shouldStop = false;
let scrollTimer = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collectImages') {
    console.log('画像収集を開始するよ!');
    
    isCollecting = true;
    shouldStop = false;
    
    // 収集した画像を保存するSet（重複防止）
    const collectedImages = new Map(); // URLをキーに、{src, timestamp}を保存
    
    // 現在表示されている画像を収集する関数
    function collectCurrentImages() {
      const articles = document.querySelectorAll('article');
      let newCount = 0;
      
      articles.forEach((article) => {
        const timeEl = article.querySelector('time');
        const imgEls = article.querySelectorAll('img[src*="media"]');
        
        if (imgEls.length > 0 && timeEl) {
          const datetime = timeEl.getAttribute('datetime');
          const timestamp = new Date(datetime).getTime();
          
          imgEls.forEach(img => {
            // 高画質版のURLに変換
            const src = img.src.replace(/&name=\w+$/, '&name=large');
            
            // まだ収集していない画像だけ追加
            if (!collectedImages.has(src)) {
              collectedImages.set(src, { src, timestamp });
              newCount++;
            }
          });
        }
      });
      
      // articleが見つからない場合の代替方法
      if (articles.length === 0) {
        const allImages = document.querySelectorAll('img[src*="pbs.twimg.com/media"]');
        
        allImages.forEach(img => {
          const src = img.src.replace(/&name=\w+$/, '&name=large');
          if (!collectedImages.has(src)) {
            collectedImages.set(src, { src, timestamp: Date.now() });
            newCount++;
          }
        });
      }
      
      return newCount;
    }
    
    // 自動スクロール機能（スクロールしながらリアルタイムで収集）
    let scrollCount = 0;
    const maxScrolls = 100;
    const scrollInterval = 1500;
    let noChangeCount = 0;
    const maxNoChange = 3;
    
    function autoScrollAndCollect() {
      return new Promise((resolve) => {
        // 最初に現在の画像を収集
        collectCurrentImages();
        console.log(`初期画像数: ${collectedImages.size}枚`);
        
        let lastCollectedCount = collectedImages.size;
        
        scrollTimer = setInterval(() => {
          // ストップボタンが押された場合
          if (shouldStop) {
            clearInterval(scrollTimer);
            console.log(`手動停止! ${collectedImages.size}枚 の画像を収集したよ!`);
            isCollecting = false;
            resolve();
            return;
          }
          
          // スクロール前に現在の画像を収集
          const newImagesBeforeScroll = collectCurrentImages();
          
          // 下にスクロール
          window.scrollTo(0, document.documentElement.scrollHeight);
          scrollCount++;
          
          console.log(`スクロール ${scrollCount}/${maxScrolls} - 合計: ${collectedImages.size}枚 (新規: +${newImagesBeforeScroll})`);
          
          // スクロール後、画像が読み込まれるまで待つ
          setTimeout(() => {
            // スクロール後の画像も収集
            const newImagesAfterScroll = collectCurrentImages();
            const currentCount = collectedImages.size;
            
            console.log(`読み込み後: ${currentCount}枚 (新規: +${newImagesAfterScroll})`);
            
            // 画像数が変わらなかった場合
            if (currentCount === lastCollectedCount) {
              noChangeCount++;
              console.log(`変化なし (${noChangeCount}/${maxNoChange})`);
            } else {
              noChangeCount = 0;
              console.log(`新しい画像を発見! 合計: ${currentCount}枚`);
            }
            
            lastCollectedCount = currentCount;
            
            // 連続で変化がない、または最大回数に達した場合
            if (noChangeCount >= maxNoChange || scrollCount >= maxScrolls) {
              clearInterval(scrollTimer);
              console.log(`スクロール完了! 最終的に ${collectedImages.size}枚 の画像を収集したよ!`);
              isCollecting = false;
              
              // 最後にもう一度収集
              setTimeout(() => {
                collectCurrentImages();
                console.log(`最終確認: ${collectedImages.size}枚`);
                resolve();
              }, 2000);
            }
          }, 1200);
          
        }, scrollInterval);
      });
    }
    
    // 自動スクロールして収集
    autoScrollAndCollect().then(() => {
      // Mapを配列に変換
      const imagesArray = Array.from(collectedImages.values());
      
      // 古い順にソート
      imagesArray.sort((a, b) => a.timestamp - b.timestamp);
      
      console.log(`収集完了! 合計 ${imagesArray.length} 枚の画像を取得したよ!`);
      
      // ページのトップに戻る
      window.scrollTo(0, 0);
      
      sendResponse({ 
        success: true, 
        images: imagesArray.map(img => img.src),
        count: imagesArray.length 
      });
    });
    
    return true;
  }
  
  // ストップ処理
  if (request.action === 'stopCollecting') {
    console.log('収集を停止するよ!');
    shouldStop = true;
    if (scrollTimer) {
      clearInterval(scrollTimer);
    }
    sendResponse({ success: true });
    return true;
  }
  
  // 収集状態の確認
  if (request.action === 'checkStatus') {
    sendResponse({ isCollecting: isCollecting });
    return true;
  }
  
  return true;
});