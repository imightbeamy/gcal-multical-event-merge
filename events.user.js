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
        // make sure that we haven't already added altTextColors
        if (colors.length == $element.find("span.gcalmemm").length)
            return;
        // check whether the event is wrapped inside a te-rev table (could be for reversing the event text?)
        if ($element.children("table.te-rev").length != 0) {
            // the event is wrapped, so add the altTextColors inside a <td> element in the table before the event text
            var trElement = $($element.children("table.te-rev")[0]).find("tr");
            if (trElement.length == 0)
                return; // we couldn't find the <tr> element in the table - shouldn't happen
            trElement = $(trElement[0]);
            trElement.prepend("<td>&nbsp;</td>");
            $.each(colors.reverse(), function (i, color) {
                trElement.prepend($("<td>").append($("<span class='gcalmemm'>")
                    .css({
                        'background-color': color,
                        'width': '4px',
                        'height': '12px',
                        'display': 'inline-block'
                    })));
            });
        } else {
            // the event is not wrapped, add the altTextColor before the event text
            $element.prepend(" ");
            $.each(colors.reverse(), function (i, color) {
                $element.prepend($("<span class='gcalmemm'>")
                    .css({
                        'background-color': color,
                        'width': '4px',
                        'height': '12px',
                        'display': 'inline-block'
                    }));
            });
        }
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
            // keep the first event, which is our calendar's event, so we will merge other events into it
            var keep = event_set[0];
            // take all other events
            var toMerge = event_set.slice(1,event_set.length);
            
            // array for storing the hidden events so we can later show them again when hovering over the kept event
            var hiddenEvents = [];

            // the rightest point of the event that is on the right
            var mostRightPoint = 0;
            
            // go over events and hide them
            // also, in non-month view, set a mouse event for re-hiding them when the mouse leaves the main event (our calendar's event)
            $(toMerge).each(function () {
				// check if this event is an rsvp-no event and if it has a white box on it, move the white box to be inside the event so it will get merged as well
                var previousEvent = $(this).parent().prev()[0];
                if ((previousEvent != undefined) && 
                    (previousEvent != keep.parent()[0]) && 
                    (previousEvent.className == "rsvp-no-bg")) {
                    previousEvent.remove();
					$(previousEvent).css("top","0px");
					$(previousEvent).css("left","0px");
					$(previousEvent).css("width","100%");
                    $(this).parent().prepend(previousEvent);
                }

                if (!this.isMonthView) {
					// unhide this event, incase it is hidden, since we use it's dimensions for calculations
                    $(this).parent().css('display','block');
					
                    // check if this event is on the right of all previous events, if so, save it's rightest point
                    if ($(this).offset().left != keep.offset().left) {
                        var elementRight = (($(this).offset().left + $(this).outerWidth()));
                        if (elementRight > mostRightPoint) {
                            mostRightPoint = elementRight;
                        }
                    }

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
            this.cleanUp && this.cleanUp(keep, mostRightPoint);
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
	// first, take the 'dd span' elements in the event
    var eventTitles = $event.find('dd span');
    var eventTitle = "";
    var uniqueEventTitles = [];
	// save only the unique ones
    eventTitles.each(function(i, el) {
                        if (el.textContent != eventTitle) {
                            eventTitle += el.textContent;
                        if (uniqueEventTitles.indexOf(el.textContent) == -1) {
                            uniqueEventTitles.push(el.textContent);
                        }
                    }});
	// set event title and clean it up
    var eventTitle = uniqueEventTitles.join('');
    var event_name = cleanEventTitle(eventTitle),
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

function cleanUp($event, mostRightPoint) {
    var chip = $event.parents('.chip');
	// fix event width
    if (chip[0]) {
        $(chip[0]).width(mostRightPoint - $event.offset().left);
    }
	// fix white box width, on event with rsvp-no
	var keepPreviousEvent = $event.parent().prev()[0];
	if ((keepPreviousEvent != undefined) && 
		(keepPreviousEvent.className == "rsvp-no-bg")) {
		$(keepPreviousEvent).width(mostRightPoint - $(keepPreviousEvent).offset().left);
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
