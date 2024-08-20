chrome.downloads.onCreated.addListener((downloadItem) => {
  chrome.downloads.pause(downloadItem.id);
  console.log(downloadItem.mime);
  checkDownloadSafety(downloadItem);
});

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
      chrome.downloads.resume(downloadItem.id);
    } else {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
          // 현재 탭에 content.js를 주입
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            files: ['content.js']
          }, () => {
            // content.js가 주입된 후에 메시지 보내기
            chrome.tabs.sendMessage(tabs[0].id, { message: "confirm_download" }, (response) => {
              console.log(response);
              if (response.userConfirmed) {
                chrome.downloads.resume(downloadItem.id);
              } else {
                chrome.downloads.cancel(downloadItem.id);
                chrome.notifications.create({
                  type: 'basic',
                  iconUrl: 'icon.png',
                  title: '다운로드 취소됨',
                  message: '다운로드가 취소되었습니다.'
                });
              }
            });
          });
        } else {
          console.log("No active tab found.");
        }
      });
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