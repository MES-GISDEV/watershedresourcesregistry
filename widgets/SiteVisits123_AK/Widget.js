define(['dojo/_base/declare', 'dojo/promise/all', 'jimu/BaseWidget', 'dojo/_base/lang','dojo/on', 'dojo/dom-class', 'esri/toolbars/draw', 'esri/tasks/query', 'esri/tasks/QueryTask'],
  function(declare, all, BaseWidget, lang, on, domClass, Draw, Query, QueryTask) {
    //To create a widget, you need to derive from BaseWidget.
    return declare([BaseWidget], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-sitevisits123',

      //this property is set by the framework when widget is loaded.
      name: 'SiteVisits123 AK',

      //methods to communication with app container:
       postCreate: function() {
           this.inherited(arguments);
           console.log('postCreate');
       },

       startup: function() {
           this.inherited(arguments);
           this.drawPoint = new Draw(this.map, {
           });
           this.drawPoint.on('draw-end', lang.hitch(this, function (result) {
    			   //domClass.add(this.siteformBtn, "disactive");
             domClass.remove(this.siteformBtn, "disactive");
    			   this.drawPoint.deactivate();
             var location = result.geometry;
             //window.open(this.config.surveyLink2 + "?center=" + location.getLatitude() + "," + location.getLongitude());
             window.open(this.config.surveyLink2 + "?field:latitude=" + location.getLatitude() + "&field:longitude=" + 
                location.getLongitude() + "&center=" + location.getLatitude() + "," + location.getLongitude());         
    			   //this.runBackgroundQuery(result.geometry); 
             console.log(result);
             console.log(window.appInfo.isRunInMobile);
           }));
           on(this.siteformBtn, 'click', lang.hitch(this, function (evt) {
               if (domClass.contains(this.siteformBtn, "disactive")) {
                   domClass.remove(this.siteformBtn, "disactive");
                   // this.drawPoint.activate(Draw.POINT);
                   this.drawPoint.deactivate();
               } else {
                   domClass.add(this.siteformBtn, "disactive");
                   //this.drawPoint.deactivate();
                   this.drawPoint.activate(Draw.POINT);
               }
           }));
           on(this.siteformBtn2, 'click', lang.hitch(this, function (evt) {
              window.open(this.config.surveyLink3);
           }));
           console.log('startup');
       },
	   
       runBackgroundQuery: function (location) {
            var today = Date.now();

            //get and apply the county for where the point was clicked
            var cquery = new Query();
            var cqueryTask = new QueryTask(this.config.county.url);
            cquery.outSpatialReference = {wkid:102100}; 
            cquery.returnGeometry = false;
            cquery.geometry = location;
            cquery.where = today + "=" + today;
            cquery.outFields = [this.config.county.field];
			      var counties = cqueryTask.execute(cquery);

            //get and apply the watershed to the point that was clicked
            var wquery = new Query();
            var wqueryTask = new QueryTask(this.config.watershed.url);
            wquery.outSpatialReference = { wkid: 102100 };
            wquery.returnGeometry = false;
            wquery.where = today + "=" + today;
            wquery.geometry = location;
            wquery.outFields = [this.config.watershed.field];
            var watersheds = wqueryTask.execute(wquery);

      			var promises = all([counties, watersheds]);
      			promises.then(lang.hitch(this, function(result){
      				county = "";
      				watershed = "";
      				console.log(result);

      				// make sure both queries finished successfully
      				if ( ! result[0].hasOwnProperty("features") ) {
      					console.log("Counties query failed.");
      				}else{
      					county = result[0].features[0].attributes[this.config.county.field];
      				}
      				if ( ! result[1].hasOwnProperty("features") ) {
      					console.log("watersheds query failed.");
      				}else{
      					watershed = result[1].features[0].attributes[this.config.watershed.field];
      				}

      				//the fields in the URL are only made to fill out survey questions by default
      				window.open(this.config.surveyLink2 + "?center=" + location.getLatitude() + "," + location.getLongitude());
              var url = (this.config.surveyLink + "?field:field_48=" + watershed + "&field:field_47=" + 
                county + "&center=" + location.getLatitude() + "," + location.getLongitude());
      				//}				   
			     }));
        }
	   

      // onOpen: function(){
      //   console.log('onOpen');
      // },

      // onClose: function(){
      //   console.log('onClose');
      // },

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