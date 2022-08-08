// ==UserScript==
// @name        Event Merge for Google Calendar™ (by @imightbeAmy)
// @namespace   gcal-multical-event-merge
// @include     https://www.google.com/calendar/*
// @include     http://www.google.com/calendar/*
// @include     https://calendar.google.com/*
// @include     http://calendar.google.com/*
// @version     1
// @grant       none
// ==/UserScript==

'use strict';

const verticalBandColours = (colors) => {
  let gradient = `linear-gradient( 90deg,`;
  let pos = 0;
  const width = 100/colors.length


  colors.forEach((colorObj, i) => {
    pos += width;
    if (colorObj.bg) {
      gradient += colorObj.bg + " 0%" + pos + "%,";
    }
    if (colorObj.bc) {
      // if border set then zebra segment to simulate border and text
      const colorBrighter = chroma(colorObj.bc).brighten().css();
      const fifth = width/5
      gradient += `${colorObj.bc} 0% ${pos - width + fifth}%,
      ${colorBrighter} 0% ${pos - width + (2*fifth)}%,
      ${colorObj.bc} 0% ${pos - width + (3*fifth)}%,
      ${colorBrighter} 0% ${pos - width + (4*fifth)}%,
      ${colorObj.bc} 0% ${pos}%,`;
    } else {
      gradient += colorObj.pbc + " 0%" + pos + "%,";
    }
  });
  gradient = gradient.slice(0, -1);
  gradient += ")";
  return gradient;
};

const dragType = e => parseInt(e.dataset.dragsourceType);

const calculatePosition = (event, parentPosition) => {
  const eventPosition = event.getBoundingClientRect();
  return {
    left: Math.max(eventPosition.left - parentPosition.left, 0),
    right: parentPosition.right - eventPosition.right,
  }
}

const mergeEventElements = (events) => {
  events.sort((e1, e2) => dragType(e1) - dragType(e2));
  const colors = events.map(event => {
    return {
      bg: event.style.backgroundColor, // Week day and full day events marked 'attending'
      bc: event.style.borderColor, // Not attending or not responded week view events
      pbc: event.parentElement.style.borderColor // Timed month view events
    }
});

  if (events.length === 6) {
    console.log('sixer found')
    events.forEach((event,i) => {
      console.log(i)
      console.log(event.style)
      console.log(event.style.backgroundColor)
      console.log(event.style.borderColor)
      console.log(event.parentElement.style.borderColor)
    })
    console.log(colors)
  }

  const parentPosition = events[0].parentElement.getBoundingClientRect();
  const positions = events.map(event => {
    event.originalPosition = event.originalPosition || calculatePosition(event, parentPosition);
    return event.originalPosition;
  });

  const eventToKeep = events.shift();
  events.forEach(event => {
    event.style.visibility = "hidden";
  });


  if (eventToKeep.style.backgroundColor || eventToKeep.style.borderColor) {
    eventToKeep.originalStyle = eventToKeep.originalStyle || {
      backgroundImage: eventToKeep.style.backgroundImage,
      backgroundSize: eventToKeep.style.backgroundSize,
      left: eventToKeep.style.left,
      right: eventToKeep.style.right,
      visibility: eventToKeep.style.visibility,
      width: eventToKeep.style.width,
      border: eventToKeep.style.border,
      borderColor: eventToKeep.style.borderColor,
      textShadow: eventToKeep.style.textShadow,
    };
    eventToKeep.style.backgroundImage = verticalBandColours(colors);
    eventToKeep.style.backgroundSize = "initial";
    eventToKeep.style.left = Math.min.apply(Math, positions.map(s => s.left)) + 'px';
    eventToKeep.style.right = Math.min.apply(Math, positions.map(s => s.right)) + 'px';
    eventToKeep.style.visibility = "visible";
    eventToKeep.style.width = null;
    //eventToKeep.style.border = "solid 1px #FFF";

    // Clear setting color for declined events
    eventToKeep.querySelector('[aria-hidden="true"]').style.color = null;

    const computedSpanStyle = window.getComputedStyle(eventToKeep.querySelector('span'));
    if (computedSpanStyle.color == "rgb(255, 255, 255)") {
      eventToKeep.style.textShadow = "0px 0px 2px black";
    } else {
      eventToKeep.style.textShadow = "0px 0px 2px white";
    }

    events.forEach(event => {
      event.style.visibility = "hidden";
    });
  } else {
    const dots = eventToKeep.querySelector('[role="button"] div:first-child');
    const dot = dots.querySelector('div');
    dot.style.backgroundImage = verticalBandColours(colors);
    dot.style.width = colors.length * 4 + 'px';
    dot.style.borderWidth = 0;
    dot.style.height = '8px';

    events.forEach(event => {
      event.style.visibility = "hidden";
    });
  }
}

const resetMergedEvents = (events) => {
  events.forEach(event => {
    for (var k in event.originalStyle) {
      event.style[k] = event.originalStyle[k];
    }
    event.style.visibility = "visible";
  });
}

const merge = (mainCalender) => {
  const eventSets = {};
  const days = mainCalender.querySelectorAll("[role=\"gridcell\"]");
  days.forEach((day, index) => {
    const events = Array.from(day.querySelectorAll("[data-eventid][role=\"button\"], [data-eventid] [role=\"button\"]"));
    events.forEach(event => {
      const eventTitleEls = event.querySelectorAll('[aria-hidden="true"]');
      if (!eventTitleEls.length) {
        return;
      }
      let eventKey = Array.from(eventTitleEls).map(el => el.textContent).join('').replace(/\\s+/g,"");
      eventKey = index + eventKey + event.style.height;
      eventSets[eventKey] = eventSets[eventKey] || [];
      eventSets[eventKey].push(event);
    });
  });

  Object.values(eventSets)
    .forEach(events => {
      if (events.length > 1) {
        mergeEventElements(events);
      } else {
        resetMergedEvents(events)
      }
    });
}

const init = (mutationsList) => {
  mutationsList && mutationsList
    .map(mutation => mutation.addedNodes[0] || mutation.target)
    .filter(node => node.matches && node.matches("[role=\"main\"], [role=\"dialog\"], [role=\"grid\"]"))
    .map(merge);
}

setTimeout(() => chrome.storage.local.get('disabled', storage => {
  console.log(`Event merge is ${storage.disabled ? 'disabled' : 'enabled'}`);
  if (!storage.disabled) {
    const observer = new MutationObserver(init);
    observer.observe(document.querySelector('body'), { childList: true, subtree: true, attributes: true });
  }

  chrome.storage.onChanged.addListener(() => window.location.reload())
}), 10);
