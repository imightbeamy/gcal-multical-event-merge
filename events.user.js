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

      const left = events[0].style.left;
      events.sort((e1, e2) => dragType(e1) - dragType(e2));
      const eventToKeep = events.shift();
      eventToKeep.style.backgroundImage = gradient;

      let width = Number(events[0].style.width.replace(/%/g, ""));
      if (!isNaN(width)) {
        width = width * (events.length + 1);
        width = Math.min(width, 100);
        eventToKeep.style.width = width + "%";
      }
      eventToKeep.style.left = left;

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
