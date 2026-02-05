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
import { useSelect, useDispatch } from '@wordpress/data';

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
import { unlock } from '../../lock-unlock';

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

	// Get both the selected client ID and the popover open state
	const { selectedClientId, isOpen } = useSelect( ( select ) => {
		const { getSelectedBlockClientId } = select( blockEditorStore );
		const privateSelectors = unlock( select( blockEditorStore ) );

		return {
			selectedClientId: getSelectedBlockClientId(),
			isOpen: privateSelectors.isListViewContentPanelOpen(),
		};
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
		const selector = `[role=row][data-block="${ selectedClientId }"].is-selected`;
		const element = listSlotRef.current.querySelector( selector );

		setAnchorElement( element );
	}, [ selectedClientId, listSlotRef ] );

	// eslint-disable-next-line @wordpress/no-unused-vars-before-return
	const { closeListViewContentPanel } = unlock(
		useDispatch( blockEditorStore )
	);

	// Only render when explicitly open
	if ( ! isOpen || ! hasFills || ! anchorElement ) {
		return null;
	}

	// The slot rendered in the popover doesn't use `bubblesVirtually`, this has a downside
	// that certain context providers (like `BlockEditContext`) are not available
	// to fills.
	// The upside is that it allows nested popovers to function correctly. If `bubblesVirtually`
	// is set opening a nest popover triggers the `onFocusOutside` of this popover and closes it.
	// Is there a solution that has no trade-offs?
	return (
		<Popover
			{ ...( popoverProps ?? {} ) }
			anchor={ anchorElement }
			placement="right-start"
			onClose={ closeListViewContentPanel }
		>
			<div style={ { width: '280px' } }>
				<Slot />
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
