///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/lang',
  'dojo/_base/array',
  'jimu/LayerInfos/LayerInfos',
  'dojo/Deferred',
  'dojo/promise/all',
  'exports',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dojo/dom-style',
  'dojo/dom-attr',
  "esri/lang",
  'jimu/utils'
], function(
  lang, array, LayerInfos, Deferred, all,
  exports, domConstruct, domClass, domStyle, domAttr, esriLang, utils
) {

    exports.getObjectByVal = function(obj, prop, val) {
          var keys = [];
          for (var key in obj) {
              if (obj[key].hasOwnProperty(prop) && obj[key][prop] === val) {
                  keys.push(obj[key]);
              }
          }
          return keys;
    };


    exports.onLayerBtnClick = function (layerInfo, thisBtnNode) {
        this._showLoading();
        var layer = null;
        layer = this.map.getLayer(layerInfo.id);
        if (layer != undefined || layer != null) {
            //what to do if the layer is already in the map
            this.map.removeLayer(layer);
            domClass.add(thisBtnNode, 'jimu-icon-add');
            domClass.remove(thisBtnNode, 'jimu-icon-delete');
            this._hideLoading();
        } else {
            //what to do if layer isn't already in the map
            if (layerInfo.type == "Map Service") {
                if (layerInfo.url && layerInfo.url.length -10 > layerInfo.url.lastIndexOf("MapServer")){
                    layer = new FeatureLayer(layerInfo.url, {
                        id: layerInfo.id,
                        outFields: ['*']
                    });
                }else{
                    layer = new ArcGISDynamicMapServiceLayer(layerInfo.url, {
                        id: layerInfo.id
                    });					   

                }
            } else if (layerInfo.type == "Feature Service") {
                var layURL = layerInfo.url;
                if (!isNumeric(layURL.substr(layURL.length - 1, 1))) {
                    layURL += "/0";
                }

                function isNumeric(n) {
                    return !isNaN(parseFloat(n)) && isFinite(n);
                }
                layer = new FeatureLayer(layURL, {
                    id: layerInfo.id,
                    outFields: ['*']
                });
            } else if (layerInfo.type == "Document Link" || (layerInfo.url && layerInfo.url.substr(layerInfo.url.length - 3) == "csv")) {
                layer = new CSVLayer(layerInfo.url, {
                    id: layerInfo.id
                });
            } else if (layerInfo.type == "WMS") {
                layer = new WMSLayer(layerInfo.url, {
                    id: layerInfo.id,

                });
            }
            if (layer == null){
                alert('Unable to load this layer type');
                this._hideLoading();
            }
            this.map.addLayer(layer);
            this.own(on(layer, 'load', lang.hitch(this, function (result) {
                this._hideLoading();
                if (result.error) {
                    alert(result.error.message);
                } else {
                    this.appConfig.OSPREYLayersInMap.push(result.layer.id);
                    domClass.add(thisBtnNode, 'jimu-icon-delete');
                    domClass.remove(thisBtnNode, 'jimu-icon-add');
                    var layerArray = this.layerInfoObj.getLayerInfoArray();
                    for (var j = 0; j < layerArray.length; j++) {
                        if (layerArray[j].id == result.layer.id) {
                            var checkLL = this._getObjectByVal(this.layerStore.data, "id", layerArray[j].id);
                            if (checkLL.length > 0) {
                                layerArray[j].title = checkLL[0].title.replace(/_/g, " ");
                            }
                            break;
                        }
                    }
                }

            })));
            this.own(on(layer, 'error', lang.hitch(this, function (error) {
                this._hideLoading();
            })));
        }
    };
    
    // return current state:
    //   true:  fold,
    //   false: unfold
    exports.fold = function (layerInfo, imageShowCategoryNode, descriptionShowNode, subNode) {
        /*jshint unused: false*/
        /* global isRTL*/
        var state;
        if (domStyle.get(subNode, 'display') === 'none') {
            //unfold
            domStyle.set(subNode, 'display', 'table');
            if (imageShowCategoryNode == null) {
                domClass.add(descriptionShowNode, 'jimu-icon-up');
                domClass.remove(descriptionShowNode, 'jimu-icon-search');
            } else {
                domAttr.set(imageShowCategoryNode, 'src', this.folderUrl + 'images/v.png');
            }

            state = false; //unfold
        } else {
            //fold
            domStyle.set(subNode, 'display', 'none');
            var src;
            if (isRTL) {
                src = this.folderUrl + 'images/v_left.png';
            } else {
                src = this.folderUrl + 'images/v_right.png';
            }
            if (imageShowCategoryNode == null) {
                domClass.add(descriptionShowNode, 'jimu-icon-search');
                domClass.remove(descriptionShowNode, 'jimu-icon-up');
            } else {
                domAttr.set(imageShowCategoryNode, 'src', src);
            }

            state = true; // fold
        }
        return state;
    };

    exports.onDescriptionClick = function (layerInfo, imageShowDescriptionNode, descriptionShowNode, layerTrNode, subNode) {
        this._changeSelectedLayerRow(layerTrNode);
        var fold = this._fold(layerInfo, null, descriptionShowNode, subNode);
        if (!fold) {
            var desNode = query(".descriptionTxt-div", subNode)[0];
            if (desNode) {

            }
        }
    };

    exports.onRowTrClick = function (layerInfo, imageShowDescriptionNode, descriptionShowNode, layerTrNode, subNode) {
        this.changeSelectedLayerRow(layerTrNode);
        var fold = this.fold(layerInfo, imageShowDescriptionNode, null, subNode);
        if (!fold) {
            var desNode = query(".descriptionTxt-div", subNode)[0];
            if (desNode) {
                   
            }
        }
    };

    exports.changeSelectedLayerRow = function (layerTrNode) {
        if (this._currentSelectedLayerRowNode && this._currentSelectedLayerRowNode === layerTrNode) {
            return;
        }
        if (this._currentSelectedLayerRowNode) {
            domClass.remove(this._currentSelectedLayerRowNode, 'jimu-widget-row-selected');
        }
        domClass.add(layerTrNode, 'jimu-widget-row-selected');
        this._currentSelectedLayerRowNode = layerTrNode;
    };

    
    exports.showLoading = function (thisDiv, loadingDiv) {
        domStyle.set(thisDiv.searchContainer, "display", "none");
        domStyle.set(thisDiv.layerContainer, "display", "none");
        loadingDiv.show();
    };

    exports.hideLoading = function (thisDiv, loadingDiv) {
        domStyle.set(thisDiv.searchContainer, "display", "block");
        domStyle.set(thisDiv.layerContainer, "display", "block");
        loadingDiv.hide();
    }
 
});