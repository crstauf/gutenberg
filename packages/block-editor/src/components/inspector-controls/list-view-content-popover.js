/**
 * WordPress dependencies
 */
import {
	createSlotFill,
	Popover,
	__experimentalUseSlotFills as useSlotFills,
} from '@wordpress/components';
import { useContext, useState, useLayoutEffect } from '@wordpress/element';
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

/** @typedef {import('@wordpress/element').RefObject} RefObject */

// Create private slot-fill for ListViewContentPanel
const LIST_VIEW_CONTENT_PANEL_SLOT = Symbol( 'ListViewContentPopover' );
const { Fill, Slot } = createSlotFill( LIST_VIEW_CONTENT_PANEL_SLOT );

// Hook to determine popover placement for inspector controls
function useInspectorPopoverPlacement() {
	const isMobile = useViewportMatch( 'medium', '<' );
	return ! isMobile
		? {
				popoverProps: {
					placement: 'left-start',
					offset: 35,
					resize: false,
				},
		  }
		: {};
}

/**
 * Displays a popover for the List View block inspector support.
 * Blocks can use this via the `ListViewContentPopoverFill` to display their
 * controls in a Popover when a ListView item is clicked.
 *
 * @param {Object}                 props
 * @param {RefObject<HTMLElement>} props.listViewRef Ref to the List View slot for the block inspector.
 */
export function ListViewContentPopover( { listViewRef } ) {
	const { popoverProps } = useInspectorPopoverPlacement();
	const fills = useSlotFills( LIST_VIEW_CONTENT_PANEL_SLOT );
	const hasFills = Boolean( fills && fills.length );

	// Get both the selected client ID and the popover open state.
	const { selectedClientId, isOpen } = useSelect( ( select ) => {
		const { getSelectedBlockClientId } = select( blockEditorStore );
		const privateSelectors = unlock( select( blockEditorStore ) );

		return {
			selectedClientId: getSelectedBlockClientId(),
			isOpen: privateSelectors.isListViewContentPanelOpen(),
		};
	}, [] );

	// Query DOM for the selected block row element in List View.
	const [ anchorElement, setAnchorElement ] = useState( null );

	useLayoutEffect( () => {
		if ( ! selectedClientId || ! listViewRef?.current ) {
			setAnchorElement( null );
			return;
		}

		// Query for the block in list view to anchor the popover.
		// Ensures the vertical positioning of the popover matches the
		// selected block in List View.
		const element = listViewRef.current.querySelector(
			`[data-block="${ selectedClientId }"]`
		);

		setAnchorElement( element );
	}, [ selectedClientId, listViewRef ] );

	// eslint-disable-next-line @wordpress/no-unused-vars-before-return
	const { closeListViewContentPanel } = unlock(
		useDispatch( blockEditorStore )
	);

	// Only render when explicitly open.
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
			onClose={ closeListViewContentPanel }
		>
			<div style={ { width: '280px' } }>
				<Slot />
			</div>
		</Popover>
	);
}

/**
 * A fill for blocks to show their content controls.
 *
 * If the block is a child of a block that supports ListView and is being
 * displayed within a `Section`, then the controls will display in a popover
 * whenever a ListView item is selected.
 *
 * When outside of a section fallback to a standard  `InspectorControls`.
 *
 * @param {Object} props
 */
export function ListViewContentPopoverFill( props ) {
	const blockEditContext = useBlockEditContext();
	const privateBlockContext = useContext( PrivateBlockContext );

	// Only render for selected blocks (same as InspectorControlsFill).
	if ( ! blockEditContext[ mayDisplayControlsKey ] ) {
		return null;
	}

	const isSelectionWithinCurrentSection =
		privateBlockContext?.isSelectionWithinCurrentSection;

	// When inside a section (navigation list view), render to the popover panel slot
	if ( isSelectionWithinCurrentSection ) {
		return <Fill { ...props } />;
	}

	// When outside a section, render to standard inspector controls.
	return <InspectorControlsFill { ...props } />;
}
