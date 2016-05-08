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

function EventMerger(key_function, clean_up_function, isMonthView) {
    this.makeKey = key_function;
    this.cleanUp = clean_up_function;
    this.isMonthView = isMonthView;
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
        $.each(colors.reverse(), function (i, color) {
            $element.prepend($("<span>")
                .css({
                    'background-color': color,
                    'width': '4px',
                    'height': '12px',
                    'display': 'inline-block'
                }));
        });
    },
    makeStripes: function ($element, colors) {
        var gradient = "repeating-linear-gradient( 45deg,",
            pos = 0;
        $.each(colors, function (i, color) {
            gradient += color + " " + pos + "px,";
            pos += 10;
            gradient += color + " " + pos + "px,";
        });
        gradient = gradient.slice(0, -1);
        gradient += ")";
        $element.css('background-image', gradient);
    },
    mergeEvents: function (name, event_set) {
        if (event_set.length > 1) {
            // keep the first event, which is our calendar's event, so we will merge other events into it
            var keep = event_set[0];
            // take all other events
            var toMerge = event_set.slice(1,event_set.length);
            
            // array for storing the hidden events so we can later show them again when hovering over the kept event
            var hiddenEvents = [];
                        
            // go over events and hide them
            // also, in non-month view, set a mouse event for re-hiding them when the mouse leaves the main event (our calendar's event)
            $(toMerge).each(function () {                
                if (!this.isMonthView) {
                
                    // save the hidden event
                    hiddenEvents.push($(this).parent());
                    
                    // hide this event
                    $(this).parent().css('display','none');
                        
                    $(this).parent().mouseleave(function(e) {
                        // check if we left the merged event and the merged events
                        var stillInMergedEvent = false;
                        hiddenEvents.forEach(function(event) {if (event[0].contains(e.relatedTarget)) stillInMergedEvent = true;});
                        if (stillInMergedEvent) {
                            return;
                        }
                        hiddenEvents.forEach(function(event) {event.css('display','none');});
                    });
                }
            });
            
            // in non-month view, set a mouse event for when hovering the main event (our calendar's event) the merged events will show up
            if (!this.isMonthView) {
                keep.hover(function(e) {
                    hiddenEvents.forEach(function(event) {
                          event.css('display','block');
                        });
                    },function(e) {                                        
                        // check if we left the merged event and the merged events
                        var stillInMergedEvent = false;
                        hiddenEvents.forEach(function(event) {if (event[0].contains(e.relatedTarget)) stillInMergedEvent = true;});
                        if (stillInMergedEvent) {
                            return;
                        }
                        hiddenEvents.forEach(function(event) {event.css('display','none');});
                        
                });
            }
            
            // retrieve colors of all events
            var background = keep.css('background-color');
            var style_type = background.indexOf("rgba") == -1 ?
                        'background-color' : 'color';
            var colors = $.map(event_set, function (event) {
                return $(event).css(style_type);
            });
            
            // do the coloring based on background type
            if (style_type == 'background-color') {
                this.makeStripes(keep, colors);
            } else {
                this.makeAltTextColors(keep, colors);
            }
            
            // clean up
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
            .replace(/\W/g, ''); // Remove non-ascii chars
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

var weekTimed = new EventMerger(weekTimedEventKey, cleanUp, false),
    weekAllDay = new EventMerger(tableEventKey, undefined, false),
    monthTimed = new EventMerger(monthTimedEventKey, undefined, true),
    monthAllDay = new EventMerger(monthAllDayEventKey, undefined, true);

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
