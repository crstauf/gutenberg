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
 * Mix two colors together.
 *
 * @param {string} color1 - The first color string (rgb or rgba format).
 * @param {string} color2 - The second color string (rgb or rgba format).
 * @param {number} ratio  - The mix ratio (0 = all color1, 1 = all color2, 0.5 = equal mix).
 * @return {string} The mixed color as an rgb() string.
 */
export function mixColors( color1, color2, ratio = 0.5 ) {
	const match1 = color1.match( /rgba?\((\d+),\s*(\d+),\s*(\d+)/ );
	const match2 = color2.match( /rgba?\((\d+),\s*(\d+),\s*(\d+)/ );

	if ( ! match1 || ! match2 ) {
		return color1;
	}

	const r1 = parseInt( match1[ 1 ], 10 );
	const g1 = parseInt( match1[ 2 ], 10 );
	const b1 = parseInt( match1[ 3 ], 10 );

	const r2 = parseInt( match2[ 1 ], 10 );
	const g2 = parseInt( match2[ 2 ], 10 );
	const b2 = parseInt( match2[ 3 ], 10 );

	const r = Math.round( r1 + ( r2 - r1 ) * ratio );
	const g = Math.round( g1 + ( g2 - g1 ) * ratio );
	const b = Math.round( b1 + ( b2 - b1 ) * ratio );

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
					// Skip very dark or very light pixels.
					const pixelR = imageData[ i ];
					const pixelG = imageData[ i + 1 ];
					const pixelB = imageData[ i + 2 ];
					const brightness = ( pixelR + pixelG + pixelB ) / 3;

					if ( brightness > 30 && brightness < 220 ) {
						r += pixelR;
						g += pixelG;
						b += pixelB;
						count++;
					}
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
	container.setAttribute( 'data-height', String( WAVEFORM_BUTTON_WIDTH ) );
	container.setAttribute( 'data-waveform-style', visualizationStyle );
	container.setAttribute( 'data-waveform-color', waveformColor );
	container.setAttribute( 'data-progress-color', progressColor );
	container.setAttribute( 'data-button-color', buttonColor );
	container.setAttribute( 'data-title', '' );
	container.setAttribute( 'data-subtitle', '' );
	container.setAttribute( 'data-show-time', 'false' );
	return container;
}
