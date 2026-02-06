/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { RichTextToolbarButton, useSettings } from '@wordpress/block-editor';
import { Icon, background as backgroundIcon } from '@wordpress/icons';
import { removeFormat } from '@wordpress/rich-text';

/**
 * Internal dependencies
 */
import { default as InlineColorUI, getActiveColors } from './inline';

const name = 'core/background-color';
const title = __( 'Background' );

const EMPTY_ARRAY = [];

function BackgroundColorEdit( {
	value,
	onChange,
	isActive,
	activeAttributes,
	contentRef,
} ) {
	const [ allowCustomControl, colors = EMPTY_ARRAY ] = useSettings(
		'color.custom',
		'color.palette'
	);
	const [ isAddingColor, setIsAddingColor ] = useState( false );
	const colorIndicatorStyle = useMemo( () => {
		const { backgroundColor } = getActiveColors( value, name, colors );
		if ( ! backgroundColor ) {
			return undefined;
		}
		return { backgroundColor };
	}, [ value, colors ] );

	const hasColorsToChoose = !! colors.length || allowCustomControl;
	if ( ! hasColorsToChoose && ! isActive ) {
		return null;
	}

	return (
		<>
			<RichTextToolbarButton
				className="format-library-background-color-button"
				isActive={ isActive }
				icon={
					<Icon
						icon={ backgroundIcon }
						style={ colorIndicatorStyle }
					/>
				}
				title={ title }
				onClick={
					hasColorsToChoose
						? () => setIsAddingColor( true )
						: () => onChange( removeFormat( value, name ) )
				}
				role="menuitemcheckbox"
			/>
			{ isAddingColor && (
				<InlineColorUI
					name={ name }
					onClose={ () => setIsAddingColor( false ) }
					activeAttributes={ activeAttributes }
					value={ value }
					onChange={ onChange }
					contentRef={ contentRef }
					isActive={ isActive }
				/>
			) }
		</>
	);
}

export const backgroundColor = {
	name,
	title,
	tagName: 'span',
	className: 'has-inline-background-color',
	attributes: {
		style: 'style',
		class: 'class',
	},
	edit: BackgroundColorEdit,
};
