// GLOBALS
let appSettings = {
  disableDonateNotification: false,
  siteExclusionList: [],
  isDevMode: false
}

let helpers = {
  logToConsole(message, logLevel = 'debug') {
    if (appSettings.isDevMode) {
      switch (logLevel) {
        case 'error': console.error(message); break;
        case 'warn': console.warn(message); break;
        case 'info': console.info(message); break;
        case 'debug': console.debug(message); break;
        default: console.debug(message); break;
      }
    }
  },

  createOverlayElement(rect, linkNumber) {
    if (rect.top === 0 && rect.left === 0) {
      return null; //// It's not truly on the page - probably hidden but not marked as invisible
    }

    // Window positioning
    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    var overlayTop = scrollTop + rect.top;
    var overlayBottom = scrollTop + rect.bottom;
    var overlayLeft = scrollLeft + rect.left;
    var overlayRight = scrollLeft + rect.right;

    let heightOfElement = 20; // Pixels
    let widthOfElement = linkNumber.toString().length * 15; // Number of characters times the width of one character (alongside padding)

    // High number - low number halfed is middle then add low number to get dead center then...
    // take away half of height/width of element to take into account element height/width
    let middleishPosition = (overlayBottom - overlayTop) / 2 + (overlayTop - (heightOfElement / 2));
    let centerishPosition = (overlayRight - overlayLeft) / 2 + (overlayLeft - (widthOfElement / 2));
    overlayElement = document.createElement('div');
    overlayElement.style.top = middleishPosition.toString() + 'px';
    overlayElement.style.left = centerishPosition.toString() + 'px';

    overlayElement.classList.add('focus-first-input-overlay-element');
    overlayElement.setAttribute('focus-first-input-overlay-element-number', linkNumber);
    document.body.appendChild(overlayElement);

    return overlayElement;
  },

  elementInViewport(el) {
    let rect = el.getBoundingClientRect();

    var isOnViewPort = (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );

    var isVisible = false;
    if (isOnViewPort && helpers.isVisible(el)) {
      if (rect.height === 1 && rect.width === 1) {
        // Check for Shoddily programmed visibility
        isVisible = false;
      } else {
        isVisible = true;
      }
    }

    return isOnViewPort && isVisible;
  },

  isVisible(el) {
    if ((el.nodeType !== 1) || (el === document.body)) {
      return true;
    }

    if (el.attributes['aria-hidden'] && el.attributes['aria-hidden'].value === 'true') {
      return false;
    }

    if (el.currentStyle && el.currentStyle['display'] !== 'none' && el.currentStyle['visibility'] !== 'hidden') {
      return helpers.isVisible(el.parentNode);
    } else if (window.getComputedStyle) {
      var cs = document.defaultView.getComputedStyle(el, null);
      if (cs.getPropertyValue('display') !== 'none' && cs.getPropertyValue('visibility') !== 'hidden') {
        return helpers.isVisible(el.parentNode);
      }
    }
    return false;
  },

  isDevMode() {
    // Make sure the chrome.runtime.getManifest() function exists
    if (typeof chrome == 'object' && typeof chrome.runtime == 'object' && typeof chrome.runtime.getManifest == 'function') {
      var manifest = chrome.runtime.getManifest();
      if (!manifest) {
        return false;
      }

      if (typeof manifest.key == 'undefined' && typeof manifest.update_url == 'undefined') {
        return true;
      } else {
        return false;
      }
    }

    // We are unsure if the extension is installed or in developer mode. Assume installed.
    return false;
  }
}

class ScreenOverlord {
  constructor() {
    this.keysPressed = [];
    this.overlayEnabled = false;
  }

  onkeyup(e) {
    if (e.keyCode === 18 && this.overlayEnabled) {
      helpers.logToConsole('released alt key');

      if (this.keysPressed.length > 0) {
        //// Has some numbers
        let numericValueOfElement = this.keysPressed.join('');
        helpers.logToConsole('keys pressed: alt+' + numericValueOfElement);
        let elementToClick = document.querySelector('[focus-first-input-element-id="' + numericValueOfElement + '"]');
        if (elementToClick) {
          // Todo split out the code to focus on first input (alt s) and use it here as well
          elementToClick.focus()
          elementToClick.click();
        }
      }

      this.resetOverlay();
    }

    let isAltS = this.keysPressed.length === 1 && this.keysPressed[0] === 's';

    if (isAltS) {
      this.focusOnFirstInput();
      this.resetOverlay();
      return;
    }
  }

  resetOverlay() {
    this.disableOverlay();
    this.clearKeysPressed();
  }

  onkeydown(e) {
    if (e.altKey && !this.overlayEnabled) {
      // Alt key pressed by itself
      e.preventDefault();
      this.enableOverlay();
    }

    let keyCodeBetween0To9 = e.key >= 0 && e.key <= 9;
    let keyCodeS = e.keyCode === 83;
    let tabKey = e.keyCode === 9;
    if (e.altKey && (keyCodeBetween0To9 || keyCodeS)) {
      e.preventDefault();
      this.keysPressed.push(e.key);
      helpers.logToConsole('pushed ' + e.key);
    } else if (e.altKey && tabKey) {
      this.resetOverlay();
    }
  }

  onblur(e) {
    this.resetOverlay();
  }

  // Todo I should break this out so that I can call it from other code that people use to click an input
  focusOnFirstInput() {
    if (document.activeElement.tagName != 'input') {
      let inputs = document.body.getElementsByTagName('input')
      let focused = false
      for (let i = 0; i < inputs.length; i++) {
        let input = inputs[i]
        if (helpers.elementInViewport(input) && (input.type == 'text' || input.type == 'search')) {
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

  enableOverlay() {
    let anchors = Array.from(document.getElementsByTagName('a'));
    let buttons = Array.from(document.getElementsByTagName('button'));
    let input = Array.from(document.getElementsByTagName('input'));
    let select = Array.from(document.getElementsByTagName('select'));
    let clickableElements = [].concat(anchors, buttons, input, select);

    let i = 1;
    clickableElements.forEach(function (element) {
      if (helpers.elementInViewport(element)) {
        let rect = element.getBoundingClientRect();
        let overlayElement = helpers.createOverlayElement(rect, i);
        if (overlayElement) {
          element.setAttribute('focus-first-input-element-id', i);
          i++;
        }
      }
    });

    this.overlayEnabled = true;
    helpers.logToConsole(i + ' clickable elements activated');
  }

  disableOverlay() {
    let i = 1;
    let clickableElements = Array.from(document.getElementsByClassName('focus-first-input-overlay-element'));
    clickableElements.forEach(function (element) {
      element.remove();
      i++;
    });

    this.overlayEnabled = false;
    helpers.logToConsole(i + ' clickable elements deactivated');
  }

  toggleDonateNotification() {
    let newDonateNotificationSetting = !appSettings.disableDonateNotification;
    chrome.storage.sync.set({ 'disableDonateNotification': newDonateNotificationSetting }, function () {
      helpers.logToConsole('Donate notification set to: ' + newDonateNotificationSetting);
    });
  }

  addToSiteExclusionList() {
    let siteToAdd = window.location.host;
    appSettings.siteExclusionList.push(siteToAdd);
    chrome.storage.sync.set({ 'siteExclusionList': appSettings.siteExclusionList }, function () {
      helpers.logToConsole('Site exclusion list set to: ' + appSettings.siteExclusionList);
    });
  }

  removeFromSiteExclusionList() {
    let siteToRemove = window.location.host;
    let positionOfItem = appSettings.siteExclusionList.indexOf(siteToRemove);
    if (positionOfItem !== -1) {
      appSettings.siteExclusionList.splice(positionOfItem, 1);
      chrome.storage.sync.set({ 'siteExclusionList': appSettings.siteExclusionList }, function () {
        helpers.logToConsole('Site exclusion list set to: ' + appSettings.siteExclusionList);
      });
    }
  }

  clearKeysPressed() {
    this.keysPressed = [];
    helpers.logToConsole('cleared keys pressed');
  }
}

init = function () {
  appSettings.isDevMode = helpers.isDevMode();

  chrome.storage.sync.get(['disableDonateNotification', 'siteExclusionList'], function (result) {
    appSettings.disableDonateNotification = result.disableDonateNotification ? result.disableDonateNotification : false;
    appSettings.siteExclusionList = result.siteExclusionList ? result.siteExclusionList : ['www.google.co.uk', 'www.google.com'];
    helpers.logToConsole('Settings retrieved', result);

    let siteIsExcluded = appSettings.siteExclusionList.includes(window.location.host);
    if (!siteIsExcluded) {
      let screenOverlord = new ScreenOverlord();
      
      document.onkeypress = keypress;

      function keypress(e){
        //// Will only happen if alt is pressed along with a numeric value
        if(e.code === 'AltLeft'){
          e.preventDefault();
        }
      }

      document.onkeyup = function (e) {
        screenOverlord.onkeyup(e);
      }

      document.onkeydown = function (e) {
        screenOverlord.onkeydown(e);
      }

      window.onblur = function (e) {
        screenOverlord.onblur(e);
      }

      helpers.logToConsole('Event listeners set up');
    } else {
      helpers.logToConsole('Site is exluded - functionality disabled');
    }
  });
}

init();
