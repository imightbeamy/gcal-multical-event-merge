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
            this.cleanUp && this.cleanUp(keep);
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

/*****************************************************************************/

// merge day-long events, on top of week mode display

// http://stackoverflow.com/questions/10966687/how-can-i-find-each-table-cells-visual-location-using-jquery/10967488#10967488
function getCellLocation(cell) {
    var cols = cell.closest("tr").children("td").index(cell);
    var rows = cell.closest("tbody").children("tr").index(cell.closest("tr"));
    var coltemp = cols;
    var rowtemp = rows;
    cell.prevAll("td").each(function() {
        cols += ($(this).attr("colspan")) ? parseInt($(this).attr("colspan")) - 1 : 0;
    });
    cell.parent("tr").prevAll("tr").each(function() {
        var rowindex = cell.closest("tbody").children("tr").index($(this));
        var row = $(this);
        row.children("td").each(function() {
            var colindex = row.children("td").index($(this));
            if (cell.offset().left > $(this).offset().left) {
                var colspn = parseInt($(this).attr("colspan"));
                var rowspn = parseInt($(this).attr("rowspan"));
                if (colspn && rowspn) {
                    if(rowindex + rowspn > rows)
                    cols += colspn;
                }
                if(rowspn && rowindex + rowspn > rows) cols +=1;
            }
        });
    });
    return {
        rows: rows,
        cols: cols
    };
}

var dayLongMerger = new EventMerger(function ($event) {
    var event_name = $event.find('span').text(),
        $td = $event.parents('td'),
        span = $td.attr("colspan") || 1,
        col = getCellLocation($td).cols - 2;
    return event_name + "_" + col + "_" + span;
});

$(document).on("DOMNodeInserted", "#topcontainerwk", function () {
    dayLongMerger.mergeSets($(".rb-n"));
});

// ...and now, in month-view display

var monthViewMerger = new EventMerger(function ($event) {
    var event_name = $event.text(),
        $td = $event.parents('td'),
        span = $td.attr("colspan") || 1,
        row = $td.parents('.month-row').index(),
        col = getCellLocation($td).cols - 2;
    return event_name + "_" + row + "_" + col + "_" + span;
});

$(document).on("DOMNodeInserted", ".mv-container", function () {
    monthViewMerger.mergeSets($(".rb-n"));
});
