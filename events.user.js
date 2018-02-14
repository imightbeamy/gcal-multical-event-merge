// ==UserScript==
// @name        Event Merge for Google Calendar™ (by @imightbeAmy)
// @namespace   gcal-multical-event-merge
// @include     https://www.google.com/calendar/*
// @include     http://www.google.com/calendar/*
// @include     https://calendar.google.com/*
// @include     http://calendar.google.com/*
// @require     https://ajax.googleapis.com/ajax/libs/jquery/2.1.0/jquery.min.js
// @version     1
// @grant       none
// ==/UserScript==

'use strict';

const merge = () => {
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

  const grids = document.querySelectorAll("[role=\"main\"] [role=\"grid\"] > [role=\"presentation\"]");
  const mainCalender = Array.from(grids).find(grid => typeof grid.dataset.isColumnViewContext === "undefined");

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

      const eventToKeep = events.shift();
      eventToKeep.style.backgroundImage = gradient;

      let width = Number(events[0].style.width.replace(/%/g, ""));
      if (!isNaN(width)) {
        width = width * (events.length + 1);
        width = Math.min(width, 100);
        eventToKeep.style.width = width + "%";
      }

      events.forEach(event => {
        event.style.visibility = "hidden";
      });
    });
}

chrome.runtime.sendMessage({}, function(response) {
  if (response.enabled) {
    $(document).ready(merge);
  }
});
