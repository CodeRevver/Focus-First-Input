// GLOBALS
let appSettings = {
  disableDonateNotification: false,
  siteExclusionList: []
}

let helpers = {
  logToConsole(message, logLevel = 'debug') {
    if (this.isDevMode()) {
      switch (logLevel) {
        case 'error': console.error(message); break;
        case 'warn': console.warn(message); break;
        case 'info': console.info(message); break;
        case 'debug': console.debug(message); break;
        default: console.debug(message); break;
      }
    }
  },

  elementInViewport(el) {
    let rect = el.getBoundingClientRect();

    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  isDevMode() {
    return !('update_url' in chrome.runtime.getManifest());
  }
};

class ScreenOverlord {
  constructor() {
    this.keysPressed = [];
    this.numericLinkOverlayEnabled = false;
  }

  onkeyup(e) {
    if (e.keyCode === 18 && this.numericLinkOverlayEnabled) {
      helpers.logToConsole('released alt key');
      e.preventDefault();

      if (this.keysPressed.length > 0) {
        //// Has some numbers
        let numericValueOfLink = this.keysPressed.join('');
        helpers.logToConsole('keys pressed: alt+' + numericValueOfLink);
        let elementToClick = document.querySelector('[focus-first-input-numeric-link-number="' + numericValueOfLink + '"]');
        if (elementToClick) {
          elementToClick.click();
        }
      }

      this.disableNumericLinks();
      this.clearKeysPressed();
    }

    let isAltS = this.keysPressed.length === 1 && this.keysPressed[0] === 's';

    if (isAltS) {
      e.preventDefault();
      this.focusOnFirstInput();
      this.clearKeysPressed();
      return;
    }

    helpers.logToConsole('Event listeners set up');
  }

  onkeydown(e) {
    if (e.altKey && !this.numericLinkOverlayEnabled) {
      // Alt key pressed by itself
      e.preventDefault();
      this.enableNumericLinks();
    }

    let keyCodeBetween0To9 = e.key >= 0 && e.key <= 9;
    let keyCodeS = e.keyCode === 83;
    if (e.altKey && (keyCodeBetween0To9 || keyCodeS)) {
      e.preventDefault();
      this.keysPressed.push(e.key);
      helpers.logToConsole('pushed ' + e.key);
    }
  }

  onblur(e) {
    this.disableNumericLinks();
    this.clearKeysPressed();
  }

  focusOnFirstInput() {
    if (document.activeElement.tagName != "input") {
      let inputs = document.body.getElementsByTagName("input")
      let focused = false
      for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i]
        if (helpers.elementInViewport(input) && (input.type == "text" || input.type == "search")) {
          input.focus()
          focused = true
          break
        }
      }

      if (!focused && inputs.length > 0)
        for (let i = 0; i < inputs.length; i++) {
          let input = inputs[i]
          if (helpers.elementInViewport(input)) {
            input.focus()
            focused = true
            break
          }
        }
    }
  }

  enableNumericLinks() {
    let i = 1;
    let linkableElements = Array.from(document.getElementsByTagName("a"));
    linkableElements.forEach(function (aLink) {
      if (helpers.elementInViewport(aLink)) {
        aLink.classList.add('focus-first-input-numeric-link');
        aLink.setAttribute('focus-first-input-numeric-link-number', i);
        i++;
      }
    });

    this.numericLinkOverlayEnabled = true;
    helpers.logToConsole('numeric links activated');
  };

  disableNumericLinks() {
    let i = 1;
    let linkableElements = Array.from(document.getElementsByTagName("a"));
    linkableElements.forEach(function (aLink) {
      aLink.classList.remove('focus-first-input-numeric-link');
      aLink.removeAttribute('focus-first-input-numeric-link-number');
      i++;
    });

    this.numericLinkOverlayEnabled = false;
    helpers.logToConsole('numeric links deactivated');
  };

  toggleDonateNotification() {
    let newDonateNotificationSetting = !appSettings.disableDonateNotification;
    chrome.storage.sync.set({ 'disableDonateNotification': newDonateNotificationSetting }, function () {
      helpers.logToConsole('Donate notification set to: ' + newDonateNotificationSetting);
    });
  };

  addToSiteExclusionList() {
    let siteToAdd = window.location.host;
    appSettings.siteExclusionList.push(siteToAdd);
    chrome.storage.sync.set({ 'siteExclusionList': appSettings.siteExclusionList }, function () {
      helpers.logToConsole('Site exclusion list set to: ' + appSettings.siteExclusionList);
    });
  };

  removeFromSiteExclusionList() {
    let siteToRemove = window.location.host;
    let positionOfItem = appSettings.siteExclusionList.indexOf(siteToRemove);
    if (positionOfItem !== -1) {
      appSettings.siteExclusionList.splice(positionOfItem, 1);
      chrome.storage.sync.set({ 'siteExclusionList': appSettings.siteExclusionList }, function () {
        helpers.logToConsole('Site exclusion list set to: ' + appSettings.siteExclusionList);
      });
    }
  };

  clearKeysPressed() {
    this.keysPressed = [];
    helpers.logToConsole('cleared keys pressed');
  };
};

init = function () {
  chrome.storage.sync.get(['disableDonateNotification', 'siteExclusionList'], function (result) {
    appSettings.disableDonateNotification = result.disableDonateNotification ? result.disableDonateNotification : false;
    appSettings.siteExclusionList = result.siteExclusionList ? result.siteExclusionList : ['www.google.co.uk', 'www.google.com'];
    helpers.logToConsole('Settings retrieved', result);

    let siteIsExcluded = appSettings.siteExclusionList.includes(window.location.host);
    if (!siteIsExcluded) {
      var screenOverlord = new ScreenOverlord();

      document.onkeyup = function (e) {
        screenOverlord.onkeyup(e);
      }

      document.onkeydown = function (e) {
        screenOverlord.onkeydown(e);
      }

      window.onblur = function (e) {
        screenOverlord.onblur(e);
      }
    } else {
      helpers.logToConsole('Site is exluded - functionality disabled');
    }
  });
};

init();
