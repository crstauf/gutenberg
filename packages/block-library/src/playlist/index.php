<?php
/**
 * Server-side rendering of the `core/playlist` block.
 *
 * @package WordPress
 */

/**
 * Renders the `core/playlist` block on server.
 *
 * @since 6.9.0
 *
 * @param array    $attributes The block attributes.
 * @param string   $content    The block content.
 * @param WP_Block $block      The block instance.
 *
 * @return string Returns the Playlist.
 */
function render_block_core_playlist( $attributes, $content, $block ) {
	if ( empty( $attributes['currentTrack'] ) ) {
		return '';
	}

	$current_media_id  = $attributes['currentTrack'];
	$playlist_id       = wp_unique_id( 'playlist-' );
	$playlist_tracks   = array();
	$tracks_data       = array();
	$current_unique_id = null;

	// Parse inner blocks to extract track data.
	// This approach avoids duplicating track data in the HTML output.
	if ( ! empty( $block->inner_blocks ) ) {
		foreach ( $block->inner_blocks as $inner_block ) {
			if ( 'core/playlist-track' === $inner_block->name ) {
				$inner_block->context['playlistId'] = $playlist_id;

				$track_attributes  = $inner_block->attributes;
				$unique_id         = isset( $track_attributes['uniqueId'] ) ? $track_attributes['uniqueId'] : wp_unique_id( 'playlist-track-' );
				$playlist_tracks[] = $unique_id;

				$inner_block->attributes['uniqueId'] = $unique_id;

				// Extract track metadata from block attributes.
				$title      = isset( $track_attributes['title'] ) && ! empty( $track_attributes['title'] ) ? $track_attributes['title'] : __( 'Unknown title' );
				$artist     = isset( $track_attributes['artist'] ) ? $track_attributes['artist'] : '';
				$album      = isset( $track_attributes['album'] ) ? $track_attributes['album'] : '';
				$image      = isset( $track_attributes['image'] ) ? $track_attributes['image'] : '';
				$url        = isset( $track_attributes['src'] ) ? $track_attributes['src'] : '';
				$aria_label = $title;

				if ( $title && $artist && $album ) {
					$aria_label = sprintf(
						/* translators: %1$s: track title, %2$s artist name, %3$s: album name. */
						_x( '%1$s by %2$s from the album %3$s', 'track title, artist name, album name' ),
						$title,
						$artist,
						$album
					);
				}

				$tracks_data[ $unique_id ] = array(
					'url'       => esc_url( $url ),
					'title'     => esc_html( $title ),
					'artist'    => esc_html( $artist ),
					'album'     => esc_html( $album ),
					'image'     => esc_url( $image ),
					'ariaLabel' => esc_attr( $aria_label ),
				);

				if ( $unique_id === $current_media_id ) {
					$current_unique_id = $unique_id;
				}
			}
		}
	}

	// If there are no tracks but there is a currentTrack set, do not render the block.
	// This can happen for example if the currentTrack was not deleted correctly
	// or if the block is manually edited in the code editor mode.
	if ( empty( $playlist_tracks ) || ! in_array( $current_media_id, $playlist_tracks, true ) ) {
		return '';
	}

	wp_enqueue_script_module( '@wordpress/block-library/playlist/view' );

	// Add the playlist tracks to the global state,
	// but keep them isolated from other playlists with the help of playlistId.
	wp_interactivity_state(
		'core/playlist',
		array(
			'playlists' => array(
				$playlist_id => array(
					'tracks' => $tracks_data,
				),
			),
		)
	);

	// Create the HTML for the waveform player.
	$visualization_style       = isset( $attributes['visualizationStyle'] ) ? $attributes['visualizationStyle'] : 'bars';
	$show_progress_background  = isset( $attributes['showProgressBackground'] ) ? $attributes['showProgressBackground'] : true;
	$progress_color            = isset( $attributes['progressColor'] ) ? $attributes['progressColor'] : '';

	$progress_color_attr = $progress_color ? ' data-progress-color="' . esc_attr( $progress_color ) . '"' : '';
	$show_progress_attr  = $show_progress_background ? ' data-show-progress-background="true"' : '';

	$html = '<div
			class="wp-block-playlist__waveform-player"
			data-waveform-style="' . esc_attr( $visualization_style ) . '"' . $show_progress_attr . $progress_color_attr . '
			data-wp-bind--data-url="state.currentTrack.url"
			data-wp-bind--aria-label="state.currentTrack.ariaLabel"
			data-wp-watch="callbacks.initWaveformPlayer"
			data-wp-on-document--waveform-ended="actions.nextSong"
			data-wp-on-document--waveform-play="actions.isPlaying"
			data-wp-on-document--waveform-pause="actions.isPaused"
		></div>';

	// Add the waveform player HTML inside the figure.
	$figure = null;
	preg_match( '/<figure[^>]*>/', $content, $figure );
	if ( ! empty( $figure[0] ) ) {
		$content = preg_replace( '/(<figure[^>]*>)/', '$1' . $html, $content, 1 );
	}

	$processor = new WP_HTML_Tag_Processor( $content );
	$processor->next_tag( 'figure' );
	$processor->set_attribute( 'data-wp-interactive', 'core/playlist' );
	$processor->set_attribute(
		'data-wp-context',
		json_encode(
			array(
				'playlistId' => $playlist_id,
				'currentId'  => $current_unique_id,
				'tracks'     => $playlist_tracks,
				'isPlaying'  => false,
			)
		)
	);

	// If border styles are set, pass them as CSS custom properties for track borders.
	// Check for preset color first, then custom color.
	$border_color = null;
	if ( ! empty( $attributes['borderColor'] ) ) {
		$border_color = 'var(--wp--preset--color--' . $attributes['borderColor'] . ')';
	} elseif ( ! empty( $attributes['style']['border']['color'] ) ) {
		$border_color = $attributes['style']['border']['color'];
	}

	// Get border width if set.
	$border_width = null;
	if ( ! empty( $attributes['style']['border']['width'] ) ) {
		$border_width = $attributes['style']['border']['width'];
	}

	if ( $border_color || $border_width ) {
		$existing_style = $processor->get_attribute( 'style' ) ?? '';
		$new_styles     = array();

		if ( $border_color ) {
			$new_styles[] = '--wp-block-playlist-border-color: ' . esc_attr( $border_color );
		}
		if ( $border_width ) {
			$new_styles[] = '--wp-block-playlist-border-width: ' . esc_attr( $border_width );
		}

		$new_style = implode( '; ', $new_styles ) . ';';
		if ( $existing_style ) {
			// Ensure existing style ends with semicolon before appending.
			$existing_style = rtrim( $existing_style, '; ' ) . ';';
			$new_style      = $existing_style . ' ' . $new_style;
		}
		$processor->set_attribute( 'style', $new_style );
	}

	return $processor->get_updated_html();
}

/**
 * Registers the `core/playlist` block on server.
 *
 * @since 6.9.0
 */
function register_block_core_playlist() {
	register_block_type_from_metadata(
		__DIR__ . '/playlist',
		array(
			'render_callback' => 'render_block_core_playlist',
		)
	);
}
add_action( 'init', 'register_block_core_playlist' );
