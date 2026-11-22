// 웹판(브라우저)에서만 하는 일. 데스크톱 앱(Electron)에서는 아무것도 하지 않는다.
(function () {
  'use strict';
  var isDesktop = !!(window.gijoDesktop && window.gijoDesktop.isElectron);
  if (isDesktop) return;

  // 1) 제목 단축키 Ctrl+1~3 은 브라우저가 탭 바꾸기에 쓰므로 웹판에서는 동작하지 않는다.
  //    되지 않는 단축키를 말풍선에 적어 두지 않는다.
  document.querySelectorAll('[data-cmd="h1"],[data-cmd="h2"],[data-cmd="h3"]').forEach(function (btn) {
    var n = btn.getAttribute('data-cmd').slice(1);
    btn.title = '제목 ' + n + ' (단축키 Ctrl+' + n + ' 은 데스크톱 설치판 전용)';
  });

  // 2) 한 번 열면 오프라인에서도 열리게 한다. 파일로 직접 연 경우(file:)에는 등록하지 않는다.
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 등록 실패해도 앱은 그대로 쓴다 */ });
    });
  }

  // 3) 브라우저가 「앱으로 설치」를 지원하면 작은 단추를 띄운다(크롬·엣지). 이미 설치해 연 창에서는 숨긴다.
  var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
  if (standalone) return;
  var deferred = null;
  var btn = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (btn) return;
    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'web-install-btn';
    btn.textContent = '앱으로 설치';
    btn.title = '이 PC·폰에 앱처럼 담아 둡니다. 인터넷 없이도 열립니다.';
    btn.addEventListener('click', function () {
      if (!deferred) return;
      var p = deferred; deferred = null;
      // 설치가 끝났다는 신호(appinstalled)가 먼저 와서 단추가 이미 없을 수 있다.
      var removeBtn = function () { if (btn) { btn.remove(); btn = null; } };
      try {
        var shown = p.prompt();
        if (shown && shown.catch) shown.catch(removeBtn);
      } catch (_) { removeBtn(); return; }
      if (p.userChoice && p.userChoice.then) p.userChoice.then(removeBtn, removeBtn);
    });
    document.body.appendChild(btn);
  });
  window.addEventListener('appinstalled', function () { if (btn) { btn.remove(); btn = null; } });
})();
