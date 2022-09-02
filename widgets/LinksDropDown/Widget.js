///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 - 2016 Esri. All Rights Reserved.
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

define(['dojo/_base/declare',
    'dojo/_base/html',
    'dojo/query',
    'dojo/on',
    'dojo/_base/lang',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'jimu/dijit/TabContainer3',
    'dojo/aspect',
	'dojo/dom',
	'dojo/dom-construct'
],
function(declare, html, query, on, lang, _WidgetsInTemplateMixin, BaseWidget, TabContainer3, aspect, dom, domConstruct) {
    var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {
		baseClass: 'jimu-widget-about',
		// clasName: 'esri.widgets.About',
		
		_hasContent: null,
		
		postCreate: function() {
			this.inherited(arguments);
			
			this._hasContent = this.config.about && this.config.about.aboutContent;
		},
		
		startup: function() {
			var self = this;
			this.inherited(arguments);
			
			//try to get a links array from our config file
			var linksArray = this.config.nationalLinks;
			
			//to set the buttons below each other we have to set up a variable that change for each button
			var topLocation = 0;
			
			//loop through links to add to list
			linksArray.forEach(function(iLink){
				//the link contains the title and the link address in a array, let's split these 
				var iTitle = iLink[0];
				var iAddress = iLink[1];
				////Simple Link - let's try to do this first before doing something special with a button like tool
				//domConstruct.place('<div><b>' + iTitle + '</b> <a href="' + iAddress + '" target="_blank">View Here</a></div><br><br>',dom.byId("drawerMappingNode"));
				////Now for the real McCoy
				//NOTE: I had to adjust \widgets\LinksDropDown\css\style.css for this, so that the colors, no underline would work
				domConstruct.place('<a href="' + iAddress + '" target="_blank"> <div style="left: 0px; top: ' + topLocation + 'px; right: auto; bottom: auto; width: 100%; height: 40px; padding: 0px; z-index: auto;line-height: 40px" class="jimu-widget-onscreen-icon-link"> <center><span class="droplabel" >' + iTitle + '</span></center> </div></a>' ,dom.byId("drawerMappingNode"));
				//Adjust location of next button "y" coordinate
				topLocation += 40;
			});
			
			
			//this.resize();
			this._initTabs();
			this.timestamps();
		},
		
		resize: function() {
			this._resizeContentImg();
		},
		
		//time stamp function for the tutorial videos
		timestamps: function() {
			//loops through all the tutorial videos with time stamps
			for (var i = 1; i < 11; i++) {
				(function(){
					var myvideo = document.getElementById('video'+i.toString()),
					group = document.getElementById('group'+i.toString());
					
					//makes sure myvideo is not null
					if(myvideo){
						//loops through every video group and attaches event listeners
						for (var j = 1; j < group.children.length; j++) {
							(function(){
								// var jumplink = document.getElementById('time'+j.toString()),
								//     num1 = document.getElementById('minute'+j.toString()),
								//     num2 = document.getElementById('seconds'+j.toString());
								
								var jumplink = group.children[j].childNodes[0],
								num1 = group.children[j].childNodes[0].children[0],
								num2 = group.children[j].childNodes[0].children[1];
								
								jumplink.addEventListener("click", function (event) {
									var int1 = parseInt(num1.innerText);
									var int2 = parseInt(num2.innerText);
									var playtime = (int1*60)+int2;
									event.preventDefault();
									myvideo.play();
									myvideo.pause();
									myvideo.currentTime = playtime;
									//myvideo.play();
								}, false);
							}()); //immediate invocation
							
						}
					}
				}()); //immediate invocation
			}
			
			// var myvideo = document.getElementById('video1'),
			//     group = document.getElementById('group1'),
			//     jumplink = document.getElementById('time1'),
			//     num1 = document.getElementById('minute1'),
			//     num2 = document.getElementById('seconds1');
			
			// jumplink.addEventListener("click", function (event) {
			//     var int1 = parseInt(num1.innerText);
			//     var int2 = parseInt(num2.innerText);
			//     var finaltime = (int1*60)+int2;
			//     event.preventDefault();
			//     myvideo.play();
			//     myvideo.pause();
			//     myvideo.currentTime = 24;
			//     //myvideo.play();
			// }, false);
		},
		
		_initTabs: function(){
			var config = this.config, tabs = [];
			
			
			tabs.push({
				title: "Videos",
				content: this.envelopeNode
			});
			
			tabs.push({
				title: "Fact Sheets",
				content: this.factsNode
			});
			
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
		
		_resizeContentImg: function() {
			if (this._hasContent) {
				html.empty(this.customContentNode);
				
				var aboutContent = html.toDom(this.config.about.aboutContent);
				html.place(aboutContent, this.customContentNode);
				// single node only(no DocumentFragment)
				if (this.customContentNode.nodeType && this.customContentNode.nodeType === 1) {
					var contentImgs = query('img', this.customContentNode);
					if (contentImgs && contentImgs.length) {
						contentImgs.forEach(lang.hitch(this, function(img) {
							var isNotLoaded = ("undefined" !== typeof img.complete && false === img.complete) ? true : false;
							if (isNotLoaded) {
								this.own(on(img, 'load', lang.hitch(this, function() {
									this._resizeImg(img);
								})));
								} else {
								this._resizeImg(img);
							}
						}));
					}
				}
			}
		},
		_resizeImg: function(img) {
			var customBox = html.getContentBox(this.customContentNode);
			var imgSize = html.getContentBox(img);
			if (imgSize && imgSize.w && imgSize.w >= customBox.w) {
				html.setStyle(img, {
					maxWidth: (customBox.w - 20) + 'px', // prevent x scroll
					maxHeight: (customBox.h - 40) + 'px'
				});
			}
		}
	});
	return clazz;
});													