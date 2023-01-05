"use strict";
// 本页面大部分内容均直接或间接修改自[[MW:Extension:CodeMirror]]
$.when($.ready, mw.loader.using( 'oojs-ui-core' )).then(function() {
	if (!['edit', 'submit'].includes( mw.config.get('wgAction') ) ||
		mw.config.get('wgPageContentModel') != 'wikitext') { return; }

	var cm, $doc, state = JSON.parse( localStorage.getItem( 'wikieditor-codemirror' ) );
	const $textarea = $('#wpTextbox1'),
		isAdvanced = ['loading', 'loaded', 'executing', 'ready'].includes( mw.loader.getState( 'ext.wikiEditor' ) ),
		ns = mw.config.get( 'wgNamespaceNumber' ),
		init = function() {
		mw.loader.load('//fastly.jsdelivr.net/npm/codemirror@5.65.1/lib/codemirror.min.css', 'text/css');
		mw.loader.load('//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.6/mediawiki.min.css', 'text/css');
		mw.loader.addStyleTag( '#wikiEditor-ui-toolbar .menu { position: relative; z-index: 5; }' +
			'.CodeMirror pre { font-family: Monaco, Menlo, "Ubuntu Mono", Consolas, "source-code-pro", monospace; }' +
			'.skin-vector #wpTextbox1:not([readonly]) + .CodeMirror { font-size: 13px; line-height: 1.5; }' +
			'#wpTextbox1[readonly] + .CodeMirror,' +
			'.skin-minerva #wpTextbox1 + .CodeMirror { font-size: 16px; line-height: 1.2; border: 1px solid #c8ccd1; }' +
			'.CodeMirror-matchingbracket { box-shadow: 0 0 0 2px #9aef98; }' +
			'.CodeMirror-nonmatchingbracket { box-shadow: 0 0 0 2px #eace64; }'
		);
		const $search = $('.group-search a'),
			getExt = $.get({ dataType: 'script', cache: true,
			url: '//fastly.jsdelivr.net/combine/npm/codemirror@5.65.1/lib/codemirror.min.js,npm/codemirror@5.65.1/addon/edit/matchbrackets.min.js,npm/wikiplus-highlight@2.22/matchtags.min.js'
		}).then(function() {
			return Promise.all([ $.get({ dataType: 'script', cache: true,
				url: '//fastly.jsdelivr.net/gh/bhsd-harry/codemirror-mediawiki@1.1.6/mediawiki.min.js'
			}) ].concat(ns == 274 ? [ $.get({ dataType: 'script', cache: true,
				url: '//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/javascript/javascript.min.js'
			}), $.get({ dataType: 'script', cache: true,
				url: '//fastly.jsdelivr.net/npm/codemirror@5.65.1/mode/css/css.min.js'
			}) ] : []));
		}),
			getJSON = $.get({ dataType: 'json', cache: true,
			url: '//fastly.jsdelivr.net/gh/bhsd-harry/LLWiki@2.16/otherwiki/gadget-CodeMirror.json'
		}).then(function(config) {
			if (ns == 274) {
				$.extend( config.tags, {script: true, style: true} );
				$.extend( config.tagModes, {script: 'javascript', style: 'css'} );
			}
			window.mwConfig = config;
		});
		return Promise.all([getJSON, getExt]).then(function() {
			if (isAdvanced) {
				cm = new CodeMirror( $textarea.parent()[0], { mode: 'text/mediawiki', mwConfig: window.mwConfig,
					lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop( 'readonly' ),
					matchBrackets: {bracketRegex: /[{}[\]]/}, matchTags: true
				} );
			} else {
				cm = CodeMirror.fromTextArea( $textarea[0], { mode: 'text/mediawiki', mwConfig: window.mwConfig,
					lineWrapping: true, lineNumbers: true, readOnly: $textarea.prop( 'readonly' ),
					matchBrackets: {bracketRegex: /[{}[\]]/}, matchTags: true
				} );
				cm.setSize( null, $textarea.height() );
			}
			mw.hook( 'wiki-codemirror' ).fire( cm );
			$doc = $(cm.getWrapperElement());
			$.valHooks.textarea = {
				get: function(ele) { return ele === $textarea[0] && state ? cm.getValue() : ele.value; },
				set: function(ele, val) { ele === $textarea[0] && state ? cm.setValue( val ) : ele.value = val; }
			};
			if (mw.loader.getState( 'jquery.ui.resizable' ) == 'ready') { $doc.resizable( {handles: 's'} ); }
			if ($search.length === 0) { return; }
			cm.addKeyMap({'Ctrl-F': function() { $search.click(); }, 'Cmd-F': function() { $search.click(); }});
		});
	};
	if (state === null || !isAdvanced) { state = true; }
	if (!isAdvanced) {
		init();
		return;
	}
	const $form = $(document.editform),
		btn = new OO.ui.ButtonWidget({ classes: ['tool'], icon: 'highlight', framed: false, title: '代码高亮开关'})
			.on('click', function() {
			if(cm) {
				$doc.toggle();
				update();
			} else { initAndUpdate(); }
		}),
		fn = { getSelection: function() { return cm.getSelection(); },
		setSelection: function(options) {
			cm.setSelection( cm.posFromIndex( options.start ), cm.posFromIndex( options.end ) );
			cm.focus();
			return this;
		},
		getCaretPosition: function(options) {
			const caretPos = cm.indexFromPos( cm.getCursor( 'from' ) ),
				endPos = cm.indexFromPos( cm.getCursor( 'to' ) );
			if (options.startAndEnd) { return [caretPos, endPos]; }
			return caretPos;
		},
		scrollToCaretPosition: function() {
			cm.scrollIntoView();
			return this;
		}
	},
		submit = function() { $textarea[0].value = cm.getValue(); },
		shared = function() {
		btn.$element.toggleClass( 'tool-active' );
		if (state) {
			cm.setValue( $textarea[0].value );
			cm.setSize( null, $textarea.height() );
		} else { $textarea[0].value = cm.getValue(); }
		$textarea.toggle();
		$form[ state ? 'on' : 'off' ]('submit', submit);
		if ($textarea.textSelection) {
			$textarea.textSelection(state ? 'register' : 'unregister', fn);
		}
	},
		update = function() {
		state = !state;
		localStorage.setItem( 'wikieditor-codemirror', state );
		shared();
	},
		initAndUpdate = function() { init().then( update ); },
		group = $('#wikiEditor-section-main > .group-insert')[0];
	$textarea.on( 'wikiEditor-toolbar-doneInitialSections', function() {
		btn.$element.appendTo( '#wikiEditor-section-main > .group-insert' );
	} );
	if (group && !group.contains( btn.$element[0] )) {
		$textarea.trigger( 'wikiEditor-toolbar-doneInitialSections' );
	}
	if (state) { mw.loader.using( 'ext.wikiEditor' ).then( init ).then( shared ); }
});
