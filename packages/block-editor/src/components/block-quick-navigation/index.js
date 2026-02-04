import { clsx } from 'clsx';
import { hasBlockSupport } from '@wordpress/blocks';
import { useSelect, useDispatch } from '@wordpress/data';
import {
	Button,
	__experimentalVStack as VStack,
	__experimentalTruncate as Truncate,
	Flex,
	FlexBlock,
	FlexItem,
} from '@wordpress/components';
import { store as blockEditorStore } from '../../store';
import BlockIcon from '../block-icon';
import useBlockDisplayInformation from '../use-block-display-information';
import useBlockDisplayTitle from '../block-title/use-block-display-title';

export default function BlockQuickNavigation( { clientIds, onSelect } ) {
	if ( ! clientIds.length ) {
		return null;
	}
	return (
		<VStack spacing={ 0 }>
			{ clientIds.map( ( clientId ) => (
				<BlockQuickNavigationItem
					onSelect={ onSelect }
					key={ clientId }
					clientId={ clientId }
				/>
			) ) }
		</VStack>
	);
}

function BlockQuickNavigationItem( { clientId, onSelect } ) {
	const blockInformation = useBlockDisplayInformation( clientId );
	const blockTitle = useBlockDisplayTitle( {
		clientId,
		context: 'list-view',
	} );
	const { isSelected, hasSelectedInnerBlock, hasListViewSupport } = useSelect(
		( select ) => {
			const {
				isBlockSelected,
				hasSelectedInnerBlock: _hasSelectedInnerBlock,
				getBlockName,
			} = select( blockEditorStore );

			const blockName = getBlockName( clientId );

			return {
				isSelected: isBlockSelected( clientId ),
				hasSelectedInnerBlock: _hasSelectedInnerBlock(
					clientId,
					true /* deep: */
				),
				hasListViewSupport:
					blockName === 'core/navigation' ||
					hasBlockSupport( blockName, 'listView' ),
			};
		},
		[ clientId ]
	);
	const { selectBlock } = useDispatch( blockEditorStore );

	return (
		<Button
			__next40pxDefaultSize
			className={ clsx( 'block-editor-block-quick-navigation__item', {
				'has-selected-list-view-block':
					hasListViewSupport && hasSelectedInnerBlock,
			} ) }
			isPressed={ isSelected || hasSelectedInnerBlock }
			onClick={ async () => {
				await selectBlock( clientId );
				if ( onSelect ) {
					onSelect( clientId );
				}
			} }
		>
			<Flex>
				<FlexItem>
					<BlockIcon icon={ blockInformation?.icon } />
				</FlexItem>
				<FlexBlock style={ { textAlign: 'left' } }>
					<Truncate>{ blockTitle }</Truncate>
				</FlexBlock>
			</Flex>
		</Button>
	);
}
