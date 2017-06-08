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

function EventMerger(key_function, clean_up_function) {
    this.makeKey = key_function;
    this.cleanUp = clean_up_function;
}

EventMerger.prototype = {
    getEventSets: function ($events) {
        var event_sets = {},
            makeKey = this.makeKey;
        $events.each(function () {
            var $event = $(this),
                key = makeKey($event).replace(/\s/g, '');
            event_sets[key] = event_sets[key] || [];
            event_sets[key].push($event);
        });
        return event_sets;
    },
    makeAltTextColors: function ($element, colors) {
        $element.prepend(" ");
        $element.find(".color-bar").remove();
        $.each(colors.reverse(), function (i, color) {
            $element.prepend($("<span>")
                .addClass('color-bar')
                .css({
                    'background-color': color,
                    'width': '4px',
                    'height': '12px',
                    'display': 'inline-block'
                }));
        });
    },
    makeStripes: function ($element, colors) {
        chrome.storage.sync.get({
                stripeWidth: 10
            }, function(items) {
            var gradient = "repeating-linear-gradient( 45deg,",
                pos = 0;
            $.each(colors, function (i, color) {
                gradient += color + " " + pos + "px,";
                pos += items.stripeWidth;
                gradient += color + " " + pos + "px,";
            });
            gradient = gradient.slice(0, -1);
            gradient += ")";
            $element.css('background-image', gradient);
        });
    },
    mergeEvents: function (name, event_set) {
        if (event_set.length > 1) {

            var background = $(event_set[0]).css('background-color');
            // If the background is transparent, use the text color
            var style_type = background.indexOf("rgba") == -1 ?
                        'background-color' : 'color';

            var colors = $.map(event_set, function (event) {
                return $(event).css(style_type);
            });

            var keep = event_set.shift();
            $(event_set).each(function () {
                $(this).parent().css('visibility', 'hidden');
                $(this).parent().find('*').css('visibility', 'hidden');
            });

            if (style_type == 'background-color') {
                this.makeStripes(keep, colors);
            } else {
                this.makeAltTextColors(keep, colors);
            }
            this.cleanUp && this.cleanUp(keep);
        }
    },
    mergeSets: function ($events) {
        var sets = this.getEventSets($events);
        $.each(sets, $.proxy(this.mergeEvents, this));
    }
};

/*****************************************************************************/

function cleanEventTitle(event_title) {
    return event_title.trim()
        .replace(/\(.*\)$/, ''); // Remove parentheticals at end for 1:1 lab
}

function weekTimedEventKey($event) {
    var event_name = cleanEventTitle($event.find('dd .evt-lk').text()),
        event_time = $event.find('dt').text(),
        col = $event.parents('.tg-col-eventwrapper').attr('id');
    return event_name + event_time + col;
}

function tableEventKey($event) {
    var event_name = cleanEventTitle($event.text()),
        $td = $event.parents('td'),
        days = $td.attr("colspan") || 1,
        col = $td.position().left;
    return event_name + ":" + col + ":" + days;
}

function monthAllDayEventKey($event) {
    var row = $event.parents('.month-row').index();
    return tableEventKey($event) + ":" + row;
}

function monthTimedEventKey($event) {
    var time = $event.find('.te-t').text();
    return monthAllDayEventKey($event) + time;
}

function cleanUp($event) {
    var chip = $event.parents('.chip');
    if (chip[0]) {
        var left = Number(chip[0].style.left.replace(/%/g, ''));
        chip.css('width', 100 - (isNaN(left) ? 0 : left) + "%");
    }
}

var weekTimed = new EventMerger(weekTimedEventKey, cleanUp),
    weekAllDay = new EventMerger(tableEventKey),
    monthTimed = new EventMerger(monthTimedEventKey),
    monthAllDay = new EventMerger(monthAllDayEventKey);

chrome.runtime.sendMessage({}, function(response) {
  if (response.enabled) {
    var merging_main = false;
    $(document).on("DOMNodeInserted", "#gridcontainer", function () {
        if (!merging_main) {
            merging_main = true;
            var grid_container = $(this);
            weekTimed.mergeSets(grid_container.find('dl'));
            weekAllDay.mergeSets(grid_container.find(".wk-weektop .rb-n"));
            monthTimed.mergeSets(grid_container.find(".te"));
            monthAllDay.mergeSets(grid_container.find(".mv-event-container .rb-n"));
            merging_main = false;
        }
    });

    var merging_find_time = false;
    $(document).on("DOMNodeInserted", "#scTgTable", function (e) {
        if (!merging_find_time) {
            merging_find_time = true;
            var find_time_container = $(this);
            weekTimed.mergeSets(find_time_container.find('dl'));
            weekAllDay.mergeSets(find_time_container.find(".rb-n"));
            merging_find_time = false;
        }
    });
  }
});
