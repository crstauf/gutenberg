/**
 * Shared utilities for the playlist block.
 */

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
 * Create a waveform container element with the specified attributes.
 *
 * @param {Object} options                    - The options for the container.
 * @param {string} options.url                - The audio URL.
 * @param {string} options.visualizationStyle - The visualization style.
 * @param {string} options.waveformColor      - The waveform bar color.
 * @param {string} options.progressColor      - The progress indicator color.
 * @param {string} options.buttonColor        - The play button color.
 * @return {Element} The configured container element.
 */
export function createWaveformContainer( {
	url,
	visualizationStyle,
	waveformColor,
	progressColor,
	buttonColor,
} ) {
	const container = document.createElement( 'div' );
	container.setAttribute( 'data-waveform-player', '' );
	container.setAttribute( 'data-url', url );
	container.setAttribute( 'data-waveform-style', visualizationStyle );
	container.setAttribute( 'data-waveform-color', waveformColor );
	container.setAttribute( 'data-progress-color', progressColor );
	container.setAttribute( 'data-button-color', buttonColor );
	container.setAttribute( 'data-title', '' );
	container.setAttribute( 'data-subtitle', '' );
	container.setAttribute( 'data-show-time', 'false' );
	return container;
}
