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
    makeStripes: function (colors) {
        var gradient = "repeating-linear-gradient( 45deg,",
            pos = 0;
        $.each(colors, function (i, c) {
            gradient += c + " " + pos + "px,";
            pos += 10;
            gradient += c + " " + pos + "px,";
        });
        gradient = gradient.slice(0, -1);
        gradient += ")";
        return gradient;
    },
    mergeEvents: function (name, event_set) {
        if (event_set.length > 1) {
            var colors = $.map(event_set, function (event) {
                return $(event).css('background-color');
            });

            var keep = event_set.shift();
            $(event_set).each(function () {
                $(this).parent().remove();
            });

            keep.css('background-image', this.makeStripes(colors));
            this.cleanUp(keep);
        }
    },
    mergeSets: function ($events) {
        var sets = this.getEventSets($events);
        $.each(sets, $.proxy(this.mergeEvents, this));
    }
};

/*****************************************************************************/

function eventKey($event) {
    var event_name = $event.find('dd span').text(),
        event_time = $event.find('dt').text(),
        col = $event.parents('.tg-col-eventwrapper').attr('id');
    return event_name + event_time + col;
}

function cleanUp($event) {
    var chip = $event.parents('.chip'),
        left = Number(chip.css('left').replace(/[%px]*/g, ''));
    chip.css('width', 100 - left + "%");
}

var merger = new EventMerger(eventKey, cleanUp);
$(document).on("DOMNodeInserted", ".tg-mainwrapper", function () {
    merger.mergeSets($('dl'));
});
