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
	createWaveformContainer,
} from './utils';

/**
 * Store references to initialized WaveformPlayer instances.
 */
const waveformInstances = new Map();
const playedInstances = new Map();

/**
 * Track the last URL we initialized for each element to detect track changes.
 */
const lastInitializedUrl = new Map();

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

				// Always clean up any existing player content first.
				const existingInstance = waveformInstances.get( ref );
				if ( existingInstance?.destroy ) {
					try {
						existingInstance.destroy();
					} catch ( e ) {
						// Ignore errors during cleanup.
					}
					waveformInstances.delete( ref );
				}

				const existingPlayedInstance = playedInstances.get( ref );
				if ( existingPlayedInstance?.destroy ) {
					try {
						existingPlayedInstance.destroy();
					} catch ( e ) {
						// Ignore errors during cleanup.
					}
					playedInstances.delete( ref );
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
				const baseWaveformColor = colorWithOpacity( textColor, 0.5 );
				const visualizationStyle =
					ref.getAttribute( 'data-waveform-style' ) || 'bars';

				// Store the button width for progress calculations.
				const buttonWidth = 60;

				// Create progress background layer (solid color behind played portion).
				const progressBg = document.createElement( 'div' );
				progressBg.className = 'wp-block-playlist__waveform-progress';
				ref.appendChild( progressBg );
				ref._progressBg = progressBg;

				// Create wrapper for the base waveform (text-colored bars for unplayed area).
				const baseWrapper = document.createElement( 'div' );
				baseWrapper.className = 'wp-block-playlist__waveform-base';
				const baseContainer = createWaveformContainer( {
					url: track.url,
					visualizationStyle,
					waveformColor: baseWaveformColor,
					progressColor: baseWaveformColor,
					buttonColor: textColor,
				} );
				baseWrapper.appendChild( baseContainer );
				ref.appendChild( baseWrapper );

				// Create wrapper for the played waveform (background-colored bars).
				// This layer is clipped to the played portion to show contrasting bars.
				const playedWrapper = document.createElement( 'div' );
				playedWrapper.className = 'wp-block-playlist__waveform-played';
				const playedWaveformColor = colorWithOpacity( bgColor, 0.5 );
				const playedContainer = createWaveformContainer( {
					url: track.url,
					visualizationStyle,
					waveformColor: playedWaveformColor,
					progressColor: playedWaveformColor,
					buttonColor: textColor,
				} );
				playedWrapper.appendChild( playedContainer );
				ref.appendChild( playedWrapper );
				ref._playedWrapper = playedWrapper;

				// Create base WaveformPlayer instance.
				const baseInstance = new WaveformPlayer( baseContainer );
				waveformInstances.set( ref, baseInstance );

				// Create played WaveformPlayer instance.
				const playedInstance = new WaveformPlayer( playedContainer );
				playedInstances.set( ref, playedInstance );

				// Apply background color to SVG icons for contrast.
				const svgPaths = baseContainer.querySelectorAll( 'svg path' );
				svgPaths.forEach( ( path ) => {
					path.style.fill = bgColor;
				} );

				// Hide the play button in the played layer (we only use the base player's button).
				const playedPlayBtn =
					playedContainer.querySelector( '.waveform-btn' );
				if ( playedPlayBtn ) {
					playedPlayBtn.style.visibility = 'hidden';
				}

				// Listen to WaveformPlayer custom events for progress updates.
				baseContainer.addEventListener(
					'waveformplayer:timeupdate',
					( event ) => {
						if ( event.detail?.duration ) {
							const progress =
								event.detail.currentTime /
								event.detail.duration;
							// Calculate width based on track area (excluding button).
							const trackWidth = ref.offsetWidth - buttonWidth;
							const progressWidth = progress * trackWidth;

							// Update progress background width.
							if ( ref._progressBg ) {
								ref._progressBg.style.width = `${ progressWidth }px`;
							}

							// Update played waveform clip-path to match progress.
							if ( ref._playedWrapper ) {
								const clipPercent =
									( ( buttonWidth + progressWidth ) /
										ref.offsetWidth ) *
									100;
								const clipRight = 100 - clipPercent;
								ref._playedWrapper.style.clipPath = `inset(0 ${ clipRight }% 0 0)`;
							}
						}
					}
				);

				baseContainer.addEventListener( 'waveformplayer:ended', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-ended', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
					// Reset progress background and played waveform clip-path.
					if ( ref._progressBg ) {
						ref._progressBg.style.width = '0';
					}
					if ( ref._playedWrapper ) {
						ref._playedWrapper.style.clipPath = 'inset(0 100% 0 0)';
					}
				} );

				baseContainer.addEventListener( 'waveformplayer:play', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-play', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
				} );

				baseContainer.addEventListener( 'waveformplayer:pause', () => {
					ref.dispatchEvent(
						new CustomEvent( 'waveform-pause', {
							bubbles: true,
							detail: { element: ref },
						} )
					);
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
