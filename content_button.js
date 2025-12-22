(function() {
  if (document.getElementById('banana-float-btn')) return;

  const btn = document.createElement('div');
  btn.id = 'banana-float-btn';
  btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;background:#fff;border-radius:50%;box-shadow:0 4px 12px rgba(0,0,0,.15);z-index:2147483647;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .2s';

  const img = document.createElement('img');
  img.src = chrome.runtime.getURL('icons/banana.svg');
  img.style.cssText = 'width:40px;height:40px';
  btn.appendChild(img);

  btn.onmouseenter = () => btn.style.transform = 'scale(1.1)';
  btn.onmouseleave = () => btn.style.transform = 'scale(1)';
  btn.onclick = () => chrome.runtime.sendMessage({ type: 'OPEN_BANANA_CONSOLE' });

  document.body.appendChild(btn);
})();
