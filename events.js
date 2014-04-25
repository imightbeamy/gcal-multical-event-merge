function EventMerger (key_function, parent_selector) {
    this.makeKey = key_function;
    this.parent_selector = parent_selector;
}

EventMerger.prototype = {
    getEventSets: function($events) {
    	var event_sets = {},
            makeKey = this.makeKey;
    	$events.each(function() {
    		var $event = $(this),
                key = makeKey($event).replace(/\s/g,'');
    		event_sets[key] = event_sets[key] || [];
    		event_sets[key].push($event);
    	});
    	return event_sets;
    },
    makeStripes: function (colors) {
        var gradient = "repeating-linear-gradient( 45deg,",
            pos = 0;
        $.each(colors, function(i, c) {
            gradient += c + " " + pos + "px,";
            pos+=10;
            gradient += c + " " + pos + "px,";
        })
        gradient = gradient.slice(0, -1);
        gradient += ")"
        return gradient;
    },
    mergeEvents: function (name, event_set) {
        if (event_set.length > 1) {
            var colors = $.map(event_set, function(event) {
                return $(event).css('background-color');
            });
            var keep = event_set.shift();
            $(event_set).each(function() {$(this).remove()});

            keep.css('background-image', this.makeStripes(colors));
            keep.parents('.chip').css('width', '100%');
        }
    },
    mergeSets: function ($events) {
        var sets = this.getEventSets($events);
        $.each(sets, $.proxy(this.mergeEvents, this));
    }
};

/*****************************************************************************/

function eventKey ($event) {
    var event_name = $event.find('dd span').text(),
        event_time = $event.find('dt').text(),
        col = $event.parents('.tg-col-eventwrapper').attr('id');
    return event_name + event_time + col;
}

merger = new EventMerger(eventKey);
 $(document).on("DOMNodeInserted", ".tg-mainwrapper", function(e) {
    merger.mergeSets($('dl'));
 });
