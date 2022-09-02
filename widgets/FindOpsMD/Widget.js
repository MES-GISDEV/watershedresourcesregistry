define(['dojo/_base/declare', 'dojo/_base/lang', 'dojo/_base/html', 'jimu/BaseWidget', 'dojo/on', 'dojo/promise/all', 'dojo/Deferred', 'jimu/dijit/LoadingShelter', 'esri/geometry/jsonUtils',
    'esri/toolbars/draw', 'esri/tasks/query', 'esri/tasks/QueryTask', 'esri/tasks/GeometryService', 'esri/graphic', 'esri/layers/GraphicsLayer', "esri/request", "dijit/form/DateTextBox", 'esri/SpatialReference',
    'esri/tasks/IdentifyTask', 'esri/tasks/IdentifyParameters', 'esri/tasks/DistanceParameters', 'esri/symbols/PictureMarkerSymbol', 'dojo/dom-construct', 'dojo/query',
    'esri/renderers/SimpleRenderer', 'esri/symbols/SimpleMarkerSymbol', 'esri/symbols/SimpleLineSymbol', 'esri/symbols/SimpleFillSymbol', 'esri/Color', 'esri/layers/FeatureLayer',
    'esri/geometry/Circle', 'esri/units', 'jimu/WidgetManager', 'jimu/LayerInfos/LayerInfos'],
  function (declare, lang, html, BaseWidget, on, all, Deferred, LoadingShelter, geometryJsonUtils,
      Draw, Query, QueryTask, GeometryService, Graphic, GraphicsLayer, esriRequest, Calendar, SpatialReference,
      IdentifyTask, IdentifyParameters, DistanceParameters, PictureMarkerSymbol, domConstruct, djQuery,
      SimpleRenderer, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, Color, FeatureLayer,
      Circle, Units, WidgetManager, LayerInfos) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-findOpsMD',

      //this property is set by the framework when widget is loaded.
      name: 'FindOpsMD',
      graphicsLayer: null,
      opsLayer: null,
      visitsLayer: null,

      //methods to communication with app container:
       postCreate: function() {
           this.inherited(arguments);

           this.wm = WidgetManager.getInstance();

           this.attributeTableWid = this.wm.getWidgetByLabel("Attribute Table");

           LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (layerInfosObject) {
               this.layerInfoObj = layerInfosObject;
               this.layerInfoArray = layerInfosObject.getLayerInfoArray();
               this.own(this.layerInfoObj.on('layerInfosChanged', lang.hitch(this, this._onLayerInfosChanged)));
           }));

           console.log('postCreate');
       },

       startup: function() {
           this.inherited(arguments);

           this._setAllDropdownData();
           this._addDateControls();
           this._createModelChoice();

           on(this.selectLocation, 'click', lang.hitch(this, function (evt) {
               this.loading.show();
               this._createFindOps();
           }));

           on(this.searchAssessBtn, 'click', lang.hitch(this, function (evt) {
               this.loading.show();
               this._createFindSiteVisits();
           }));

           this.loading = new LoadingShelter({
               hidden: true
           });
           this.loading.placeAt(this.findDiv);
           console.log('startup');
       },
	   
	   _wtrShedChange: function(evt){
		   switch(evt.target.value){
		   	case("fedhuc8"):
				this._setMDDropdowns(this.fedHuc8Data, 'COUNTY', 'HUC8', 'Name');
				break;
			case("fedhuc12"):
				this._setMDDropdowns(this.fedHuc12Data, 'NAME_1', 'HUC12', 'Name');
				break;
			case("mdhuc8"):
				this._setMDDropdowns(this.mdHuc8Data, 'COUNTY', 'mde8digt', 'mde8name');
				break;			
		   }	   },

       _toggleAddLocation: function () {
           if (html.hasClass(this.selectLocation, 'jimu-state-active')) {
               this.map.setInfoWindowOnClick(true);
               html.removeClass(this.selectLocation, 'jimu-state-active');
               this.toolbar.deactivate();
           } else {
               this.toolbar.activate(Draw.POINT);
               html.addClass(this.selectLocation, 'jimu-state-active');
               this.map.setInfoWindowOnClick(false);
           }

       },
		_setAllDropdownData: function(){
			fedHuc8 =  esriRequest({
               url: "https://gis.menv.com/server/rest/services/WRR/WatershedsHUC12/MapServer/4/query?where=1=1&outFields=COUNTY%2C+HUC8%2C+Name&orderByFields=COUNTY&returnGeometry=false&returnDistinctValues=true&f=json",
               handleAs: "json",
               callbackParamName: "callback"
           }, {
               useProxy: false
           }); 
			fedHuc12 =  esriRequest({
               url: "https://gis.menv.com/server/rest/services/WRR/WatershedsHUC12/MapServer/3/query?where=STATE_NAME=%27Maryland%27&outFields=NAME_1%2C+HUC12%2C+Name&orderByFields=NAME_1&returnGeometry=false&returnDistinctValues=true&f=json",
               handleAs: "json",
               callbackParamName: "callback"
           }, {
               useProxy: false
           });
			mdHuc8 =  esriRequest({
               url: "https://gis.menv.com/server/rest/services/WRR/WatershedsHUC12/MapServer/5/query?where=1=1&outFields=COUNTY%2C+mde8digt%2C+mde8name&orderByFields=COUNTY&returnGeometry=false&returnDistinctValues=true&f=json",
               handleAs: "json",
               callbackParamName: "callback"
           }, {
               useProxy: false
           });
			promises = all([fedHuc8, fedHuc12, mdHuc8]).then(lang.hitch(this, function(result){
				this.fedHuc8Data = result[0];
				this.fedHuc12Data = result[1];
				this.mdHuc8Data = result[2];
				this._setSADropdowns(this.fedHuc12Data);
				this._setMDDropdowns(this.fedHuc12Data, 'NAME_1', 'HUC12', 'Name');
				console.log('here');
			}), function (error) {
               console.log("error: ", error.message);
           });
		},
		_setSADropdowns: function(data){
		    //get the list
		   this.countyData = data.features;
		   domConstruct.empty(this.ddlSAWatershed);			   
		   var tempArray = [];
		   			   
		   //put the watershed values into the watershed box
		   domConstruct.place("<option value='all'>All Watersheds</option>", this.ddlSAWatershed)		   
		   for (var i = 0; i < this.countyData.length; i++) {
			   tempArray.push(this.countyData[i].attributes.NAME_1);

		   }
		   function compare(a,b) {
			  if (a.attributes.Name < b.attributes.Name)
				return -1;
			  if (a.attributes.Name > b.attributes.Name)
				return 1;
			  return 0;
		   }	
		   //remove the duplicate values from the array
		   tempArray = tempArray.reverse().filter(function (e, i, tempArray) {
			   return tempArray.indexOf(e, i + 1) === -1;
		   }).reverse();
		   //put the unique values into the combobox
		   for (var j = 0; j < tempArray.length; j++) {
		   	   domConstruct.place("<option value='" + tempArray[j] + "'>" + tempArray[j] + "</option>", this.ddlCounty);			   
			   domConstruct.place("<option value='" + tempArray[j] + "'>" + tempArray[j] + "</option>", this.ddlSACounty);
		   }
		   this.countyData.sort(compare);
		   var tempCompareList = [];
		   for (var i = 0; i < this.countyData.length; i++) {
			   if (tempCompareList.indexOf(this.countyData[i].attributes.HUC12) === -1){
			   	domConstruct.place("<option value='" + this.countyData[i].attributes.HUC12 + "'>" + this.countyData[i].attributes.Name + ": " + this.countyData[i].attributes.HUC12 + "</option>", this.ddlSAWatershed);
				tempCompareList.push(this.countyData[i].attributes.HUC12)
			   }

		   }		   
			on(this.ddlSACounty, "change", lang.hitch(this, function (evt) {
			   domConstruct.empty(this.ddlSAWatershed);
			   domConstruct.place("<option value='all'>All Watersheds</option>", this.ddlSAWatershed);
			   var tempCompareList = [];
			   for (var k = 0; k < this.countyData.length; k++) {
				  if (evt.currentTarget.value == this.countyData[k].attributes.NAME_1 || evt.currentTarget.value == "all") {
				   	if (tempCompareList.indexOf(this.countyData[k].attributes.HUC12) === -1){					   
					   	domConstruct.place("<option value='" + this.countyData[k].attributes.HUC12 + "'>" + this.countyData[k].attributes.Name + ": " + this.countyData[k].attributes.HUC12 + "</option>", this.ddlSAWatershed);
						tempCompareList.push(this.countyData[k].attributes.HUC12);
				  	 }
				  }
			   }
		   }));
		},
       _setMDDropdowns: function(data, countyField, wshField, nameField){ 
           //get the list
		   this.countyData = data.features;
		   this.wshField = wshField;
		   var ddlCounty = this.ddlCounty;
		   var ddlWatershed = this.ddlWatershed;
		   domConstruct.empty(this.ddlWatershed);
		   var tempArray = [];
		   //put the watershed values into the watershed box
		   domConstruct.place("<option value='all'>All Watersheds</option>", this.ddlWatershed)		   
		   for (var i = 0; i < this.countyData.length; i++) {		
			   tempArray.push(this.countyData[i].attributes[countyField]);
		   }

		   function compare(a,b) {
			  if (a.attributes[nameField] < b.attributes[nameField])
				return -1;
			  if (a.attributes[nameField] > b.attributes[nameField])
				return 1;
			  return 0;
		   }		   

		   //remove the duplicate values from the array
		   tempArray = tempArray.reverse().filter(function (e, i, tempArray) {
			   return tempArray.indexOf(e, i + 1) === -1;
		   }).reverse();

		   //put the unique values into the combobox
		   for (var j = 0; j < tempArray.length; j++) {
		   		//domConstruct.place("<option value='" + tempArray[j] + "'>" + tempArray[j] + "</option>", this.ddlCounty);
		   }
		   if (this.ddCountyEvent){
		   	this.ddCountyEvent.remove();
		   }
		   console.log(this.ddlCounty.value);
		   this.countyData.sort(compare);
		   var tempCompareList = [];
		   for (var i = 0; i < this.countyData.length; i++) {
			if (this.ddlCounty.value == "all" || this.ddlCounty.value == this.countyData[i].attributes[countyField]){	
				if (tempCompareList.indexOf(this.countyData[i].attributes[wshField]) === -1){		
			   		domConstruct.place("<option value='" + this.countyData[i].attributes[wshField] + "'>" + this.countyData[i].attributes[nameField] + ": " + this.countyData[i].attributes[wshField] + "</option>", this.ddlWatershed);
					tempCompareList.push(this.countyData[i].attributes[wshField]);
				}
			}
		   }		   
		   this.ddCountyEvent = on(this.ddlCounty, "change", lang.hitch(this, function (evt) {
			   domConstruct.empty(this.ddlWatershed);
			   domConstruct.place("<option value='all'>All Watersheds</option>", this.ddlWatershed);
			   var tempCompareList = [];
			   for (var k=0; k < this.countyData.length; k++){
				   if (evt.currentTarget.value == this.countyData[k].attributes[countyField] || evt.currentTarget.value == "all") {
					   if (tempCompareList.indexOf(this.countyData[k].attributes[wshField]) === -1){		
					   		domConstruct.place("<option value='" + this.countyData[k].attributes[wshField] + "'>" + this.countyData[k].attributes[nameField] + ": " + this.countyData[k].attributes[wshField] + "</option>", this.ddlWatershed);
							tempCompareList.push(this.countyData[k].attributes[wshField]);
					   }
				   }
			   }
			   this.ddlWatershed.value = "all"
		   }));
		   this.ddlWatershed.value = "all";
       },

       _createModelChoice: function(){
           for (var i = 0; i < this.config.modelItems.length; i++) {
               var choiceDiv = domConstruct.create("div", {
                   "class": "radioClass"
               })
               var choice = domConstruct.create("input", {
                   "type": "radio",
                   "name": "model",
                   "value": "model" + i
               });
               if (i == 0) {
                   choice.checked = true;
               };
               domConstruct.place(choice, choiceDiv);
               var radioLabel = domConstruct.create("label", {
                   "for": "model" + i,
                   "innerHTML": this.config.modelItems[i].name
               });
               domConstruct.place(radioLabel, choiceDiv);
               domConstruct.place(choiceDiv, this.radioSelect);
           }
       },

       _addDateControls: function () {
           new Calendar({
			   id: 'startDate',
               value: new Date()
           }, this.startDate).startup();
           new Calendar({
			   id: 'endDate',		   
               value: new Date()
           }, this.endDate).startup();
       },

       _queryLayer: function (queryTask, query, type, layerName, layerID) {
           var deferred = new Deferred();
           queryTask.execute(query, function (results) {
               var obj = {};
               obj['layerName'] = type;
               obj['layerId'] = layerName;
               obj['layerURL'] = queryTask.url;
               obj['result'] = results;
               deferred.resolve(obj);
           }, function (error) {
               var obj = {};
               obj['layerName'] = type;
               obj['error'] = error;
               deferred.resolve(obj);
           });
           return deferred.promise;
       },

       _createFindOps: function(){
           var query = new Query();
           var modelNum = djQuery('input[type=radio][name=model]:checked')[0].value.replace("model", "");
           
           //get model layer and field to use in the query task based on radio selected, if nothing selected alert and leave
           var modelURL = this.config.modelItems[parseInt(modelNum)].url;
           var modelField = this.config.gridcodeField;
           var watershedField = this.config.watershedField;

           if (modelURL != "") {
               var qTaskURL = modelURL;
               var queryTask = new QueryTask(qTaskURL);
               var query = new Query();
               var qWhere = "";
               var dirty = (new Date()).getTime();
               qWhere += dirty + "=" + dirty;
               //get county part of query
               if (this.ddlCounty.value != "all") {
                   if (qWhere != "")
                       qWhere += " AND ";
                   //remove characters not found in model layers for query
                   var countyVar = this.ddlCounty.value.replace("'", "''");
                   qWhere += "County = '" + countyVar + "'";
               }
               //get watershed part of query
               if (this.ddlWatershed.value != "all") {				   
                   if (qWhere != "")
                       qWhere += " AND ";
					var wshdVal = this.ddlWatershed.value;
					if (wshdVal.length < 8){
						wshdVal = padWithZeros(this.ddlWatershed.value, 8)
					}
					if (this.wshField == "HUC12"){
						this.wshField = "HUC_12";
					}
					qWhere += this.wshField + " = '" + wshdVal + "'";
               }
			   function padWithZeros(number, length) {
					var wshString = '' + number;
					while (wshString.length < length) {
						wshString = '0' + wshString;
					}
					return wshString;
				}
               //score part of query and change symbol dropdown to appropriate symbols
               var scoreBtn = djQuery('input[type=radio][name=score]:checked');
               if (scoreBtn.length > 0) {
                   if (qWhere != "")
                       qWhere += " AND ";
                   var scoreOp = this.ddlScore.value;
                   scoreOp = scoreOp.replace("eq", "=").replace("lt", "<").replace("gt", ">");
                   qWhere += modelField + scoreOp + scoreBtn[0].value;
               } else {
                   if (qWhere != "")
                       qWhere += " AND ";
                   qWhere += modelField + " > 0";
               }
               //if acres greater than selected
               if (this.ddlAcresGreater.value != "any") {
                   if (qWhere != "")
                       qWhere += " AND ";
                   qWhere += "ACRES > " + this.ddlAcresGreater.value;
               }
               //if acres less than selected
               if (this.ddlAcresLess.value != "any") {
                   if (qWhere != "")
                       qWhere += " AND ";
                   qWhere += "ACRES < " + this.ddlAcresLess.value;
               }

               var lay = this.map.getLayer("opsQLayer");
               if (lay) {
                   this.map.removeLayer(lay);
               }
               var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([37, 111, 91, 0.5]), 2), new Color([111, 167, 152, 0.50]));
               layer = new FeatureLayer(modelURL, {
                   id: "opsQLayer",
                   outFields: ["OBJECTID", "GRIDCODE", "ACRES"],
                   definitionExpression: qWhere
               });
               var renderer = new SimpleRenderer(symbol);
               layer.setRenderer(renderer);

               layer.name = "Found Opportunities";
               this.map.addLayer(layer);

               var q = new Query();
               q.where = qWhere;
               layer.queryExtent(q, lang.hitch(this, function (result) {
                   this.map.setExtent(result.extent);
               }));

               this.loading.hide();

               //if no where, add in 1=1
               //if (qWhere == "")
               //    qWhere = "1=1";
               //query.where = qWhere;
               //query.returnGeometry = true;
               //query.outFields = ["ACRES", modelField, "OBJECTID"];

               //this._queryLayer(queryTask, query, "Found Opportunities", "opsQLayer", 0).then(lang.hitch(this, function (result) {
               //    this._resultsHandler(result, this.opsLayer);
               //}), function (error) {
               //    console.log(error);
               //    this.loading.hide();
               //});

           } else {
               alert("You must select a potential type.");
               this.loading.hide();
           }
       },

       _createFindSiteVisits: function () {
           var query = new Query();
           var qTaskURL = this.config.siteVisits;
           var queryTask = new QueryTask(qTaskURL);
           var qWhere = "";
           //suitability checked
           if (this.UPSuit.checked == true || this.URSuit.checked == true || this.WPSuit.checked == true || this.WRSuit.checked == true || this.RPSuit.checked == true || this.RRSuit.checked == true || this.SPSuit.checked == true || this.SRSuit.checked == true) {
               var suitWhere = "(";
               addSuitQuery('Upland_Preservation', this.UPSuit.checked);
               addSuitQuery('Upland_Restoration', this.URSuit.checked);
               addSuitQuery('Wetland_Preservation', this.WPSuit.checked);
               addSuitQuery('Wetland_Restoration', this.WRSuit.checked);
               addSuitQuery('Riparian_Preservation', this.RPSuit.checked);
               addSuitQuery('Riparian_Restoration', this.RRSuit.checked);
               addSuitQuery('Stormwater_Natural_Infrastructure_Preservation', this.SPSuit.checked);
               addSuitQuery('Stormwater_Compromised_Infrastructure_Restoration', this.SRSuit.checked);
               suitWhere += ")";
               qWhere += suitWhere;
           }
           
           function addSuitQuery(field, checked) {
               if (checked == true) {
                   if (suitWhere != "(")
                       suitWhere += " OR ";
                   suitWhere +=  "field_32 LIKE '%" + field + "%'";
               }
           }
           //get county part of query
           if (this.ddlSACounty.value != "all") {
               if (qWhere != "")
                   qWhere += " AND ";
               //remove characters not found in model layers for query
               var countyVar = this.ddlSACounty.value.replace("'", "").replace(" County", "");
               qWhere += "field_47 = '" + countyVar + "'";
           }
           //get watershed part of query
           if (this.ddlSAWatershed.value != "all") {
               if (qWhere != "")
                   qWhere += " AND ";
               qWhere += "field_48 = " + this.ddlSAWatershed.value;
           }
           //score part of query and change symbol dropdown to appropriate symbols
           if (this.chkLOW.checked == true) {
               if (qWhere != "")
                   qWhere += " AND ";
               qWhere += "field_34 = 'choice0'";
           }
           function formatDateField(dateVal) {
               var dayVal = dateVal.getDate();
               var monthVal = dateVal.getMonth() + 1;
               var yearVal = dateVal.getFullYear();
               return monthVal + "/" + dayVal + "/" + yearVal;
           }
           //search by owner willingness to particpate
           if (this.chkDate.checked == true) {
               if (qWhere != "")
                   qWhere += " AND ";
               var startDate = dijit.byId('startDate').value;
               var endDate = dijit.byId('endDate').value;
               qWhere += "field_7 <= '" + formatDateField(endDate) + "' AND field_7 >= '" + formatDateField(startDate) + "'";
           }
           //search by object ID
           if (this.txtID.value != "") {
               qWhere = "OBJECTID = " + this.txtID.value;
           }
           var lay = this.map.getLayer("visitsQLayer");
           if (lay) {
               this.map.removeLayer(lay);
           }
			   
           var symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 3), new Color([255, 255, 0, 0.50]));
           layer = new FeatureLayer(qTaskURL, {
               id: "visitsQLayer",
               outFields: ["*"],
			   definitionExpression: qWhere
			   //mode: FeatureLayer.MODE_SELECTION
           });
		   //layer.selectFeatures(query);

           var renderer = new SimpleRenderer(symbol);
           layer.setRenderer(renderer);

           layer.name = "Found Visits";
           this.map.addLayer(layer);
           this.loading.hide();

           //if no where, add in 1=1
           //if (qWhere == "")
           //    qWhere = "1=1";
           //query.where = qWhere;
           //query.returnGeometry = true;
           //query.outFields = ["Organization", "VisitDate", "OBJECTID"];

           //this._queryLayer(queryTask, query, "Found Visits", "visitsQLayer", 0).then(lang.hitch(this, function (result) {
           //    this._resultsHandler(result, this.visitsLayer);
           //}), function (error) {
           //    console.log(error);
           //    this.loading.hide();
           //});

       },

       _resultsHandler: function (result, layer) {
           var results = result.result;

           if (result.error) {
               alert(result.error);
               this.loading.hide();
           }else if (results && results.features && results.features.length > 0) {
               var lay = this.map.getLayer(result.layerId);
               if (lay) {
                   this.map.removeLayer(lay);
               }

               layer = null;
               var symbol = null;
               switch (results.geometryType) {
                   case "esriGeometryPoint":
                       symbol = new PictureMarkerSymbol({
                           "angle": 0,
                           "xoffset": 2,
                           "yoffset": 8,
                           "type": "esriPMS",
                           "url": "http://static.arcgis.com/images/Symbols/Basic/RedShinyPin.png",
                           "imageData": "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",
                           "contentType": "image/png",
                           "width": 24,
                           "height": 24
                       });
                       break;
                   case "esriGeometryPolyline":
                       symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASH, new Color([255, 0, 0]), 2);
                       break;
                   case "esriGeometryPolygon":
                       symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_DASHDOT, new Color([255, 0, 0]), 3), new Color([255, 255, 0, 0.50]));
                       break;
               }

               ////Create the layer when the querytask is launched
               //var layerDefinition = {
               //    "geometryType": results.geometryType,
               //    "fields": results.fields
               //}
               //var featureCollection = {
               //    layerDefinition: layerDefinition,
               //    featureSet: results.features
               //};
               //layer = new FeatureLayer(featureCollection, {
               layer = new FeatureLayer(result.layerURL, {
                   id: result.layerId,
                   outFields: [""],

               });

               var renderer = new SimpleRenderer(symbol);
               layer.setRenderer(renderer);

               layer.name = result.layerName;
               this.map.addLayer(layer);

               this.loading.hide();

           } else if (results && results.features && results.features.length == 0) {
               alert('No features found for this search!');
               this.loading.hide();
           } else {
               this.loading.hide();
           }
       },

       _onLayerInfosChanged: function (layerInfo, changeType, layerInfoSelf) {
           if (!layerInfoSelf || !layerInfo) {
               return;
           }
           if (layerInfo.id == "opsQLayer" || layerInfoSelf.id == "opsQLayer") {
               layerInfo.title = "Found Opportunities";
               layerInfoSelf.title = "Found Opportunities";
           } else if (layerInfo.id == "visitsQLayer" || layerInfoSelf.id == "visitsQLayer") {
               layerInfo.title = "Found Visits";
               layerInfoSelf.title = "Found Visits";
           }
           if ('added' === changeType) {
               layerInfoSelf.getSupportTableInfo().then(lang.hitch(this, function (supportTableInfo) {
                   if (supportTableInfo.isSupportedLayer) {
                       this.publishData({
                           'target': 'AttributeTable',
                           'layer': layerInfoSelf
                       });
                   } else {
                       if (layerInfoSelf.newSubLayers.length > 0) {
                           var supportQArray = [];
                           for (var j = 0; j < layerInfoSelf.newSubLayers.length; j++) {
                               if (layerInfoSelf.newSubLayers[j].newSubLayers.length == 0) {
                                   var subLayInfoSelf = layerInfoSelf.newSubLayers[j];
                                   supportQArray.push(supTableFunction(subLayInfoSelf));
                               }
                           }
                           all(supportQArray).then(lang.hitch(this, function (results) {
                               for (var l = 0; l < results.length; l++) {
                                   if (results[l].status == 'success' && results[l].result.isSupportedLayer) {
                                       this.publishData({
                                           'target': 'AttributeTable',
                                           'layer': results[l].layerInfo
                                       });
                                   }
                               }

                           }));
                       }
                   }
               }));

           } else if ('removed' === changeType) {
               // do something
               if (this.attributeTableWid) {
                   layerInfoSelf.getSupportTableInfo().then(lang.hitch(this, function (supportTableInfo) {
                       if (supportTableInfo.isSupportedLayer) {
                           var selfId = layerInfoSelf.id;
                           if (this.attributeTableWid.getExistLayerTabPage(selfId)) {
                               this.attributeTableWid.layerTabPageClose(selfId, true);
                           }
                       } else {
                           if (layerInfoSelf.newSubLayers.length > 0) {
                               var supportQArray = [];
                               for (var j = 0; j < layerInfoSelf.newSubLayers.length; j++) {

                                   if (layerInfoSelf.newSubLayers[j].newSubLayers.length == 0) {
                                       var subLayInfoSelf = layerInfoSelf.newSubLayers[j];
                                       supportQArray.push(supTableFunction(subLayInfoSelf));
                                   }
                               }
                               all(supportQArray).then(lang.hitch(this, function (results) {
                                   for (var l = 0; l < results.length; l++) {
                                       if (results[l].status == 'success' && results[l].result.isSupportedLayer) {
                                           var selfId = results[l].layerInfo.id;
                                           if (this.attributeTableWid.getExistLayerTabPage(selfId)) {
                                               this.attributeTableWid.layerTabPageClose(selfId, true);
                                           }
                                       }
                                   }
                               }));
                           }
                       }
                   }));
               }
           }
           function supTableFunction(subLayInfoSelf) {
               var deferred = new Deferred();
               var layer = subLayInfoSelf;
               subLayInfoSelf.getSupportTableInfo().then(lang.hitch(this, function (result) {
                   deferred.resolve({ status: 'success', layerInfo: layer, result: result });
               }), function (error) {
                   deferred.resolve({ status: 'error' });
               });
               return deferred;
           }
       },

       _onTabHeaderClicked: function (event) {
           var target = event.target || event.srcElement;
           if (target === this.findLocItem) {
               this._switchToFindTab();
           } else if (target === this.resultsLocItem) {
               this._switchToResultTab();
           }
       },

       _switchToFindTab: function () {
           html.removeClass(this.resultsLocItem, 'selected');
           html.removeClass(this.resultsTabView, 'selected');
           html.addClass(this.findLocItem, 'selected');
           html.addClass(this.findTabView, 'selected');
       },

       _switchToResultTab: function () {
           html.removeClass(this.findLocItem, 'selected');
           html.removeClass(this.findTabView, 'selected');
           html.addClass(this.resultsLocItem, 'selected');
           html.addClass(this.resultsTabView, 'selected');
       },

       _showLoading: function () {
           domStyle.set(this.findDiv, "display", "none");
           this.loading.show();
       },

       _hideLoading: function () {
           domStyle.set(this.findDiv, "display", "block");
           this.loading.hide();
       },

       onOpen: function () {
           console.log('onOpen');
       },

       onClose: function () {
           console.log('onClose');
       }

      // onMinimize: function(){
      //   console.log('onMinimize');
      // },

      // onMaximize: function(){
      //   console.log('onMaximize');
      // },

      // onSignIn: function(credential){
      //   /* jshint unused:false*/
      //   console.log('onSignIn');
      // },

      // onSignOut: function(){
      //   console.log('onSignOut');
      // }

      // onPositionChange: function(){
      //   console.log('onPositionChange');
      // },

      // resize: function(){
      //   console.log('resize');
      // }

      //methods to communication between widgets:

    });
  });