define(['dojo/_base/declare',
    'dojo/_base/lang',
    'dojo/on',
    'dojo/aspect',
    'dojo/Deferred',
    'dojo/dom-class',
    'jimu/LayerInfos/LayerInfos',
    'jimu/WidgetManager',
    'jimu/PanelManager',
    'jimu/BaseWidget',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/dijit/TabContainer3',
    './utils',
    './WRRLayerList',
    './LayerList'],
  function (declare, 
      lang, 
      on, 
      aspect, 
      Deferred, 
      domClass,
      LayerInfos,
      WidgetManager,
      PanelManager,
      BaseWidget,
      _WidgetsInTemplateMixin,
      TabContainer3,
      addUtils,
      WRRLayerList,
      LayerListESRI) {
    //To create a widget, you need to derive from BaseWidget.
      return declare([BaseWidget, _WidgetsInTemplateMixin], {
      // Custom widget code goes here

      baseClass: 'jimu-widget-joinedLayerLists',

      //this property is set by the framework when widget is loaded.
      name: 'JoinedLayerLists',

      //methods to communication with app container:
       postCreate: function() {
         this.inherited(arguments);
         console.log('postCreate');
       },

       startup: function () {
           this.inherited(arguments);

           this.wm = WidgetManager.getInstance();
           this.pManager = PanelManager.getInstance();
           this._addThemeFixes();

           this.attributeTableWid = this.wm.getWidgetByLabel("Attribute Table");

           esri.config.defaults.io.corsDetection = false;

           LayerInfos.getInstance(this.map, this.map.itemInfo).then(lang.hitch(this, function (layerInfosObject) {
               this.layerInfoObj = layerInfosObject;
               this._initTabs();
           }));

           console.log('startup');
       },


       _initTabs: function(){
           var config = this.config, tabs = [];


           this.llWRR = new WRRLayerList({
               wabWidget: this,
               layerInfo: this.layerInfoObj,
               appConfig: this.appConfig,
			         nls: this.nls,
               config: this.config,
               map: this.map,
               folderUrl: this.folderUrl
           }, this.groupedNode);
           tabs.push({
               title: "Map Layers",
               content: this.llWRR.domNode
           });
           this.llWRR.startup();

           //creates the advanced features tab for layer list
           this.llAdvanced = new LayerListESRI({
               wabWidget: this,
               layerInfo: this.layerInfoObj,
               appConfig: this.appConfig,
               nls: this.nls,
               config: this.config,
               map: this.map,
               folderUrl: this.folderUrl
           }, this.layerListNode);
           tabs.push({
               title: "Added Data Layers",
               content: this.llAdvanced.domNode
           });
           this.llAdvanced.startup();

           var self = this;
           if (tabs.length > 1) {
               this.tabContainer = new TabContainer3({
                   average: true,
                   tabs: tabs
               }, this.tabsNode);
               //this.tabContainer.hideShelter();
               this.own(aspect.after(this.tabContainer, "selectTab", function (title) {
                   ////console.warn("selectTab",title);
                   //if (self.searchPane && title === self.nls.tabs.search) {
                   //    self.searchPane.resize();
                   //}
               }, true));
           } else if (tabs.length === 0) {
               this.tabsNode.appendChild(document.createTextNode(this.nls.noOptionsConfigured));
           }
       },

       _addThemeFixes: function () {
           /*Workaround for the LanunchPad theme not firing onClose and onOpen for the widget*/
           if (this.appConfig.theme.name === "LaunchpadTheme") {
               var tPanel = this.getPanel();
               if (tPanel) {
                   aspect.after(tPanel, "onClose", lang.hitch(this, this.onClose));
                   aspect.after(tPanel, "onOpen", lang.hitch(this, this.onOpen));
               }
           }
           /*end work around for LaunchPad*/
           /*Workaround for TabTheme moregroup not calling onClose and onOpen when the SidebarController is minimized*/
           if (this.appConfig.theme.name === "TabTheme") {
               var sidebarWidget = this.wm.getWidgetsByName('SidebarController');
               if (sidebarWidget[0]) {
                   aspect.after(sidebarWidget[0], "onMinimize", lang.hitch(this, this.onClose));
                   aspect.after(sidebarWidget[0], "onMaximize", lang.hitch(this, this.onOpen));
               }
           }
       }

    });
  });