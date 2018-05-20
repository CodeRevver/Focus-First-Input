// GLOBALS
var keysPressed = [];
var numericLinkOverlayEnabled = false;
var numericLinkAttributeIdentifierPrefix = 'focus-first-input-numeric-link-number';
var numericLinkClass = 'focus-first-input-numeric-link';
var disableDonateNotification = false;
var siteExclusionList = [];

focusOnFirstInput = function () {
  if (document.activeElement.tagName != "input") {
    var inputs = document.body.getElementsByTagName("input")
    focused = false
    for (var i = 0; i < inputs.length; i++) {
      var input = inputs[i]
      if (elementInViewport(input) && (input.type == "text" || input.type == "search")) {
        input.focus()
        focused = true
        break
      }
    }

    if (!focused && inputs.length > 0)
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i]
        if (elementInViewport(input)) {
          input.focus()
          focused = true
          break
        }
      }
  }
}

elementInViewport = function (el) {
  var rect = el.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
};

enableNumericLinks = function () {
  var i = 1;
  var linkableElements = Array.from(document.getElementsByTagName("a"));
  linkableElements.forEach(function (aLink) {
    if (elementInViewport(aLink)) {

      aLink.classList.add(numericLinkClass);
      aLink.setAttribute(numericLinkAttributeIdentifierPrefix, i);
      i++;
      console.log('in vp');
    }
    else {
      console.log('not in vp');
    }
  });

  numericLinkOverlayEnabled = true;
  console.log('numeric links activated');
};

disableNumericLinks = function () {
  var i = 1;
  var linkableElements = Array.from(document.getElementsByTagName("a"));
  linkableElements.forEach(function (aLink) {
    aLink.classList.remove(numericLinkClass);
    aLink.removeAttribute(numericLinkAttributeIdentifierPrefix);
    i++;
  });

  numericLinkOverlayEnabled = false;
  console.log('numeric links deactivated');
};

clearKeysPressed = function () {
  console.log('cleared keys pressed');
  keysPressed = [];
};

toggleDonateNotification = function () {
  var newDonateNotificationSetting = !disableDonateNotification;
  chrome.storage.sync.set({ 'disableDonateNotification': newDonateNotificationSetting }, function () {
    console.log('Donate notification set to: ' + newDonateNotificationSetting);
  });
};

addToSiteExclusionList = function () {
  var siteToAdd = window.location.host;
  siteExclusionList.push(siteToAdd);
  chrome.storage.sync.set({ 'siteExclusionList': siteExclusionList }, function () {
    console.log('Site exclusion list set to: ' + siteExclusionList);
  });
};

removeFromSiteExclusionList = function () {
  var siteToRemove = window.location.host;
  var positionOfItem = siteExclusionList.indexOf(siteToRemove);
  if (positionOfItem !== -1) {
    siteExclusionList.splice(positionOfItem, 1);
    chrome.storage.sync.set({ 'siteExclusionList': siteExclusionList }, function () {
      console.log('Site exclusion list set to: ' + siteExclusionList);
    });
  }
};

init = function () {
  chrome.storage.sync.get(['disableDonateNotification', 'siteExclusionList'], function (result) {
    disableDonateNotification = result.disableDonateNotification ? result.disableDonateNotification : false;
    siteExclusionList = result.siteExclusionList ? result.siteExclusionList : [];
    console.log('Settings retrieved', result);
  });

  // Setup event listeners
  document.onkeyup = function (e) {
    if (e.keyCode === 18 && numericLinkOverlayEnabled) {
      console.log('released alt key');
      e.preventDefault();

      if (keysPressed.length > 0) {
        //// Has some numbers
        var numericValueOfLink = keysPressed.join('');
        console.log('keys pressed: alt+' + numericValueOfLink);
        var elementToClick = document.querySelector('[' + numericLinkAttributeIdentifierPrefix + '="' + numericValueOfLink + '"]');
        if (elementToClick) {
          elementToClick.click();
        }
      }

      disableNumericLinks();
      clearKeysPressed();
    }

    var isAltS = keysPressed.length === 1 && keysPressed[0] === 's';

    if (isAltS) {
      e.preventDefault();
      focusOnFirstInput();
      clearKeysPressed();
      return;
    }
  }

  document.onkeydown = function (e) {
    if (e.altKey && !numericLinkOverlayEnabled) {
      // Alt key pressed by itself
      e.preventDefault();
      enableNumericLinks();
    }

    var keyCodeBetween0To9 = e.key >= 0 && e.key <= 9;
    var keyCodeS = e.keyCode === 83;
    if (e.altKey && (keyCodeBetween0To9 || keyCodeS)) {
      e.preventDefault();
      keysPressed.push(e.key);
      console.log('pushed ' + e.key);
    }
  }
};

init();
