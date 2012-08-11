(function($) {
	$.fn.spin = function(opts, color) {
		var presets = {
			"tiny": { lines: 8, length: 2, width: 2, radius: 3 },
			"small": { lines: 8, length: 4, width: 3, radius: 5 },
			"medium": { lines: 10, length: 8, width: 4, radius: 8 },
			"large": { lines: 10, length: 16, width: 8, radius: 24 }
		};
		if (Spinner) {
			return this.each(function() {
				var $this = $(this),
					data = $this.data();

				if (data.spinner) {
					data.spinner.stop();
					delete data.spinner;
				}
				if (opts !== false) {
                    var preset = typeof opts === "string" ? opts : opts.preset;
					if (typeof preset === "string") {
						if (preset in presets) {
							opts = $.extend( opts, presets[ preset ] );
						}
                        
						if (color) {
							opts.color = color;
						}
					}
					data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
				}
			});
		} else {
			throw "Spinner class not available.";
		}
	};
})(jQuery);