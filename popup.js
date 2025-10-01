document.addEventListener('DOMContentLoaded', () => {
    const collectBtn = document.getElementById('collectBtn');
    const stopBtn = document.getElementById('stopBtn');
    const viewBtn = document.getElementById('viewBtn');
    const statusText = document.getElementById('statusText');
    
    let progressTimer = null;
    
    // 保存済みの画像があるかチェック
    chrome.storage.local.get(['chiikawaImages'], (result) => {
      if (result.chiikawaImages && result.chiikawaImages.length > 0) {
        viewBtn.disabled = false;
        statusText.innerHTML = `保存済み: ${result.chiikawaImages.length}枚の画像<br>ビューアで読めるよ!`;
      }
    });
    
    // 画像収集ボタン
    collectBtn.addEventListener('click', async () => {
      collectBtn.disabled = true;
      collectBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      stopBtn.disabled = false;
      
      statusText.innerHTML = '<div class="loading">⏳ 自動スクロールを開始するよ...<br>しばらく待ってね!</div>';
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // X(Twitter)のページかチェック
        if (!tab.url.includes('x.com') && !tab.url.includes('twitter.com')) {
          statusText.innerHTML = '<div class="error">❌ X(Twitter)のページで実行してね!</div>';
          resetButtons();
          return;
        }
        
        // 進捗更新用のタイマー
        let dots = 0;
        progressTimer = setInterval(() => {
          dots = (dots + 1) % 4;
          const dotStr = '.'.repeat(dots);
          statusText.innerHTML = `<div class="loading">⏳ 自動スクロール中${dotStr}<br>画像を読み込んでいるよ!<br>途中で止めたい時はストップボタンを押してね!</div>`;
        }, 500);
        
        // content scriptにメッセージを送信
        chrome.tabs.sendMessage(tab.id, { action: 'collectImages' }, (response) => {
          if (progressTimer) {
            clearInterval(progressTimer);
          }
          
          if (chrome.runtime.lastError) {
            statusText.innerHTML = '<div class="error">❌ エラーが発生したよ。ページを更新してもう一度試してみて!</div>';
            resetButtons();
            return;
          }
          
          if (response && response.success) {
            // 画像データを保存
            chrome.storage.local.set({ chiikawaImages: response.images }, () => {
              statusText.innerHTML = `<div class="success">✅ ${response.count}枚の画像を収集したよ!</div>`;
              viewBtn.disabled = false;
              resetButtons();
            });
          } else {
            statusText.innerHTML = '<div class="error">❌ 画像が見つからなかったよ。メディアページで試してね!</div>';
            resetButtons();
          }
        });
      } catch (error) {
        if (progressTimer) {
          clearInterval(progressTimer);
        }
        statusText.innerHTML = '<div class="error">❌ エラーが発生したよ</div>';
        resetButtons();
      }
    });
    
    // ストップボタン
    stopBtn.addEventListener('click', async () => {
      stopBtn.disabled = true;
      statusText.innerHTML = '<div class="loading">⏳ 停止中... 現在までの画像を保存するよ!</div>';
      
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // 収集を停止
        chrome.tabs.sendMessage(tab.id, { action: 'stopCollecting' }, () => {
          if (progressTimer) {
            clearInterval(progressTimer);
          }
          
          // 少し待ってから画像を確認
          setTimeout(() => {
            chrome.storage.local.get(['chiikawaImages'], (result) => {
              if (result.chiikawaImages && result.chiikawaImages.length > 0) {
                statusText.innerHTML = `<div class="success">⏹️ 停止完了!<br>${result.chiikawaImages.length}枚の画像を保存したよ!</div>`;
                viewBtn.disabled = false;
              } else {
                statusText.innerHTML = '<div class="error">❌ 画像が収集できませんでした</div>';
              }
              resetButtons();
            });
          }, 1000);
        });
      } catch (error) {
        if (progressTimer) {
          clearInterval(progressTimer);
        }
        statusText.innerHTML = '<div class="error">❌ 停止に失敗したよ</div>';
        resetButtons();
      }
    });
    
    // ビューアを開く
    viewBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
    });
    
    // ボタンの状態をリセット
    function resetButtons() {
      collectBtn.disabled = false;
      collectBtn.style.display = 'block';
      stopBtn.style.display = 'none';
      stopBtn.disabled = true;
    }
  });