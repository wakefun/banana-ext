(function() {
  if (!location.href.includes('vertex-ai/studio')) return;

  const notified = new Set();

  function automate() {
    document.querySelectorAll('input.mdc-checkbox__native-control').forEach(cb => {
      if (!cb.checked) cb.click();
    });
    document.querySelectorAll('span.mdc-button__label').forEach(label => {
      if (label.textContent.includes('同意')) {
        const btn = label.closest('button');
        if (btn && !btn.disabled) btn.click();
      }
    });
    document.querySelectorAll('div.ft-message-bar, ai-llm-user-onboarding-banner').forEach(el => el.remove());
    document.querySelectorAll('.prompt-input-container').forEach(el => el.style.padding = '10px 0 80px 0');
  }

  function checkImages() {
    document.querySelectorAll('.generated-image__img').forEach(img => {
      const src = img.src || img.dataset.src || img.getAttribute('src');
      if (src && !notified.has(src)) {
        notified.add(src);
        chrome.runtime.sendMessage({ type: 'IMAGE_GENERATED' });
      }
    });
  }

  new MutationObserver(() => { automate(); checkImages(); })
    .observe(document.body, { childList: true, subtree: true });

  setTimeout(() => { automate(); checkImages(); }, 1000);
})();
