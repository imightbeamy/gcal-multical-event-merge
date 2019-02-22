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

const stripesGradient = (colors, width, angle) => {
  const offsetWidth = 1;
  let pos = 0;
  let lastColor;
  let gradient = colors.reduce((gradient, color, i) => {
    const nextPos = pos + width + offsetWidth;
    // Blend the colors
    let offsetColor = chroma.blend(color, lastColor || color, 'multiply').css();
    lastColor = color;
    // Add offset stripe
    gradient += `${offsetColor} ${pos}px, ${offsetColor} ${pos + offsetWidth}px,`;
    gradient += `${color} ${pos + offsetWidth}px, ${color} ${nextPos}px,`;
    pos = nextPos;
    return gradient;
  }, `repeating-linear-gradient( ${angle}deg,`).slice(0, -1) + ")";
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
  const colors = events.map(event =>
    event.style.backgroundColor || // Week day and full day events marked 'attending'
    event.style.borderColor || // Not attending or not responded week view events
    event.parentElement.style.borderColor // Timed month view events
  );

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
    };
    eventToKeep.style.backgroundImage = stripesGradient(colors, 10, 45);
    eventToKeep.style.backgroundSize = "initial";
    eventToKeep.style.left = Math.min.apply(Math, positions.map(s => s.left)) + 'px';
    eventToKeep.style.right = Math.min.apply(Math, positions.map(s => s.right)) + 'px';
    eventToKeep.style.visibility = "visible";
    eventToKeep.style.width = null;
    eventToKeep.style.border = "solid 1px #FFF"

    events.forEach(event => {
      event.style.visibility = "hidden";
    });
  } else {
    const dots = eventToKeep.querySelector('[role="button"] div:first-child');
    const dot = dots.querySelector('div');
    dot.style.backgroundImage = stripesGradient(colors, 4, 90);
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
