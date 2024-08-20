let downloadQueue = [];
let isProcessing = false;
let processedDownloads = new Set();
let requestHeaders = {};

chrome.downloads.onCreated.addListener((downloadItem) => {
  console.log(downloadItem.mime);
  if (!processedDownloads.has(downloadItem.id) && downloadItem.mime == "application/pdf") {
    chrome.downloads.cancel(downloadItem.id);
    downloadQueue.push(downloadItem);
    // monitorRequestHeader(downloadItem.url);
    processQueue();
  }
});

// function monitorRequestHeader(url) {
//   chrome.webRequest.onBeforeSendHeaders.addListener(
//     function(details) {
//       console.log("Request Headers: ", details.requestHeaders);
//       // 다운로드된 파일의 URL과 요청 URL이 일치하는지 확인
//       if (details.url === url) {
//         // console.log("Request Headers for Download URL: ", details.requestHeaders);

//         // 요청 헤더를 객체로 변환하여 저장
//         details.requestHeaders.forEach(header => {
//           requestHeaders[header.name] = header.value;
//         });
//         console.log("Captured Headers:", requestHeaders);
//       }
//       return { requestHeaders: details.requestHeaders };
//     },
//     { urls: [url] }, // 다운로드 URL과 일치하는 웹 요청만 모니터링
//     ["requestHeaders"]
//   );
// }

async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (downloadQueue.length > 0) {
    const downloadItem = downloadQueue.shift();
    await checkDownloadSafety(downloadItem);
  }

  isProcessing = false;
}

async function checkDownloadSafety(downloadItem) {
  // console.log("Request Headers:");
  // Object.entries(requestHeaders).forEach(([key, value]) => {
  //   console.log(`${key}: ${value}`);
  // });
  try {
    const response = await fetch('http://15.164.40.221:5000/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // ...requestHeaders
      },
      body: JSON.stringify({ url: downloadItem.url})
    });

    notification('진행중', '검증 중 입니다...');

    const result = await response.json();
    console.log(result.safe);
    console.log(result.url);
    downloadItem.url = result.url;

    if (result.safe) {
      await fileDownLoad(downloadItem, 'http://15.164.40.221:5000/' + result.path);
      notification('완료', '다운로드 완료!')
    } else {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        await chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        });

        const userResponse = await chrome.tabs.sendMessage(tabs[0].id, { message: "confirm_download" });
        console.log(userResponse.userConfirmed);
        if (userResponse.userConfirmed) {
          await fileDownLoad(downloadItem, 'http://15.164.40.221:5000/' + result.path);
        } else {
          notification('다운로드 취소', '사용자가 다운로드를 취소했습니다.');
        }
      } else {
        notification('재시도 해보세요!', '활성 탭을 찾을 수 없습니다.');
      }
    }
  } catch (error) {
    console.error('Error checking download safety:', error);
    notification('오류 발견', '다운로드 안전성 확인 중 오류가 발생했습니다.');
  }
}

async function fileDownLoad(downloadItem, path) {
  const response = await fetch(path);

  if (response.ok) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download({ url: path }, (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError.message);
        } else {
          console.log("Download started with ID:", downloadId);
          processedDownloads.add(downloadId);
          resolve();
        }
      });
    });
  } else {
    throw new Error('Error downloading file');
  }
}

function notification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon-48.png',
    title: title,
    message: message
  });
}
