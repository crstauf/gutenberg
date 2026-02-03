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
 * Darken a color by mixing it with black.
 *
 * @param {string} color  - The color string (rgb or rgba format).
 * @param {number} amount - The amount to darken (0-1, where 1 is fully black).
 * @return {string} The darkened color as an rgb() string.
 */
export function darkenColor( color, amount = 0.5 ) {
	// Parse rgb/rgba values.
	const match = color.match( /rgba?\((\d+),\s*(\d+),\s*(\d+)/ );
	if ( ! match ) {
		return color;
	}

	const r = Math.round( parseInt( match[ 1 ], 10 ) * ( 1 - amount ) );
	const g = Math.round( parseInt( match[ 2 ], 10 ) * ( 1 - amount ) );
	const b = Math.round( parseInt( match[ 3 ], 10 ) * ( 1 - amount ) );

	return `rgb(${ r }, ${ g }, ${ b })`;
}

/**
 * Extract the dominant color from an image URL using canvas sampling.
 *
 * @param {string} imageUrl - The URL of the image to analyze.
 * @return {Promise<string|null>} The dominant color as an rgb() string, or null if extraction fails.
 */
export function getDominantColor( imageUrl ) {
	return new Promise( ( resolve ) => {
		if ( ! imageUrl ) {
			resolve( null );
			return;
		}

		const img = new window.Image();
		img.crossOrigin = 'anonymous';

		img.onload = () => {
			try {
				const canvas = document.createElement( 'canvas' );
				const ctx = canvas.getContext( '2d' );

				// Use a small size for performance.
				const size = 50;
				canvas.width = size;
				canvas.height = size;

				ctx.drawImage( img, 0, 0, size, size );
				const imageData = ctx.getImageData( 0, 0, size, size ).data;

				// Calculate average color.
				let r = 0,
					g = 0,
					b = 0,
					count = 0;

				for ( let i = 0; i < imageData.length; i += 4 ) {
					r += imageData[ i ];
					g += imageData[ i + 1 ];
					b += imageData[ i + 2 ];
					count++;
				}

				if ( count > 0 ) {
					r = Math.round( r / count );
					g = Math.round( g / count );
					b = Math.round( b / count );
					resolve( `rgb(${ r }, ${ g }, ${ b })` );
				} else {
					resolve( null );
				}
			} catch ( e ) {
				resolve( null );
			}
		};

		img.onerror = () => {
			resolve( null );
		};

		img.src = imageUrl;
	} );
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
