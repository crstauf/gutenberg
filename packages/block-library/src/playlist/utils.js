/**
 * Shared utilities for the playlist block.
 */

/**
 * Width of the waveform player button in pixels.
 */
export const WAVEFORM_BUTTON_WIDTH = 100;

/**
 * Convert an rgb/rgba color string to rgba with a specific opacity.
 *
 * @param {string} color   - The color string (rgb or rgba format).
 * @param {number} opacity - The desired opacity (0-1).
 * @return {string} The rgba color string.
 */
export function colorWithOpacity( color, opacity ) {
	if ( color.startsWith( 'rgba' ) ) {
		return color.replace( /[\d.]+\)$/, `${ opacity })` );
	}
	return color.replace( 'rgb(', 'rgba(' ).replace( ')', `, ${ opacity })` );
}

/**
 * Get the effective background color, falling back to body if transparent.
 *
 * @param {Element} element - The element to get the background color from.
 * @return {string} The background color.
 */
export function getEffectiveBackgroundColor( element ) {
	const blockContainer = element.closest( '.wp-block-playlist' );
	let bgColor = blockContainer
		? window.getComputedStyle( blockContainer ).backgroundColor
		: window.getComputedStyle( element ).backgroundColor;

	const isTransparent =
		! bgColor ||
		bgColor === 'transparent' ||
		bgColor === 'rgba(0, 0, 0, 0)' ||
		bgColor.match( /rgba\([^)]+,\s*0\s*\)/ );

	if ( isTransparent ) {
		bgColor = window.getComputedStyle( document.body ).backgroundColor;
	}

	return bgColor;
}

/**
 * Get the progress background color based on the background color.
 * Lightens light colors and darkens dark colors for contrast,
 * but reverses direction if already at white or black.
 *
 * @param {string} bgColor - The background color string (hex, rgb, or rgba format).
 * @param {number} amount  - The amount to adjust (0-1).
 * @return {string} The adjusted color as an rgb() string.
 */
export function getProgressBackgroundColor( bgColor, amount = 0.25 ) {
	let r, g, b;

	// Try to match hex color first (#RGB, #RRGGBB, or #RRGGBBAA).
	const hexMatch = bgColor.match( /^#([0-9a-f]{3,8})$/i );
	if ( hexMatch ) {
		const hex = hexMatch[ 1 ];
		if ( hex.length === 3 || hex.length === 4 ) {
			// Short form: #RGB or #RGBA
			r = parseInt( hex[ 0 ] + hex[ 0 ], 16 );
			g = parseInt( hex[ 1 ] + hex[ 1 ], 16 );
			b = parseInt( hex[ 2 ] + hex[ 2 ], 16 );
		} else {
			// Long form: #RRGGBB or #RRGGBBAA
			r = parseInt( hex.slice( 0, 2 ), 16 );
			g = parseInt( hex.slice( 2, 4 ), 16 );
			b = parseInt( hex.slice( 4, 6 ), 16 );
		}
	} else {
		// Try to match rgb/rgba color.
		const rgbMatch = bgColor.match( /rgba?\((\d+),\s*(\d+),\s*(\d+)/ );
		if ( ! rgbMatch ) {
			return bgColor;
		}
		r = parseInt( rgbMatch[ 1 ], 10 );
		g = parseInt( rgbMatch[ 2 ], 10 );
		b = parseInt( rgbMatch[ 3 ], 10 );
	}

	// Calculate perceived brightness (0-255).
	const brightness = ( r * 299 + g * 587 + b * 114 ) / 1000;

	// Determine if we should lighten or darken.
	// Light colors get lighter, dark colors get darker.
	// But if already at an extreme (near white/black), reverse direction.
	const isLight = brightness > 128;
	const isNearWhite = brightness > 240;
	const isNearBlack = brightness < 30;

	let shouldLighten;
	if ( isNearWhite ) {
		shouldLighten = false; // Near white: darken for contrast.
	} else if ( isNearBlack ) {
		shouldLighten = true; // Near black: lighten for contrast.
	} else {
		shouldLighten = isLight; // Normal: lighten light colors, darken dark colors.
	}

	let newR, newG, newB;
	if ( shouldLighten ) {
		// Lighten: move towards 255.
		newR = Math.round( r + ( 255 - r ) * amount );
		newG = Math.round( g + ( 255 - g ) * amount );
		newB = Math.round( b + ( 255 - b ) * amount );
	} else {
		// Darken: move towards 0.
		newR = Math.round( r * ( 1 - amount ) );
		newG = Math.round( g * ( 1 - amount ) );
		newB = Math.round( b * ( 1 - amount ) );
	}

	return `rgb(${ newR }, ${ newG }, ${ newB })`;
}

/**
 * Create a waveform container element with the specified attributes.
 *
 * @param {Object} options                    - The options for the container.
 * @param {string} options.url                - The audio URL.
 * @param {string} options.visualizationStyle - The visualization style.
 * @param {string} options.waveformColor      - The waveform bar color.
 * @param {string} options.progressColor      - The progress indicator color.
 * @param {string} options.buttonColor        - The play button color.
 * @param {string} options.title              - The track title.
 * @param {string} options.subtitle           - The track subtitle (artist/album).
 * @return {Element} The configured container element.
 */
export function createWaveformContainer( {
	url,
	visualizationStyle,
	waveformColor,
	progressColor,
	buttonColor,
	title = '',
	subtitle = '',
} ) {
	const container = document.createElement( 'div' );
	container.setAttribute( 'data-waveform-player', '' );
	container.setAttribute( 'data-url', url );
	container.setAttribute( 'data-height', String( WAVEFORM_BUTTON_WIDTH ) );
	container.setAttribute( 'data-waveform-style', visualizationStyle );
	container.setAttribute( 'data-waveform-color', waveformColor );
	container.setAttribute( 'data-progress-color', progressColor );
	container.setAttribute( 'data-button-color', buttonColor );
	container.setAttribute( 'data-title', title );
	container.setAttribute( 'data-subtitle', subtitle );
	container.setAttribute( 'data-show-time', 'false' );
	return container;
}
