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
        if (colors.length == $element.children("#gcalmemm").length)
            return;
        $element.prepend(" ");
        $.each(colors.reverse(), function (i, color) {
            $element.prepend($("<span id='gcalmemm'>")
                .css({
                    'background-color': color,
                    'width': '4px',
                    'height': '12px',
                    'display': 'inline-block'
                }));
        });
    },
    makeStripes: function ($element, colors) {
        // make sure that we didn't already process this element
        if ($element.children("#gcalmemm").length != 0)
            return;
        $element.prepend($("<span id='gcalmemm'>"));
        
        // add "[Merged]" to the event title, event element varies depending on different views
        var foundDailyEvent = $element.find(".rb-ni");                        // daily event
        var foundRegularWithLink = $element.find("span.evt-lk");            // regular event with link
        var foundRegularWithoutLink = $element.find("span.cbrdcc");            // regular event without link
        
        // in order to not add "[Merged]" twice when the event is daily and with/without a link, we simply
        // add the "[Merged]" text on the daily event if this is a daily event, or if not we put the text on the regular event
        if (foundDailyEvent.length != 0) {
            foundDailyEvent.html(function(i,h){return h+" [Merged]";});    
        } else {
            foundRegularWithLink.html(function(i,h){return h+" [Merged]";});
            foundRegularWithoutLink.html(function(i,h){return h+" [Merged]";});    
        }
        
        var background = $element.css('background-color');
        var style_type = background.indexOf("rgba") == -1 ?
                        'background-color' : 'color';
        var elementColor = $element.css(style_type);
        var gradient = "repeating-linear-gradient( 135deg,",
            pos = 0;
            
        var uniqueColors = [];
        $.each(colors, function(i, el){
            if($.inArray(el, uniqueColors) === -1) uniqueColors.push(el);
        });
        if (uniqueColors.length == 1) {
            return;
        }
        $.each(uniqueColors, function (i, color) {
            // turn color string to an rgb array
            var rgba = color.match(/^rgb(?:a)?\(([0-9]{1,3}),\s([0-9]{1,3}),\s([0-9]{1,3})(?:,\s)?([0-9]{1,3})?\)$/);
            // create new semi-transparent color using the old color's rgb values
            color = "rgba(" + rgba[1] + "," + rgba[2] + "," + rgba[3] + ",0.2)";
            gradient += color + " " + pos + "px,";
            pos += 6;
            gradient += color + " " + pos + "px,";
        });
        gradient = gradient.slice(0, -1);
        gradient += ")";
        $element.css('background-image', gradient);
    },
    mergeEvents: function (name, event_set) {
        if (event_set.length > 1) {

            var background = $(event_set[0]).css('background-color');
            // If the background is trasparent, use the text color
            var style_type = background.indexOf("rgba") == -1 ?
                        'background-color' : 'color';

            var colors = $.map(event_set, function (event) {
                return $(event).css(style_type);
            });

            var keep = event_set.shift();
            $(event_set).each(function () {
                $(this).parent().css('display', 'none');
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
            .replace(/\(.*\)$/, '') // Remove parentheticals at end for 1:1 lab
            .replace(/\[Merged\]/g,'') // Remove [Merged] string
            .replace(/[\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\xff]/g,''); // Remove non alphanumeric chars in the ascii range
}

function weekTimedEventKey($event) {
    var event_name = cleanEventTitle($event.find('dd span').text()),
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
