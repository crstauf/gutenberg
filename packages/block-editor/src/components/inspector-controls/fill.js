/**
 * WordPress dependencies
 */
import {
	__experimentalStyleProvider as StyleProvider,
	__experimentalToolsPanelContext as ToolsPanelContext,
} from '@wordpress/components';
import warning from '@wordpress/warning';
import deprecated from '@wordpress/deprecated';
import { useEffect, useContext } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { hasBlockSupport } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import {
	useBlockEditContext,
	mayDisplayControlsKey,
	mayDisplayPatternEditingControlsKey,
} from '../block-edit/context';
import groups from './groups';
import { ListViewContentFill } from './list-view-content-popover';
import { store as blockEditorStore } from '../../store';

const PATTERN_EDITING_GROUPS = [ 'content', 'list' ];
const TEMPLATE_PART_GROUPS = [ 'default', 'settings', 'advanced' ];

/**
 * Determines whether a block's content controls should be routed to the
 * List View content popover instead of the normal inspector content slot.
 *
 * @param {string}  clientId The block's client ID.
 * @param {boolean} isActive Whether the conditions for routing are potentially met.
 * @return {boolean} Whether to route to the List View content popover.
 */
function useHasListViewParent( clientId, isActive ) {
	return useSelect(
		( select ) => {
			if ( ! isActive ) {
				return false;
			}
			const { getBlockParents, getBlockName } =
				select( blockEditorStore );
			const parents = getBlockParents( clientId, false );
			return parents.some( ( parentId ) => {
				const parentName = getBlockName( parentId );
				return (
					parentName === 'core/navigation' ||
					hasBlockSupport( parentName, 'listView' )
				);
			} );
		},
		[ clientId, isActive ]
	);
}

export default function InspectorControlsFill( {
	children,
	group = 'default',
	__experimentalGroup,
	resetAllFilter,
} ) {
	if ( __experimentalGroup ) {
		deprecated(
			'`__experimentalGroup` property in `InspectorControlsFill`',
			{
				since: '6.2',
				version: '6.4',
				alternative: '`group`',
			}
		);
		group = __experimentalGroup;
	}

	const context = useBlockEditContext();

	// Check if this block is inside a section with a parent that has List View
	// block support. When true, content fills are handled by the List View
	// popover rather than the normal content inspector slot.
	const hasListViewParent = useHasListViewParent(
		context.clientId,
		group === 'content' && !! context[ mayDisplayPatternEditingControlsKey ]
	);

	const Fill = groups[ group ]?.Fill;
	if ( ! Fill ) {
		warning( `Unknown InspectorControls group "${ group }" provided.` );
		return null;
	}

	// During pattern editing:
	// - All blocks can show pattern editing groups (content, list).
	// - Template parts can show a settings tab (default, settings, advanced groups).
	// - Other blocks cannot show a settings tab.
	if ( context[ mayDisplayPatternEditingControlsKey ] ) {
		// Template parts are allowed to show a settings tab to allow access to the
		// 'Design' and 'Advanced' panels.
		const isTemplatePart = context.name === 'core/template-part';
		const isTemplatePartGroup = TEMPLATE_PART_GROUPS.includes( group );
		const isPatternEditingGroup = PATTERN_EDITING_GROUPS.includes( group );

		const canShowGroup =
			( isTemplatePart && isTemplatePartGroup ) || isPatternEditingGroup;

		if ( ! canShowGroup ) {
			return null;
		}
	}

	// Outside pattern editing, use the standard rules for displaying controls.
	if (
		! context[ mayDisplayPatternEditingControlsKey ] &&
		! context[ mayDisplayControlsKey ]
	) {
		return null;
	}

	// When inside a section with a List View parent, content controls are
	// managed by the List View popover. The selected block's controls
	// render in the popover; all other blocks render nothing to avoid
	// duplicating controls in the sidebar.
	if ( hasListViewParent ) {
		if ( context[ mayDisplayControlsKey ] ) {
			return (
				<StyleProvider document={ document }>
					<ListViewContentFill>{ children }</ListViewContentFill>
				</StyleProvider>
			);
		}
		return null;
	}

	return (
		<StyleProvider document={ document }>
			<Fill>
				{ ( fillProps ) => {
					return (
						<ToolsPanelInspectorControl
							fillProps={ fillProps }
							children={ children }
							resetAllFilter={ resetAllFilter }
						/>
					);
				} }
			</Fill>
		</StyleProvider>
	);
}

function RegisterResetAll( { resetAllFilter, children } ) {
	const { registerResetAllFilter, deregisterResetAllFilter } =
		useContext( ToolsPanelContext );
	useEffect( () => {
		if (
			resetAllFilter &&
			registerResetAllFilter &&
			deregisterResetAllFilter
		) {
			registerResetAllFilter( resetAllFilter );
			return () => {
				deregisterResetAllFilter( resetAllFilter );
			};
		}
	}, [ resetAllFilter, registerResetAllFilter, deregisterResetAllFilter ] );
	return children;
}

function ToolsPanelInspectorControl( { children, resetAllFilter, fillProps } ) {
	// `fillProps.forwardedContext` is an array of context provider entries, provided by slot,
	// that should wrap the fill markup.
	const { forwardedContext = [] } = fillProps;

	// Children passed to InspectorControlsFill will not have
	// access to any React Context whose Provider is part of
	// the InspectorControlsSlot tree. So we re-create the
	// Provider in this subtree.
	const innerMarkup = (
		<RegisterResetAll resetAllFilter={ resetAllFilter }>
			{ children }
		</RegisterResetAll>
	);
	return forwardedContext.reduce(
		( inner, [ Provider, props ] ) => (
			<Provider { ...props }>{ inner }</Provider>
		),
		innerMarkup
	);
}
