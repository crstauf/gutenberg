/**
 * WordPress dependencies
 */
import {
	createSlotFill,
	Popover,
	__experimentalUseSlotFills as useSlotFills,
} from '@wordpress/components';
import { useContext, useState, useEffect } from '@wordpress/element';
import { useViewportMatch } from '@wordpress/compose';
import { useSelect } from '@wordpress/data';

/**
 * Internal dependencies
 */
import InspectorControlsFill from './fill';
import { PrivateBlockContext } from '../block-list/private-block-context';
import {
	useBlockEditContext,
	mayDisplayControlsKey,
} from '../block-edit/context';
import { store as blockEditorStore } from '../../store';

// Create private slot-fill for ListViewContentPanel
const LIST_VIEW_CONTENT_PANEL_SLOT = Symbol( 'ListViewContentPanel' );
const { Fill, Slot } = createSlotFill( LIST_VIEW_CONTENT_PANEL_SLOT );

// Hook to determine popover placement for inspector controls
function useInspectorPopoverPlacement() {
	const isMobile = useViewportMatch( 'medium', '<' );
	return ! isMobile
		? {
				popoverProps: {
					placement: 'left-start',
					offset: 35,
				},
		  }
		: {};
}

// Internal Slot component that renders the popover panel
function ListViewContentPanelSlot( { listSlotRef } ) {
	const { popoverProps } = useInspectorPopoverPlacement();
	const fills = useSlotFills( LIST_VIEW_CONTENT_PANEL_SLOT );
	const hasFills = Boolean( fills && fills.length );

	// Get the first selected block client ID
	const selectedClientId = useSelect( ( select ) => {
		const { getSelectedBlockClientId } = select( blockEditorStore );
		return getSelectedBlockClientId();
	}, [] );

	// Query DOM for the selected block row element in List View
	const [ anchorElement, setAnchorElement ] = useState( null );

	useEffect( () => {
		if ( ! selectedClientId || ! listSlotRef?.current ) {
			setAnchorElement( null );
			return;
		}

		// Query for the list view row within the list slot only
		// Using the stable data-block attribute and is-selected class
		const selector = `[data-block="${ selectedClientId }"]`;
		const element = listSlotRef.current.querySelector( selector );

		setAnchorElement( element );
	}, [ selectedClientId, listSlotRef ] );

	if ( ! hasFills ) {
		return null;
	}

	return (
		<Popover
			{ ...( popoverProps ?? {} ) }
			anchor={ anchorElement }
			placement="right-start"
		>
			<div style={ { width: '280px' } }>
				<Slot bubblesVirtually />
			</div>
		</Popover>
	);
}

// Wrapper component that conditionally renders based on selection context
function ListViewContentPanelFill( props ) {
	const blockEditContext = useBlockEditContext();
	const privateBlockContext = useContext( PrivateBlockContext );

	// Only render for selected blocks (same as InspectorControlsFill)
	if ( ! blockEditContext[ mayDisplayControlsKey ] ) {
		return null;
	}

	const isSelectionWithinCurrentSection =
		privateBlockContext?.isSelectionWithinCurrentSection;

	// When inside a section (navigation list view), render to the popover panel slot
	if ( isSelectionWithinCurrentSection ) {
		return <Fill { ...props } />;
	}

	// When outside a section, render to standard inspector controls
	return <InspectorControlsFill { ...props } />;
}

// Export Fill for use by block-library
export { ListViewContentPanelFill, ListViewContentPanelSlot };
