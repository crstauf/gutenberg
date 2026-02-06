/**
 * Internal dependencies
 */
import { HStack } from '../h-stack';
import { Text } from '../text';
import { RangeControl, NumberControlWrapper } from './styles';
import { COLORS } from '../utils/colors-values';
import type { InputWithSliderProps } from './types';
import InputControlPrefixWrapper from '../input-control/input-prefix-wrapper';

export const InputWithSlider = ( {
	min,
	max,
	label,
	abbreviation,
	onChange,
	value,
}: InputWithSliderProps ) => {
	const onNumberControlChange = ( newValue?: number | string ) => {
		if ( ! newValue ) {
			onChange( 0 );
			return;
		}
		if ( typeof newValue === 'string' ) {
			onChange( parseInt( newValue, 10 ) );
			return;
		}
		onChange( newValue );
	};

	return (
		<HStack spacing={ 4 }>
			<NumberControlWrapper
				__next40pxDefaultSize
				min={ min }
				max={ max }
				label={ label }
				hideLabelFromVision
				value={ value }
				onChange={ onNumberControlChange }
				prefix={
					<InputControlPrefixWrapper>
						<Text color={ COLORS.theme.accent } lineHeight={ 1 }>
							{ abbreviation }
						</Text>
					</InputControlPrefixWrapper>
				}
				spinControls="none"
			/>
			<RangeControl
				__next40pxDefaultSize
				label={ label }
				hideLabelFromVision
				min={ min }
				max={ max }
				value={ value }
				onChange={ onChange }
				withInputField={ false }
			/>
		</HStack>
	);
};
