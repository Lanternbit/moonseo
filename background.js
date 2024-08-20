let downloadQueue = [];
let isProcessing = false;

chrome.downloads.onCreated.addListener((downloadItem) => {
  chrome.downloads.cancel(downloadItem.id);
  downloadQueue.push(downloadItem);  // 큐에 다운로드 항목 추가
  processQueue();  // 큐 처리 시작
});

async function processQueue() {
  if (isProcessing) return;  // 이미 처리 중이면 대기
  isProcessing = true;

  while (downloadQueue.length > 0) {
    const downloadItem = downloadQueue.shift();  // 큐에서 항목을 하나 꺼냄
    console.log(downloadItem.id);
    await checkDownloadSafety(downloadItem);  // 다운로드 처리
  }

  isProcessing = false;
}

async function checkDownloadSafety(downloadItem) {
  try {
    const response = await fetch('http://15.164.40.221:5000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: downloadItem.url }),
    });

    const result = await response.json();
    console.log(result.safe);

    if (result.safe) {
      chrome.downloads.download({
        url: downloadItem.url  // 다운로드할 파일의 URL
      }, function(downloadId) {
        console.log("Download started with ID:", downloadItem.id);
      });
    } else {
      const tabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      if (tabs.length > 0) {
        await new Promise((resolve) => {
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, resolve);
        });

        const userResponse = await new Promise((resolve) => {
          chrome.tabs.sendMessage(tabs[0].id, { message: "confirm_download" }, resolve);
        });

        if (userResponse.userConfirmed) {
          console.log(downloadItem.url);
          console.log(downloadItem);
          chrome.downloads.download({
            url: downloadItem.url  // 다운로드할 파일의 URL
          }, function(downloadId) {
            console.log("Download started with ID:", downloadItem.id);
          });
        } else {
          chrome.downloads.cancel(downloadItem.id);
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'images/icon-48.png',
            title: '다운로드 취소됨',
            message: '다운로드가 취소되었습니다.'
          });
        }
      } else {
        console.log("No active tab found.");
        chrome.downloads.cancel(downloadItem.id);
      }
    }
  } catch (error) {
    console.error('Error checking download safety:', error);
    chrome.downloads.cancel(downloadItem.id);
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'images/icon-48.png',
      title: '다운로드 알림',
      message: '다운로드 안전성 확인 중 오류가 발생했습니다. 다운로드가 취소되었습니다.'
    });
  }
}
