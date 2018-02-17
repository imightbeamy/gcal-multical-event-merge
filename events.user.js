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

console.log("event merge");

const stripesGradient = (colors) => {
  let gradient = "repeating-linear-gradient( 45deg,";
  let pos = 0;

  colors.forEach(color => {
    gradient += color + " " + pos + "px,";
    pos += 10;
    gradient += color + " " + pos + "px,";
  });
  gradient = gradient.slice(0, -1);
  gradient += ")";
  return gradient;
};

const dragType = e => parseInt(e.dataset.dragsourceType);
const parsePixels = px => parseInt(px.replace('px', ''));

const merge = (mainCalender) => {
  const eventSets = {};
  const days = mainCalender.querySelectorAll("[role=\"gridcell\"]");
  days.forEach((day, index) => {
    const events = Array.from(day.querySelectorAll("[role=\"button\"]"));
    events.forEach(event => {
      let eventKey = event.querySelector("div:nth-child(2)").textContent.replace(/\\s+/g,"");
      eventKey = index + eventKey;
      eventSets[eventKey] = eventSets[eventKey] || [];
      eventSets[eventKey].push(event);
    });
  });

  Object.values(eventSets)
    .filter(events => events.length > 1)
    .forEach(events => {
      const colors = events.map(event => event.style.backgroundColor || event.style.borderColor);
      const gradient = stripesGradient(colors);

      events.sort((e1, e2) => dragType(e1) - dragType(e2));
      const styles = events.map(window.getComputedStyle);
      const eventToKeep = events.shift();
      eventToKeep.style.backgroundImage = gradient;
      eventToKeep.style.left = Math.min.apply(Math, styles.map(s => parsePixels(s.left))) + 'px';
      eventToKeep.style.right = Math.min.apply(Math, styles.map(s => parsePixels(s.right))) + 'px';
      eventToKeep.style.visibility = "visible";
      eventToKeep.style.width = null;

      events.forEach(event => {
        event.style.visibility = "hidden";
      });
    });
}

const init = (mutationsList) => {
  const main = mutationsList && mutationsList
    .map(mutation => mutation.addedNodes[0] || mutation.target)
    .filter(node => node.matches && node.matches("[role=\"main\"]"))[0];

  if (main) {
    const mainCalender = main.querySelector("[role=\"grid\"] > [role=\"presentation\"][data-type=\"1\"]");
    if (mainCalender) {
      merge(mainCalender);
      new MutationObserver(() => merge(mainCalender))
        .observe(mainCalender, { childList: true, subtree: true, attributes: true });
    }
  }
}

chrome.runtime.sendMessage({}, response => {
  if (response.enabled) {
    const observer = new MutationObserver(init);
    observer.observe(document.querySelector('body'), { childList: true, subtree: true, attributes: true });
  }
});
