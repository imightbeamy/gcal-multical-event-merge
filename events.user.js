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

  const colorCounts = colors.reduce((counts, color) => {
    counts[color] = (counts[color] || 0) + 1;
    return counts;
  }, {});

  colors.forEach((color, i) => {
    colorCounts[color] -= 1;
    color = chroma(color).darken(colorCounts[color]/3).css();

    gradient += color + " " + pos + "%,";
    pos += width;
    gradient += color + " " + pos + "%,";
  });
  gradient = gradient.slice(0, -1);
  gradient += ")";
  return gradient;
}

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
      borderColor: eventToKeep.style.borderColor,
      textShadow: eventToKeep.style.textShadow,
    };
    eventToKeep.style.backgroundImage = verticalBandColours(colors);
    eventToKeep.style.backgroundSize = "initial";
    eventToKeep.style.left = Math.min.apply(Math, positions.map(s => s.left)) + 'px';
    eventToKeep.style.right = Math.min.apply(Math, positions.map(s => s.right)) + 'px';
    eventToKeep.style.visibility = "visible";
    eventToKeep.style.width = null;
    eventToKeep.style.border = "solid 1px #FFF";

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
