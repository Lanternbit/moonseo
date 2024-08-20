let confirmationPromise = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "confirm_download") {
    if (confirmationPromise) {
      confirmationPromise.then(sendResponse);
      return true; // 비동기 응답을 위해 true 반환
    }

    confirmationPromise = new Promise((resolve) => {
      const userConfirmed = confirm("이 파일을 다운로드하시겠습니까?");
      resolve({ userConfirmed });
    });

    confirmationPromise.then(sendResponse);
    return true; // 비동기 응답을 위해 true 반환
  }
});