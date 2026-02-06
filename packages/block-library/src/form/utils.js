/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

export const formSubmissionNotificationSuccess = [
	'core/form-submission-notification',
	{
		type: 'success',
	},
	[
		[
			'core/paragraph',
			{
				content:
					'<span style="color:#345C00" class="has-inline-text-color">' +
					__( 'Your form has been submitted successfully' ) +
					'</span>',
			},
		],
	],
];
export const formSubmissionNotificationError = [
	'core/form-submission-notification',
	{
		type: 'error',
	},
	[
		[
			'core/paragraph',
			{
				content:
					'<span style="color:#CF2E2E" class="has-inline-text-color">' +
					__( 'There was an error submitting your form.' ) +
					'</span>',
			},
		],
	],
];
