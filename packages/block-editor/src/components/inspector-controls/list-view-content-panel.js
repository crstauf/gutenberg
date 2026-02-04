/**
 * WordPress dependencies
 */
import {
	createSlotFill,
	Popover,
	__experimentalUseSlotFills as useSlotFills,
} from '@wordpress/components';
import { useContext } from '@wordpress/element';
import { useViewportMatch } from '@wordpress/compose';

/**
 * Internal dependencies
 */
import InspectorControlsFill from './fill';
import { PrivateBlockContext } from '../block-list/private-block-context';
import {
	useBlockEditContext,
	mayDisplayControlsKey,
} from '../block-edit/context';

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
function ListViewContentPanelSlot() {
	const { popoverProps } = useInspectorPopoverPlacement();
	const fills = useSlotFills( LIST_VIEW_CONTENT_PANEL_SLOT );
	const hasFills = Boolean( fills && fills.length );

	if ( ! hasFills ) {
		return null;
	}

	return (
		<Popover { ...( popoverProps ?? {} ) }>
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
