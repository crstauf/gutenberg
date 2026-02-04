/**
 * Internal dependencies
 */
import {
	colorWithOpacity,
	darkenColor,
	mixColors,
	WAVEFORM_BUTTON_WIDTH,
} from '../utils';

describe( 'WAVEFORM_BUTTON_WIDTH', () => {
	it( 'should be defined as a number', () => {
		expect( typeof WAVEFORM_BUTTON_WIDTH ).toBe( 'number' );
		expect( WAVEFORM_BUTTON_WIDTH ).toBe( 100 );
	} );
} );

describe( 'colorWithOpacity', () => {
	it( 'should convert rgb to rgba with specified opacity', () => {
		const result = colorWithOpacity( 'rgb(255, 0, 0)', 0.5 );
		expect( result ).toBe( 'rgba(255, 0, 0, 0.5)' );
	} );

	it( 'should replace opacity in existing rgba', () => {
		const result = colorWithOpacity( 'rgba(255, 0, 0, 1)', 0.3 );
		expect( result ).toBe( 'rgba(255, 0, 0, 0.3)' );
	} );

	it( 'should handle opacity of 0', () => {
		const result = colorWithOpacity( 'rgb(100, 150, 200)', 0 );
		expect( result ).toBe( 'rgba(100, 150, 200, 0)' );
	} );

	it( 'should handle opacity of 1', () => {
		const result = colorWithOpacity( 'rgb(100, 150, 200)', 1 );
		expect( result ).toBe( 'rgba(100, 150, 200, 1)' );
	} );

	it( 'should handle decimal opacity values', () => {
		const result = colorWithOpacity( 'rgb(0, 0, 0)', 0.75 );
		expect( result ).toBe( 'rgba(0, 0, 0, 0.75)' );
	} );
} );

describe( 'darkenColor', () => {
	it( 'should darken a color by default amount (0.5)', () => {
		const result = darkenColor( 'rgb(200, 200, 200)' );
		expect( result ).toBe( 'rgb(100, 100, 100)' );
	} );

	it( 'should darken a color by specified amount', () => {
		const result = darkenColor( 'rgb(100, 100, 100)', 0.5 );
		expect( result ).toBe( 'rgb(50, 50, 50)' );
	} );

	it( 'should return black when amount is 1', () => {
		const result = darkenColor( 'rgb(255, 255, 255)', 1 );
		expect( result ).toBe( 'rgb(0, 0, 0)' );
	} );

	it( 'should return original color when amount is 0', () => {
		const result = darkenColor( 'rgb(128, 64, 32)', 0 );
		expect( result ).toBe( 'rgb(128, 64, 32)' );
	} );

	it( 'should handle rgba input', () => {
		const result = darkenColor( 'rgba(200, 100, 50, 0.5)', 0.5 );
		expect( result ).toBe( 'rgb(100, 50, 25)' );
	} );

	it( 'should return original color for invalid input', () => {
		const result = darkenColor( 'invalid', 0.5 );
		expect( result ).toBe( 'invalid' );
	} );

	it( 'should return original for colors with extra spaces', () => {
		// The regex expects standard rgb format without extra spaces.
		const result = darkenColor( 'rgb( 200, 100, 50 )', 0.5 );
		expect( result ).toBe( 'rgb( 200, 100, 50 )' );
	} );
} );

describe( 'mixColors', () => {
	it( 'should mix two colors equally by default (0.5 ratio)', () => {
		const result = mixColors( 'rgb(0, 0, 0)', 'rgb(100, 100, 100)' );
		expect( result ).toBe( 'rgb(50, 50, 50)' );
	} );

	it( 'should return first color when ratio is 0', () => {
		const result = mixColors( 'rgb(255, 0, 0)', 'rgb(0, 255, 0)', 0 );
		expect( result ).toBe( 'rgb(255, 0, 0)' );
	} );

	it( 'should return second color when ratio is 1', () => {
		const result = mixColors( 'rgb(255, 0, 0)', 'rgb(0, 255, 0)', 1 );
		expect( result ).toBe( 'rgb(0, 255, 0)' );
	} );

	it( 'should mix colors with custom ratio', () => {
		const result = mixColors( 'rgb(0, 0, 0)', 'rgb(100, 100, 100)', 0.25 );
		expect( result ).toBe( 'rgb(25, 25, 25)' );
	} );

	it( 'should handle rgba input colors', () => {
		const result = mixColors(
			'rgba(100, 0, 0, 0.5)',
			'rgba(0, 100, 0, 0.5)',
			0.5
		);
		expect( result ).toBe( 'rgb(50, 50, 0)' );
	} );

	it( 'should return first color for invalid second color', () => {
		const result = mixColors( 'rgb(255, 0, 0)', 'invalid', 0.5 );
		expect( result ).toBe( 'rgb(255, 0, 0)' );
	} );

	it( 'should return first color for invalid first color', () => {
		const result = mixColors( 'invalid', 'rgb(0, 255, 0)', 0.5 );
		expect( result ).toBe( 'invalid' );
	} );

	it( 'should mix white and black correctly', () => {
		const result = mixColors( 'rgb(255, 255, 255)', 'rgb(0, 0, 0)', 0.5 );
		expect( result ).toBe( 'rgb(128, 128, 128)' );
	} );

	it( 'should return first color for colors with extra spaces', () => {
		// The regex expects standard rgb format without extra spaces.
		const result = mixColors(
			'rgb( 100, 100, 100 )',
			'rgb( 200, 200, 200 )',
			0.5
		);
		expect( result ).toBe( 'rgb( 100, 100, 100 )' );
	} );
} );
