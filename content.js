chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.message === "confirm_download") {
    const userConfirmed = confirm("안전한 파일이 아닙니다. 그래도 받으시겠습니까?");
    sendResponse({ userConfirmed: userConfirmed });
  }
});
