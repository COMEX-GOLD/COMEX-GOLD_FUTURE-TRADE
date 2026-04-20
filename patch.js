/**
 * COMEX GOLD - Black Screen Fix + PWA Patch
 * ==========================================
 * ဒီ file ကို index.html မှာ </body> မတိုင်ခင် ထည့်ပါ
 * <script src="patch.js"></script>
 */

(function () {
  'use strict';

  // ============================================================
  // FIX 1: Black Screen - Loading Overlay
  // Firebase / TradingView load မပြီးခင် black screen မဖြစ်အောင်
  // ============================================================
  function injectLoadingOverlay() {
    if (document.getElementById('comex-loader')) return;

    var style = document.createElement('style');
    style.textContent = [
      '#comex-loader{',
        'position:fixed;top:0;left:0;width:100%;height:100%;',
        'background:#0F0E0B;',
        'display:flex;flex-direction:column;',
        'align-items:center;justify-content:center;',
        'z-index:99999;',
        'transition:opacity 0.5s ease;',
      '}',
      '#comex-loader .loader-logo{',
        'color:#C9A84C;font-size:2rem;font-weight:700;',
        'letter-spacing:0.2em;margin-bottom:1.5rem;',
      '}',
      '#comex-loader .loader-bar{',
        'width:200px;height:2px;background:rgba(201,168,76,0.2);',
        'border-radius:2px;overflow:hidden;',
      '}',
      '#comex-loader .loader-fill{',
        'height:100%;width:0%;background:#C9A84C;',
        'border-radius:2px;',
        'animation:loaderAnim 2s ease forwards;',
      '}',
      '@keyframes loaderAnim{',
        '0%{width:0%}',
        '60%{width:70%}',
        '100%{width:100%}',
      '}',
      '#comex-loader.fade-out{opacity:0;pointer-events:none;}',
    ].join('');
    document.head.appendChild(style);

    var loader = document.createElement('div');
    loader.id = 'comex-loader';
    loader.innerHTML = [
      '<div class="loader-logo">COMEX GOLD</div>',
      '<div class="loader-bar"><div class="loader-fill"></div></div>',
    ].join('');
    document.body.appendChild(loader);
  }

  function hideLoader() {
    var loader = document.getElementById('comex-loader');
    if (!loader) return;
    loader.classList.add('fade-out');
    setTimeout(function () {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    }, 600);
  }

  // ============================================================
  // FIX 2: Firebase Auth Race Condition
  // onAuthStateChanged မပြီးခင် page render မဖြစ်အောင်
  // ============================================================
  function fixFirebaseAuthRace() {
    var authTimeout = setTimeout(function () {
      // Firebase 3 seconds အတွင်း respond မလုပ်ရင် loader ဖယ်မယ်
      hideLoader();
    }, 3000);

    // Firebase ရှိမရှိ check လုပ်ပြီး patch လုပ်မယ်
    var checkFirebase = setInterval(function () {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        clearInterval(checkFirebase);
        clearTimeout(authTimeout);

        firebase.auth().onAuthStateChanged(function (user) {
          // Auth state ရပြီဆိုမှ loader ဖယ်မယ်
          setTimeout(hideLoader, 300);
        });
      }
    }, 100);
  }

  // ============================================================
  // FIX 3: TradingView Widget Async Error Handle
  // TradingView load မအောင်မြင်ရင် error မပြဘဲ gracefully handle
  // ============================================================
  function fixTradingViewErrors() {
    window.addEventListener('error', function (e) {
      if (e && e.filename && e.filename.indexOf('tradingview') !== -1) {
        e.preventDefault();
        console.warn('[COMEX] TradingView load issue - continuing without chart');
        hideLoader();
        return true;
      }
    });

    // TradingView container blank ဖြစ်နေရင် placeholder ပြမယ်
    setTimeout(function () {
      var tvContainers = document.querySelectorAll('.tradingview-widget-container, [id*="tradingview"], [class*="tv-"]');
      tvContainers.forEach(function (el) {
        if (el.offsetHeight === 0 || el.innerHTML.trim() === '') {
          el.style.minHeight = '400px';
          el.style.background = 'rgba(201,168,76,0.05)';
          el.style.borderRadius = '12px';
          el.style.display = 'flex';
          el.style.alignItems = 'center';
          el.style.justifyContent = 'center';
          el.innerHTML = '<div style="color:#C9A84C;opacity:0.5;font-size:0.9rem;">Chart Loading...</div>';
        }
      });
    }, 5000);
  }

  // ============================================================
  // FIX 4: iOS Safari Viewport Black Screen
  // iOS 16+ user-scalable=no render block fix
  // ============================================================
  function fixIOSViewport() {
    var ua = navigator.userAgent;
    var isIOS = /iPad|iPhone|iPod/.test(ua);
    if (!isIOS) return;

    // Viewport meta ကို iOS safe version ပြောင်းမယ်
    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content',
        'width=device-width, initial-scale=1.0, viewport-fit=cover'
      );
    }

    // iOS safe area padding
    var safeStyle = document.createElement('style');
    safeStyle.textContent = [
      ':root{',
        '--safe-top: env(safe-area-inset-top, 0px);',
        '--safe-bottom: env(safe-area-inset-bottom, 0px);',
      '}',
      'body{',
        'padding-top: var(--safe-top);',
        'padding-bottom: var(--safe-bottom);',
      '}',
    ].join('');
    document.head.appendChild(safeStyle);
  }

  // ============================================================
  // FIX 5: Android Chrome PWA - Theme Color
  // ============================================================
  function addAndroidPWAMeta() {
    // theme-color for Android Chrome
    var themeColor = document.querySelector('meta[name="theme-color"]');
    if (!themeColor) {
      var meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = '#C9A84C';
      document.head.appendChild(meta);
    }

    // manifest link
    var manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      var link = document.createElement('link');
      link.rel = 'manifest';
      link.href = '/COMEX-GOLD_FUTURE-TRADE/manifest.json';
      document.head.appendChild(link);
    }
  }

  // ============================================================
  // FIX 6: Network Error Handling - Firebase offline graceful
  // ============================================================
  function handleNetworkErrors() {
    window.addEventListener('unhandledrejection', function (e) {
      if (e.reason && e.reason.code) {
        var code = e.reason.code;
        // Firebase errors - suppress crash, show user-friendly message
        if (code.indexOf('auth/') !== -1 || code.indexOf('firestore/') !== -1) {
          e.preventDefault();
          console.warn('[COMEX] Firebase error handled:', code);
        }
      }
    });
  }

  // ============================================================
  // INIT - အားလုံး run မယ်
  // ============================================================
  function init() {
    injectLoadingOverlay();
    fixIOSViewport();
    addAndroidPWAMeta();
    fixTradingViewErrors();
    handleNetworkErrors();

    // DOM ready ဆိုမှ Firebase fix run မယ်
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fixFirebaseAuthRace);
    } else {
      fixFirebaseAuthRace();
    }

    // Fallback: 5 seconds နောက်ဆုံး loader ဖယ်မယ်
    setTimeout(hideLoader, 5000);
  }

  // Script run မယ်
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
