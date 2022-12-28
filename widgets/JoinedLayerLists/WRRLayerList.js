define(['dojo/_base/declare',
    'dijit/_WidgetBase',
    'dijit/_TemplatedMixin',
    'jimu/LayerInfos/LayerInfos',
    'dojo/dom-construct',
    'dojo/dom-class',
    'dojo/dom-style',
    'dojo/dom-attr',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/query',
    'dojo/_base/event',
    'esri/layers/ArcGISDynamicMapServiceLayer',
    'esri/layers/FeatureLayer',
    'esri/layers/CSVLayer',
    'esri/layers/WMSLayer',
    'esri/InfoTemplate',
    'dijit/form/Select',
    'dojo/data/ObjectStore',
    'dojo/store/Memory',
    'jimu/MapManager',
    'jimu/WidgetManager',
	'jimu/BaseWidget',  //FK 2022-12-28 Added this, note the order of where this was added seems to be important
    'dojo/text!./WRRLayerList.html',
    'jimu/dijit/LoadingIndicator',
	'./LayerListView',
	'./NlsStrings',
	'dojo/dom',
	'dojo/_base/array',
	'dojo/_base/html',
"dijit/form/DropDownButton", "dijit/DropDownMenu", "dijit/MenuItem", "./PopupMenu2", "dojo/domReady!"],
function (declare,
	_WidgetBase,
	_TemplatedMixin,
	LayerInfos,
	domConstruct,
	domClass,
	domStyle,
	domAttr,
	lang,
	on,
	query,
	event,
	ArcGISDynamicMapServiceLayer,
	FeatureLayer,
	CSVLayer,
	WMSLayer,
	InfoTemplate,
	Select,
	ObjectStore,
	Memory,
	MapManager,
	WidgetManager,
	BaseWidget, //FK 2022-12-28 Added this
	template,      
	LoadingIndicator,
	LayerListView,
	NlsStrings,
	dom,
	array,
	html,
	DropDownButton, DropDownMenu, MenuItem, PopupMenu2) {
	
	//To create a widget, you need to derive from BaseWidget.
	/* FK 2022-12-28 I added BaseWidget, after trial and error
		of where to put that up in the require/declare this appears
	to be working, but will need some testing*/
	return declare([_WidgetBase, _TemplatedMixin, BaseWidget], { 
		templateString: template,
		loading: null,
		
		////*********
		_denyLayerInfosReorderResponseOneTime: null,
		_denyLayerInfosIsVisibleChangedResponseOneTime: null,
		
		//  A module is responsible for show layers list
		layerListView: null,
		//  operational layer infos
		operLayerInfos: null,
		layerInfo: null,
		
		//methods to communication with app container:
		postCreate: function () {
			this.inherited(arguments);
			console.log('postCreate');
		},
		
		startup: function () {
			///******
			this.inherited(arguments);
			NlsStrings.value = this.nls;
			this._denyLayerInfosReorderResponseOneTime = false;
			this._denyLayerInfosIsVisibleChangedResponseOneTime = false;
			
			if (!this.loading) {
				this.loading = new LoadingIndicator();
			}
			//set up the layer store for this config and then use it
			this.wrrStore = new Memory({ data: this.config.layers });
			this.appConfig.wrrStore = this.wrrStore;
			
			this.loading.placeAt(this.mainDiv);
			this._showLoading();
			
			this.wm = WidgetManager.getInstance();
			
			esri.config.defaults.io.corsDetection = false;
			
			
			///************
			LayerInfos.getInstance(this.map, this.map.itemInfo)
			.then(lang.hitch(this, function(operLayerInfos) {
				this.operLayerInfos = operLayerInfos;
				this.showLayers();
				this.bindEvents();
				dom.setSelectable(this.layersSection, false);
			}));
			
			if (this.appConfig.wrrStore) {
				this.layerStore = this.appConfig.wrrStore;
				this._buildCategoryList(this.appConfig.wrrStore);
			}
			
			console.log('startup');
		},
		
		_buildCategoryList: function (items) {
			//this.WRRLayerListDiv.innerHTML = "";
			this.layerListBody.innerHTML = "";
			
			var categories = this._getCategories(items);
			
			for (var j = 0; j < categories.length; j++) {
				var category = categories[j];
				// var categoryBody = domConstruct.create('div', {
				//     'class': 'category-container control-group collapsible'
				// }, this.layerListBody);
				
				// var categoryTitle = domConstruct.create('h2', {
				//     'class': 'category-title',
				//     'innerHTML': category
				// }, categoryBody);
				
				var categoryTitle = domConstruct.create('h2', {
					'id': 'refReplace',
					'class': 'category-title collapsible',
					'innerHTML': category
				}, this.layerListBody);
				
				var categoryBody = domConstruct.create('div', {
					'class': 'category-container control-group'
				}, this.layerListBody);
				
				var layerObj = items.query({ category: category });
				if (layerObj.length > 0) {
					this._buildLayerList(layerObj, categoryBody);
				}
			}
			
			//collapsible layer code
			var coll = document.getElementsByClassName("collapsible");
			var collapseButton = document.getElementById("collBtn");
			var i;
			
			//code to collapse all layer groups at once
			collapseButton.addEventListener("click", function() {
              	if(collapseButton.innerHTML == "Collapse All Layers"){
              		collapseButton.innerHTML = "Expand All Layers";
					
              		for (i = 0; i < coll.length; i++) {
	              	    var content = coll[i].nextElementSibling;
	              	    if (content.style.maxHeight){
	              	    	coll[i].classList.toggle("active");
	              	      	content.style.maxHeight = null;
						}
					}
					}else{
              		collapseButton.innerHTML = "Collapse All Layers";
					
              		for (i = 0; i < coll.length; i++) {
	              	    var content = coll[i].nextElementSibling;
	              	    if (content.style.maxHeight == ""){
	              	    	coll[i].classList.toggle("active");
	              	      	//increasing height for collapsible layer view by 50px
	              	      	content.style.maxHeight = (content.scrollHeight + 50) + "px";
						}
					}
				}
			});
			
			//code to collapse individual layer groups
			for (i = 0; i < coll.length; i++) {
                coll[i].addEventListener("click", function() {
					this.classList.toggle("active");
					
					var content = this.nextElementSibling;
					if (content.style.maxHeight){
						content.style.maxHeight = null;
						} else {
						//increasing height for collapsible layer view by 50px
						content.style.maxHeight = (content.scrollHeight + 50) + "px";
					} 
					
				});
			}
			
			this._hideLoading();
		},
		
		_buildLayerList: function (items, containerDiv) {
			
			var popupMenuBox = [];
			var popupMenu;
			
			for (var i = 0; i < items.length; i++) {
                var fullID = items[i].wrrID;
                var shortID = items[i].id;
                var layerName = items[i].title;
				var layerInfo = this.operLayerInfos._layerInfos;
				
				
				var layer = this.map.getLayer(fullID);
				if (layer) {
					var layvis = layer.visible;
					var layerContainerDiv = domConstruct.create('div', {
						'class': 'layer-container',
					}, containerDiv);
					
					//var layerDiv = domConstruct.create('label', {
					//      						  'class': 'layer-container control control--checkbox',
					//      						  'innerHTML': layerName
					//      					  }, layerContainerDiv);
					//
					//      					  var layerChk = domConstruct.create('input', {
					//      						  'type': 'checkbox',
					//      						  'checked': layvis,
					//      						  'id': shortID
					//      					  }, layerDiv);
					//
					//      					  var layerIndicator = domConstruct.create('div', {
					//      						  'class': 'control__indicator'
					//      					  }, layerDiv);
					
					//////////////
					
					//						  var layerContainerDiv2 = domConstruct.create('div', {
					//      						'class': 'layer-container',
					//      					  }, containerDiv);
					
					//refLayerNode = query("[class~='layer-tr-node-" + fullID + "']", this.domNode)[0];
					//            			  if(refLayerNode) {
					//							  break;
					//						  }
					var layerTrNodeClass = "layer-tr-node-" + shortID;
					layerTrNode = domConstruct.create('tr', {
						'class': 'jimu-widget-row layer-row ' +
						( /*visible*/ false ? 'jimu-widget-row-selected ' : ' ') + layerTrNodeClass,
						'layerTrNodeId': shortID
					}, layerContainerDiv);
					//						  domConstruct.place(layerTrNode, refLayerNode, 'before');
					
					//  layerTdNode = domConstruct.create('td', {
					// 'class': 'col col1'
					//  }, layerTrNode);
					
					layerTdNode = html.create('div', {
						'class': 'checkbox jimu-float-leading'
					}, layerTrNode);
					
					var layerChk = domConstruct.create('input', {
						'type': 'checkbox',
						'checked': layvis,
						'id': shortID
					}, layerTdNode);
					
					//var layerIndicator = domConstruct.create('div', {
					//      						  'class': 'control__indicator'
					//      					  }, layerTdNode);
					
					var layerTitleTdNode = domConstruct.create('td', {
						'class': 'col col2'
					}, layerTrNode);
					
					// var layerDiv = domConstruct.create('label', {
					// 				  'class': 'layer-container control control--checkbox',
					// 				  'innerHTML': layerName
					// 			  }, layerTitleTdNode);
					
					var grayedTitleClass = '';
					if (!layer.visibleAtMapScale) {
						grayedTitleClass = 'grayed-title';
					}
					
					var layerTitleDivIdClass = 'layer-title-div-' + fullID;
					var layerDiv = domConstruct.create('div', {
						'class': layerTitleDivIdClass+' div-content control control--checkbox '+grayedTitleClass,
						'innerHTML': layerName
					}, layerTitleTdNode);
					
					layerTdNode = domConstruct.create('td', {
						'class': 'col col3'
					}, layerTrNode);
					
					var popupMenuDisplayStyle = this.hasContentMenu() ? "display: block" : "display: none";
					// add popupMenu
					var popupMenuNode = domConstruct.create('div', {
						'class': 'layers-list-popupMenu-div',
						'style': popupMenuDisplayStyle,
						'id': fullID
					}, layerTdNode);
					
					popupMenuBox.push(popupMenuNode);
					
					this.own(on((popupMenuNode, layerTrNode), 'click', lang.hitch(this, function (evt) {
						var layerID = evt.target.id;
						if(!layerID){
							layerID = evt.target.offsetParent.id;
						}
						var popp = popupMenuBox;
						//alert('save');
						if(!evt.target.offsetParent.popupMenu){
							popupMenu = evt.target.popupMenu;
							}else{
							popupMenu = evt.target.offsetParent.popupMenu;
						}
						if(!popupMenu) {
							for (var k = 0; k < layerInfo.length; k++) {
								if(layerInfo[k].id == layerID){
									popupMenu = new PopupMenu2({
										//items: layerInfo.popupMenuInfo.menuItems,
										_layerInfo: layerInfo[k],
										box: this.domNode.parentNode,
										popupMenuNode: popupMenuNode,
										layerListWidget: this,
										_config: this.config
									}).placeAt(evt.target);
									evt.target.popupMenu = popupMenu;
									this.own(on(popupMenu,
										'onMenuClick',
									lang.hitch(this, this._onPopupMenuItemClick, layerInfo[k], popupMenu)));
								}
							}
						}
						
						this.layerListView._changeSelectedLayerRow(layerTrNode);
						if (popupMenu && popupMenu.state === 'opened') {
							popupMenu.closeDropMenu();
							} else {
							this._hideCurrentPopupMenu();
							if (popupMenu) {
								this.currentPopupMenu = popupMenu;
								popupMenu.openDropMenu();
							}
						}
						console.log(evt);
						
						//hidden operation mene if that is opened.
						if (this.operationsDropMenu && this.operationsDropMenu.state === 'opened') {
							this.operationsDropMenu.closeDropMenu();
						}
						evt.stopPropagation();
					})));
					
					this.own(on(layerChk, 'change', lang.hitch(this, function (evt) {
						var layerId = evt.target.id;
						var vis = evt.target.checked || false;
						var checkStatus = evt.target.checked
						var layerObj = this.layerStore.query({ id: layerId });
						if (layerObj.length > 0) {
							var layer = this.map.getLayer(layerObj[0].wrrID);
							if (layer) {
								layer.setVisibility(vis);
							}
							/*FK Pure testing 2022-12-16 need to replace*/
							/*maybe we need to import esri/layers/FeatureLayer.... (nevermind, it's there already*/
							/*Uncomment when re-testing*/
							/*This was nice, but the WRR layer list doesn't have the website*/
							
							/*Is there a way we can get the config file based on the state*/
							/*You might want to try https://stackoverflow.com/questions/34789321/js-read-json-file-and-use-as-an-object
							and see what we can do*/
							/*else
								{
								var testMap = this.map;
								var Frank = testMap.layers;
								var testLayer = new FeatureLayer(
								"https://services.arcgis.com/QVENGdaPbd4LUkLV/arcgis/rest/services/USFWS_Critical_Habitat/FeatureServer/0"
								);
								this.map.addLayer(testLayer);
							}*/
						}
						/*FK 2022-12-28, broadcast message if we uncheck a box over here, I want to pass
							a message that says the layer is turned off and the layer ID, so LayerListView
						can hide this layer*/
						if (checkStatus == false)
						{
							this.publishData({
								message: 'Hide layer - WRR call',
								layerID: layer.id
							});
						}
					})));
					
					this.own(on(layer, 'visibility-change', lang.hitch(this, function (evt) {
						var layerName = evt.target.id;
						var layObj = this.layerStore.query({ wrrID: layerName });
						if (layObj && layObj.length > 0) {
							var chkBox = dojo.byId(layObj[0].id);
							/*FK 2022-12-28, EPA requested a change on how this works,
								I'm keeping this line because one it's very basic, just turn
								on and off the layer based on visibility-change and two, I 
							can see someone changing their minds on this */
							//chkBox.checked = evt.visible;
						}
						console.log('layer vis change');
					})));
					}
					}
			},
			
			//////Start of functions with LayerListView///////
			
			_hideCurrentPopupMenu: function() {
				if (this.currentPopupMenu && this.currentPopupMenu.state === 'opened') {
				this.currentPopupMenu.closeDropMenu();
			}
		},
		
		
		_onPopupMenuItemClick: function(layerInfo, popupMenu, item, data) {
			var evt = {
				itemKey: item.key,
				extraData: data,
				layerListWidget: this,
				layerListView: this.layerListView
			},
			result;
			
			// window.jimuNls.layerInfosMenu.itemTransparency NlsStrings.value.itemTransparency
			if (item.key === 'transparency') {
				if (domStyle.get(popupMenu.transparencyDiv, 'display') === 'none') {
					popupMenu.showTransNode(layerInfo.getOpacity());
					} else {
					popupMenu.hideTransNode();
				}
				} else {
				result = popupMenu.popupMenuInfo.onPopupMenuClick(evt);
				if (result.closeMenu) {
					popupMenu.closeDropMenu();
				}
			}
		},
		
		hasContentMenu: function() {
			var hasContentMenu = false;
			var item;
			if(this.config.contextMenu) {
				for (item in this.config.contextMenu) {
					if(this.config.contextMenu.hasOwnProperty(item) &&
						(typeof this.config.contextMenu[item] !== 'function')) {
						hasContentMenu = hasContentMenu || this.config.contextMenu[item];
					}
				}
				} else {
				hasContentMenu = true;
			}
			return hasContentMenu;
		},
		
		
		
		
		
		destroy: function() {
			this._clearLayers();
			this.inherited(arguments);
		},
		
		showLayers: function() {
			// summary:
			//    create a LayerListView module used to draw layers list in browser.
			this.layerListView = new LayerListView({
				operLayerInfos: this.operLayerInfos,
				layerListWidget: this,
				config: this.config
			}).placeAt(this.layerListBody);
		},
		
		_clearLayers: function() {
			// summary:
			//   clear layer list
			//domConstruct.empty(this.layerListTable);
			if (this.layerListView && this.layerListView.destroyRecursive) {
				this.layerListView.destroyRecursive();
			}
		},
		
		
		/****************
			* Event
		***************/
		bindEvents: function() {
			// summary:
			//    bind events are listened by this module
			this.own(on(this.operLayerInfos,
				'layerInfosChanged',
			lang.hitch(this, this._onLayerInfosChanged)));
			
			this.own(on(this.operLayerInfos,
				'tableInfosChanged',
			lang.hitch(this, this._onTableInfosChanged)));
			
			this.own(this.operLayerInfos.on('layerInfosIsVisibleChanged',
			lang.hitch(this, this._onLayerInfosIsVisibleChanged)));
			
			this.own(on(this.operLayerInfos,
				'updated',
			lang.hitch(this, this._onLayerInfosObjUpdated)));
			
			this.own(on(this.operLayerInfos,
				'layerInfosReorder',
			lang.hitch(this, this._onLayerInfosReorder)));
			
			this.own(on(this.map,
				'zoom-end',
			lang.hitch(this, this._onZoomEnd)));
			
			this.own(on(this.operLayerInfos,
				'layerInfosRendererChanged',
			lang.hitch(this, this._onLayerInfosRendererChanged)));
			
			this.own(on(this.operLayerInfos,
				'layerInfosOpacityChanged',
			lang.hitch(this, this._onLayerInfosOpacityChanged)));
		},
		
		
		_onLayerInfosChanged: function(layerInfo, changedType) {
			//this._refresh();
			
			if(changedType === "added") {
				var allLayers = this.map.layerIds.concat(this.map.graphicsLayerIds);
				
				var layerIndex = array.indexOf(allLayers, layerInfo.id);
				//replaces the title with "Found Opportunities"
				if(layerInfo.title.indexOf("Found Opportunities") != -1){
					layerInfo.title = "Found Opportunities";
				}
				var refLayerId = null;
				var refLayerNode = null;
				for(var i = layerIndex - 1; i >= 0; i--) {
					refLayerId = allLayers[i];
					refLayerNode = query("[class~='layer-tr-node-" + refLayerId + "']", this.domNode)[0];
					if(refLayerNode) {
						break;
					}
				}
				if(refLayerNode) {
					this.layerListView.drawListNode(layerInfo, 0, refLayerNode, 'before');
					} else {
					this.layerListView.drawListNode(layerInfo, 0, this.layerListView.layerListTable);
				}
				} else {
				this.layerListView.destroyLayerTrNode(layerInfo);
			}
		},
		
		_onTableInfosChanged: function(tableInfoArray, changedType) {
			if(changedType === "added") {
				array.forEach(tableInfoArray, function(tableInfo) {
					this.layerListView.drawListNode(tableInfo, 0, this.layerListView.tableListTable);
				}, this);
				} else {
				array.forEach(tableInfoArray, function(tableInfo) {
					this.layerListView.destroyLayerTrNode(tableInfo);
				}, this);
			}
		},
		
		_onLayerInfosReorder: function() {
			if(this._denyLayerInfosReorderResponseOneTime) {
				// denies one time
				this._denyLayerInfosReorderResponseOneTime = false;
				} else {
				this._refresh();
			}
		},
		
		_onLayerInfosRendererChanged: function(changedLayerInfos) {
			try {
				array.forEach(changedLayerInfos, function(layerInfo) {
					this.layerListView.redrawLegends(layerInfo);
				}, this);
				} catch (err) {
				this._refresh();
			}
		},
		
		_onLayerInfosObjUpdated: function() {
			this._refresh();
		},
		
		_onZoomEnd: function() {
			this.operLayerInfos.traversal(lang.hitch(this, function(layerInfo) {
				query("[class~='layer-title-div-" + layerInfo.id + "']", this.domNode)
				.forEach(function(layerTitleDivIdDomNode) {
					try {
						if (layerInfo.isInScale()) {
							html.removeClass(layerTitleDivIdDomNode, 'grayed-title');
							} else {
							html.addClass(layerTitleDivIdDomNode, 'grayed-title');
						}
						} catch (err) {
						console.warn(err.message);
					}
				}, this);
			}));
		},
		
		_onLayerInfosOpacityChanged: function(changedLayerInfos) {
			array.forEach(changedLayerInfos, function(layerInfo) {
				var opacity = layerInfo.layerObject.opacity === undefined ? 1 : layerInfo.layerObject.opacity;
				var contentDomNode = query("[layercontenttrnodeid='" + layerInfo.id + "']", this.domNode)[0];
				query(".legends-div.jimu-legends-div-flag img", contentDomNode).style("opacity", opacity);
			}, this);
		},
		
		//////End of functions with LayerListView///////
		
		_onPopupMenuClick: function(layerID, popupMenuNode, evt) {
			console.log(layerID);
			var layerObj = this.layerStore.query({ id: layerID });
			if (layerObj.length > 0) {
				var layer = this.map.getLayer(layerObj[0].wrrID);
				console.log(layer);
			}			  
		},		  
		
		_getCategories: function (items) {
			var categoryArray = [];
			for (var j = 0; j < items.data.length; j++) {
				if (categoryArray.indexOf(items.data[j].category) == -1) {
					categoryArray.push(items.data[j].category);
				}
			}
			return categoryArray;
		},
		
		
		_changeSelectedLayerRow: function (layerTrNode) {
			if (this._currentSelectedLayerRowNode && this._currentSelectedLayerRowNode === layerTrNode) {
				return;
			}
			if (this._currentSelectedLayerRowNode) {
				domClass.remove(this._currentSelectedLayerRowNode, 'jimu-widget-row-selected');
			}
			domClass.add(layerTrNode, 'jimu-widget-row-selected');
			this._currentSelectedLayerRowNode = layerTrNode;
		},
		
		_getObjectByVal: function (obj, prop, val) {
			var keys = [];
			
			for (var key in obj) {
				if (obj[key].hasOwnProperty(prop) && obj[key][prop] === val) {
					keys.push(obj[key]);
				}
			}
			
			return keys;
		},
		_showLoading: function () {
			//domStyle.set(this.llESRI, "display", "none");
			domStyle.set(this.layerContainer, "display", "none");
			this.loading.show();
		},
		_hideLoading: function () {
			//domStyle.set(this.llESRI, "display", "block");
			domStyle.set(this.layerContainer, "display", "block");
			this.loading.hide();
		}
		
	});
	
	
});												