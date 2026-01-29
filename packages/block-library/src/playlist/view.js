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

				// Set the url attribute for WaveformPlayer.
				ref.setAttribute( 'data-url', track.url );
				ref.setAttribute( 'data-waveform-color', 'currentColor' );
				ref.setAttribute( 'data-progress-color', 'currentColor' );
				ref.setAttribute( 'data-button-color', 'currentColor' );

				// Destroy existing instance if any.
				const existingInstance = waveformInstances.get( ref );
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

				// Get the background color from the block container and apply it to the SVG icons.
				const blockContainer = ref.closest( '.wp-block-playlist' );
				const bgColor = blockContainer
					? window.getComputedStyle( blockContainer ).backgroundColor
					: window.getComputedStyle( ref ).backgroundColor;
				const svgPaths = ref.querySelectorAll( 'svg path' );
				svgPaths.forEach( ( path ) => {
					path.style.fill = bgColor;
				} );

				// Get the audio element created by WaveformPlayer.
				const audio = ref.querySelector( 'audio' );
				if ( audio ) {
					// Set up event listeners.
					audio.addEventListener( 'ended', () => {
						ref.dispatchEvent(
							new CustomEvent( 'waveform-ended', {
								bubbles: true,
								detail: { element: ref },
							} )
						);
					} );

					audio.addEventListener( 'play', () => {
						ref.dispatchEvent(
							new CustomEvent( 'waveform-play', {
								bubbles: true,
								detail: { element: ref },
							} )
						);
					} );

					audio.addEventListener( 'pause', () => {
						ref.dispatchEvent(
							new CustomEvent( 'waveform-pause', {
								bubbles: true,
								detail: { element: ref },
							} )
						);
					} );

					// Auto-play if the context says we should be playing.
					if ( context.isPlaying ) {
						audio.play();
					}
				}
			},
		},
	},
	{ lock: true }
);
