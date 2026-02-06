/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import {
	applyFormat,
	removeFormat,
	getActiveFormat,
	useAnchor,
} from '@wordpress/rich-text';
import {
	ColorPalette,
	getColorClassName,
	getColorObjectByColorValue,
	getColorObjectByAttributeValues,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { Popover } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { backgroundColor as settings } from './index';

function parseCSS( css = '' ) {
	return css.split( ';' ).reduce( ( accumulator, rule ) => {
		if ( rule ) {
			const [ property, value ] = rule.split( ':' );
			if ( property === 'background-color' && value ) {
				accumulator.backgroundColor = value.trim();
			}
		}
		return accumulator;
	}, {} );
}

export function parseClassName( className = '', colorSettings ) {
	return className.split( ' ' ).reduce( ( accumulator, name ) => {
		// Match has-*-background-color (e.g. has-vivid-red-background-color).
		if (
			name.startsWith( 'has-' ) &&
			name.endsWith( '-background-color' )
		) {
			const colorSlug = name
				.replace( /^has-/, '' )
				.replace( /-background-color$/, '' );
			const colorObject = getColorObjectByAttributeValues(
				colorSettings,
				colorSlug
			);
			if ( colorObject?.color ) {
				accumulator.backgroundColor = colorObject.color;
			}
		}
		return accumulator;
	}, {} );
}

export function getActiveColors( value, name, colorSettings ) {
	const activeFormat = getActiveFormat( value, name );

	if ( ! activeFormat ) {
		return {};
	}

	return {
		...parseCSS( activeFormat.attributes.style ),
		...parseClassName( activeFormat.attributes.class, colorSettings ),
	};
}

function setColors( value, name, colorSettings, colors ) {
	const { backgroundColor } = {
		...getActiveColors( value, name, colorSettings ),
		...colors,
	};

	if ( ! backgroundColor ) {
		return removeFormat( value, name );
	}

	const styles = [];
	const classNames = [];
	const attributes = {};

	const colorObject = getColorObjectByColorValue(
		colorSettings,
		backgroundColor
	);

	if ( colorObject ) {
		classNames.push(
			getColorClassName( 'background-color', colorObject.slug )
		);
	} else {
		styles.push( [ 'background-color', backgroundColor ].join( ':' ) );
	}

	if ( styles.length ) {
		attributes.style = styles.join( ';' );
	}
	if ( classNames.length ) {
		attributes.class = classNames.join( ' ' );
	}

	return applyFormat( value, { type: name, attributes } );
}

function ColorPicker( { name, property, value, onChange } ) {
	const colors = useSelect( ( select ) => {
		const { getSettings } = select( blockEditorStore );
		return getSettings().colors ?? [];
	}, [] );
	const activeColors = getActiveColors( value, name, colors );

	return (
		<ColorPalette
			value={ activeColors[ property ] }
			onChange={ ( color ) => {
				onChange(
					setColors( value, name, colors, { [ property ]: color } )
				);
			} }
			enableAlpha
			__experimentalIsRenderedInSidebar
		/>
	);
}

export default function InlineColorUI( {
	name,
	value,
	onChange,
	onClose,
	contentRef,
	isActive,
} ) {
	const popoverAnchor = useAnchor( {
		editableContentElement: contentRef.current,
		settings: { ...settings, isActive },
	} );

	return (
		<Popover
			onClose={ onClose }
			className="format-library__inline-color-popover"
			anchor={ popoverAnchor }
		>
			<ColorPicker
				name={ name }
				property="backgroundColor"
				value={ value }
				onChange={ onChange }
			/>
		</Popover>
	);
}
