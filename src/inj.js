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
  
  createOverlayElement(rect, linkNumber) {
    if(rect.top === 0 && rect.left === 0){
      return null; //// It's not truly on the page - probably hidden but not marked as invisible
    }
    
    let heightOfElement = 18; // Pixels
    let widthOfElement = linkNumber.toString().length * 5; // Number of characters times the width of one character 
  
    // Basically high number - low number halfed is middle then add low number to get dead center 
    // but take away half of height/width of element to take into account element height/width
    let middleishPosition = (rect.bottom - rect.top)/2 + (rect.top - (heightOfElement/2));
    let centerishPosition = (rect.right - rect.left)/2 + (rect.left - (widthOfElement/2));
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
}

class ScreenOverlord {
  constructor() {
    this.keysPressed = [];
    this.overlayEnabled = false;
  }

  onkeyup(e) {
    if (e.keyCode === 18 && this.overlayEnabled) {
      helpers.logToConsole('released alt key');
      e.preventDefault();

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
      e.preventDefault();
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
  // Consider calling enable overlay links - so setup the links so that they can be called really quicly when pressing alt
  // Might need to add something called enabled to the stylesheet so that all I have to do is set enabled to true/false so show the overlay

  chrome.storage.sync.get(['disableDonateNotification', 'siteExclusionList'], function (result) {
    appSettings.disableDonateNotification = result.disableDonateNotification ? result.disableDonateNotification : false;
    appSettings.siteExclusionList = result.siteExclusionList ? result.siteExclusionList : ['www.google.co.uk', 'www.google.com'];
    helpers.logToConsole('Settings retrieved', result);

    let siteIsExcluded = appSettings.siteExclusionList.includes(window.location.host);
    if (!siteIsExcluded) {
      let screenOverlord = new ScreenOverlord();

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
