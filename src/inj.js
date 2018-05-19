// GLOBALS
var keysPressed = [];
var numericLinkOverlayEnabled = true;
var numericLinkAttributeIdentifierPrefix = 'focus-first-input-numeric-link-number';
var numericLinkClass = 'focus-first-input-numeric-link';

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
  var top = el.offsetTop;
  var left = el.offsetLeft;
  var width = el.offsetWidth;
  var height = el.offsetHeight;

  while (el.offsetParent) {
    el = el.offsetParent;
    top += el.offsetTop;
    left += el.offsetLeft;
  }

  return (
    top >= window.pageYOffset &&
    left >= window.pageXOffset &&
    (top + height) <= (window.pageYOffset + window.innerHeight) &&
    (left + width) <= (window.pageXOffset + window.innerWidth)
  );
};

enableNumericLinks = function () {
  var i = 1;
  var linkableElements = Array.from(document.getElementsByTagName("a"));
  linkableElements.forEach(function (aLink) {
    aLink.classList.add(numericLinkClass);
    aLink.setAttribute(numericLinkAttributeIdentifierPrefix, i);
    i++;
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

clearKeysPressed = function() {
  console.log('cleared keys pressed');
  keysPressed = [];
};

document.onkeyup = function (e) {
  if (e.keyCode === 18 && numericLinkOverlayEnabled) {
    console.log('released alt key');
    e.preventDefault();
    // Alt key is released

    if (keysPressed.length > 0) {
      //// Has some numbers
      var numericValueOfLink = keysPressed.join('');
      console.log('keys pressed: alt+' + numericValueOfLink);
      var elementToClick = document.querySelector('[' + numericLinkAttributeIdentifierPrefix + '="' + numericValueOfLink + '"]');
      if(elementToClick){
        elementToClick.click();
      }
    }

    disableNumericLinks();
    clearKeysPressed();
  }

  var isAltS = keysPressed.length === 1 && keysPressed[0] === 83;

  if (isAltS) {
    e.preventDefault();
    focusOnFirstInput();
    clearKeysPressed();
    return;
  }
}

document.onkeydown = function (e) {
  if (e.altKey && !numericLinkOverlayEnabled) {
    e.preventDefault();
    // Alt key pressed by itself
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
