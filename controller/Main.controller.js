sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/m/Dialog",
	"sap/ui/unified/FileUploader",
	"sap/m/MessageToast",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"demo/app/matcost/model/formatter",
	"demo/app/matcost/util/jszip"
], function(Controller, JSONModel, History, Dialog, FileUploader, MessageToast, MessageBox, Filter, formatter) {
	"use strict";

	return Controller.extend("demo.app.matcost.controller.Main", {
		onInit: function(){
				var oJson = new JSONModel();
				oJson.setData({data: [],  newEntry: {
					Zzlocation:"",
					Zzcostcol:"",
					Zzmatprod:"",
					Zzenddate: new Date(),
					Zzqtyprods:0,
					Zzmatcosts:0,
					Zzlabcosts:0,
					Zzmchcosts:0,
					Zzunitcosts:0,
					Zcurrency: ""
				}})		;
				this.getView().setModel(oJson,"local");
				this.localModel = oJson;
				this.oDataModel = this.getOwnerComponent().getModel();
		},
		formatter: formatter,
		updateRecords : [],
		newRecords: [],
		deleteRecords: [],
		onLiveChange: function(){
			var sValues = 	this.localModel.getProperty("/newEntry");
			if(sValues.Zzqtyprods <= 0 || !sValues.Zzqtyprods){
				return;
			}
			sValues.Zzunitcosts = ( parseFloat(sValues.Zzmatcosts) + parseFloat(sValues.Zzlabcosts) + parseFloat(sValues.Zzmchcosts) ) / parseFloat(sValues.Zzqtyprods);
			var newVal = parseFloat(sValues.Zzunitcosts).toFixed(2);
			this.localModel.setProperty("/newEntry/Zzunitcosts", newVal);
		},
		onCellChange: function(oEvent){
			var currentRow = oEvent.getSource().getParent();
			var Zzqtyprods = currentRow.getCells()[4].getValue();
			var Zzmatcosts = currentRow.getCells()[5].getValue();
			var labor = currentRow.getCells()[6].getValue();
			var emission = currentRow.getCells()[7].getValue();
			var calcVal = parseFloat(Zzmatcosts) + parseFloat(labor) + parseFloat(emission);
			if(Zzqtyprods <= 0 || !Zzqtyprods){
				return;
			}
			var final = parseFloat(calcVal / parseFloat(Zzqtyprods)).toFixed(2);
			currentRow.getCells()[8].setText(final);
		},
		onCancel: function(){
			var that = this;
			MessageBox.confirm("All the changes will be discarded?", function(conf) {
				if (conf == 'OK') {
					window.location.reload();
				}
			}, "Confirmation");	
		},
		inpField: "",
		onFilterSearch: function(){
			var that = this;
			
			if(this.getView().byId("Zzmatprod").getValue() !== ""){
				this.oDataModel.read("/MatCollAllSet",{
					filters: [new Filter("Zzmatprod", "EQ", this.getView().byId("Zzmatprod").getValue())],
					success: function(data){
						that.localModel.setProperty("/data",data.results);
					}
				});
			}else if (this.getView().byId("Zzlocation").getValue() !== ""){
				this.oDataModel.read("/MatCollAllSet",{
					filters: [new Filter("Zzlocation", "EQ", this.getView().byId("Zzlocation").getValue())],
					success: function(data){
						that.localModel.setProperty("/data",data.results);
					}
				});
			}else{
				this.oDataModel.read("/MatCollAllSet",{
					success: function(data){
						console.log(data.results);
						that.localModel.setProperty("/data",data.results);
					}
				});
			}
			
			
		},
		onSelectValue: function(oEvent){
				var selectedItem = oEvent.getParameter("selectedItem");
				var sTitle = selectedItem.getLabel();
				sap.ui.getCore().byId(this.inpField).setValue(sTitle);
				var that = this;
				if(this.inpField.indexOf("Zzmatprod") !== -1){
					this.getView().byId("Zzlocation").setValue("");
				}else{
					this.getView().byId("Zzmatprod").setValue("");
				}
				
				
		},
		cityPopup: null,
		onValueHelp: function(oEvent){
			this.inpField = oEvent.getSource().getId();
			//lo_alv->set_table_for_first_display
			//MessageBox.confirm("this functionality is under construction");
			if(this.inpField.indexOf("Zzmatprod") !== -1){
				this.cityPopup = sap.ui.xmlfragment("demo.app.matcost.fragments.popup", this);	
				this.cityPopup.bindAggregation("items",{
					path: "/ValueHelpSet",
					filters: [new Filter("Key", "EQ","M-")],
					template: new sap.m.DisplayListItem({
						label: "{Key}",
						value: "{Text}"
					})
				});
				this.cityPopup.setTitle("Materials");
				this.cityPopup.setMultiSelect(false);
				this.getView().addDependent(this.cityPopup);
				this.cityPopup.open();
			}else{
				this.cityPopup = sap.ui.xmlfragment("demo.app.matcost.fragments.popup", this);	
				this.cityPopup.bindAggregation("items",{
					path: "/ValueHelpSet",
					filters: [new Filter("Key", "EQ","L-")],
					template: new sap.m.DisplayListItem({
						label: "{Key}",
						value: "{Text}"
					})
				});
				this.cityPopup.setTitle("Locations");
				this.cityPopup.setMultiSelect(false);
				this.getView().addDependent(this.cityPopup);
				this.cityPopup.open();
			}
			
		},
		getFormattedDate: function(monthInc) {
			var dateObj = new Date();
			dateObj.setDate(dateObj.getDate());
			var dd = dateObj.getDate();
			dateObj.setMonth(dateObj.getMonth() + monthInc);
			var mm = dateObj.getMonth() + 1;
			var yyyy = dateObj.getFullYear();
			if (dd < 10) {
				dd = '0' + dd;
			}
			if (mm < 10) {
				mm = '0' + mm;
			}
			return mm + '.' + dd + '.' + yyyy;
		},
		onUpload: function (e) {
			this._import(e.getParameter("files") && e.getParameter("files")[0]);
		},
		onPressHandleSecureOkPopup: function(){
			var sValues = this.localModel.getProperty("/newEntry");
			if(sValues.Zzmatcosts === 0 || sValues.Zzmatcosts === "" || sValues.Zzmatprod === "" || sValues.Zzcostcol === "" || sValues.Zzlocation === ""){
				MessageBox.error("Please enter valid value");
				return;
			}
			var clonedData = JSON.parse(JSON.stringify(sValues));
			clonedData.Zzenddate =  new Date(clonedData.Zzenddate);
			if(this.editPath){
				clonedData.Zcurrency = "U";
				this.localModel.setProperty(this.editPath, clonedData);
				this.editPath = "";
			}else{
				var aData = this.localModel.getProperty("/data");
				aData.splice(0, 0, clonedData);
				this.localModel.setProperty("/data", aData);
			}
			this._oDialogSecure.close();
		},
		onEdit: function(oEvent){
			this.editPath = oEvent.getSource().getParent().getParent().getBindingContextPath();
			this.localModel.setProperty(this.editPath + "/Zzenddate", new Date(this.localModel.getProperty(this.editPath).Zzenddate));
			this.localModel.setProperty("/newEntry", this.localModel.getProperty(this.editPath));
			if (!this._oDialogSecure) {
				this._oDialogSecure = sap.ui.xmlfragment("Secure_Dialog", "demo.app.matcost.fragments.createEntry", this);
				this.getView().addDependent(this._oDialogSecure);
			}
			//jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialogSecure);
			this._oDialogSecure.open();
		},
		onDelete: function(oEvent){
			this.editPath = oEvent.getSource().getParent().getParent().getBindingContextPath();
			var record = this.localModel.getProperty(this.editPath);
			record.Zcurrency = "D";
			this.localModel.setProperty(this.editPath, record);
			this.getView().byId("idTable").getBinding("items").filter([new sap.ui.model.Filter("Zcurrency", "NE", "D")]);
		},
		onPressHandleSecureCancelPopup: function(){
			this._oDialogSecure.close();
		},
		
		onAddExcelData: function() {
			//This code was generated by the layout editor.
			var that = this;
			//Step 1: Create a popup object as a global variable
			if (this.fixedDialog === undefined) {
				this.fixedDialog = new Dialog({
					title: "Choose XSLX File For Upload",
					width: "60%",
					beginButton: new sap.m.Button({
						text: "Close",
						press: function(oEvent) {
							that.fixedDialog.close();
						}
					}),
					content: [
						new FileUploader("excelUploader",{
							fileType: "XLSX,xlsx",
							change: [this.onUpload, this],
							class: "sapUiLargeMargin"
						})
					]
				});
				this.getView().addDependent(this.fixedDialog);
			}
			//Step 2: Launch the popup
			this.fixedDialog.open();
		},
		formatDate: function(endDate){
			var x = new Date(endDate);
			var mon = ('0' + (x.getMonth()+1)).slice(-2);
			var day = ('0' + x.getDate()).slice(-2);
			var year = x.getFullYear();
			return year + mon + day;
		},
		onSearch: function(oEvent){
			var search = oEvent.getParameter("query");
			var oFilter1 = new sap.ui.model.Filter("Zzlocation", sap.ui.model.FilterOperator.Contains, search);
			var oFilter2 = new sap.ui.model.Filter("Zzmatprod", sap.ui.model.FilterOperator.Contains, search);
			var oFilter = new sap.ui.model.Filter({
				filters: [oFilter1, oFilter2],
				and: false
			});
			this.getView().byId("idTable").getBinding("items").filter([oFilter]);
		},
		_oDialogSecure: null,
		onAdd: function(oEvent){
			if (!this._oDialogSecure) {
				this._oDialogSecure = sap.ui.xmlfragment("Secure_Dialog", "demo.app.matcost.fragments.createEntry", this);
				this.getView().addDependent(this._oDialogSecure);
			}
			var newEntry = {
					Zzlocation:"",
					Zzcostcol:"",
					Zzmatprod:"",
					Zzenddate: new Date(),
					Zzqtyprods:0,
					Zzmatcosts:0,
					Zzlabcosts:0,
					Zzmchcosts:0,
					Zzunitcosts:0,
					Zcurrency: ""
				};
			this.localModel.setProperty("/newEntry", newEntry);
			//jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._oDialogSecure);
			this._oDialogSecure.open();
		},
		onSave: function(){
			var xData = this.localModel.getProperty("/data");
			var aData = JSON.parse(JSON.stringify(xData));
			debugger;
			for(var i = 0;i<aData.length;i++){
				aData[i].Zzenddate = this.formatDate(aData[i].Zzenddate);
			}
			//var base64Str = Buffer.from(JSON.stringify(aData)).toString("base64");
			var base64Str = btoa(decodeURIComponent(JSON.stringify(aData)));
			var payload = {Key : "PST", Value : base64Str};
			this.getView().getModel().create("/CollectorSet", payload,{
				success: function(){
					MessageToast.show("Data has been saved to SAP system");
				}
			});
		},
		_import: function (file) {
			var that = this;
			var excelData = {};
			if (file && window.FileReader) {
				var reader = new FileReader();
				reader.onload = function (e) {
					var data = e.target.result;
					var workbook = XLSX.read(data, {
						type: 'binary'
					});
					workbook.SheetNames.forEach(function (sheetName) {
						// Here is your object for every sheet in workbook
						excelData = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[sheetName]);

					});
					for (var i=0; i<excelData.length; i++) {
						excelData[i].Zzunitcosts = parseFloat(( parseInt(excelData[i].Zzqtyprods)   + parseInt(excelData[i].Zzlabcosts)  + parseInt(excelData[i].Zzmchcosts) ) / parseInt(excelData[i].Zzqtyprods)).toFixed(2);                         
						excelData[i].Zcurrency = "N";
					}
					// Setting the data to the local model 
					that.localModel.setData({
						data: JSON.parse(JSON.stringify(excelData)),
						newEntry: {
							Zzlocation:"",
							Zzcostcol:"",
							Zzmatprod:"",
							Zzenddate: new Date(),
							Zzqtyprods:0,
							Zzmatcosts:0,
							Zzlabcosts:0,
							Zzmchcosts:0,
							Zzunitcosts:0
						}
					});
					that.localModel.refresh(true);
				};
				reader.onerror = function (ex) {
					console.log(ex);
				};
				reader.readAsBinaryString(file);
				this.fixedDialog.close();
			}
		}
	});
});