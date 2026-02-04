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
 * Internal dependencies
 */
import {
	colorWithOpacity,
	getEffectiveBackgroundColor,
	getProgressBackgroundColor,
	createWaveformContainer,
	WAVEFORM_BUTTON_WIDTH,
} from './utils';

/**
 * Store references to initialized WaveformPlayer instances.
 */
const waveformInstances = new Map();
const hoverInstances = new Map();

/**
 * Track the last URL we initialized for each element to detect track changes.
 */
const lastInitializedUrl = new Map();

/**
 * Store event listener references for proper cleanup.
 */
const eventListeners = new Map();

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

				// Skip if we already initialized with this exact URL.
				if ( lastInitializedUrl.get( ref ) === track.url ) {
					return;
				}

				// Clean up any existing event handlers first.
				if ( ref._hoverHandlers ) {
					ref.removeEventListener(
						'mouseleave',
						ref._hoverHandlers.handleMouseLeave
					);
					ref.removeEventListener(
						'mousemove',
						ref._hoverHandlers.handleMouseMove
					);
					delete ref._hoverHandlers;
				}

				// Clean up keyboard handler.
				if ( ref._playBtn && ref._keyboardHandler ) {
					ref._playBtn.removeEventListener(
						'keydown',
						ref._keyboardHandler
					);
					delete ref._keyboardHandler;
					delete ref._playBtn;
				}

				// Clean up any existing event listeners on baseContainer.
				const existingListeners = eventListeners.get( ref );
				if ( existingListeners ) {
					const { container, handlers } = existingListeners;
					if ( container && handlers ) {
						container.removeEventListener(
							'waveformplayer:timeupdate',
							handlers.timeupdate
						);
						container.removeEventListener(
							'waveformplayer:ended',
							handlers.ended
						);
						container.removeEventListener(
							'waveformplayer:play',
							handlers.play
						);
						container.removeEventListener(
							'waveformplayer:pause',
							handlers.pause
						);
					}
					eventListeners.delete( ref );
				}

				// Always clean up any existing player content first.
				const existingInstance = waveformInstances.get( ref );
				if ( existingInstance?.destroy ) {
					try {
						existingInstance.destroy();
					} catch ( e ) {
						logWarning( 'Error destroying waveform instance:', e );
					}
					waveformInstances.delete( ref );
				}

				const existingHoverInstance = hoverInstances.get( ref );
				if ( existingHoverInstance?.destroy ) {
					try {
						existingHoverInstance.destroy();
					} catch ( e ) {
						logWarning(
							'Error destroying hover waveform instance:',
							e
						);
					}
					hoverInstances.delete( ref );
				}

				// Clear any DOM elements from previous player.
				ref.innerHTML = '';

				// Remove the initialized flag so WaveformPlayer creates fresh.
				ref.removeAttribute( 'data-waveform-initialized' );

				// Track what URL we're initializing.
				lastInitializedUrl.set( ref, track.url );

				// Get colors for styling.
				const textColor = window.getComputedStyle( ref ).color;
				const bgColor = getEffectiveBackgroundColor( ref );
				const baseWaveformColor = colorWithOpacity( textColor, 0.3 );
				const visualizationStyle =
					ref.getAttribute( 'data-waveform-style' ) || 'bars';
				const showProgressBackground =
					ref.getAttribute( 'data-show-progress-background' ) ===
					'true';
				const customProgressColor =
					ref.getAttribute( 'data-progress-color' ) || '';

				// Create progress background layer if enabled.
				if ( showProgressBackground ) {
					const progressBg = document.createElement( 'div' );
					progressBg.className =
						'wp-block-playlist__waveform-progress';
					progressBg.style.backgroundColor =
						customProgressColor ||
						getProgressBackgroundColor( bgColor );
					ref.appendChild( progressBg );
					ref._progressBg = progressBg;
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

				// Create wrapper for the base waveform (30% opacity text-colored bars).
				const baseWrapper = document.createElement( 'div' );
				baseWrapper.className = 'wp-block-playlist__waveform-base';
				const baseContainer = createWaveformContainer( {
					url: track.url,
					visualizationStyle,
					waveformColor: baseWaveformColor,
					progressColor: baseWaveformColor,
					buttonColor: textColor,
					title: track?.title || 'Untitled',
					subtitle,
				} );
				baseWrapper.appendChild( baseContainer );
				ref.appendChild( baseWrapper );

				// Create wrapper for the hover waveform (100% opacity text-colored bars).
				// This layer is clipped to the mouse position to show brighter bars on hover.
				const hoverWrapper = document.createElement( 'div' );
				hoverWrapper.className = 'wp-block-playlist__waveform-hover';
				const hoverContainer = createWaveformContainer( {
					url: track.url,
					visualizationStyle,
					waveformColor: textColor,
					progressColor: textColor,
					buttonColor: textColor,
				} );
				hoverWrapper.appendChild( hoverContainer );
				ref.appendChild( hoverWrapper );
				ref._hoverWrapper = hoverWrapper;

				// Create base WaveformPlayer instance.
				const baseInstance = new WaveformPlayer( baseContainer );
				waveformInstances.set( ref, baseInstance );

				// Create hover WaveformPlayer instance.
				const hoverInstance = new WaveformPlayer( hoverContainer );
				hoverInstances.set( ref, hoverInstance );

				// Apply background color to SVG icons for contrast.
				const svgPaths = baseContainer.querySelectorAll( 'svg path' );
				svgPaths.forEach( ( path ) => {
					path.style.fill = bgColor;
				} );

				// Enhance play button accessibility and styling.
				const playBtn = baseContainer.querySelector( '.waveform-btn' );
				if ( playBtn ) {
					playBtn.setAttribute(
						'aria-label',
						track.ariaLabel || track.title || 'Play'
					);
					playBtn.setAttribute( 'role', 'button' );

					// Use album art as the play button background if available.
					if ( track.image ) {
						playBtn.style.backgroundImage = `url(${ track.image })`;
						playBtn.style.backgroundSize = 'cover';
						playBtn.style.backgroundPosition = 'center';
					}

					// Add keyboard support for seeking.
					const handleKeyDown = ( event ) => {
						const audio = baseContainer.querySelector( 'audio' );
						if ( ! audio ) {
							return;
						}

						const seekAmount = 5; // Seconds to seek.
						switch ( event.key ) {
							case 'ArrowLeft':
								event.preventDefault();
								audio.currentTime = Math.max(
									0,
									audio.currentTime - seekAmount
								);
								break;
							case 'ArrowRight':
								event.preventDefault();
								audio.currentTime = Math.min(
									audio.duration,
									audio.currentTime + seekAmount
								);
								break;
						}
					};

					playBtn.addEventListener( 'keydown', handleKeyDown );
					ref._keyboardHandler = handleKeyDown;
					ref._playBtn = playBtn;
				}

				// Hide the play button in the hover layer.
				const hoverPlayBtn =
					hoverContainer.querySelector( '.waveform-btn' );
				if ( hoverPlayBtn ) {
					hoverPlayBtn.style.visibility = 'hidden';
					// Also remove from tab order since it's just visual.
					hoverPlayBtn.setAttribute( 'tabindex', '-1' );
					hoverPlayBtn.setAttribute( 'aria-hidden', 'true' );
				}

				// Handle hover events to show/hide the hover waveform.
				const handleMouseLeave = () => {
					if ( ref._hoverWrapper ) {
						ref._hoverWrapper.style.clipPath = 'inset(0 100% 0 0)';
					}
				};

				const handleMouseMove = ( event ) => {
					if ( ref._hoverWrapper ) {
						const rect = ref.getBoundingClientRect();
						const hoverPercent =
							( ( event.clientX - rect.left ) / rect.width ) *
							100;
						const clipRight =
							100 - Math.max( 0, Math.min( 100, hoverPercent ) );
						ref._hoverWrapper.style.clipPath = `inset(0 ${ clipRight }% 0 0)`;
					}
				};

				ref.addEventListener( 'mouseleave', handleMouseLeave );
				ref.addEventListener( 'mousemove', handleMouseMove );

				// Store handlers for cleanup.
				ref._hoverHandlers = { handleMouseLeave, handleMouseMove };

				// Create event handlers for WaveformPlayer events.
				const handleTimeUpdate = ( event ) => {
					if ( event.detail?.duration ) {
						const progress =
							event.detail.currentTime / event.detail.duration;
						// Calculate width based on track area (excluding button).
						const trackWidth =
							ref.offsetWidth - WAVEFORM_BUTTON_WIDTH;
						const progressWidth = progress * trackWidth;

						// Update progress background width.
						if ( ref._progressBg ) {
							ref._progressBg.style.width = `${ progressWidth }px`;
						}
					}
				};

				const handleEnded = () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-ended', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
					// Reset progress background.
					if ( ref._progressBg ) {
						ref._progressBg.style.width = '0';
					}
				};

				const handlePlay = () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-play', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
				};

				const handlePause = () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-pause', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
				};

				// Add event listeners.
				baseContainer.addEventListener(
					'waveformplayer:timeupdate',
					handleTimeUpdate
				);
				baseContainer.addEventListener(
					'waveformplayer:ended',
					handleEnded
				);
				baseContainer.addEventListener(
					'waveformplayer:play',
					handlePlay
				);
				baseContainer.addEventListener(
					'waveformplayer:pause',
					handlePause
				);

				// Store references for cleanup.
				eventListeners.set( ref, {
					container: baseContainer,
					handlers: {
						timeupdate: handleTimeUpdate,
						ended: handleEnded,
						play: handlePlay,
						pause: handlePause,
					},
				} );

				// Auto-play if the context says we should be playing.
				if ( context.isPlaying && baseInstance ) {
					baseInstance.play();
				}
			},
		},
	},
	{ lock: true }
);
