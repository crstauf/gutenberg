<?php
/**
 * Block Bindings: Support for generically setting rich-text block attributes.
 *
 * @since 7.0
 * @package gutenberg
 * @subpackage Block Bindings
 */

// The following filter can be removed once the minimum required WordPress version is 7.0 or newer.
add_filter(
	'block_bindings_supported_attributes',
	function ( $attributes, $block_type ) {
		if ( 'core/cover' === $block_type ) {
			$attributes[] = 'id';
			$attributes[] = 'url';
		}
		return $attributes;
	},
	10,
	2
);

/**
 * Callback function for the render_block filter.
 *
 * @since 7.0.0
 *
 * @param string   $block_content The block content.
 * @param array    $block         The full block, including name and attributes.
 */
function gutenberg_block_bindings_replace_cover_block_img_src( $block_content, $block, $instance ) {
	$amended_content = new WP_HTML_Tag_Processor( $block_content );
	if ( ! $amended_content->next_tag(
		array(
			'tag_name' => 'img'
		)
	) ) {
		return $block_content;
	}
	$amended_content->set_attribute( 'src', $instance->attributes['url'] );
	return $amended_content->get_updated_html();
}
add_filter( 'render_block_core/cover', 'gutenberg_block_bindings_replace_cover_block_img_src', 10, 3 );