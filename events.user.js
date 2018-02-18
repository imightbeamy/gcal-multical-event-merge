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
  let gradient = `repeating-linear-gradient( ${angle}deg,`;
  let pos = 0;

  colors.forEach(color => {
    gradient += color + " " + pos + "px,";
    pos += width;
    gradient += color + " " + pos + "px,";
  });
  gradient = gradient.slice(0, -1);
  gradient += ")";
  return gradient;
};

const dragType = e => parseInt(e.dataset.dragsourceType);

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
      let eventKey = Array.from(eventTitleEls).map(el => el.textContent).join().replace(/\\s+/g,"");
      eventKey = index + eventKey;
      eventSets[eventKey] = eventSets[eventKey] || [];
      eventSets[eventKey].push(event);
    });
  });

  Object.values(eventSets)
    .forEach(events => {
      if (events.length > 1) {
        const colors = events.map(event =>
          event.style.backgroundColor || // Week day and full day events marked 'attending'
          event.style.borderColor || // Not attending or not responded week view events
          event.parentElement.style.borderColor // Timed month view events
        );
        events.sort((e1, e2) => dragType(e1) - dragType(e2));

        const parentPosition = events[0].parentElement.getBoundingClientRect();
        const positions = events.map(event => {
          const eventPosition = event.getBoundingClientRect();
          event.originalLeft = event.originalLeft || eventPosition.left;
          event.originalRight = event.originalRight || eventPosition.right;
          return {
            left: eventPosition.left - parentPosition.left,
            right: parentPosition.right - eventPosition.right,
          }
        });

        const eventToKeep = events.shift();
        events.forEach(event => {
          event.style.visibility = "hidden";
        });

        if (eventToKeep.style.backgroundColor || eventToKeep.style.borderColor) {
          eventToKeep.style.backgroundImage = stripesGradient(colors, 10, 45);
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
      } else {
        events.forEach(event => {
          event.style.visibility = "visible";
        });
      }
    });
}

const init = (mutationsList) => {
  mutationsList && mutationsList
    .map(mutation => mutation.addedNodes[0] || mutation.target)
    .filter(node => node.matches && node.matches("[role=\"main\"], [role=\"dialog\"]"))
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
