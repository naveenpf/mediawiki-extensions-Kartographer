/* globals module */
/**
 * Utility methods.
 *
 * @alias wikivoyage
 * @class Kartographer.Wikivoyage.wikivoyage
 * @singleton
 */
module.wikivoyage = ( function ( $, mw, undefined ) {

	/*jscs:disable requireVarDeclFirst */
	var tileLayerDefs = {},
		areExternalAllowed,
		windowManager,
		messageDialog,
		STORAGE_KEY = 'mwKartographerExternalSources',
		pathToKartographerImages = mw.config.get( 'wgExtensionAssetsPath' ) +
			'/Kartographer/modules/wikivoyage/images/';

	function getWindowManager() {
		if ( windowManager ) {
			return windowManager;
		}
		messageDialog = new OO.ui.MessageDialog();
		windowManager = new OO.ui.WindowManager();
		$( 'body' ).append( windowManager.$element );
		windowManager.addWindows( [ messageDialog ] );
		return windowManager;
	}

	function alertExternalData() {
		return getWindowManager().openWindow( messageDialog, {
			title: mw.msg( 'kartographer-wv-warning-external-source-title' ),
			message: mw.msg( 'kartographer-wv-warning-external-source-message' ),
			actions: [
				{ label: mw.msg( 'kartographer-wv-warning-external-source-disagree' ), action: 'bad' },
				{
					label: mw.msg( 'kartographer-wv-warning-external-source-agree' ),
					action: 'good'
				}
			]
		} );
	}

	return {
		/**
		 * Adds a tile layer definition to the internal store.
		 *
		 * @param {string} id A unique id to identify the layer.
		 * @param {string} url The tile url.
		 * @param {Object} options
		 * @param {Array} [options.attribs] A list of attributions.
		 * @chainable
		 */
		addTileLayer: function ( id, url, options ) {
			options.wvLayerId = id;
			options.attribution = options.attribution || '';
			$.each( options.attribs, function ( i, attrib ) {
				options.attribution += mw.html.escape( attrib.label ) +
				' <a href="' + mw.html.escape( attrib.url ) + '">' + mw.html.escape( attrib.name ) + '</a>';
			} );

			tileLayerDefs[ id.toString() ] = {
				url: url,
				options: options
			};
			return this;
		},

		createTileLayer: function ( id ) {
			var layerDefs = tileLayerDefs[ id ];
			return {
				layer: new L.TileLayer( layerDefs.url, layerDefs.options ),
				name: this.formatLayerName( layerDefs.options.wvName, layerDefs.options )
			};
		},

		formatLayerName: function ( name, options ) {
			var icon = '';
			options = options || {};
			if ( options.wvIsExternal ) {
				icon = new OO.ui.IconWidget( {
					icon: 'linkExternal',
					iconTitle: mw.msg( 'kartographer-wv-warning-external-source-message' ),
					classes: [ 'leaflet-control-layers-oo-ui-icon' ]
				} );
				icon = icon.$element[ 0 ].outerHTML;
			} else if ( options.wvIsWMF ) {
				icon = mw.html.element( 'img', {
					src: pathToKartographerImages + 'Wikimedia-logo.png',
					srcset: pathToKartographerImages + 'Wikimedia-logo@1.5.png 1.5x, ' +
					pathToKartographerImages + 'Wikimedia-logo@2x.png 2x',
					'class': 'leaflet-control-layers-wm-icon'
				} );
			}
			return mw.html.escape( name ) + '&nbsp;' + icon;
		},

		/**
		 * Checks if the layer is allowed.
		 *
		 * Some layers may load content hosted externally, enabling them shares
		 * the user's data with other sites. This method checks whether the
		 * layer is external and warns the user with a confirmation dialog.
		 * Once the user agrees, a setting with {@link mw.storage} so the user
		 * won't be prompted with a confirmation dialog anymore.
		 *
		 * @param {L.GeoJSON} layer
		 * @return {jQuery.Promise}
		 */
		isAllowed: function ( layer ) {
			var deferred = $.Deferred();

			if ( areExternalAllowed === undefined ) {
				areExternalAllowed = mw.storage.get( STORAGE_KEY ) === '1';
			}

			if ( !layer.options.wvIsExternal || areExternalAllowed ) {
				deferred.resolve();
			} else {
				alertExternalData()
					.then( function ( opened ) {
						opened.then( function ( closing, data ) {
							if ( data && data.action && data.action === 'good' ) {
								areExternalAllowed = true;
								mw.storage.set( STORAGE_KEY, '1' );
								deferred.resolve();
							} else {
								deferred.reject();
							}
						} );
					} );
			}

			return deferred.promise();
		}
	};

} )( jQuery, mediaWiki, module.WVMap );