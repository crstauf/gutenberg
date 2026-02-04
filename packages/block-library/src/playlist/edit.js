/**
 * External dependencies
 */
import clsx from 'clsx';
import { v4 as uuid } from 'uuid';
import WaveformPlayer from '@arraypress/waveform-player';
import '@arraypress/waveform-player/dist/waveform-player.css';

/**
 * WordPress dependencies
 */
import { useState, useCallback, useEffect, useRef } from '@wordpress/element';
import {
	store as blockEditorStore,
	MediaPlaceholder,
	MediaReplaceFlow,
	BlockIcon,
	useBlockProps,
	useInnerBlocksProps,
	BlockControls,
	InspectorControls,
	InnerBlocks,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	ToggleControl,
	Disabled,
	SelectControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect, useDispatch } from '@wordpress/data';
import { store as noticesStore } from '@wordpress/notices';
import { __, _x, sprintf } from '@wordpress/i18n';
import { audio as icon } from '@wordpress/icons';
import { __unstableStripHTML as stripHTML } from '@wordpress/dom';
import { createBlock } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import { Caption } from '../utils/caption';
import { useToolsPanelDropdownMenuProps } from '../utils/hooks';
import {
	colorWithOpacity,
	getEffectiveBackgroundColor,
	getProgressBackgroundColor,
	createWaveformContainer,
	WAVEFORM_BUTTON_WIDTH,
} from './utils';

const ALLOWED_MEDIA_TYPES = [ 'audio' ];

/**
 * Log warnings in development mode only.
 *
 * @param {string} message - The warning message.
 * @param {Error}  error   - The error object.
 */
function logWarning( message, error ) {
	if ( process.env.NODE_ENV === 'development' ) {
		// eslint-disable-next-line no-console
		console.warn( `[Playlist Block] ${ message }`, error );
	}
}

const CurrentTrack = ( {
	track,
	onTrackEnd,
	visualizationStyle,
	showProgressBackground,
	progressColor,
} ) => {
	const waveformRef = useRef( null );
	const waveformInstanceRef = useRef( null );
	const hoverInstanceRef = useRef( null );

	let ariaLabel;
	if ( track?.title && track?.artist && track?.album ) {
		ariaLabel = stripHTML(
			sprintf(
				/* translators: %1$s: track title, %2$s artist name, %3$s: album name. */
				_x(
					'%1$s by %2$s from the album %3$s',
					'track title, artist name, album name'
				),
				track?.title,
				track?.artist,
				track?.album
			)
		);
	} else if ( track?.title ) {
		ariaLabel = stripHTML( track.title );
	} else {
		ariaLabel = stripHTML( __( 'Untitled' ) );
	}

	// Initialize WaveformPlayer when track changes.
	// Uses 2 instances like the frontend: base (30% opacity) + hover (100% opacity).
	useEffect( () => {
		const currentElement = waveformRef.current;
		if ( ! currentElement || ! track?.src ) {
			return;
		}

		// Get the text and background colors for styling.
		const textColor = window.getComputedStyle( currentElement ).color;
		const bgColor = getEffectiveBackgroundColor( currentElement );
		const baseWaveformColor = colorWithOpacity( textColor, 0.3 );
		const style = visualizationStyle || 'bars';

		// Destroy existing instances if any.
		if ( waveformInstanceRef.current?.destroy ) {
			try {
				waveformInstanceRef.current.destroy();
			} catch ( e ) {
				logWarning( 'Error destroying waveform instance:', e );
			}
		}
		if ( hoverInstanceRef.current?.destroy ) {
			try {
				hoverInstanceRef.current.destroy();
			} catch ( e ) {
				logWarning( 'Error destroying hover waveform instance:', e );
			}
		}

		// Clear any leftover DOM elements from previous player.
		currentElement.innerHTML = '';

		// Create progress background layer if enabled.
		if ( showProgressBackground ) {
			const progressBg = document.createElement( 'div' );
			progressBg.className = 'wp-block-playlist__waveform-progress';
			progressBg.style.backgroundColor =
				progressColor || getProgressBackgroundColor( bgColor );
			currentElement.appendChild( progressBg );

			// Store reference for progress updates.
			currentElement._progressBg = progressBg;
		}

		// Build subtitle from artist and album.
		const subtitleParts = [];
		if ( track?.artist ) {
			subtitleParts.push( track.artist );
		}
		if ( track?.album ) {
			subtitleParts.push( track.album );
		}
		const subtitle = subtitleParts.join( ' — ' );

		// Create base waveform layer (30% opacity bars).
		const baseWrapper = document.createElement( 'div' );
		baseWrapper.className = 'wp-block-playlist__waveform-base';
		const baseContainer = createWaveformContainer( {
			url: track.src,
			visualizationStyle: style,
			waveformColor: baseWaveformColor,
			progressColor: baseWaveformColor,
			buttonColor: textColor,
			title: track?.title || __( 'Untitled' ),
			subtitle,
		} );
		baseWrapper.appendChild( baseContainer );
		currentElement.appendChild( baseWrapper );

		// Create hover waveform layer (100% opacity bars).
		const hoverWrapper = document.createElement( 'div' );
		hoverWrapper.className = 'wp-block-playlist__waveform-hover';
		const hoverContainer = createWaveformContainer( {
			url: track.src,
			visualizationStyle: style,
			waveformColor: textColor,
			progressColor: textColor,
			buttonColor: textColor,
		} );
		hoverWrapper.appendChild( hoverContainer );
		currentElement.appendChild( hoverWrapper );
		currentElement._hoverWrapper = hoverWrapper;

		// Create WaveformPlayer instances.
		const baseInstance = new WaveformPlayer( baseContainer );
		waveformInstanceRef.current = baseInstance;

		const hoverInstance = new WaveformPlayer( hoverContainer );
		hoverInstanceRef.current = hoverInstance;

		// Set icon color via CSS variable so it persists when icon changes.
		const playBtn = baseContainer.querySelector( '.waveform-btn' );
		if ( playBtn ) {
			playBtn.style.setProperty(
				'--wp-block-playlist-icon-color',
				bgColor
			);

			// Use album art as the play button background if available.
			if ( track?.image ) {
				playBtn.style.backgroundImage = `url(${ track.image })`;
				playBtn.style.backgroundSize = 'cover';
				playBtn.style.backgroundPosition = 'center';
			}
		}

		// Hide the play button in the hover layer.
		const hoverPlayBtn = hoverContainer.querySelector( '.waveform-btn' );
		if ( hoverPlayBtn ) {
			hoverPlayBtn.style.visibility = 'hidden';
		}

		// Handle hover events.
		const handleMouseLeave = () => {
			if ( currentElement._hoverWrapper ) {
				currentElement._hoverWrapper.style.clipPath =
					'inset(0 100% 0 0)';
			}
		};

		const handleMouseMove = ( event ) => {
			if ( currentElement._hoverWrapper ) {
				const rect = currentElement.getBoundingClientRect();
				const hoverPercent =
					( ( event.clientX - rect.left ) / rect.width ) * 100;
				const clipRight =
					100 - Math.max( 0, Math.min( 100, hoverPercent ) );
				currentElement._hoverWrapper.style.clipPath = `inset(0 ${ clipRight }% 0 0)`;
			}
		};

		currentElement.addEventListener( 'mouseleave', handleMouseLeave );
		currentElement.addEventListener( 'mousemove', handleMouseMove );
		currentElement._hoverHandlers = { handleMouseLeave, handleMouseMove };

		// Handle progress updates.
		const handleTimeUpdate = ( event ) => {
			if ( event.detail?.duration && currentElement._progressBg ) {
				const progress =
					event.detail.currentTime / event.detail.duration;
				const trackWidth =
					currentElement.offsetWidth - WAVEFORM_BUTTON_WIDTH;
				const progressWidth = progress * trackWidth;
				currentElement._progressBg.style.width = `${ progressWidth }px`;
			}
		};

		const handleEnded = () => {
			if ( currentElement._progressBg ) {
				currentElement._progressBg.style.width = '0';
			}
			onTrackEnd();
		};

		baseContainer.addEventListener(
			'waveformplayer:timeupdate',
			handleTimeUpdate
		);
		baseContainer.addEventListener( 'waveformplayer:ended', handleEnded );

		// Store for cleanup.
		currentElement._baseContainer = baseContainer;
		currentElement._eventHandlers = { handleTimeUpdate, handleEnded };

		return () => {
			// Clean up hover handlers.
			if ( currentElement._hoverHandlers ) {
				currentElement.removeEventListener(
					'mouseleave',
					currentElement._hoverHandlers.handleMouseLeave
				);
				currentElement.removeEventListener(
					'mousemove',
					currentElement._hoverHandlers.handleMouseMove
				);
			}

			// Clean up event listeners.
			if (
				currentElement._baseContainer &&
				currentElement._eventHandlers
			) {
				currentElement._baseContainer.removeEventListener(
					'waveformplayer:timeupdate',
					currentElement._eventHandlers.handleTimeUpdate
				);
				currentElement._baseContainer.removeEventListener(
					'waveformplayer:ended',
					currentElement._eventHandlers.handleEnded
				);
			}

			// Destroy instances.
			if ( waveformInstanceRef.current?.destroy ) {
				try {
					waveformInstanceRef.current.destroy();
				} catch ( e ) {
					logWarning( 'Error destroying waveform instance:', e );
				}
			}
			if ( hoverInstanceRef.current?.destroy ) {
				try {
					hoverInstanceRef.current.destroy();
				} catch ( e ) {
					logWarning(
						'Error destroying hover waveform instance:',
						e
					);
				}
			}
			waveformInstanceRef.current = null;
			hoverInstanceRef.current = null;
		};
	}, [
		track?.src,
		track?.uniqueId,
		track?.image,
		visualizationStyle,
		showProgressBackground,
		progressColor,
		onTrackEnd,
	] );

	return (
		<div
			ref={ waveformRef }
			className="wp-block-playlist__waveform-player"
			data-waveform-style={ visualizationStyle || 'bars' }
			aria-label={ ariaLabel }
		/>
	);
};

const PlaylistEdit = ( {
	attributes,
	setAttributes,
	isSelected,
	insertBlocksAfter,
	clientId,
} ) => {
	const {
		order,
		showTracklist,
		showNumbers,
		showImages,
		showArtists,
		currentTrack,
		visualizationStyle,
		showProgressBackground,
		progressColor,
		borderColor,
		style,
		tagName: TagName = showNumbers ? 'ol' : 'ul',
	} = attributes;
	const [ trackListIndex, setTrackListIndex ] = useState( 0 );

	// Build custom style with border CSS variables for track separators.
	const customStyle = {};
	if ( borderColor ) {
		customStyle[
			'--wp-block-playlist-border-color'
		] = `var(--wp--preset--color--${ borderColor })`;
	} else if ( style?.border?.color ) {
		customStyle[ '--wp-block-playlist-border-color' ] = style.border.color;
	}
	if ( style?.border?.width ) {
		customStyle[ '--wp-block-playlist-border-width' ] = style.border.width;
	}

	const blockProps = useBlockProps( { style: customStyle } );
	const { replaceInnerBlocks, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch( blockEditorStore );
	const { createErrorNotice } = useDispatch( noticesStore );
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();
	const colorGradientSettings = useMultipleOriginColorsAndGradients();
	function onUploadError( message ) {
		createErrorNotice( message, { type: 'snackbar' } );
	}
	const { updateBlockAttributes } = useDispatch( blockEditorStore );

	const { innerBlockTracks } = useSelect(
		( select ) => {
			const { getBlock: _getBlock } = select( blockEditorStore );
			return {
				innerBlockTracks: _getBlock( clientId )?.innerBlocks ?? [],
			};
		},
		[ clientId ]
	);

	// Ensure that each inner block has a unique ID,
	// even if a track is duplicated.
	useEffect( () => {
		const seen = new Set();
		let hasDuplicates = false;
		const updatedBlocks = innerBlockTracks.map( ( block ) => {
			if ( seen.has( block.attributes.uniqueId ) ) {
				hasDuplicates = true;
				return {
					...block,
					attributes: {
						...block.attributes,
						uniqueId: uuid(),
					},
				};
			}
			seen.add( block.attributes.uniqueId );
			return block;
		} );
		if ( hasDuplicates ) {
			replaceInnerBlocks( clientId, updatedBlocks );
		}
	}, [ innerBlockTracks, clientId, replaceInnerBlocks ] );

	// Create a list of tracks from the inner blocks,
	// but skip blocks that do not have a uniqueId attribute, such as the media placeholder.
	const validTracks = innerBlockTracks.filter(
		( block ) => !! block.attributes.uniqueId
	);
	const tracks = validTracks.map( ( block ) => block.attributes );
	const firstTrackId = validTracks[ 0 ]?.attributes?.uniqueId;

	// updateBlockAttributes is used to force updating the parent playlist block
	// when the currentTrack changes. Using setAttributes directly does not update
	// the currentTrack when multiple tracks are moved at the same time.
	useEffect( () => {
		if ( tracks.length === 0 ) {
			// If there are no tracks but currentTrack is set, set it to null.
			if ( currentTrack !== null ) {
				updateBlockAttributes( clientId, { currentTrack: null } );
			}
		} else if (
			// If the currentTrack is not the first track, update it to the first track.
			firstTrackId &&
			firstTrackId !== currentTrack
		) {
			updateBlockAttributes( clientId, { currentTrack: firstTrackId } );
		}
	}, [
		tracks,
		currentTrack,
		firstTrackId,
		clientId,
		updateBlockAttributes,
	] );

	const onSelectTracks = useCallback(
		( media ) => {
			if ( ! media ) {
				return;
			}

			if ( ! Array.isArray( media ) ) {
				media = [ media ];
			}

			const trackAttributes = ( track ) => ( {
				id: track.id || track.url, // Attachment ID or URL.
				uniqueId: uuid(), // Unique ID for the track.
				src: track.url,
				title: track.title,
				artist:
					track.artist ||
					track?.meta?.artist ||
					track?.media_details?.artist ||
					__( 'Unknown artist' ),
				album:
					track.album ||
					track?.meta?.album ||
					track?.media_details?.album ||
					__( 'Unknown album' ),
				length:
					track?.fileLength || track?.media_details?.length_formatted,
				// Prevent using the default media attachment icon as the track image.
				// Note: Image is not available when a new track is uploaded.
				image:
					track?.image?.src &&
					track?.image?.src.endsWith( '/images/media/audio.svg' )
						? ''
						: track?.image?.src,
			} );

			const trackList = media.map( trackAttributes );
			__unstableMarkNextChangeAsNotPersistent();
			setAttributes( {
				currentTrack:
					trackList.length > 0 ? trackList[ 0 ].uniqueId : null,
			} );

			const newBlocks = trackList.map( ( track ) =>
				createBlock( 'core/playlist-track', track )
			);
			// Replace the inner blocks with the new tracks.
			replaceInnerBlocks( clientId, newBlocks );
		},
		[
			__unstableMarkNextChangeAsNotPersistent,
			setAttributes,
			replaceInnerBlocks,
			clientId,
		]
	);

	const onTrackEnd = useCallback( () => {
		/* If there are tracks left, play the next track */
		if ( trackListIndex < tracks.length - 1 ) {
			if ( tracks[ trackListIndex + 1 ]?.uniqueId ) {
				setTrackListIndex( trackListIndex + 1 );
				setAttributes( {
					currentTrack: tracks[ trackListIndex + 1 ].uniqueId,
				} );
			}
		} else {
			setTrackListIndex( 0 );
			if ( tracks[ 0 ].uniqueId ) {
				setAttributes( { currentTrack: tracks[ 0 ].uniqueId } );
			} else if ( tracks.length > 0 ) {
				const validTrack = tracks.find(
					( track ) => track.uniqueId !== undefined
				);
				if ( validTrack ) {
					setAttributes( { currentTrack: validTrack.uniqueId } );
				}
			}
		}
	}, [ setAttributes, trackListIndex, tracks ] );

	const onChangeOrder = useCallback(
		( trackOrder ) => {
			const sortedBlocks = [ ...innerBlockTracks ].sort( ( a, b ) => {
				const titleA = a.attributes.title || '';
				const titleB = b.attributes.title || '';

				if ( trackOrder === 'asc' ) {
					return titleA.localeCompare( titleB );
				}
				return titleB.localeCompare( titleA );
			} );
			const sortedTracks = sortedBlocks.map(
				( block ) => block.attributes
			);
			replaceInnerBlocks( clientId, sortedBlocks );
			setAttributes( {
				order: trackOrder,
				currentTrack:
					sortedTracks.length > 0 &&
					sortedTracks[ 0 ].uniqueId !== currentTrack
						? sortedTracks[ 0 ].uniqueId
						: currentTrack,
			} );
		},
		[
			clientId,
			currentTrack,
			innerBlockTracks,
			replaceInnerBlocks,
			setAttributes,
		]
	);

	function toggleAttribute( attribute ) {
		return ( newValue ) => {
			setAttributes( { [ attribute ]: newValue } );
		};
	}

	const hasSelectedChild = useSelect(
		( select ) =>
			select( blockEditorStore ).hasSelectedInnerBlock( clientId ),
		[ clientId ]
	);

	const hasAnySelected = isSelected || hasSelectedChild;

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		__experimentalAppenderTagName: 'li',
		renderAppender: hasAnySelected && InnerBlocks.ButtonBlockAppender,
	} );

	if ( ! tracks || ( Array.isArray( tracks ) && tracks.length === 0 ) ) {
		return (
			<div
				{ ...blockProps }
				className={ clsx( 'is-placeholder', blockProps.className ) }
			>
				<MediaPlaceholder
					icon={ <BlockIcon icon={ icon } /> }
					labels={ {
						title: __( 'Playlist' ),
						instructions: __(
							'Upload an audio file or pick one from your media library.'
						),
					} }
					onSelect={ onSelectTracks }
					accept="audio/*"
					multiple
					allowedTypes={ ALLOWED_MEDIA_TYPES }
					onError={ onUploadError }
				/>
			</div>
		);
	}

	return (
		<>
			<BlockControls group="other">
				<MediaReplaceFlow
					name={ __( 'Edit' ) }
					onSelect={ onSelectTracks }
					accept="audio/*"
					multiple
					mediaIds={ tracks
						.filter( ( track ) => track.id )
						.map( ( track ) => track.id ) }
					allowedTypes={ ALLOWED_MEDIA_TYPES }
					onError={ onUploadError }
				/>
			</BlockControls>
			<InspectorControls>
				<ToolsPanel
					label={ __( 'Settings' ) }
					resetAll={ () => {
						setAttributes( {
							showTracklist: true,
							showArtists: true,
							showNumbers: true,
							showImages: true,
							order: 'asc',
							visualizationStyle: 'bars',
							showProgressBackground: true,
							progressColor: undefined,
						} );
					} }
					dropdownMenuProps={ dropdownMenuProps }
				>
					<ToolsPanelItem
						label={ __( 'Show Tracklist' ) }
						isShownByDefault
						hasValue={ () => showTracklist !== true }
						onDeselect={ () =>
							setAttributes( { showTracklist: true } )
						}
					>
						<ToggleControl
							label={ __( 'Show Tracklist' ) }
							onChange={ toggleAttribute( 'showTracklist' ) }
							checked={ showTracklist }
						/>
					</ToolsPanelItem>
					{ showTracklist && (
						<>
							<ToolsPanelItem
								label={ __( 'Show artist name in Tracklist' ) }
								isShownByDefault
								hasValue={ () => showArtists !== true }
								onDeselect={ () =>
									setAttributes( { showArtists: true } )
								}
							>
								<ToggleControl
									label={ __(
										'Show artist name in Tracklist'
									) }
									onChange={ toggleAttribute(
										'showArtists'
									) }
									checked={ showArtists }
								/>
							</ToolsPanelItem>
							<ToolsPanelItem
								label={ __( 'Show number in Tracklist' ) }
								isShownByDefault
								hasValue={ () => showNumbers !== true }
								onDeselect={ () =>
									setAttributes( { showNumbers: true } )
								}
							>
								<ToggleControl
									label={ __( 'Show number in Tracklist' ) }
									onChange={ toggleAttribute(
										'showNumbers'
									) }
									checked={ showNumbers }
								/>
							</ToolsPanelItem>
						</>
					) }
					<ToolsPanelItem
						label={ __( 'Show images' ) }
						isShownByDefault
						hasValue={ () => showImages !== true }
						onDeselect={ () =>
							setAttributes( { showImages: true } )
						}
					>
						<ToggleControl
							label={ __( 'Show images' ) }
							onChange={ toggleAttribute( 'showImages' ) }
							checked={ showImages }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Order' ) }
						isShownByDefault
						hasValue={ () => order !== 'asc' }
						onDeselect={ () => setAttributes( { order: 'asc' } ) }
					>
						<SelectControl
							__next40pxDefaultSize
							label={ __( 'Order' ) }
							value={ order }
							options={ [
								{ label: __( 'Descending' ), value: 'desc' },
								{ label: __( 'Ascending' ), value: 'asc' },
							] }
							onChange={ ( value ) => onChangeOrder( value ) }
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Visualization style' ) }
						isShownByDefault
						hasValue={ () => visualizationStyle !== 'bars' }
						onDeselect={ () =>
							setAttributes( { visualizationStyle: 'bars' } )
						}
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={ __( 'Visualization style' ) }
							value={ visualizationStyle || 'bars' }
							options={ [
								{ label: __( 'Bars' ), value: 'bars' },
								{ label: __( 'Mirror' ), value: 'mirror' },
								{ label: __( 'Line' ), value: 'line' },
								{ label: __( 'Blocks' ), value: 'blocks' },
								{ label: __( 'Dots' ), value: 'dots' },
								{ label: __( 'Seekbar' ), value: 'seekbar' },
							] }
							onChange={ ( value ) =>
								setAttributes( { visualizationStyle: value } )
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Show progress background' ) }
						isShownByDefault
						hasValue={ () => showProgressBackground !== true }
						onDeselect={ () =>
							setAttributes( { showProgressBackground: true } )
						}
					>
						<ToggleControl
							__nextHasNoMarginBottom
							label={ __( 'Show progress background' ) }
							onChange={ toggleAttribute(
								'showProgressBackground'
							) }
							checked={ showProgressBackground }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			{ showProgressBackground &&
				colorGradientSettings.hasColorsOrGradients && (
					<InspectorControls group="color">
						<ColorGradientSettingsDropdown
							__experimentalIsRenderedInSidebar
							settings={ [
								{
									colorValue: progressColor,
									label: __( 'Progress background' ),
									onColorChange: ( value ) =>
										setAttributes( {
											progressColor: value,
										} ),
									isShownByDefault: true,
									resetAllFilter: () => ( {
										progressColor: undefined,
									} ),
									clearable: true,
								},
							] }
							panelId={ clientId }
							{ ...colorGradientSettings }
						/>
					</InspectorControls>
				) }
			<figure { ...blockProps }>
				<Disabled isDisabled={ ! isSelected }>
					<CurrentTrack
						key={ `${ tracks[ trackListIndex ]?.uniqueId }-${ visualizationStyle }-${ showProgressBackground }-${ progressColor }` }
						track={ tracks[ trackListIndex ] }
						onTrackEnd={ onTrackEnd }
						visualizationStyle={ visualizationStyle }
						showProgressBackground={ showProgressBackground }
						progressColor={ progressColor }
					/>
				</Disabled>
				{ showTracklist && (
					<TagName className="wp-block-playlist__tracklist">
						{ innerBlocksProps.children }
					</TagName>
				) }
				<Caption
					attributes={ attributes }
					setAttributes={ setAttributes }
					isSelected={ isSelected }
					insertBlocksAfter={ insertBlocksAfter }
					label={ __( 'Playlist caption text' ) }
					showToolbarButton={ isSelected }
					style={ { marginTop: 16 } }
				/>
			</figure>
		</>
	);
};

export default PlaylistEdit;
