/**
 * External dependencies
 */
import WaveformPlayer from '@arraypress/waveform-player';
import '@arraypress/waveform-player/dist/waveform-player.css';

/**
 * WordPress dependencies
 */
import { store, getContext, getElement } from '@wordpress/interactivity';

/**
 * Store a reference to initialized WaveformPlayer instances.
 */
const waveformInstances = new Map();

const { state } = store(
	'core/playlist',
	{
		state: {
			playlists: {},
			get currentTrack() {
				const { currentId, playlistId } = getContext();
				if ( ! currentId || ! playlistId ) {
					return {};
				}
				const playlist = state.playlists[ playlistId ];
				if ( ! playlist ) {
					return {};
				}
				return playlist.tracks[ currentId ] || {};
			},
			get isCurrentTrack() {
				const { currentId, uniqueId } = getContext();
				return currentId === uniqueId;
			},
		},
		actions: {
			changeTrack() {
				const context = getContext();
				context.currentId = context.uniqueId;
				context.isPlaying = true;
			},
			isPlaying() {
				const context = getContext();
				context.isPlaying = true;
			},
			isPaused() {
				const context = getContext();
				context.isPlaying = false;
			},
			nextSong( event ) {
				const { ref } = getElement();

				// Check if this event is for this specific player instance.
				if ( event?.detail?.element && event.detail.element !== ref ) {
					return;
				}

				const context = getContext();
				const currentIndex = context.tracks.findIndex(
					( uniqueId ) => uniqueId === context.currentId
				);
				const nextTrack = context.tracks[ currentIndex + 1 ];
				if ( nextTrack ) {
					context.currentId = nextTrack;
					// Waits a moment before changing the track, since
					// immediately changing the track can be jarring.
					setTimeout( () => {
						const audio = ref.querySelector( 'audio' );
						if ( audio ) {
							audio.play();
						}
					}, 1000 );
				}
			},
		},
		callbacks: {
			initWaveformPlayer() {
				const context = getContext();
				const { ref } = getElement();

				if ( ! context.currentId || ! ref ) {
					return;
				}

				const track =
					state.playlists[ context.playlistId ]?.tracks[
						context.currentId
					];
				if ( ! track?.url ) {
					return;
				}

				// Skip reinitialization if instance already exists for the same track.
				const existingInstance = waveformInstances.get( ref );
				const currentUrl = ref.getAttribute( 'data-url' );
				if ( existingInstance && currentUrl === track.url ) {
					return;
				}

				// Set the url attribute for WaveformPlayer.
				ref.setAttribute( 'data-url', track.url );
				// Get the text color for styling
				const textColor = window.getComputedStyle( ref ).color;
				// Get the background color from the block container, falling back to body if empty/transparent.
				const blockContainer = ref.closest( '.wp-block-playlist' );
				let bgColor = blockContainer
					? window.getComputedStyle( blockContainer ).backgroundColor
					: window.getComputedStyle( ref ).backgroundColor;
				// Check if background is transparent/empty and fall back to body background.
				const isTransparent =
					! bgColor ||
					bgColor === 'transparent' ||
					bgColor === 'rgba(0, 0, 0, 0)' ||
					bgColor.match( /rgba\([^)]+,\s*0\s*\)/ );
				if ( isTransparent ) {
					bgColor = window.getComputedStyle(
						document.body
					).backgroundColor;
				}
				// Convert rgb to rgba with 50% opacity for unplayed bars
				const waveformColor = textColor.startsWith( 'rgba' )
					? textColor.replace( /[\d.]+\)$/, '0.5)' )
					: textColor
							.replace( 'rgb(', 'rgba(' )
							.replace( ')', ', 0.5)' );
				// Convert bgColor to rgba with 50% opacity for played bars
				const progressColor = bgColor.startsWith( 'rgba' )
					? bgColor.replace( /[\d.]+\)$/, '0.5)' )
					: bgColor
							.replace( 'rgb(', 'rgba(' )
							.replace( ')', ', 0.5)' );
				ref.setAttribute( 'data-waveform-color', waveformColor );
				ref.setAttribute( 'data-progress-color', progressColor );
				ref.setAttribute( 'data-button-color', textColor );

				// Destroy existing instance if switching tracks.
				if ( existingInstance?.destroy ) {
					try {
						existingInstance.destroy();
					} catch ( e ) {
						// Ignore errors during cleanup.
					}
				}

				// Create new WaveformPlayer instance.
				const instance = new WaveformPlayer( ref );
				waveformInstances.set( ref, instance );

				// Apply background color to SVG icons for contrast.
				const svgPaths = ref.querySelectorAll( 'svg path' );
				svgPaths.forEach( ( path ) => {
					path.style.fill = bgColor;
				} );

				// Create progress background overlay element.
				const waveformContainer = ref.querySelector(
					'.waveform-container'
				);
				if ( waveformContainer ) {
					// Remove any existing progress background.
					const existingProgressBg = waveformContainer.querySelector(
						'.wp-block-playlist__progress-bg'
					);
					if ( existingProgressBg ) {
						existingProgressBg.remove();
					}

					// Create the progress background element.
					// Use text color as background for played area.
					const progressBg = document.createElement( 'div' );
					progressBg.className = 'wp-block-playlist__progress-bg';
					progressBg.style.cssText = `
						position: absolute;
						top: 0;
						left: 0;
						height: 60px;
						width: 0%;
						background-color: ${ textColor };
						pointer-events: none;
						z-index: 0;
					`;
					waveformContainer.style.position = 'relative';
					waveformContainer.insertBefore(
						progressBg,
						waveformContainer.firstChild
					);

					// Store reference for updating.
					ref._progressBg = progressBg;

					// Create hover overlay for showing potential seek position.
					const hoverBg = document.createElement( 'div' );
					hoverBg.className = 'wp-block-playlist__hover-bg';
					hoverBg.style.cssText = `
						position: absolute;
						top: 0;
						left: 0;
						height: 60px;
						width: 0%;
						background-color: ${ waveformColor };
						pointer-events: none;
						z-index: 0;
						opacity: 0;
						transition: opacity 0.15s ease;
					`;
					waveformContainer.insertBefore(
						hoverBg,
						waveformContainer.firstChild
					);
					ref._hoverBg = hoverBg;

					// Handle hover events on waveform container.
					waveformContainer.addEventListener( 'mouseenter', () => {
						hoverBg.style.opacity = '1';
					} );
					waveformContainer.addEventListener( 'mouseleave', () => {
						hoverBg.style.opacity = '0';
					} );
					waveformContainer.addEventListener(
						'mousemove',
						( event ) => {
							const rect =
								waveformContainer.getBoundingClientRect();
							const hoverProgress =
								( ( event.clientX - rect.left ) / rect.width ) *
								100;
							hoverBg.style.width = `${ Math.max(
								0,
								Math.min( 100, hoverProgress )
							) }%`;
						}
					);
				}

				// Listen to WaveformPlayer custom events for progress updates.
				ref.addEventListener(
					'waveformplayer:timeupdate',
					( event ) => {
						if ( ref._progressBg && event.detail?.duration ) {
							const progress =
								( event.detail.currentTime /
									event.detail.duration ) *
								100;
							ref._progressBg.style.width = `${ progress }%`;
						}
					}
				);

				ref.addEventListener( 'waveformplayer:ended', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-ended', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
					// Reset progress background.
					if ( ref._progressBg ) {
						ref._progressBg.style.width = '0%';
					}
				} );

				ref.addEventListener( 'waveformplayer:play', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-play', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
				} );

				ref.addEventListener( 'waveformplayer:pause', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-pause', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
				} );

				// Auto-play if the context says we should be playing.
				if ( context.isPlaying && instance ) {
					instance.play();
				}
			},
		},
	},
	{ lock: true }
);
